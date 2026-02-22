"use client";

import { useState, useEffect } from "react";
import { Search, Instagram, X, Clock, Map, Target, Zap } from "lucide-react";

const MAX_HISTORY = 5;

interface ReconPanelProps {
  hideHeader?: boolean;
}

export default function ReconPanel({ hideHeader }: ReconPanelProps) {
  // State
  const [query, setQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // Load search history on mount
  useEffect(() => {
    const saved = localStorage.getItem('reconSearchHistory');
    if (saved) {
      setSearchHistory(JSON.parse(saved));
    }
  }, []);

  const saveToHistory = (searchQuery: string) => {
    const newHistory = [
      searchQuery,
      ...searchHistory.filter(q => q !== searchQuery) // Remove duplicates
    ].slice(0, MAX_HISTORY); // Keep only last 5

    setSearchHistory(newHistory);
    localStorage.setItem('reconSearchHistory', JSON.stringify(newHistory));
  };

  const handleSearch = (e?: React.FormEvent, searchQuery?: string) => {
    e?.preventDefault();
    const finalQuery = searchQuery || query;
    if (!finalQuery.trim()) return;

    // Save to history
    saveToHistory(finalQuery);

    // Show modal
    setShowModal(true);

    // Open Instagram after brief delay for UX
    setTimeout(() => {
      const searchUrl = `https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(finalQuery)}`;
      window.open(searchUrl, '_blank');

      // Auto-close modal after opening
      setTimeout(() => setShowModal(false), 500);
    }, 800);
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('reconSearchHistory');
  };

  const quickExamples = ["music producer miami", "techno dj berlin", "hip hop artist atlanta", "edm producer la"];

  return (
    <>
      <div className="editorial-panel p-0 min-h-[400px] flex flex-col h-full overflow-hidden">
        {/* Header - Hidden if controlled by parent */}
        {!hideHeader && (
          <div className="p-4 border-b border-border bg-black/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-brand-purple" />
              <h2 className="font-display text-[10px] uppercase tracking-widest text-white">Target Recon</h2>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter">Live Intel</span>
            </div>
          </div>
        )}

        {/* Search Bar Container */}
        <div className="p-6 bg-gradient-to-b from-black/20 to-transparent">
          <form onSubmit={handleSearch} className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-gray-600 group-focus-within:text-brand-purple transition-colors" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Instagram profiles or locations..."
              className="w-full bg-black/40 border border-white/5 rounded-[8px] pl-12 pr-24 py-3 text-xs font-sans text-white focus:outline-none focus:border-brand-purple/40 focus:bg-black/60 transition-all placeholder:text-gray-600 shadow-inner"
            />
            <button
              type="submit"
              className="absolute right-2 top-1.5 bottom-1.5 px-4 bg-brand-purple hover:bg-brand-purple-hover text-white text-[10px] font-bold uppercase tracking-widest rounded-[4px] transition-all shadow-lg shadow-brand-purple/20 active:scale-95"
            >
              Scan
            </button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-8 scrollbar-thin scrollbar-thumb-white/5">
          {/* Recent Searches */}
          {searchHistory.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-gray-600" />
                  <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Historical Operations</p>
                </div>
                <button
                  onClick={clearHistory}
                  className="text-[9px] text-gray-700 hover:text-red-400 font-bold uppercase transition-colors"
                >
                  Purge
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {searchHistory.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setQuery(item);
                      handleSearch(undefined, item);
                    }}
                    className="px-3 py-1.5 bg-white/5 hover:bg-brand-purple/10 border border-white/5 hover:border-brand-purple/20 rounded-[4px] text-[10px] text-gray-400 hover:text-brand-purple transition-all"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Examples */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Map className="w-3 h-3 text-gray-600" />
              <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Strategic Suggestions</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {quickExamples.map((example) => (
                <button
                  key={example}
                  onClick={() => {
                    setQuery(example);
                    handleSearch(undefined, example);
                  }}
                  className="flex items-center justify-between p-3 bg-black/20 hover:bg-white/[0.03] border border-white/5 rounded-[6px] text-[10px] text-gray-500 hover:text-white transition-all group/example"
                >
                  <span className="truncate pr-2 italic opacity-80 group-hover/example:opacity-100">"{example}"</span>
                  <Instagram className="w-3 h-3 text-gray-800 group-hover/example:text-pink-500/50 transition-colors" />
                </button>
              ))}
            </div>
          </div>

          {/* Empty State Illustration */}
          {searchHistory.length === 0 && (
            <div className="flex flex-col items-center justify-center text-gray-600 space-y-4 py-8 opacity-20">
              <div className="relative">
                <Instagram className="w-16 h-16" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-brand-purple/20 rounded-full animate-ping" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-xs font-bold uppercase tracking-widest">Zero Intel Points</p>
                <p className="text-[10px] max-w-[180px] leading-relaxed">Establish a search query above to begin social perimeter scanning.</p>
              </div>
            </div>
          )}
        </div>

        {/* Intelligence Footer */}
        <div className="p-4 bg-black/40 border-t border-border flex items-center gap-3">
          <div className="p-2 bg-brand-purple/10 rounded-full">
            <Zap className="w-3 h-3 text-brand-purple" />
          </div>
          <p className="text-[9px] text-gray-500 font-sans leading-tight">
            Target Recon uses deep-link protocols to bypass browser limitations and provide immediate profile access.
          </p>
        </div>
      </div>

      {/* Search Transition Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center animate-in fade-in duration-300">
          <div className="bg-gradient-to-br from-brand-purple/10 to-black border border-white/10 rounded-[12px] p-10 max-w-sm w-full mx-4 shadow-[0_0_100px_rgba(168,85,247,0.15)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-purple/50 to-transparent" />

            <div className="flex flex-col items-center space-y-6 text-center">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border border-brand-purple/30 flex items-center justify-center animate-pulse">
                  <Instagram className="w-10 h-10 text-brand-purple" />
                </div>
                <div className="absolute inset-0 bg-brand-purple/30 rounded-full blur-2xl opacity-20 animate-pulse"></div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-display text-white tracking-[0.2em] uppercase">Engaging Recon</h3>
                <p className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">Target established:</p>
                <p className="text-xs text-brand-purple font-bold italic">"{query}"</p>
              </div>

              <div className="flex gap-2.5">
                <div className="w-1.5 h-1.5 bg-brand-purple rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-brand-purple rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-brand-purple rounded-full animate-bounce"></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
