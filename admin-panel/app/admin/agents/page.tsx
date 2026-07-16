'use client';
import React, { useState, useEffect } from 'react';
import {
  Bot,
  Plus,
  X,
  Search,
  Activity,
  Edit2,
  Trash2,
  Cpu,
  Settings,
  ShieldAlert,
  BadgeCheck,
} from 'lucide-react';
import { getCookie } from 'cookies-next';

interface Agent {
  id: string;
  name: string;
  description: string;
  category: string;
  status: string;
  model: string;
  tenant_name?: string;
  total_requests: number;
  total_tokens: string;
  system_prompt: string;
  temperature: number;
  max_tokens: number;
  streaming_enabled: boolean;
  memory_enabled: boolean;
}

export default function AgentsManagement() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const apiBase = '/api-proxy';
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [formData, setFormData] = useState<Partial<Agent>>({
    name: '',
    description: '',
    category: 'General',
    model: 'Qwen3-8B',
    system_prompt: 'You are a helpful AI assistant.',
    temperature: 0.7,
    max_tokens: 2048,
    streaming_enabled: true,
    memory_enabled: true,
    status: 'active',
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchAgents = async () => {
    setLoading(true);
    const token =
      getCookie('admin_token') || localStorage.getItem('admin_token');
    try {
      const res = await fetch(`${apiBase}/v1/admin/agents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAgents(data);
      }
    } catch (err) {
      console.error('Failed to fetch agents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (apiBase) fetchAgents();
  }, [apiBase]);

  const handleSave = async () => {
    const token =
      getCookie('admin_token') || localStorage.getItem('admin_token');
    const method = editingId ? 'PUT' : 'POST';
    const endpoint = editingId ? `/v1/admin/agents/${editingId}` : '/v1/admin/agents';

    try {
      const res = await fetch(`${apiBase}${endpoint}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setIsDrawerOpen(false);
        fetchAgents();
      } else {
        alert('Failed to save agent configuration.');
      }
    } catch (err) {
      console.error('Save error:', err);
      alert('Network error saving agent.');
    }
  };

  const handleArchive = async (id: string) => {
    if (!window.confirm('Are you sure you want to archive this agent?')) return;
    const token =
      getCookie('admin_token') || localStorage.getItem('admin_token');
    try {
      await fetch(`${apiBase}/v1/v1/admin/agents/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchAgents();
    } catch (err) {
      console.error('Failed to archive:', err);
    }
  };

  const openEditDrawer = (agent: Agent) => {
    setFormData(agent);
    setEditingId(agent.id);
    setIsDrawerOpen(true);
  };

  const openCreateDrawer = () => {
    setFormData({
      name: '',
      description: '',
      category: 'General',
      model: 'Qwen3-8B',
      system_prompt: 'You are a helpful AI assistant.',
      temperature: 0.7,
      max_tokens: 2048,
      streaming_enabled: true,
      memory_enabled: true,
      status: 'active',
    });
    setEditingId(null);
    setIsDrawerOpen(true);
  };

  const filteredAgents = agents.filter(
    (a) =>
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.tenant_name &&
        a.tenant_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-gray-100">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
            <Bot className="w-7 h-7 text-blue-600 shrink-0" /> AI Agent Fleet
          </h1>
          <p className="text-gray-500 mt-1.5 text-sm sm:text-base">
            Manage, configure, and orchestrate specialized AI agents across all
            tenants.
          </p>
        </div>
        <button
          onClick={openCreateDrawer}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 transition-all text-white font-semibold text-sm rounded-xl shadow-sm self-start sm:self-auto hover:shadow"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>Create Agent</span>
        </button>
      </div>

      {/* Agents table card wrapper */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {/* Search and control bar */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50">
          <div className="relative w-72">
            <Search className="w-4.5 h-4.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search agents or tenants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-1.5 text-sm text-gray-700 outline-none focus:border-blue-500 transition-colors bg-white"
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border bg-blue-50 text-blue-700 border-blue-200 self-start sm:self-auto">
            <Activity className="w-3.5 h-3.5" />
            <span>{agents.length} Total Agents</span>
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center text-gray-400 font-medium">
            Loading AI agents...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/25">
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Agent Name
                  </th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Tenant / Scope
                  </th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Model
                  </th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Usage Stats
                  </th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAgents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center py-16 text-gray-400 font-medium"
                    >
                      No agents found. Click Create Agent to deploy one.
                    </td>
                  </tr>
                ) : (
                  filteredAgents.map((agent) => (
                    <tr
                      key={agent.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="font-bold text-gray-900 text-base">
                          {agent.name}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 font-medium">
                          {agent.category}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-600 font-medium">
                        {agent.tenant_name || 'Global (Admin)'}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-100">
                          {agent.model}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                            agent.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : agent.status === 'disabled'
                                ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                : 'bg-gray-50 text-gray-700 border border-gray-100'
                          }`}
                        >
                          {agent.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-gray-900 font-semibold text-xs">
                          {agent.total_requests || 0} reqs
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5 font-mono">
                          {agent.total_tokens || 0} tokens
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditDrawer(agent)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 transition-all border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold hover:shadow-xs"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleArchive(agent.id)}
                            className="inline-flex items-center p-1.5 bg-red-50 hover:bg-red-100 text-red-600 hover:border-red-200 transition-all border border-red-100 rounded-lg shadow-xs"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drawer Overlay & Panel */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          />
          <div className="relative w-full max-w-xl bg-white border-l border-gray-200 h-full overflow-y-auto flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white/90 backdrop-blur z-10">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-blue-600" />
                  {editingId ? 'Configure Agent' : 'Create New Agent'}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Define LLM engine, system prompt directives, and capabilities.
                </p>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 border border-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body Form */}
            <div className="p-6 space-y-6 flex-1">
              {/* Profile Config */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2 flex items-center gap-1.5">
                  <BadgeCheck className="w-4 h-4 text-gray-400" /> Identity
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1.5 block">
                      Agent Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Technical Writer"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1.5 block">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      className="w-full border border-gray-200 bg-white rounded-xl px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="General">General</option>
                      <option value="Support">Customer Support</option>
                      <option value="Coding">Coding / Engineering</option>
                      <option value="Sales">Sales & Marketing</option>
                      <option value="Data">Data Analysis</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1.5 block">
                    Description
                  </label>
                  <input
                    type="text"
                    placeholder="Short summary of the agent's purpose..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* LLM & Prompt Parameters */}
              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2 flex items-center gap-1.5">
                  <Settings className="w-4 h-4 text-gray-400" /> Brain &
                  Parameters
                </h3>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1.5 block">
                    LLM Engine
                  </label>
                  <select
                    value={formData.model}
                    onChange={(e) =>
                      setFormData({ ...formData, model: e.target.value })
                    }
                    className="w-full border border-gray-200 bg-white rounded-xl px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Qwen3-8B">Qwen3-8B (Fast & Cheap)</option>
                    <option value="Qwen3-14B">Qwen3-14B (Balanced)</option>
                    <option value="Qwen3-32B">
                      Qwen3-32B (Complex Reasoning)
                    </option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1.5 block">
                    System Prompt Persona
                  </label>
                  <textarea
                    rows={4}
                    placeholder="You are a helpful AI assistant..."
                    value={formData.system_prompt}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        system_prompt: e.target.value,
                      })
                    }
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 leading-relaxed"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1.5 block">
                      Temperature ({formData.temperature})
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={2}
                      step={0.1}
                      value={formData.temperature}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          temperature: parseFloat(e.target.value) || 0.7,
                        })
                      }
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1.5 block">
                      Max Tokens
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={8192}
                      value={formData.max_tokens}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          max_tokens: parseInt(e.target.value) || 2048,
                        })
                      }
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Capabilities */}
              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-gray-400" /> Capabilities
                  & Status
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3.5 bg-gray-50/50 rounded-xl border border-gray-100 cursor-pointer select-none">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        Session Memory
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Agent remembers context across conversations
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.memory_enabled || false}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          memory_enabled: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </label>
                  <label className="flex items-center justify-between p-3.5 bg-gray-50/50 rounded-xl border border-gray-100 cursor-pointer select-none">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        Response Streaming
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Stream tokens in real-time to the client
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.streaming_enabled || false}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          streaming_enabled: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </label>

                  {editingId && (
                    <div className="flex items-center justify-between p-3.5 bg-gray-50/50 rounded-xl border border-gray-100">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          Agent Status
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          Disable to temporarily block invocations
                        </div>
                      </div>
                      <select
                        value={formData.status}
                        onChange={(e) =>
                          setFormData({ ...formData, status: e.target.value })
                        }
                        className="border border-gray-200 bg-white rounded-lg px-2.5 py-1 text-xs text-gray-700 outline-none focus:border-blue-500 w-28"
                      >
                        <option value="active">Active</option>
                        <option value="disabled">Disabled</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-6 border-t border-gray-100 bg-gray-50/75 flex justify-end gap-3 sticky bottom-0 z-10">
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="px-4 py-2 border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 transition-all font-semibold text-sm rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 transition-all text-white font-semibold text-sm rounded-xl hover:shadow-xs"
              >
                {editingId ? 'Save Configuration' : 'Deploy Agent'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
