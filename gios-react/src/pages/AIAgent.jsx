import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, Send, Sparkles, Activity, Layers, Droplet, 
  Droplets, Flame, Radio, Download, Trash2, ArrowRight, 
  MapPin, CheckCircle2, ShieldCheck, RefreshCw, Cpu, User, FileText,
  BrainCircuit, Compass, Globe, Search, ExternalLink, BarChart3, Lightbulb, AlertTriangle
} from 'lucide-react';
import giosApi from '../api/giosApi';
import { useNavigate } from 'react-router-dom';
import useJarvisStore from '../store/jarvisStore';
import MetallicPaintText from '../components/ReactBits/MetallicPaintText';

const QUICK_PROMPTS = [
  "What are the latest flood warnings in Texas?",
  "Research satellite-based dam seepage monitoring papers",
  "Compare anomaly readings across all 4 hazard sites",
  "Mark San Luis Dam and analyze its seepage",
  "Explain how NDMI detects moisture anomalies",
  "What do you remember about me?"
];

export default function AIAgent() {
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const { 
    messages, 
    loading, 
    memoryNotes, 
    markedLocations, 
    sendMessage, 
    clearChat,
    initSSE
  } = useJarvisStore();

  const [input, setInput] = useState('');
  const [activeEventFilter, setActiveEventFilter] = useState(null);
  const [exportingId, setExportingId] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    const cleanupSSE = initSSE();
    return () => {
      if (cleanupSSE) cleanupSSE();
    };
  }, [initSSE]);

  const handleSend = (customText = null) => {
    const query = (customText || input).trim();
    if (!query || loading) return;
    setInput('');
    sendMessage(query, (targetPath) => {
      navigate(targetPath);
    });
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Quick action: export PDF
  const handleExportPDF = async (metric = 'ndmi') => {
    try {
      setExportingId(true);
      const res = await giosApi.get(`/api/v1/reports/pdf?bbox=-121.08,37.05,-121.06,37.065&index_type=${metric}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `GIOS_Executive_Dossier_${metric.toUpperCase()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      console.error(e);
    } finally {
      setExportingId(false);
    }
  };

  return (
    <div className="p-8 h-full flex flex-col gap-6 text-gray-200 w-full relative z-10 overflow-hidden font-sans">
      
      {/* Sleek Frosted Glass Header */}
      <header className="flex justify-between items-center bg-white/[0.03] backdrop-blur-xl border border-white/10 px-6 py-4 rounded-2xl shrink-0 shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary/30 to-secondary/20 border border-primary/40 flex items-center justify-center text-primary shadow-[0_0_18px_rgba(0,255,170,0.3)]">
            <Bot size={22} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-['Orbitron'] font-bold text-white tracking-wider flex items-center gap-2">
              <MetallicPaintText text="JARVIS" glow='var(--color-primary)' />
              <span className="text-xs text-primary font-mono font-normal tracking-widest px-2 py-0.5 rounded bg-primary/10 border border-primary/30">
                AUTONOMOUS COPILOT
              </span>
            </h1>
            <p className="text-xs text-gray-400 font-medium mt-0.5">
              Persistent Memory Active • Autonomous Map Pinning & Tab Navigation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {markedLocations.length > 0 && (
            <div className="flex items-center gap-2 text-xs bg-teal-500/10 border border-teal-500/30 text-teal-300 px-3 py-1.5 rounded-full font-mono">
              <MapPin size={12} className="animate-bounce" />
              <span>{markedLocations.length} Pinned</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs bg-black/40 border border-white/10 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span className="text-gray-300 font-mono">JARVIS Core Online</span>
          </div>

          <button 
            onClick={clearChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 hover:border-red-400/40 text-gray-400 hover:text-red-400 text-xs bg-white/[0.02] hover:bg-red-500/10 transition-all"
          >
            <Trash2 size={13} /> Clear Chat
          </button>

          <button 
            onClick={async () => {
              try {
                await giosApi.post('/api/v1/agent/trigger-mock-alert');
              } catch (e) {
                console.error('Mock alert failed', e);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-500/30 hover:border-amber-400/60 text-amber-400 hover:text-amber-300 text-xs bg-amber-500/10 hover:bg-amber-500/20 transition-all"
          >
            <AlertTriangle size={13} /> Simulate Alert
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-hidden">
        
        {/* Left Telemetry Highlights Card */}
        <div className="hidden lg:flex flex-col gap-4 bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-5 rounded-2xl overflow-y-auto shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
          
          {/* Memory Section */}
          <div className="border-b border-white/10 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400 font-mono flex items-center gap-2">
              <BrainCircuit size={14} /> JARVIS Memory Bank
            </h3>
            <p className="text-[11px] text-gray-400 mt-1">
              Conversations, user facts, and pinned sites are automatically retained across sessions.
            </p>

            {memoryNotes && memoryNotes.length > 0 ? (
              <div className="mt-2.5 space-y-1.5">
                {memoryNotes.map((note, idx) => (
                  <div key={idx} className="text-[11px] font-mono text-teal-300 bg-teal-500/10 border border-teal-500/20 px-2.5 py-1 rounded-lg">
                    • {note}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[10px] text-gray-500 font-mono mt-2 italic">
                No personal notes saved yet. Tell JARVIS your name or what to remember!
              </div>
            )}
          </div>

          {/* Autonomous Map Pins */}
          {markedLocations.length > 0 && (
            <div className="border-b border-white/10 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-secondary font-mono flex items-center gap-2">
                <MapPin size={14} /> Marked Map Locations ({markedLocations.length})
              </h3>
              <div className="mt-2 space-y-1.5 max-h-28 overflow-y-auto">
                {markedLocations.map((m) => (
                  <div 
                    key={m.id}
                    onClick={() => navigate('/map')}
                    className="p-2 rounded-lg bg-black/40 border border-teal-500/20 text-xs font-mono cursor-pointer hover:border-teal-400 transition-colors flex justify-between items-center"
                  >
                    <span className="text-white truncate max-w-[140px]">{m.label}</span>
                    <ArrowRight size={12} className="text-teal-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Target Hazard Quick Taps */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400 font-mono mb-2 flex items-center gap-2">
              <Activity size={14} /> Hazard Locations
            </h3>
            <div className="flex flex-col gap-2">
              {[
                { id: 'SEEPAGE-01', name: 'San Luis Dam', tag: 'Toe Seepage', icon: <Droplet size={14} className="text-red-400" /> },
                { id: 'HAB-02', name: 'Lake Erie', tag: 'Cyanobacteria', icon: <Flame size={14} className="text-emerald-400" /> },
                { id: 'INUNDATION-03', name: 'Brazos River', tag: 'Flood Pulse', icon: <Droplets size={14} className="text-cyan-400" /> },
                { id: 'TAILINGS-04', name: 'Silver Bell Mine', tag: 'Tailings Saturation', icon: <Radio size={14} className="text-purple-400" /> }
              ].map(site => {
                const isActive = activeEventFilter === site.id;
                return (
                  <button
                    key={site.id}
                    onClick={() => {
                      setActiveEventFilter(isActive ? null : site.id);
                      handleSend(`Analyze ${site.name} and mark it on the map`);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                      isActive 
                        ? 'bg-teal-500/15 border-teal-400/50 text-white shadow-[0_0_15px_rgba(0,255,170,0.15)]' 
                        : 'bg-white/[0.02] border-white/5 hover:border-white/20 text-gray-300 hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {site.icon}
                      <div>
                        <div className="text-xs font-semibold">{site.name}</div>
                        <div className="text-[10px] text-gray-400">{site.tag}</div>
                      </div>
                    </div>
                    <Compass size={14} className="text-teal-400 hover:scale-125 transition-transform" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Quick Controls */}
          <div className="mt-auto pt-4 border-t border-white/10 space-y-2">
            <button 
              onClick={() => navigate('/map')}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-semibold transition-all"
            >
              <MapPin size={13} /> Switch to Map Explorer
            </button>
            <button 
              onClick={() => handleExportPDF('ndmi')}
              disabled={exportingId}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-gray-300 text-xs transition-all disabled:opacity-50"
            >
              <Download size={13} /> {exportingId ? 'Exporting...' : 'Export Dossier PDF'}
            </button>
          </div>
        </div>

        {/* Chat Stream (Glass UI Messenger) */}
        <div className="lg:col-span-3 flex flex-col bg-white/[0.02] backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.37)]">
          
          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={msg.id}
                  className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {/* Assistant Avatar */}
                  {!isUser && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-500/30 to-cyan-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300 shrink-0 shadow-[0_0_10px_rgba(0,255,170,0.2)] mt-1">
                      <Bot size={16} />
                    </div>
                  )}

                  <div className={`max-w-2xl flex flex-col gap-1.5 ${isUser ? 'items-end' : 'items-start'}`}>
                    
                    {/* Thinking Trace (shows what tools JARVIS called) */}
                    {!isUser && msg.thinking && (
                      <div className="flex items-center gap-1.5 mb-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[10px] font-mono">
                        <Lightbulb size={10} className="shrink-0" />
                        <span className="truncate max-w-[400px]">{msg.thinking}</span>
                      </div>
                    )}

                    {/* Subtle Micro-Pills for Tool Executions */}
                    {!isUser && msg.toolCalls && msg.toolCalls.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-1">
                        {msg.toolCalls.map((t, idx) => {
                          const toolLabels = {
                            'get_hazard_event': '🛰️ Hazard Lookup',
                            'compute_spectral_index': `📊 ${t.output?.index || 'Spectral'} Index`,
                            'query_usgs_stream': `🌊 USGS #${t.args?.site_id || ''}`,
                            'query_usgs_streamflow': `🌊 USGS #${t.args?.site_id || ''}`,
                            'generate_spatial_buffer': `🌐 ${t.output?.radius_km || '2.5'}km Buffer`,
                            'web_search': `🔍 Web Search`,
                            'read_webpage': `📄 Page Read`,
                            'analyze_gios_data': `📈 Data Analysis`,
                            'mark_map_location': `📍 Map Pin`,
                            'navigate_to_tab': `🧭 Tab Switch`,
                            'save_memory': `🧠 Memory Saved`,
                            'recall_memory': `🧠 Memory Recall`
                          };
                          const label = toolLabels[t.tool] || t.tool;
                          return (
                            <span 
                              key={idx} 
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-teal-500/10 border border-teal-500/25 text-teal-300 backdrop-blur-md"
                            >
                              {label}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Chat Bubble with Smooth Glass Styling */}
                    <div 
                      className={`px-5 py-4 text-[14px] leading-relaxed transition-all shadow-md ${
                        isUser 
                          ? 'bg-gradient-to-r from-teal-500/25 to-teal-600/20 backdrop-blur-xl border border-teal-400/35 text-teal-50 rounded-2xl rounded-br-sm' 
                          : msg.isProactiveAlert
                            ? 'bg-red-950/60 backdrop-blur-3xl border-2 border-red-500/60 shadow-[0_0_40px_rgba(239,68,68,0.3)] text-red-50 rounded-2xl rounded-bl-sm animate-pulse-slow'
                            : 'bg-[#121A26]/80 backdrop-blur-2xl border border-white/10 text-gray-100 rounded-2xl rounded-bl-sm shadow-[0_4px_24px_rgba(0,0,0,0.25)]'
                      }`}
                    >
                      <div className="whitespace-pre-wrap font-sans font-normal selection:bg-teal-500/30">
                        {msg.content}
                      </div>

                      {/* Web Search Source Citations */}
                      {!isUser && msg.sources && msg.sources.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-white/10">
                          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 mb-2">
                            <Globe size={11} /> Sources ({msg.sources.length})
                          </div>
                          <div className="flex flex-col gap-1.5">
                            {msg.sources.slice(0, 5).map((src, idx) => (
                              <a 
                                key={idx}
                                href={src.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-start gap-2 p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-cyan-500/30 transition-all group"
                              >
                                <ExternalLink size={11} className="text-cyan-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-[11px] font-medium text-cyan-200 truncate">{src.title}</div>
                                  <div className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">{src.snippet}</div>
                                </div>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Data Analysis Summary */}
                      {!isUser && msg.dataAnalysis && (
                        <div className="mt-4 pt-3 border-t border-white/10">
                          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 mb-2">
                            <BarChart3 size={11} /> Data Analysis
                          </div>
                          <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-[11px] font-mono text-emerald-200">
                            {msg.dataAnalysis.total_events && (
                              <div>Events analyzed: {msg.dataAnalysis.total_events}</div>
                            )}
                            {msg.dataAnalysis.highest_anomaly && (
                              <div>Highest anomaly: {msg.dataAnalysis.highest_anomaly.title} ({msg.dataAnalysis.highest_anomaly.zscore})</div>
                            )}
                            {msg.dataAnalysis.mean_zscore && (
                              <div>Mean z-score: {msg.dataAnalysis.mean_zscore}</div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Interactive Action Buttons inside assistant text back */}
                      {!isUser && (msg.mapAction || msg.navigation) && (
                        <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap gap-2">
                          <button 
                            onClick={() => navigate('/map')}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-teal-500/20 hover:bg-teal-500/35 border border-teal-400/50 text-teal-300 transition-colors shadow-sm"
                          >
                            <MapPin size={12} /> View Pin on Map
                          </button>
                          <button 
                            onClick={() => handleExportPDF('ndmi')}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-gray-300 transition-colors"
                          >
                            <FileText size={12} /> Download PDF Briefing
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="text-[10px] text-gray-400 font-mono px-2">
                      {msg.timestamp}
                    </div>
                  </div>

                  {/* User Avatar */}
                  {isUser && (
                    <div className="w-8 h-8 rounded-full bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300 shrink-0 font-mono text-xs font-bold mt-1 shadow-sm">
                      OP
                    </div>
                  )}
                </motion.div>
              );
            })}

            {/* Smooth Bouncing Dots Typing Indicator */}
            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3.5 items-center">
                <div className="w-8 h-8 rounded-full bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shrink-0">
                  <Bot size={16} />
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-[#121A26]/80 backdrop-blur-xl border border-white/10 flex flex-col gap-1.5 shadow-md">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce"></span>
                    <span className="text-xs text-gray-400 ml-2 font-mono">JARVIS is reasoning, searching & analyzing...</span>
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono flex items-center gap-1">
                    <BrainCircuit size={10} className="text-amber-400 animate-pulse" />
                    LLM Agent Loop Active — executing tools & synthesizing
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions Chips */}
          <div className="px-6 py-2.5 bg-black/20 border-t border-white/5 flex items-center gap-2 overflow-x-auto shrink-0">
            <span className="text-[10px] font-mono text-gray-500 uppercase shrink-0 flex items-center gap-1">
              <Sparkles size={11} className="text-teal-400" /> Prompts:
            </span>
            {QUICK_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(p)}
                disabled={loading}
                className="px-3 py-1 rounded-full bg-white/[0.03] hover:bg-teal-500/15 border border-white/10 hover:border-teal-400/40 text-gray-300 hover:text-teal-200 text-xs transition-all whitespace-nowrap shrink-0"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input Glass Bar */}
          <div className="p-4 border-t border-white/10 bg-black/30 backdrop-blur-lg shrink-0">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex items-center gap-3 bg-white/[0.04] border border-white/15 focus-within:border-teal-400/60 focus-within:ring-1 focus-within:ring-teal-400/50 rounded-2xl px-5 py-2.5 transition-all shadow-inner"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask JARVIS... (e.g. 'Show me the seepage at San Luis Dam and mark it on the map')"
                className="flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-400 outline-none font-sans py-1 leading-normal"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="w-8 h-8 rounded-xl bg-teal-400 hover:bg-teal-300 disabled:opacity-30 text-accent flex items-center justify-center font-bold transition-all shadow-[0_0_12px_rgba(0,255,170,0.3)] shrink-0"
              >
                <Send size={15} />
              </button>
            </form>
          </div>

        </div>
      </div>

    </div>
  );
}
