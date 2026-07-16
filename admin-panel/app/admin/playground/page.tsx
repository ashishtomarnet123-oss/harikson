'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Badge, Select, SelectItem } from '@tremor/react';
import {
  Terminal,
  Send,
  RotateCcw,
  ChevronDown,
  Zap,
  Clock,
  Hash,
} from 'lucide-react';
import { getCookie } from 'cookies-next';

const MODELS = ['harikson-plus', 'Qwen3-8B', 'Qwen3-14B', 'Qwen3-32B'];
const MODEL_LABELS: Record<string, string> = {
  'harikson-plus': 'Harikson Plus (Default)',
  'Qwen3-8B': 'Qwen3-8B · Fast',
  'Qwen3-14B': 'Qwen3-14B · Balanced',
  'Qwen3-32B': 'Qwen3-32B · Powerful',
};

export default function Playground() {
  const [model, setModel] = useState('harikson-plus');
  const [systemPrompt, setSystemPrompt] = useState(
    'You are a helpful AI assistant.'
  );
  const [userMessage, setUserMessage] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [stats, setStats] = useState<{
    tokensIn: number;
    tokensOut: number;
    latencyMs: number;
  } | null>(null);
  const apiBase = '/api-proxy';
  const responseRef = useRef<HTMLDivElement>(null);

  const handleSend = async () => {
    if (!userMessage.trim() || loading) return;
    setLoading(true);
    setResponse('');
    setStats(null);
    const token =
      getCookie('admin_token') || localStorage.getItem('admin_token');
    const startTime = Date.now();

    try {
      const res = await fetch(`${apiBase}/v1/admin/playground/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          model,
          system_prompt: systemPrompt,
          user_message: userMessage,
          temperature,
          max_tokens: maxTokens,
        }),
      });
      if (!res.body) throw new Error('No stream');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setResponse(fullText);
        if (responseRef.current)
          responseRef.current.scrollTop = responseRef.current.scrollHeight;
      }

      setStats({
        tokensIn: parseInt(res.headers.get('x-tokens-in') || '0'),
        tokensOut: parseInt(res.headers.get('x-tokens-out') || '0'),
        latencyMs: Date.now() - startTime,
      });
    } catch (err) {
      setResponse(
        '⚠️ Error connecting to inference engine. Is the model loaded?'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Terminal className="w-6 h-6 text-emerald-500" /> AI Playground
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            Test models in isolation — requests are NOT counted against tenant
            quotas.
          </p>
        </div>
        <Badge color="emerald" icon={Zap}>
          Isolated Environment
        </Badge>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Config Panel */}
        <div className="space-y-4">
          <Card className="bg-gray-900/60 border-gray-800 p-4 space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-800 pb-2">
              Model Settings
            </h3>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block font-semibold">
                LLM Engine
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-emerald-500"
              >
                {MODELS.map((m) => (
                  <option key={m} value={m}>
                    {MODEL_LABELS[m] || m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block font-semibold">
                Temperature: {temperature}
              </label>
              <input
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>Precise</span>
                <span>Creative</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block font-semibold">
                Max Tokens: {maxTokens}
              </label>
              <input
                type="range"
                min={256}
                max={8192}
                step={256}
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>
          </Card>

          {/* Stats */}
          {stats && (
            <Card className="bg-gray-900/60 border-gray-800 p-4 space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-800 pb-2">
                Run Stats
              </h3>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-gray-400">Latency:</span>
                <span className="text-white font-mono font-bold">
                  {stats.latencyMs >= 1000
                    ? `${(stats.latencyMs / 1000).toFixed(1)}s`
                    : `${stats.latencyMs}ms`}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Hash className="w-4 h-4 text-purple-400" />
                <span className="text-gray-400">Tokens In:</span>
                <span className="text-white font-mono">{stats.tokensIn}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Hash className="w-4 h-4 text-emerald-400" />
                <span className="text-gray-400">Tokens Out:</span>
                <span className="text-white font-mono">{stats.tokensOut}</span>
              </div>
            </Card>
          )}
        </div>

        {/* Chat Panel */}
        <div className="xl:col-span-2 space-y-4">
          <Card className="bg-gray-900/60 border-gray-800 p-4">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">
              System Prompt
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm text-gray-200 h-24 focus:outline-none focus:border-emerald-500 resize-none"
              placeholder="You are a helpful AI assistant..."
            />
          </Card>

          <Card className="bg-gray-900/60 border-gray-800 p-4">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">
              User Message
            </label>
            <div className="flex gap-3">
              <textarea
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey))
                    handleSend();
                }}
                className="flex-1 bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm text-gray-200 h-20 focus:outline-none focus:border-emerald-500 resize-none"
                placeholder="Type your message here... (Ctrl+Enter to send)"
              />
              <div className="flex flex-col gap-2">
                <Button
                  size="sm"
                  icon={Send}
                  onClick={handleSend}
                  loading={loading}
                  className="h-full"
                >
                  Send
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={RotateCcw}
                  onClick={() => {
                    setResponse('');
                    setStats(null);
                  }}
                />
              </div>
            </div>
          </Card>

          <Card className="bg-gray-900/60 border-gray-800 p-4">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">
              {loading ? (
                <span className="text-emerald-400 animate-pulse">
                  ● Streaming response...
                </span>
              ) : (
                'Response'
              )}
            </label>
            <div
              ref={responseRef}
              className="bg-gray-950 border border-gray-800 rounded-lg p-4 min-h-48 max-h-96 overflow-y-auto text-sm text-gray-200 whitespace-pre-wrap font-mono leading-relaxed"
            >
              {response || (
                <span className="text-gray-600">
                  Response will appear here...
                </span>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
