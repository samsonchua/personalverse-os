import ipaddress
import re
import socket
import urllib.request
from html.parser import HTMLParser
from urllib.parse import urlparse

from app.services.ai_providers import get_configured_provider

_SKIP_TAGS = {"script", "style", "noscript", "svg", "nav", "footer", "header"}
_USER_AGENT = "PersonalVerse-WebReader/1.0"


class _TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title_parts: list[str] = []
        self.text_parts: list[str] = []
        self._in_title = False
        self._skip_depth = 0

    def handle_starttag(self, tag, attrs):
        if tag == "title":
            self._in_title = True
        if tag in _SKIP_TAGS:
            self._skip_depth += 1

    def handle_endtag(self, tag):
        if tag == "title":
            self._in_title = False
        if tag in _SKIP_TAGS and self._skip_depth > 0:
            self._skip_depth -= 1

    def handle_data(self, data):
        if self._skip_depth:
            return
        text = data.strip()
        if not text:
            return
        if self._in_title:
            self.title_parts.append(text)
        else:
            self.text_parts.append(text)


class UnsafeUrlError(ValueError):
    pass


def _assert_public_http_url(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise UnsafeUrlError("Only http:// and https:// URLs are supported.")
    if not parsed.hostname:
        raise UnsafeUrlError("URL is missing a hostname.")
    try:
        infos = socket.getaddrinfo(parsed.hostname, None)
    except socket.gaierror:
        raise UnsafeUrlError("Could not resolve hostname.")
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            raise UnsafeUrlError("Refusing to fetch a private/internal address.")
    return url


def fetch_and_extract(url: str) -> tuple[str, str]:
    """Fetches a URL server-side and returns (title, plain_text). Raises UnsafeUrlError
    for non-public targets and urllib.error.URLError-family exceptions on network failure."""
    _assert_public_http_url(url)
    req = urllib.request.Request(url, headers={"User-Agent": _USER_AGENT, "Accept": "text/html"})
    with urllib.request.urlopen(req, timeout=12) as resp:
        raw = resp.read(2_000_000)  # cap at ~2MB
    html = raw.decode(resp.headers.get_content_charset() or "utf-8", errors="ignore")

    parser = _TextExtractor()
    parser.feed(html)
    title = " ".join(parser.title_parts).strip() or url
    text = re.sub(r"\s+", " ", " ".join(parser.text_parts)).strip()
    return title, text


def summarize(title: str, text: str) -> str:
    provider = get_configured_provider()
    excerpt = text[:8000]
    if provider:
        try:
            return provider.complete(
                "You summarize web articles into a crisp 3-5 sentence TL;DR, plain prose, no preamble.",
                f"Title: {title}\n\nArticle text:\n{excerpt}",
            ).strip()
        except Exception:
            pass  # fall through to extractive summary

    sentences = re.split(r"(?<=[.!?])\s+", excerpt)
    summary = ""
    for sentence in sentences:
        if len(summary) + len(sentence) > 600:
            break
        summary += sentence + " "
    return summary.strip() or excerpt[:300]
