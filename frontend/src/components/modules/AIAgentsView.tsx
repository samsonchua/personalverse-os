import React, { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { Bot, Send, Sparkles, User, CheckCircle2 } from 'lucide-react';
import { api } from '../../api/client';
import { AIChatMessage } from '../../types';
import { useAuth } from '../../context/AuthContext';

const AGENTS = [
  { id: 'ceo_agent', name: 'CEO Agent', role: 'Executive Life Strategist', avatar: '👑', desc: 'Provides high-level alignment across finance, health, career, and productivity goals.' },
  { id: 'finance_agent', name: 'Finance Coach', role: 'Chief Financial Officer', avatar: '💎', desc: 'Analyzes spending, net worth trends, investments, and capital reserve allocation.' },
  { id: 'dev_agent', name: 'Developer Agent', role: 'Lead Architect', avatar: '⚡', desc: 'Evaluates systems design, software engineering roadmaps, and tech stack decisions.' },
  { id: 'health_coach', name: 'Health Coach', role: 'Biohacking & Performance', avatar: '🏋️', desc: 'Monitors workout routines, nutrition, HRV, and sleep recovery stats.' },
  { id: 'meeting_assistant', name: 'Meeting Assistant', role: 'Summarizer & Tasks', avatar: '📝', desc: 'Extracts concise action items and decisions from raw meeting transcripts.' },
  { id: 'research_agent', name: 'Research Agent', role: 'NotebookLM Specialist', avatar: '🧠', desc: 'Synthesizes books, research papers, and Second Brain notes into actionable graphs.' },
];

export const AIAgentsView: React.FC = () => {
  const { user } = useAuth();
  const firstName = (user?.full_name || 'there').split(' ')[0];
  const [activeAgent, setActiveAgent] = useState(AGENTS[0]);
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      id: 'init-1',
      sender: 'agent',
      agent_id: AGENTS[0].id,
      text: `Welcome ${firstName}! I am the ${AGENTS[0].name}. What strategic directive or life domain analysis would you like to explore today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: AIChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: input,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    const promptText = input;
    setInput('');
    setLoading(true);

    try {
      const res = await api.sendAIChat(activeAgent.id, promptText);
      const agentMsg: AIChatMessage = {
        id: `a-${Date.now()}`,
        sender: 'agent',
        agent_id: activeAgent.id,
        text: res.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, agentMsg]);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-extrabold text-white">Autonomous Multi-Agent AI Swarm</h2>
        <p className="text-xs text-slate-400">Specialized domain AI agents connected to your universal Life Graph</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent Persona Selector Grid */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Available AI Personas</h3>
          {AGENTS.map((agent) => (
            <GlassCard
              key={agent.id}
              onClick={() => setActiveAgent(agent)}
              className={`p-3.5 border transition-all ${
                activeAgent.id === agent.id ? 'border-cyan-500 bg-cyan-950/20' : 'border-white/5'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{agent.avatar}</span>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-white text-sm">{agent.name}</h4>
                    {activeAgent.id === agent.id && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
                  </div>
                  <p className="text-xs text-slate-400">{agent.role}</p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Dedicated Chat Window */}
        <GlassCard className="lg:col-span-2 h-[600px] flex flex-col p-0 overflow-hidden border-cyan-500/20">
          {/* Agent Top Header */}
          <div className="p-4 border-b border-white/10 bg-slate-900/80 flex items-center space-x-3">
            <span className="text-3xl">{activeAgent.avatar}</span>
            <div>
              <h3 className="font-bold text-white text-base">{activeAgent.name}</h3>
              <p className="text-xs text-slate-400">{activeAgent.role} • {activeAgent.desc}</p>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-sm ${
                    m.sender === 'user'
                      ? 'bg-cyan-600 text-white rounded-br-none shadow-lg shadow-cyan-600/20'
                      : 'bg-slate-900/90 text-slate-100 border border-white/10 rounded-bl-none'
                  }`}
                >
                  <div className="whitespace-pre-wrap leading-relaxed">{m.text}</div>
                  <span className="block text-[10px] opacity-60 text-right mt-1.5">{m.timestamp}</span>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center space-x-2 text-xs text-slate-400 p-2">
                <Bot className="w-4 h-4 animate-spin text-cyan-400" />
                <span>{activeAgent.name} is processing Life Graph context...</span>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSend} className="p-3 border-t border-white/10 bg-slate-900/90 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Consult ${activeAgent.name}...`}
              className="flex-1 glass-input px-4 py-2.5 rounded-xl text-sm"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-xl text-xs hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </GlassCard>
      </div>
    </div>
  );
};
