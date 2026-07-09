'use client';
import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Flex } from '@tremor/react';
import { Database, Plus, Trash2, Upload, FileText, RefreshCw, Search } from 'lucide-react';
import { getCookie } from 'cookies-next';

interface KnowledgeBase { id: string; name: string; description: string; tenant_name: string; total_documents: number; total_embeddings: number; storage_bytes: number; index_status: string; created_at: string; }
interface Document { id: string; filename: string; file_type: string; file_size_bytes: number; status: string; chunk_count: number; created_at: string; }

const statusColors: Record<string, string> = { pending: 'yellow', indexing: 'blue', completed: 'emerald', failed: 'red' };
const docStatusColors: Record<string, string> = { pending: 'yellow', processing: 'blue', indexed: 'emerald', failed: 'red' };

function fmtBytes(b: number) { if (!b) return '0 B'; const k = 1024; const sizes = ['B','KB','MB','GB']; const i = Math.floor(Math.log(b)/Math.log(k)); return `${(b/Math.pow(k,i)).toFixed(1)} ${sizes[i]}`; }

export default function KnowledgePage() {
  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
  const [selectedKb, setSelectedKb] = useState<KnowledgeBase | null>(null);
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const apiBase = '/api-proxy';

  

  const token = () => getCookie('admin_token') || localStorage.getItem('admin_token');

  const fetchKbs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/admin/knowledge`, { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) setKbs(await res.json());
    } finally { setLoading(false); }
  };

  const fetchDocs = async (kbId: string) => {
    try {
      const res = await fetch(`${apiBase}/admin/knowledge/${kbId}/documents`, { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) setDocs(await res.json());
    } catch {}
  };

  useEffect(() => { if (apiBase) fetchKbs(); }, [apiBase]);
  useEffect(() => { if (selectedKb) fetchDocs(selectedKb.id); }, [selectedKb]);

  const createKb = async () => {
    if (!newName) return;
    await fetch(`${apiBase}/admin/knowledge`, { method: 'POST', headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName, description: newDesc }) });
    setShowCreate(false); setNewName(''); setNewDesc('');
    fetchKbs();
  };

  const deleteKb = async (id: string) => {
    if (!confirm('Delete this knowledge base and all its documents?')) return;
    await fetch(`${apiBase}/admin/knowledge/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
    if (selectedKb?.id === id) setSelectedKb(null);
    fetchKbs();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedKb || !e.target.files?.length) return;
    const file = e.target.files[0];
    const ext = file.name.split('.').pop()?.toLowerCase() || 'txt';
    await fetch(`${apiBase}/admin/knowledge/${selectedKb.id}/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: file.name, file_type: ext, file_size_bytes: file.size })
    });
    fetchDocs(selectedKb.id);
    setTimeout(() => { fetchDocs(selectedKb.id); fetchKbs(); }, 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Database className="w-6 h-6 text-violet-500" /> Knowledge Bases</h1>
          <p className="text-gray-400 mt-1 text-sm">Manage RAG document collections and indexing pipelines.</p>
        </div>
        <Button icon={Plus} onClick={() => setShowCreate(true)}>New Knowledge Base</Button>
      </div>

      {showCreate && (
        <Card className="bg-gray-900/60 border-violet-800/50 p-5">
          <h3 className="text-sm font-bold text-gray-200 mb-4">Create Knowledge Base</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Name *</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-violet-500" placeholder="e.g. Product Documentation" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Description</label>
              <input value={newDesc} onChange={e => setNewDesc(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-violet-500" placeholder="Optional description..." />
            </div>
          </div>
          <Flex justifyContent="end" className="gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button size="sm" onClick={createKb}>Create</Button>
          </Flex>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* KB List */}
        <div className="space-y-3">
          {loading ? <div className="text-center text-gray-500 py-8">Loading...</div> : null}
          {kbs.map(kb => (
            <Card key={kb.id} onClick={() => setSelectedKb(kb)}
              className={`cursor-pointer transition-all border p-4 ${selectedKb?.id === kb.id ? 'bg-violet-900/20 border-violet-700' : 'bg-gray-900/40 border-gray-800 hover:border-gray-700'}`}>
              <Flex justifyContent="between" className="mb-2">
                <div className="font-semibold text-white">{kb.name}</div>
                <div className="flex items-center gap-2">
                  <Badge color={statusColors[kb.index_status] as any} size="sm">{kb.index_status}</Badge>
                  <button onClick={e => { e.stopPropagation(); deleteKb(kb.id); }} className="text-gray-600 hover:text-red-400 transition-colors p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </Flex>
              <p className="text-xs text-gray-500 mb-3">{kb.description || 'No description'}</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-gray-950 rounded p-2 text-center"><div className="font-bold text-violet-400">{kb.total_documents}</div><div className="text-gray-600">Docs</div></div>
                <div className="bg-gray-950 rounded p-2 text-center"><div className="font-bold text-blue-400">{kb.total_embeddings?.toLocaleString()}</div><div className="text-gray-600">Embeddings</div></div>
                <div className="bg-gray-950 rounded p-2 text-center"><div className="font-bold text-gray-300">{fmtBytes(kb.storage_bytes)}</div><div className="text-gray-600">Storage</div></div>
              </div>
            </Card>
          ))}
        </div>

        {/* Document Panel */}
        {selectedKb ? (
          <Card className="bg-gray-900/40 border-gray-800 p-4">
            <Flex justifyContent="between" className="mb-4">
              <div>
                <h3 className="font-bold text-white">{selectedKb.name}</h3>
                <p className="text-xs text-gray-500">Documents</p>
              </div>
              <label className="cursor-pointer">
                <input type="file" className="hidden" accept=".pdf,.docx,.txt,.md,.html,.csv,.json,.xml" onChange={handleUpload} />
                <span className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                  <Upload className="w-3.5 h-3.5" /> Upload File
                </span>
              </label>
            </Flex>
            <div className="space-y-2">
              {docs.length === 0 && <div className="text-center text-gray-500 py-8 text-sm">No documents yet. Upload a file to start indexing.</div>}
              {docs.map(doc => (
                <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-950 rounded-lg border border-gray-800">
                  <FileText className="w-4 h-4 text-violet-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-200 truncate">{doc.filename}</div>
                    <div className="text-xs text-gray-500">{fmtBytes(doc.file_size_bytes)} · {doc.chunk_count || 0} chunks</div>
                  </div>
                  <Badge color={docStatusColors[doc.status] as any} size="sm">{doc.status}</Badge>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card className="bg-gray-900/40 border-gray-800 p-8 flex items-center justify-center text-gray-500 text-sm">
            Select a Knowledge Base to view documents
          </Card>
        )}
      </div>
    </div>
  );
}
