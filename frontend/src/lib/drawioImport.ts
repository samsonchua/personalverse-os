// Converts an uncompressed draw.io / diagrams.net XML export into a Mermaid flowchart.
// Draw.io must export as "Uncompressed XML" (File > Export as > XML, uncheck "Compressed")
// since compressed <diagram> payloads are base64+deflate and not decoded here.

const sanitizeLabel = (raw: string | null): string => {
  if (!raw) return '';
  const text = raw.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').trim();
  return text.replace(/"/g, "'");
};

export const convertDrawioXmlToMermaid = (xml: string): string => {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) {
    throw new Error('Could not parse XML. Make sure this is an uncompressed draw.io export.');
  }

  const cells = Array.from(doc.querySelectorAll('mxCell'));
  const idMap = new Map<string, string>();
  const vertices: Array<{ safeId: string; label: string }> = [];
  const edges: Array<{ source: string; target: string; label: string }> = [];

  let counter = 0;
  const safeIdFor = (rawId: string) => {
    if (!idMap.has(rawId)) {
      idMap.set(rawId, `n${counter++}`);
    }
    return idMap.get(rawId)!;
  };

  cells.forEach((cell) => {
    const isVertex = cell.getAttribute('vertex') === '1';
    const isEdge = cell.getAttribute('edge') === '1';
    const id = cell.getAttribute('id');
    if (!id) return;

    if (isVertex) {
      const label = sanitizeLabel(cell.getAttribute('value')) || id;
      vertices.push({ safeId: safeIdFor(id), label });
    } else if (isEdge) {
      const source = cell.getAttribute('source');
      const target = cell.getAttribute('target');
      if (source && target) {
        edges.push({
          source: safeIdFor(source),
          target: safeIdFor(target),
          label: sanitizeLabel(cell.getAttribute('value')),
        });
      }
    }
  });

  if (!vertices.length) {
    throw new Error('No shapes found in this file. Export as uncompressed XML from draw.io.');
  }

  const lines = ['flowchart TD'];
  vertices.forEach((v) => lines.push(`    ${v.safeId}["${v.label}"]`));
  edges.forEach((e) => {
    if (e.label) {
      lines.push(`    ${e.source} -- "${e.label}" --> ${e.target}`);
    } else {
      lines.push(`    ${e.source} --> ${e.target}`);
    }
  });

  return lines.join('\n');
};
