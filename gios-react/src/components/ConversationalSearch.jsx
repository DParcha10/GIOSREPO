import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Map, Calendar, Activity } from 'lucide-react';

const ConversationalSearch = () => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setIsSearching(true);
    // Simulate natural language parsing delay
    setTimeout(() => {
      setIsSearching(false);
      // In a real app, this would trigger the actual map/data update
    }, 1500);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="w-full max-w-3xl mx-auto mt-12 mb-8 relative z-10"
    >
      <div className="glass-panel p-6 rounded-3xl">
        <h2 className="text-2xl font-light mb-4 text-stone-100 flex items-center gap-3">
          <Activity className="text-emerald-400" size={28} />
          What would you like to analyze?
        </h2>
        
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex items-center bg-[rgba(10,15,20,0.5)] rounded-full border border-[rgba(115,200,169,0.2)] overflow-hidden focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-[#73c8a9] transition-all duration-300">
            <div className="pl-6 text-stone-500">
              <Search size={20} />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., 'Show me the seepage risk in Miami over the last 30 days'"
              className="w-full bg-transparent border-none py-4 px-4 text-lg text-stone-100 placeholder-[#95a5a6] focus:outline-none"
            />
            <button 
              type="submit"
              disabled={isSearching}
              className="bg-emerald-600 hover:bg-emerald-500 text-stone-50 px-8 py-4 font-semibold transition-colors duration-300 disabled:opacity-50"
            >
              {isSearching ? 'Parsing...' : 'Analyze'}
            </button>
          </div>
        </form>

        {/* Suggestion Chips */}
        <div className="mt-6 flex flex-wrap gap-3">
          <span className="text-sm text-stone-500 py-2">Try:</span>
          {[
            { icon: <Activity size={14} />, text: "Algal bloom risk near Lake Erie" },
            { icon: <Map size={14} />, text: "Compare NDMI for California coast" },
            { icon: <Calendar size={14} />, text: "Flooding events in 2025" }
          ].map((suggestion, idx) => (
            <button 
              key={idx}
              onClick={() => setQuery(suggestion.text)}
              className="flex items-center gap-2 text-sm bg-[rgba(55,59,68,0.4)] hover:bg-[rgba(115,200,169,0.2)] text-stone-100 py-2 px-4 rounded-full border border-transparent hover:border-emerald-600 transition-all duration-300"
            >
              {suggestion.icon}
              {suggestion.text}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default ConversationalSearch;
