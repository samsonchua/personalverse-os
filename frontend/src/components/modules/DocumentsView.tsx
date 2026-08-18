import React, { useEffect, useRef, useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { FileText, UploadCloud, Download, Trash2, Tag, Loader2, Eye } from 'lucide-react';
import { api } from '../../api/client';
import { Document } from '../../types';

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const DocumentsView: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setDocuments(await api.listDocuments());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      await api.uploadDocument(file, { description, tags });
      setDescription('');
      setTags('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await api.deleteDocument(id);
    await loadData();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-white">Documents</h2>
        <p className="text-xs text-slate-400">PDF, Word, Excel, PowerPoint, images, text & markdown — stored and searchable</p>
      </div>

      <GlassCard className="space-y-3" hoverEffect={false}>
        <h3 className="font-bold text-white text-sm flex items-center gap-2">
          <UploadCloud className="w-4 h-4 text-cyanAccent" />
          Upload a document
        </h3>
        <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input ref={fileInputRef} type="file" required className="md:col-span-2 text-xs text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:bg-cyan-500/20 file:text-cyan-300 file:text-xs file:font-bold" />
          <input
            type="text"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="glass-input px-3.5 py-2 rounded-xl text-xs"
          />
          <input
            type="text"
            placeholder="Tags (optional)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="glass-input px-3.5 py-2 rounded-xl text-xs"
          />
          <button
            type="submit"
            disabled={uploading}
            className="md:col-span-4 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:opacity-90 text-white font-bold text-xs transition-all disabled:opacity-50"
          >
            {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
            Upload
          </button>
        </form>
        {error && <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{error}</p>}
      </GlassCard>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map((doc) => (
          <GlassCard key={doc.id} hoverEffect={false} className="space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                <p className="text-sm font-bold text-white truncate" title={doc.filename}>{doc.filename}</p>
              </div>
              <span className="text-[10px] text-slate-500 shrink-0">{formatSize(doc.size_bytes)}</span>
            </div>
            {doc.description && <p className="text-xs text-slate-400 line-clamp-2">{doc.description}</p>}
            {doc.tags && (
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <Tag className="w-3 h-3 text-cyan-400" />
                <span>{doc.tags}</span>
              </div>
            )}
            <div className="flex items-center gap-2 pt-2 border-t border-white/5">
              <button
                onClick={() => api.viewDocument(doc.id, doc.content_type)}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 text-[11px] font-semibold"
              >
                <Eye className="w-3.5 h-3.5" /> View
              </button>
              <button
                onClick={() => api.downloadDocument(doc.id, doc.filename)}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 text-[11px] font-semibold"
              >
                <Download className="w-3.5 h-3.5" /> Download
              </button>
              <button
                onClick={() => handleDelete(doc.id)}
                className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </GlassCard>
        ))}
        {documents.length === 0 && (
          <p className="text-xs text-slate-500 col-span-full text-center py-8">No documents uploaded yet.</p>
        )}
      </div>
    </div>
  );
};
