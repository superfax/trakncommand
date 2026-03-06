"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import MasterToggle from "@/components/MasterToggle";
import LiveActivityFeed from "@/components/LiveActivityFeed";
import SettingsPanel from "@/components/SettingsPanel";
import MiniCRM from "@/components/MiniCRM";
import ReconPanel from "@/components/ReconPanel";
import { cn } from "@/lib/utils";
import { Zap, Loader2, Bell, Search, User, Activity, Users, Plus, Settings, MessageSquare, Lock } from "lucide-react";

interface Macro {
  label: string;
  text: string;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [settingsSubTab, setSettingsSubTab] = useState("general");
  const [isSystemOnline, setIsSystemOnline] = useState(false);
  const [macros, setMacros] = useState<Macro[]>([]);
  const [leads, setLeads] = useState([]);
  const [feed, setFeed] = useState([]);
  const [isFiring, setIsFiring] = useState(false);
  const [fireMsg, setFireMsg] = useState<string | null>(null);
  const [keywordMode, setKeywordMode] = useState<"single" | "multi">("single");
  const [singleKeyword, setSingleKeyword] = useState<string>("");

  const fetchDashboardData = () => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((data) => {
        setLeads(data.leads || []);
        setFeed(data.activity || []);
      });
  };

  // Fetch initial status and data
  useEffect(() => {
    // 1. Get Settings
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setIsSystemOnline(data.isSystemOnline);
        if (data.macros) setMacros(data.macros);
        if (data.keywordMode) setKeywordMode(data.keywordMode);
        if (data.keyword) setSingleKeyword(data.keyword);
      });

    // 2. Get Dashboard Data (Polling every 3s)
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleToggle = async () => {
    const newState = !isSystemOnline;
    setIsSystemOnline(newState);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSystemOnline: newState }),
      });
    } catch (error) {
      console.error("Failed to toggle status", error);
      setIsSystemOnline(!newState);
    }
  };

  const handleSimulate = async () => {
    if (isFiring) return;
    setIsFiring(true);
    setFireMsg(null);
    try {
      const res = await fetch("/api/simulate", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setFireMsg(`⚡ Fired: @${data.handle} · "${data.comment}"`);
      } else {
        setFireMsg(`⚠️ ${data.reason || "Simulation failed"}`);
      }
    } catch (e) {
      setFireMsg("❌ Network error");
    } finally {
      setIsFiring(false);
      setTimeout(() => setFireMsg(null), 5000);
    }
  };

  const handleReply = async (item: any, message: string) => {
    try {
      await fetch("/api/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: item.handle, message }),
      });
      const res = await fetch("/api/dashboard");
      const data = await res.json();
      setFeed(data.activity);
    } catch (e) {
      console.error("Reply failed", e);
    }
  };

  // Derive real metrics from feed
  const dmsSent = (feed as any[]).filter((f) => f.status === "sent").length;
  const newLeadsCount = (leads as any[]).filter((l) => l.status === "new").length;
  const contactedCount = (leads as any[]).filter((l) => l.status === "contacted").length;
  const convertedCount = (leads as any[]).filter((l) => l.status === "converted").length;

  const totalFunnel = contactedCount + convertedCount;
  const conversionRate = totalFunnel > 0 ? Math.round((convertedCount / totalFunnel) * 100) : 0;

  // Derive Keyword Performance
  const getKeywordPerformance = () => {
    const counts: Record<string, number> = {};
    feed.forEach((f: any) => {
      if (!f.comment) return;
      const textToMatch = f.comment.toLowerCase();

      if (keywordMode === "single") {
        if (singleKeyword && textToMatch.includes(singleKeyword.toLowerCase())) {
          counts[singleKeyword] = (counts[singleKeyword] || 0) + 1;
        }
      } else {
        macros.forEach(m => {
          if (m.label && textToMatch.includes(m.label.toLowerCase())) {
            counts[m.label] = (counts[m.label] || 0) + 1;
          }
        });
      }
    });

    // Sort descending
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5); // top 5
  };

  const topKeywords = getKeywordPerformance();
  const maxKeywordHits = topKeywords.length > 0 ? Math.max(...topKeywords.map(k => k[1])) : 1;

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        isSystemOnline={isSystemOnline}
        activePath={activeTab}
        onPathChange={setActiveTab}
        newLeadsCount={newLeadsCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* Top Header / Action Bar */}
        <header className="h-16 border-b border-border bg-black/20 backdrop-blur-md px-8 flex items-center justify-between z-10">
          <div className="flex items-center gap-6">
            <h2 className="text-sm font-medium text-white/90">Command Center</h2>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2 text-[11px] font-mono text-gray-500 uppercase tracking-widest">
              <Activity className="w-3 h-3 text-brand-purple" />
              Real-time Monitoring
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Simulation Status Info */}
            {fireMsg && (
              <div className="px-3 py-1.5 bg-brand-purple/10 border border-brand-purple/20 rounded-[4px] flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
                <span className="text-[10px] font-mono text-brand-purple font-bold tracking-tight">{fireMsg}</span>
              </div>
            )}

            {/* Fire Test Button */}
            <button
              onClick={handleSimulate}
              disabled={isFiring}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-[4px] border text-[11px] font-mono uppercase tracking-widest transition-all
                ${isFiring
                  ? "border-brand-purple/40 text-brand-purple/40 cursor-not-allowed"
                  : "border-brand-purple text-brand-purple hover:bg-brand-purple hover:text-white active:scale-95"
                }`}
            >
              {isFiring ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Zap className="w-3 h-3" />
              )}
              {isFiring ? "Firing..." : "Fire Test"}
            </button>

            <div className="h-8 w-px bg-white/10 mx-2" />

            <button className="p-2 text-gray-400 hover:text-white transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-brand-purple rounded-full" />
            </button>
            <div className="w-8 h-8 rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
              <User className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        </header>

        {/* Tabbed Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === "dashboard" && (
            <div className="space-y-8 animate-in fade-in duration-500">
              {/* Top Metric Row */}
              <div className="grid grid-cols-4 gap-6">
                <div className="glass-panel p-6 flex flex-col justify-between min-h-[110px]">
                  <span className="text-label">System State</span>
                  <div className="flex items-center justify-between mt-3">
                    <span className={`text-xl font-display ${isSystemOnline ? 'text-green-500' : 'text-red-500'}`}>
                      {isSystemOnline ? 'ONLINE' : 'OFFLINE'}
                    </span>
                    <MasterToggle isOn={isSystemOnline} onToggle={handleToggle} />
                  </div>
                </div>

                <div className="glass-panel p-6 flex flex-col justify-between min-h-[120px]">
                  <span className="text-label">DMs Sent</span>
                  <div className="flex items-end justify-between mt-2">
                    <span className="text-3xl font-display text-white">{dmsSent}</span>
                    <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full bg-brand-purple transition-all duration-500"
                        style={{ width: `${Math.min((dmsSent / 50) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="glass-panel p-6 flex flex-col justify-between min-h-[120px]">
                  <span className="text-label">Active Leads</span>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-3xl font-display text-white">{leads.length}</span>
                    <div className="p-2 bg-brand-purple/10 rounded-[4px]">
                      <Users className="w-5 h-5 text-brand-purple" />
                    </div>
                  </div>
                </div>

                <div className="glass-panel p-6 flex flex-col justify-between min-h-[120px]">
                  <span className="text-label">Conversion Rate</span>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-3xl font-display text-brand-purple">
                      {conversionRate}%
                    </span>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] uppercase font-mono tracking-widest text-gray-400">Converted</span>
                      <span className="text-xs font-bold text-gray-300">{convertedCount} / {totalFunnel}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-12 gap-8">
                {/* Live Feed - 8 Columns */}
                <div className="lg:col-span-8 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-display uppercase tracking-widest text-white/50">Live Intelligence</h3>
                    <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">{feed.length} Active Events</span>
                    </div>
                  </div>
                  <div className="editorial-panel min-h-[600px] flex flex-col overflow-hidden">
                    <div className="flex-1 p-0 overflow-y-auto">
                      <LiveActivityFeed feed={feed} onReply={handleReply} macros={macros} />
                    </div>
                  </div>
                </div>

                {/* Side Panels - 4 Columns */}
                <div className="lg:col-span-4 space-y-8">
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-display uppercase tracking-widest text-white/50">Contacts Preview</h3>
                      <button
                        onClick={() => setActiveTab("contacts")}
                        className="text-[10px] font-mono text-brand-purple uppercase tracking-wider hover:underline"
                      >
                        Expand All
                      </button>
                    </div>
                    {/* Just show a small subset or the main CRM component restricted */}
                    <div className="max-h-[500px] overflow-hidden">
                      <MiniCRM
                        leads={leads.slice(0, 5)}
                        macros={macros}
                        variant="minimal"
                        onRemove={fetchDashboardData}
                      />
                    </div>
                  </section>

                  {/* Keyword Performance Panel */}
                  <section className="glass-panel p-6 border-white/5">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-sm font-display uppercase tracking-widest text-white/50">Top Keywords</h3>
                      <Activity className="w-4 h-4 text-brand-purple" />
                    </div>

                    {topKeywords.length === 0 ? (
                      <div className="py-8 text-center bg-black/20 rounded-[8px] border border-white/5">
                        <p className="text-[11px] font-mono text-gray-500 uppercase tracking-widest">No keyword data yet</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {topKeywords.map(([kw, count], idx) => (
                          <div key={idx} className="space-y-1.5">
                            <div className="flex justify-between items-end text-[10px] uppercase font-mono tracking-widest">
                              <span className="text-gray-300 font-bold overflow-hidden text-ellipsis whitespace-nowrap max-w-[150px]">"{kw}"</span>
                              <span className="text-brand-purple">{count} Hits</span>
                            </div>
                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-brand-purple to-[#B87CFF] rounded-full transition-all duration-1000"
                                style={{ width: `${Math.max((count / maxKeywordHits) * 100, 5)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              </div>
            </div>
          )}

          {activeTab === "contacts" && (
            <div className="h-full flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-display uppercase tracking-widest text-white shadow-brand-purple/20">Lead Intelligence CRM</h3>
                  <p className="text-xs text-gray-500 font-mono mt-1">Manage and interact with your captured audience</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="px-4 py-2 bg-white/5 rounded-[4px] border border-white/10 flex items-center gap-3">
                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Total Population</span>
                    <span className="text-xl font-display text-brand-purple">{leads.length}</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 min-h-[600px] editorial-panel overflow-hidden shadow-2xl">
                <MiniCRM leads={leads} macros={macros} onRemove={fetchDashboardData} />
              </div>
            </div>
          )}

          {activeTab === "activity" && (
            <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-500">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-display uppercase tracking-widest text-white">Global Activity Stream</h3>
                  <p className="text-xs text-gray-500 font-mono mt-1">Real-time surveillance of social interactions</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">{feed.length} Live Signals</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 min-h-[600px] editorial-panel overflow-hidden">
                <LiveActivityFeed feed={feed} onReply={handleReply} macros={macros} />
              </div>
            </div>
          )}

          {activeTab === "automations" && (
            <div className="h-full space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-display uppercase tracking-widest text-white">Automation Intelligence Hub</h3>
                  <p className="text-xs text-gray-500 font-mono mt-1">Configure and monitor your autonomous workflows</p>
                </div>
                <button className="bg-brand-purple hover:bg-brand-purple-hover text-white px-6 py-2 transition-all font-bold text-[10px] uppercase rounded-[6px] shadow-lg shadow-brand-purple/20 flex items-center gap-2">
                  <Plus className="w-3 h-3" /> Create New Workflow
                </button>
              </div>

              <div className="grid grid-cols-3 gap-6">
                {/* Active Automation */}
                <div className="glass-panel p-6 border-brand-purple/30 bg-brand-purple/[0.02] flex flex-col h-full ring-1 ring-brand-purple/10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="p-3 bg-brand-purple rounded-[8px] shadow-lg shadow-brand-purple/20">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex items-center gap-2 px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[9px] font-bold text-green-500 uppercase">ACTIVE</span>
                    </div>
                  </div>
                  <h4 className="text-sm font-display uppercase tracking-widest text-white mb-2">Keyword-to-DM Engine</h4>
                  <p className="text-xs text-gray-500 font-sans leading-relaxed mb-6">
                    Automatically triggers a DM response whenever a user comments with your designated keyword.
                  </p>
                  <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase text-gray-500">Operation Mode</span>
                      <div className="flex items-center gap-1 bg-black/30 rounded-[4px] p-0.5 border border-white/5">
                        {(["single", "multi"] as const).map((m) => (
                          <button
                            key={m}
                            onClick={async () => {
                              setKeywordMode(m);
                              await fetch("/api/settings", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ keywordMode: m })
                              });
                            }}
                            className={cn(
                              "text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded-[3px] transition-all",
                              keywordMode === m ? "bg-brand-purple text-white shadow-lg" : "text-gray-500 hover:text-white"
                            )}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase">
                      <span className="text-gray-500">Target Keyword</span>
                      <span className="text-brand-purple font-bold tracking-widest">{keywordMode === "multi" ? "MULTI" : "ESTABLISHED"}</span>
                    </div>
                    <button
                      onClick={() => setActiveTab("settings")}
                      className="w-full py-2 bg-white/5 border border-white/10 rounded-[4px] text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                    >
                      Configure Flow
                    </button>
                  </div>
                </div>

                {/* Story Mention (Locked) */}
                <div className="glass-panel p-6 opacity-60 grayscale-[0.5] border-dashed border-white/10 flex flex-col h-full bg-black/20">
                  <div className="flex items-center justify-between mb-6">
                    <div className="p-3 bg-white/5 rounded-[8px]">
                      <Activity className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-full">
                      <span className="text-[9px] font-bold text-gray-500 uppercase">LOCKED</span>
                    </div>
                  </div>
                  <h4 className="text-sm font-display uppercase tracking-widest text-gray-400 mb-2">Story Mention Reply</h4>
                  <p className="text-xs text-gray-500 font-sans leading-relaxed mb-6">
                    Send immediate thank-you DMs when someone mentions your profile in their stories.
                  </p>
                  <div className="mt-auto pt-6 border-t border-white/5">
                    <button disabled className="w-full py-2 bg-white/5 border border-white/5 rounded-[4px] text-[10px] font-bold uppercase tracking-widest text-gray-600 cursor-not-allowed">
                      Coming Soon
                    </button>
                  </div>
                </div>

                {/* New Follower (Locked) */}
                <div className="glass-panel p-6 opacity-60 grayscale-[0.5] border-dashed border-white/10 flex flex-col h-full bg-black/20">
                  <div className="flex items-center justify-between mb-6">
                    <div className="p-3 bg-white/5 rounded-[8px]">
                      <Users className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-full">
                      <span className="text-[9px] font-bold text-gray-500 uppercase">PRO ONLY</span>
                    </div>
                  </div>
                  <h4 className="text-sm font-display uppercase tracking-widest text-gray-400 mb-2">New Follower Welcome</h4>
                  <p className="text-xs text-gray-500 font-sans leading-relaxed mb-6">
                    Greet every new follower with a curated welcome sequence and special offer.
                  </p>
                  <div className="mt-auto pt-6 border-t border-white/5">
                    <button disabled className="w-full py-2 bg-white/5 border border-white/5 rounded-[4px] text-[10px] font-bold uppercase tracking-widest text-gray-600 cursor-not-allowed">
                      Upgrade Required
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="h-full flex gap-8 animate-in fade-in duration-500">
              {/* Settings Sub-Sidebar */}
              <aside className="w-48 flex flex-col gap-2">
                <div className="px-2 mb-4">
                  <h3 className="text-[10px] font-display uppercase tracking-[0.2em] text-gray-500">Settings</h3>
                </div>
                {[
                  { id: "general", label: "General", icon: Settings },
                  { id: "automations", label: "Automations", icon: Zap },
                  { id: "macros", label: "Response Macros", icon: MessageSquare },
                  { id: "intelligence", label: "Intelligence", icon: Activity },
                  { id: "api", label: "API & Security", icon: Lock },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSettingsSubTab(item.id)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-[6px] transition-all text-left",
                      settingsSubTab === item.id
                        ? "bg-brand-purple/10 text-brand-purple border border-brand-purple/20"
                        : "text-gray-500 hover:text-white hover:bg-white/5 border border-transparent"
                    )}
                  >
                    <item.icon className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
                  </button>
                ))}
              </aside>

              {/* Settings Content Area */}
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-4xl space-y-8">
                  {settingsSubTab === "general" && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <h3 className="text-lg font-display uppercase tracking-widest text-white">General Configuration</h3>
                      </div>
                      <div className="glass-panel p-6 flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-display uppercase tracking-widest text-white mb-1">Master System Switch</h4>
                          <p className="text-xs text-gray-500 font-sans">Toggle the entire autonomous engine on or off.</p>
                        </div>
                        <MasterToggle isOn={isSystemOnline} onToggle={handleToggle} />
                      </div>

                      <div className="editorial-panel p-6 opacity-40">
                        <h4 className="text-sm font-display uppercase tracking-widest text-gray-400 mb-4">Connected Profile</h4>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                            <User className="w-6 h-6 text-gray-600" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white uppercase tracking-wider">Trakn Admin</div>
                            <div className="text-[10px] font-mono text-gray-500">Connected to @traknpro</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {settingsSubTab === "automations" && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <h3 className="text-lg font-display uppercase tracking-widest text-white">Automation Rules</h3>
                      </div>
                      <SettingsPanel forceTab="automation" />
                    </div>
                  )}

                  {settingsSubTab === "macros" && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <h3 className="text-lg font-display uppercase tracking-widest text-white">Response Templates</h3>
                      </div>
                      <SettingsPanel forceTab="macros" />
                    </div>
                  )}

                  {settingsSubTab === "intelligence" && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <h3 className="text-lg font-display uppercase tracking-widest text-white">Target Recon Intelligence</h3>
                      </div>
                      <ReconPanel hideHeader />
                    </div>
                  )}

                  {settingsSubTab === "api" && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <h3 className="text-lg font-display uppercase tracking-widest text-white">API & Security</h3>
                      </div>
                      <div className="glass-panel p-8 border-dashed border-white/10 flex flex-col items-center justify-center text-center">
                        <Lock className="w-8 h-8 text-gray-700 mb-4" />
                        <h4 className="text-sm font-display uppercase tracking-widest text-gray-500 mb-2">Advanced Security Console</h4>
                        <p className="text-xs text-gray-600 font-sans max-w-sm">
                          API key management and webhook security settings are currently restricted.
                          Contact support to enable developer features.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
