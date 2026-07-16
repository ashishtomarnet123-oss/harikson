'use client';
import React, { useState, useEffect } from 'react';
import {
  Database,
  Plus,
  Trash2,
  Upload,
  FileText,
  RefreshCw,
  Search,
} from 'lucide-react';
import { getCookie } from 'cookies-next';

interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  tenant_name: string;
  total_documents: number;
  total_embeddings: number;
  storage_bytes: number;
  index_status: string;
  created_at: string;
}

interface Document {
  id: string;
  filename: string;
  file_type: string;
  file_size_bytes: number;
  status: string;
  chunk_count: number;
  created_at: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-100',
  indexing: 'bg-blue-50 text-blue-700 border-blue-100 animate-pulse',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  failed: 'bg-red-50 text-red-700 border-red-100',
};

const docStatusColors: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-100',
  processing: 'bg-blue-50 text-blue-700 border-blue-100 animate-pulse',
  indexed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  failed: 'bg-red-50 text-red-700 border-red-100',
};

function fmtBytes(b: number) {
  if (!b) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${(b / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default function KnowledgePage() {
  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
  const [selectedKb, setSelectedKb] = useState<KnowledgeBase | null>(null);
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const apiBase = '/api-proxy';

  const token = () =>
    getCookie('admin_token') || localStorage.getItem('admin_token');
  const headers = () => ({
    Authorization: `Bearer ${token()}`,
    'Content-Type': 'application/json',
  });

  const fetchKbs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/v1/admin/knowledge`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setKbs(data);
        // Sync selected Knowledge Base if active
        if (selectedKb) {
          const updated = data.find(
            (k: KnowledgeBase) => k.id === selectedKb.id
          );
          if (updated) setSelectedKb(updated);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchDocs = async (kbId: string) => {
    try {
      const res = await fetch(`${apiBase}/v1/admin/knowledge/${kbId}/documents`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) setDocs(await res.json());
    } catch (err: any) {
      console.error('Error fetching knowledge base documents:', err);
    }
  };

  useEffect(() => {
    if (apiBase) fetchKbs();
  }, [apiBase]);

  useEffect(() => {
    if (selectedKb) fetchDocs(selectedKb.id);
  }, [selectedKb]);

  const createKb = async () => {
    if (!newName) return;
    await fetch(`${apiBase}/v1/admin/knowledge`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ name: newName, description: newDesc }),
    });
    setShowCreate(false);
    setNewName('');
    setNewDesc('');
    fetchKbs();
  };

  const deleteKb = async (id: string) => {
    if (!confirm('Delete this knowledge base and all its documents?')) return;
    await fetch(`${apiBase}/v1/admin/knowledge/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (selectedKb?.id === id) setSelectedKb(null);
    fetchKbs();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedKb || !e.target.files?.length) return;
    const file = e.target.files[0];
    const ext = file.name.split('.').pop()?.toLowerCase() || 'txt';
    await fetch(`${apiBase}/v1/admin/knowledge/${selectedKb.id}/documents`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        filename: file.name,
        file_type: ext,
        file_size_bytes: file.size,
      }),
    });
    fetchDocs(selectedKb.id);
    setTimeout(() => {
      fetchDocs(selectedKb.id);
      fetchKbs();
    }, 3000);
  };

  const filteredKbs = kbs.filter(
    (k) =>
      k.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (k.tenant_name &&
        k.tenant_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-gray-100">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
            <Database className="w-7 h-7 text-blue-600 shrink-0" /> Knowledge
            Bases
          </h1>
          <p className="text-gray-500 mt-1.5 text-sm sm:text-base">
            Manage RAG document collections and indexing pipelines.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 transition-all text-white font-semibold text-sm rounded-xl shadow-sm self-start sm:self-auto hover:shadow"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>New Knowledge Base</span>
        </button>
      </div>

      {/* Creation form modal card */}
      {showCreate && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-md space-y-4 animate-in fade-in duration-200">
          <h3 className="text-sm font-bold text-gray-900">
            Create New Knowledge Base
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
                Name *
              </label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. Product Documentation"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
                Description
              </label>
              <input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Optional description..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2.5 pt-2">
            <button
              onClick={() => setShowCreate(false)}
              className="px-3.5 py-1.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 transition-all border border-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={createKb}
              className="px-3.5 py-1.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all"
            >
              Create
            </button>
          </div>
        </div>
      )}

      {/* Main layout grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Knowledge Bases List Panel */}
        <div className="space-y-4">
          {/* Search bar inside list panel */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <div className="relative w-full">
              <Search className="w-4.5 h-4.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search knowledge bases or tenants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 transition-all bg-white"
              />
            </div>
          </div>

          {loading && kbs.length === 0 ? (
            <div className="text-center text-gray-400 font-medium py-12 bg-white rounded-2xl border border-gray-100">
              Loading knowledge bases...
            </div>
          ) : null}

          {filteredKbs.length === 0 && !loading ? (
            <div className="text-center text-gray-400 font-medium py-16 bg-white rounded-2xl border border-dashed border-gray-200 p-6">
              No knowledge bases found. Click New Knowledge Base to create one.
            </div>
          ) : (
            filteredKbs.map((kb) => (
              <div
                key={kb.id}
                onClick={() => setSelectedKb(kb)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer bg-white relative ${
                  selectedKb?.id === kb.id
                    ? 'border-blue-500 ring-1 ring-blue-500/20 shadow-md'
                    : 'border-gray-100 hover:border-gray-200 shadow-sm hover:shadow'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-bold text-gray-900 text-base tracking-tight truncate">
                      {kb.name}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 truncate">
                      Scope: {kb.tenant_name || 'Global (Admin)'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                        statusColors[kb.index_status] ||
                        'bg-gray-100 text-gray-700 border-gray-200'
                      }`}
                    >
                      {kb.index_status}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteKb(kb.id);
                      }}
                      className="inline-flex items-center p-1.5 bg-red-50 hover:bg-red-100 text-red-600 hover:border-red-200 transition-all border border-red-100 rounded-lg shadow-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                  {kb.description || 'No description provided.'}
                </p>

                {/* Storage stats */}
                <div className="grid grid-cols-3 gap-3 text-xs mt-4 pt-3.5 border-t border-gray-50">
                  <div className="text-center border-r border-gray-50">
                    <div className="text-gray-500 font-medium">Docs</div>
                    <div className="font-black text-gray-900 text-sm mt-0.5">
                      {kb.total_documents}
                    </div>
                  </div>
                  <div className="text-center border-r border-gray-50">
                    <div className="text-gray-500 font-medium">Embeddings</div>
                    <div className="font-black text-blue-600 text-sm mt-0.5">
                      {kb.total_embeddings?.toLocaleString() || 0}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-500 font-medium">Storage</div>
                    <div className="font-black text-gray-900 text-sm mt-0.5">
                      {fmtBytes(kb.storage_bytes)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Selected Knowledge Base Documents Panel */}
        <div>
          {selectedKb ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-50">
                <div>
                  <h3 className="font-black text-gray-900 text-lg leading-tight truncate max-w-[280px] sm:max-w-xs">
                    {selectedKb.name}
                  </h3>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-0.5">
                    Documents Drive
                  </p>
                </div>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.docx,.txt,.md,.html,.csv,.json,.xml"
                    onChange={handleUpload}
                  />
                  <span className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-all shadow-sm hover:shadow">
                    <Upload className="w-3.5 h-3.5 text-white" />
                    <span>Upload File</span>
                  </span>
                </label>
              </div>

              {/* Documents List */}
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {docs.length === 0 ? (
                  <div className="text-center text-gray-400 py-12 text-sm font-medium">
                    No documents yet. Upload a file to start indexing.
                  </div>
                ) : (
                  docs.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3.5 p-3.5 bg-gray-50/50 border border-gray-100 rounded-xl hover:border-gray-200 transition-all"
                    >
                      <div className="p-2 bg-blue-50/50 rounded-lg text-blue-600">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-gray-900 truncate">
                          {doc.filename}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {fmtBytes(doc.file_size_bytes)} &middot;{' '}
                          {doc.chunk_count || 0} chunks
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border shrink-0 ${
                          docStatusColors[doc.status] ||
                          'bg-gray-100 text-gray-700 border-gray-200'
                        }`}
                      >
                        {doc.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-2xl p-10 flex flex-col items-center justify-center text-center text-gray-400 text-sm shadow-sm h-64">
              <Database className="w-10 h-10 text-gray-300 mb-2.5" />
              <p className="font-semibold text-gray-500">
                Select a Knowledge Base to view documents and index status
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
