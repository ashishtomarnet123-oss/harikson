'use client';

import React, { useState, useEffect } from 'react';
import { Card, Title, Text, Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell, Badge, Button, Flex, TextInput, Select, SelectItem, NumberInput, Switch } from '@tremor/react';
import { Bot, Plus, X, Search, Activity, MoreVertical, Edit2, Trash2 } from 'lucide-react';
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
    name: '', description: '', category: 'General', model: 'Qwen3-8B', 
    system_prompt: 'You are a helpful AI assistant.', 
    temperature: 0.7, max_tokens: 2048, 
    streaming_enabled: true, memory_enabled: true, status: 'active'
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  

  const fetchAgents = async () => {
    setLoading(true);
    const token = getCookie('admin_token') || localStorage.getItem('admin_token');
    try {
      const res = await fetch(`${apiBase}/admin/agents`, {
        headers: { 'Authorization': `Bearer ${token}` }
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
    const token = getCookie('admin_token') || localStorage.getItem('admin_token');
    const method = editingId ? 'PUT' : 'POST';
    const endpoint = editingId ? `/admin/agents/${editingId}` : '/admin/agents';
    
    try {
      const res = await fetch(`${apiBase}${endpoint}`, {
        method,
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
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
    const token = getCookie('admin_token') || localStorage.getItem('admin_token');
    try {
      await fetch(`${apiBase}/admin/agents/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
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
      name: '', description: '', category: 'General', model: 'Qwen3-8B', 
      system_prompt: 'You are a helpful AI assistant.', 
      temperature: 0.7, max_tokens: 2048, 
      streaming_enabled: true, memory_enabled: true, status: 'active'
    });
    setEditingId(null);
    setIsDrawerOpen(true);
  };

  const filteredAgents = agents.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (a.tenant_name && a.tenant_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <Flex justifyContent="between" alignItems="center">
        <div>
          <Title className="text-white text-2xl font-bold flex items-center gap-2">
            <Bot className="w-6 h-6 text-indigo-500" />
            AI Agent Fleet
          </Title>
          <Text className="text-gray-400 mt-1">Manage, configure, and orchestrate specialized AI agents across all tenants.</Text>
        </div>
        <Button size="md" icon={Plus} onClick={openCreateDrawer}>Create Agent</Button>
      </Flex>

      <Card className="bg-gray-900/40 border-gray-800/80 p-0 overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/60">
          <div className="relative w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search agents or tenants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <Badge icon={Activity} color="indigo">{agents.length} Total Agents</Badge>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading agents...</div>
        ) : (
          <Table className="mt-0">
            <TableHead className="bg-gray-900/80 border-b border-gray-800">
              <TableRow>
                <TableHeaderCell className="text-gray-400">Agent Name</TableHeaderCell>
                <TableHeaderCell className="text-gray-400">Tenant / Scope</TableHeaderCell>
                <TableHeaderCell className="text-gray-400">Model</TableHeaderCell>
                <TableHeaderCell className="text-gray-400">Status</TableHeaderCell>
                <TableHeaderCell className="text-gray-400">Usage</TableHeaderCell>
                <TableHeaderCell className="text-gray-400 text-right">Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAgents.map((agent) => (
                <TableRow key={agent.id} className="hover:bg-gray-800/30 transition-colors border-b border-gray-800/50">
                  <TableCell>
                    <div className="font-medium text-white">{agent.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{agent.category}</div>
                  </TableCell>
                  <TableCell>
                    <span className="text-gray-300">{agent.tenant_name || 'Global (Admin)'}</span>
                  </TableCell>
                  <TableCell>
                    <Badge color="blue" size="sm">{agent.model}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge color={agent.status === 'active' ? 'emerald' : agent.status === 'disabled' ? 'rose' : 'gray'}>
                      {agent.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-gray-300">{agent.total_requests} reqs</div>
                    <div className="text-xs text-gray-500">{agent.total_tokens} tokens</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Flex justifyContent="end" className="gap-2">
                      <Button size="xs" variant="secondary" icon={Edit2} onClick={() => openEditDrawer(agent)}>Edit</Button>
                      <Button size="xs" color="red" variant="secondary" icon={Trash2} onClick={() => handleArchive(agent.id)} />
                    </Flex>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Slide-out Drawer for Create/Edit */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)} />
          <div className="relative w-full max-w-xl bg-gray-950 border-l border-gray-800 h-full overflow-y-auto flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            
            <div className="flex items-center justify-between p-6 border-b border-gray-800 sticky top-0 bg-gray-950/80 backdrop-blur z-10">
              <div>
                <h2 className="text-xl font-bold text-white">{editingId ? 'Configure Agent' : 'Create New Agent'}</h2>
                <p className="text-sm text-gray-400 mt-1">Define the behavior and constraints for this AI agent.</p>
              </div>
              <button onClick={() => setIsDrawerOpen(false)} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1">
              
              {/* Core Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest border-b border-gray-800 pb-2">Identity</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Agent Name</label>
                    <TextInput placeholder="e.g. Sales Assistant" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Category</label>
                    <Select value={formData.category} onValueChange={v => setFormData({...formData, category: v})}>
                      <SelectItem value="General">General</SelectItem>
                      <SelectItem value="Support">Customer Support</SelectItem>
                      <SelectItem value="Coding">Coding / Engineering</SelectItem>
                      <SelectItem value="Sales">Sales & Marketing</SelectItem>
                      <SelectItem value="Data">Data Analysis</SelectItem>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Description</label>
                  <TextInput placeholder="Brief description of agent's purpose..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                </div>
              </div>

              {/* AI Config */}
              <div className="space-y-4 pt-4">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest border-b border-gray-800 pb-2">Brain Configuration</h3>
                
                <div>
                  <label className="text-xs font-semibold text-gray-400 mb-1.5 block">LLM Engine</label>
                  <Select value={formData.model} onValueChange={v => setFormData({...formData, model: v})}>
                    <SelectItem value="Qwen3-8B">Qwen3-8B (Fast & Cheap)</SelectItem>
                    <SelectItem value="Qwen3-14B">Qwen3-14B (Balanced)</SelectItem>
                    <SelectItem value="Qwen3-32B">Qwen3-32B (Complex Reasoning)</SelectItem>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 mb-1.5 block flex justify-between">
                    <span>System Prompt</span>
                    <span className="text-gray-600 font-normal">Core Instructions</span>
                  </label>
                  <textarea 
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg p-3 text-sm text-gray-200 h-32 focus:outline-none focus:border-indigo-500"
                    placeholder="You are a helpful AI assistant..."
                    value={formData.system_prompt}
                    onChange={e => setFormData({...formData, system_prompt: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Temperature ({formData.temperature})</label>
                    <NumberInput min={0} max={2} step={0.1} value={formData.temperature} onValueChange={v => setFormData({...formData, temperature: v})} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Max Tokens</label>
                    <NumberInput min={1} max={8192} step={1} value={formData.max_tokens} onValueChange={v => setFormData({...formData, max_tokens: v})} />
                  </div>
                </div>
              </div>

              {/* Capabilities */}
              <div className="space-y-4 pt-4">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest border-b border-gray-800 pb-2">Capabilities</h3>
                
                <Flex justifyContent="between" className="p-3 bg-gray-900/50 rounded-lg border border-gray-800">
                  <div>
                    <div className="text-sm font-medium text-gray-200">Session Memory</div>
                    <div className="text-xs text-gray-500">Agent remembers context across conversations</div>
                  </div>
                  <Switch checked={formData.memory_enabled || false} onChange={v => setFormData({...formData, memory_enabled: v})} />
                </Flex>

                <Flex justifyContent="between" className="p-3 bg-gray-900/50 rounded-lg border border-gray-800">
                  <div>
                    <div className="text-sm font-medium text-gray-200">Response Streaming</div>
                    <div className="text-xs text-gray-500">Stream tokens in real-time to the client</div>
                  </div>
                  <Switch checked={formData.streaming_enabled || false} onChange={v => setFormData({...formData, streaming_enabled: v})} />
                </Flex>

                {editingId && (
                  <Flex justifyContent="between" className="p-3 bg-gray-900/50 rounded-lg border border-gray-800">
                    <div>
                      <div className="text-sm font-medium text-gray-200">Agent Status</div>
                      <div className="text-xs text-gray-500">Disable to block new requests</div>
                    </div>
                    <Select className="w-32" value={formData.status} onValueChange={v => setFormData({...formData, status: v})}>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </Select>
                  </Flex>
                )}
              </div>

            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-800 bg-gray-900/50 flex justify-end gap-3 sticky bottom-0">
              <Button variant="secondary" onClick={() => setIsDrawerOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>{editingId ? 'Save Configuration' : 'Deploy Agent'}</Button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
