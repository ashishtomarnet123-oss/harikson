'use client';

import React, { useState } from 'react';
import {
  Globe,
  ChevronDown,
  RotateCw,
  LayoutDashboard,
  Bot,
  Database,
  GitBranch,
  BarChart2,
  Key,
  Blocks,
  Settings,
  Cpu,
  ShieldCheck,
  CreditCard,
  Award,
  Lock,
  FileText,
  Receipt,
  Search,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Share2,
  Check,
} from 'lucide-react';

export default function NeuravoltLightLandingPage() {
  const [activeDemoTab, setActiveDemoTab] = useState<'contract' | 'invoice' | 'policy' | 'customer'>('contract');

  return (
    <div className="min-h-screen bg-[#FAFAFC] text-slate-900 font-sans selection:bg-blue-500 selection:text-white">

      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 py-3.5">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center text-white font-extrabold text-base shadow-sm">
              N
            </div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900 font-['Outfit']">NEURAVOLT</span>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-600">
              🇮🇳 AI Cloud Platform
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a href="#platform" className="hover:text-blue-600 flex items-center gap-1 transition">Platform <ChevronDown className="w-3.5 h-3.5" /></a>
            <a href="#solutions" className="hover:text-blue-600 flex items-center gap-1 transition">Solutions <ChevronDown className="w-3.5 h-3.5" /></a>
            <a href="#developers" className="hover:text-blue-600 flex items-center gap-1 transition">Developers <ChevronDown className="w-3.5 h-3.5" /></a>
            <a href="#pricing" className="hover:text-blue-600 transition">Pricing</a>
            <a href="#resources" className="hover:text-blue-600 flex items-center gap-1 transition">Resources <ChevronDown className="w-3.5 h-3.5" /></a>
            <a href="#company" className="hover:text-blue-600 flex items-center gap-1 transition">Company <ChevronDown className="w-3.5 h-3.5" /></a>
          </nav>

          <div className="flex items-center gap-3">
            <button className="px-4 py-2 text-sm font-semibold text-slate-800 bg-white border border-slate-300 rounded-xl shadow-sm hover:bg-slate-50 transition">
              Book a Demo
            </button>
            <button className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-xl shadow-md shadow-blue-500/20 hover:bg-blue-700 transition">
              Start Free Trial
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="py-16 bg-gradient-to-b from-white to-[#FAFAFC]">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-5 space-y-5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-xs font-semibold text-blue-600">
              <Globe className="w-4 h-4" />
              <span>🇮🇳 India's AI Platform for Agents &amp; Automation</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight font-['Outfit']">
              AI That Works the <br />
              Way Your <span className="text-blue-600">Business Works</span>.
            </h1>

            <p className="text-base text-slate-600 leading-relaxed">
              From AI agents and workflow automation to agentic coding, multilingual AI chat, and knowledge management—everything works together in one platform.
            </p>

            <div className="flex flex-wrap gap-4 pt-1">
              {['DPDP Ready', 'Data Stays in India', 'Deploy in 5 Minutes'].map((item) => (
                <div key={item} className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                  <div className="w-4 h-4 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold text-[10px]">✓</div>
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="pt-3 space-y-2.5">
              <div className="flex items-center gap-3">
                <button className="px-6 py-3 text-sm font-semibold text-white bg-blue-600 rounded-xl shadow-md shadow-blue-500/25 hover:bg-blue-700 transition">
                  Start Free for 14 Days
                </button>
                <button className="px-6 py-3 text-sm font-semibold text-slate-800 bg-white border border-slate-300 rounded-xl shadow-sm hover:bg-slate-50 transition">
                  Book Live Demo
                </button>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>No credit card required</span>
                <span>•</span>
                <span>Talk to our India team</span>
              </div>
            </div>
          </div>

          {/* LIGHT HERO DASHBOARD PREVIEW */}
          <div className="lg:col-span-7">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">N</div>
                  <span className="text-xs font-bold text-slate-900">Dashboard</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <RotateCw className="w-3.5 h-3.5 cursor-pointer" />
                  <span>Welcome back! 👋</span>
                  <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-800 text-[11px] font-bold">TN</div>
                </div>
              </div>

              <div className="grid grid-cols-12 min-h-[380px]">
                <div className="col-span-3 bg-slate-50 border-r border-slate-200 p-3 space-y-1 text-xs">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 text-blue-600 font-bold"><LayoutDashboard className="w-3.5 h-3.5" /> Overview</div>
                  <div className="flex items-center gap-2 p-2 rounded-lg text-slate-600 hover:bg-slate-100"><Bot className="w-3.5 h-3.5" /> AI Agents</div>
                  <div className="flex items-center gap-2 p-2 rounded-lg text-slate-600 hover:bg-slate-100"><Database className="w-3.5 h-3.5" /> Knowledge</div>
                  <div className="flex items-center gap-2 p-2 rounded-lg text-slate-600 hover:bg-slate-100"><GitBranch className="w-3.5 h-3.5" /> Workflows</div>
                  <div className="flex items-center gap-2 p-2 rounded-lg text-slate-600 hover:bg-slate-100"><BarChart2 className="w-3.5 h-3.5" /> Analytics</div>
                  <div className="flex items-center gap-2 p-2 rounded-lg text-slate-600 hover:bg-slate-100"><Key className="w-3.5 h-3.5" /> API Keys</div>
                </div>

                <div className="col-span-9 p-5 bg-white space-y-4">
                  <div className="grid grid-cols-4 gap-2.5">
                    {[
                      { label: 'Total Agents', val: '24', trend: '↑ 18%' },
                      { label: 'Total Conversations', val: '128.4K', trend: '↑ 24%' },
                      { label: 'Knowledge Bases', val: '16', trend: '↑ 12%' },
                      { label: 'Success Rate', val: '98.6%', trend: '↑ 2.7%' },
                    ].map((s) => (
                      <div key={s.label} className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-sm">
                        <div className="text-[10px] text-slate-500 mb-1">{s.label}</div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm font-extrabold text-slate-900">{s.val}</span>
                          <span className="text-[9px] font-bold bg-green-100 text-green-700 px-1 rounded">{s.trend}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                      <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
                        <Cpu className="w-3.5 h-3.5 text-blue-600" /> AI Agent Builder
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-center gap-1 mt-3">
                        <div className="bg-white border p-1 rounded font-semibold">Query</div>
                        <div className="text-blue-600 font-bold">→</div>
                        <div className="bg-blue-50 text-blue-600 border border-blue-200 p-1 rounded font-semibold">Knowledge</div>
                        <div className="text-blue-600 font-bold">→</div>
                        <div className="bg-purple-50 text-purple-600 border border-purple-200 p-1 rounded font-semibold">LLM</div>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col justify-between">
                      <div className="text-xs font-bold text-slate-700 mb-1">Live Agent Preview</div>
                      <div className="bg-slate-100 rounded p-1.5 text-[10px] text-slate-800">
                        Hello! How can I help you today?
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded p-1.5 text-[10px] text-blue-800 mt-1">
                        Agreement summary generated. 12 months duration.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST BADGES STRIP */}
      <section className="py-8 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center text-xs font-bold uppercase tracking-wider text-slate-400 mb-5">
            Trusted by businesses across India
          </div>
          <div className="flex flex-wrap items-center justify-center gap-8 text-xs font-bold text-slate-800">
            <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-green-600" /> DPDP COMPLIANT</div>
            <div>Built in <strong>INDIA</strong> 🇮🇳</div>
            <div className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-blue-600" /> <strong>Razorpay</strong> SECURE</div>
            <div className="flex items-center gap-2"><Award className="w-4 h-4 text-blue-600" /> ISO CERTIFIED</div>
            <div className="flex items-center gap-2"><Lock className="w-4 h-4 text-blue-600" /> SOC 2 READY</div>
            <div>🚀 Startup <strong>India</strong></div>
          </div>
        </div>
      </section>

      {/* INTERACTIVE DEMO SECTION */}
      <section id="platform" className="py-20 bg-[#FAFAFC]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="text-3xl font-extrabold text-slate-900 font-['Outfit']">Try an AI Agent ✨</h2>
            <p className="text-slate-600 text-sm mt-2">Experience the power of Neuravolt AI Agents. No signup. No credit card. Just try.</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xl shadow-slate-200/40">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-5 flex flex-col gap-2.5">
                {[
                  { id: 'contract', icon: FileText, label: 'Summarize this contract' },
                  { id: 'invoice', icon: Receipt, label: 'Generate invoice' },
                  { id: 'policy', icon: Search, label: 'Search company policy' },
                  { id: 'customer', icon: MessageSquare, label: 'Answer customer query' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveDemoTab(item.id as any)}
                    className={`flex items-center gap-3 p-4 rounded-xl text-left font-semibold text-sm transition ${
                      activeDemoTab === item.id
                        ? 'bg-blue-50 border border-blue-200 text-blue-600 shadow-sm'
                        : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <item.icon className="w-4 h-4 text-blue-600" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>

              <div className="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col justify-between min-h-[300px]">
                <div>
                  <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg text-xs text-blue-700 font-semibold mb-4">
                    <span className="bg-red-500 text-white font-extrabold text-[10px] px-1.5 py-0.5 rounded">PDF</span>
                    <span>Service_Agreement.pdf • 2.4 MB • 12 pages</span>
                  </div>

                  <div className="flex justify-end mb-4">
                    <div className="bg-blue-600 text-white font-semibold px-4 py-2 rounded-2xl text-xs shadow-sm">
                      Summarize this contract
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-4 text-xs text-slate-800 shadow-sm space-y-2">
                    <div className="font-bold text-slate-900 text-sm">Here is a summary of the contract:</div>
                    <ul className="list-disc pl-5 space-y-1 text-slate-600">
                      <li><strong>Agreement between ABC Corp and XYZ Pvt. Ltd.</strong></li>
                      <li><strong>Duration:</strong> 12 months from 1 May 2024</li>
                      <li><strong>Scope:</strong> Supply of software licenses</li>
                      <li><strong>Payment Terms:</strong> 30 days from invoice date</li>
                    </ul>
                  </div>
                </div>

                <div className="text-center text-[11px] text-slate-400 mt-4">
                  Responses are AI generated and for demo only.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL BLUE CTA BANNER */}
      <section className="max-w-7xl mx-auto px-6 mb-16">
        <div className="bg-gradient-to-r from-blue-700 to-blue-800 rounded-2xl p-12 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl shadow-blue-600/20">
          <div>
            <h2 className="text-3xl font-extrabold mb-2 font-['Outfit']">Ready to Build the Future with AI?</h2>
            <p className="text-blue-100 text-sm max-w-lg">Join thousands of Indian businesses building secure and compliant AI applications with Neuravolt.</p>
            <div className="flex gap-3 mt-6">
              <button className="px-6 py-3 bg-white text-blue-600 font-bold rounded-xl text-sm shadow hover:bg-slate-50 transition">
                Start Free for 14 Days
              </button>
              <button className="px-6 py-3 bg-transparent border border-blue-200 text-white font-bold rounded-xl text-sm hover:bg-white/10 transition">
                Book Live Demo
              </button>
            </div>
          </div>
          <div className="space-y-2 text-xs font-semibold text-blue-200">
            <div>✓ No Credit Card</div>
            <div>✓ Deploy in 5 Minutes</div>
            <div>✓ Cancel Anytime</div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-10 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>© 2025 Neuravolt Technologies Pvt. Ltd. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <span>🇮🇳 Made in India</span>
            <span>🌐 English</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
