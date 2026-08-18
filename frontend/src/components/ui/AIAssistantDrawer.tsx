import React, { useState } from 'react';
import { GlassCard } from './GlassCard';
import { Bot, Send, X, Sparkles, ChevronRight, User } from 'lucide-react';
import { api } from '../../api/client';
import { AIChatMessage } from '../../types';
import { useAuth } from '../../context/AuthContext';

const AGENT_LIST = [
  { id: 'ceo_agent', name: 'CEO Agent', role: 'Executive Strategist', avatar: '👑' },
  { id: 'finance_agent', name: 'Finance Coach', role: 'Chief Financial Officer', avatar: '💎' },
  { id: 'dev_agent', name: 'Developer Agent', role: 'Lead Architect', avatar: '⚡' },
  { id: 'health_coach', name: 'Health Coach', role: 'Biohacking & Fitness', avatar: '🏋️' },
  { id: 'meeting_assistant', name: 'Meeting Assistant', role: 'Summarizer & Tasks', avatar: '📝' },
  { id: 'research_agent', name: 'Research Agent', role: 'NotebookLM & Wiki', avatar: '🧠' },
];

export const AIAssistantDrawer: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const firstName = (user?.full_name || 'there').split(' ')[0];
  const [selectedAgent, setSelectedAgent] = useState(AGENT_LIST[0]);
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      id: 'init-1',
      sender: 'agent',
      agent_id: AGENT_LIST[0].id,
      text: `Hello ${firstName}! I am your ${AGENT_LIST[0].name}. How can I assist with your strategy, finance, or projects today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: AIChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: input,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    const currentInput = input;
    setInput('');
    setLoading(true);

    try {
      const res = await api.sendAIChat(selectedAgent.id, currentInput);
      const agentMsg: AIChatMessage = {
        id: `res-${Date.now()}`,
        sender: 'agent',
        agent_id: selectedAgent.id,
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
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[var(--bg-primary)]/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl flex flex-col transition-all duration-300">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-900/60">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">PersonalVerse AI Suite</h3>
            <p className="text-xs text-slate-400">Autonomous Multi-Agent Swarm</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Agent Selector Bar */}
      <div className="flex overflow-x-auto p-2 border-b border-white/10 bg-slate-950/40 gap-1.5 scrollbar-thin">
        {AGENT_LIST.map((agent) => (
          <button
            key={agent.id}
            onClick={() => setSelectedAgent(agent)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedAgent.id === agent.id
                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <span>{agent.avatar}</span>
            <span>{agent.name}</span>
          </button>
        ))}
      </div>

      {/* Selected Agent Persona Header */}
      <div className="px-4 py-2 bg-gradient-to-r from-cyan-950/40 to-slate-900/40 border-b border-white/5 flex items-center justify-between text-xs text-cyan-300">
        <div className="flex items-center space-x-2">
          <span>{selectedAgent.avatar}</span>
          <span className="font-bold">{selectedAgent.name}</span>
          <span className="text-slate-400">({selectedAgent.role})</span>
        </div>
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl p-3.5 text-sm ${
                msg.sender === 'user'
                  ? 'bg-cyan-600 text-white rounded-br-none shadow-md shadow-cyan-600/20'
                  : 'bg-slate-800/90 text-slate-100 border border-white/10 rounded-bl-none'
              }`}
            >
              {msg.sender === 'agent' && (
                <div className="flex items-center space-x-1.5 text-xs text-cyan-400 font-bold mb-1">
                  <span>{selectedAgent.avatar}</span>
                  <span>{selectedAgent.name}</span>
                </div>
              )}
              <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
              <span className="block text-[10px] opacity-60 text-right mt-1.5">{msg.timestamp}</span>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800/90 border border-white/10 rounded-2xl p-3.5 text-xs text-slate-400 flex items-center space-x-2">
              <Bot className="w-4 h-4 animate-spin text-cyanAccent" />
              <span>{selectedAgent.name} is thinking & analyzing graph relationships...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Field */}
      <form onSubmit={handleSend} className="p-3 border-t border-white/10 bg-slate-900/90 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask ${selectedAgent.name}...`}
          className="flex-1 glass-input px-4 py-2.5 rounded-xl text-sm"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold hover:from-cyan-400 hover:to-blue-500 transition-all disabled:opacity-50 flex items-center justify-center shadow-lg shadow-cyan-500/20"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
