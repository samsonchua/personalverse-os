import React, { useEffect, useRef, useState } from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { UploadCloud, Download, Trash2, FileText, Eye } from 'lucide-react';
import { api } from '../../../api/client';
import { Document } from '../../../types';

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface ContractsTabProps {
  clientId: string;
}

export const ContractsTab: React.FC<ContractsTabProps> = ({ clientId }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () => api.listDocuments('client', clientId).then(setDocuments);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      await api.uploadDocument(file, { description, entityType: 'client', entityId: clientId });
      setDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await api.deleteDocument(id);
    await load();
  };

  return (
    <div className="space-y-4">
      <GlassCard hoverEffect={false} className="space-y-3">
        <h3 className="font-bold text-white text-sm flex items-center gap-2">
          <UploadCloud className="w-4 h-4 text-cyanAccent" /> Upload contract or document
        </h3>
        <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input ref={fileInputRef} type="file" required className="md:col-span-2 text-xs text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:bg-cyan-500/20 file:text-cyan-300 file:text-xs file:font-bold" />
          <input type="text" placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} className="glass-input px-3.5 py-2 rounded-xl text-xs" />
          <button type="submit" disabled={uploading} className="py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs disabled:opacity-50">
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </form>
        {error && <p className="text-xs text-rose-400">{error}</p>}
      </GlassCard>

      <div className="space-y-2">
        {documents.map((doc) => (
          <div key={doc.id} className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-900/60 border border-white/5">
            <div className="flex items-center gap-2.5 min-w-0">
              <FileText className="w-4 h-4 text-cyanAccent shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{doc.filename}</p>
                <p className="text-[10px] text-slate-500">{formatSize(doc.size_bytes)}{doc.description ? ` · ${doc.description}` : ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <button onClick={() => api.viewDocument(doc.id, doc.content_type)} className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-white/5"><Eye className="w-3.5 h-3.5" /></button>
              <button onClick={() => api.downloadDocument(doc.id, doc.filename)} className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-white/5"><Download className="w-3.5 h-3.5" /></button>
              <button onClick={() => handleDelete(doc.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
        {!documents.length && (
          <GlassCard hoverEffect={false} className="text-center py-8">
            <p className="text-xs text-slate-500">No contracts or documents uploaded yet.</p>
          </GlassCard>
        )}
      </div>
    </div>
  );
};
