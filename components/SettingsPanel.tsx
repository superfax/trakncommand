"use client";

import { useState, useEffect } from "react";
import { Check, Plus, Trash2, Edit2, Loader2, Save, Copy, Settings, Zap, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface Macro {
    label: string;
    text: string;
}

interface SettingsPanelProps {
    forceTab?: "automation" | "macros";
}

export default function SettingsPanel({ forceTab }: SettingsPanelProps) {
    // State
    const [activeTab, setActiveTab] = useState<"automation" | "macros">(forceTab || "automation");

    // Sync with forceTab if provided
    useEffect(() => {
        if (forceTab) setActiveTab(forceTab);
    }, [forceTab]);
    const [keyword, setKeyword] = useState("PRO");
    const [macros, setMacros] = useState<Macro[]>([]);
    const [autoReply, setAutoReply] = useState("");
    const [tempAutoReply, setTempAutoReply] = useState("");
    const [isEditingAutoReply, setIsEditingAutoReply] = useState(false);

    const [dmReply, setDmReply] = useState("");
    const [tempDmReply, setTempDmReply] = useState("");
    const [isEditingDmReply, setIsEditingDmReply] = useState(false);

    const [copiedMacroIdx, setCopiedMacroIdx] = useState<number | null>(null);

    // Edit States
    const [tempKeyword, setTempKeyword] = useState("");
    const [isEditingKeyword, setIsEditingKeyword] = useState(false);

    const [newMacroLabel, setNewMacroLabel] = useState("");
    const [newMacroText, setNewMacroText] = useState("");
    const [isAddingMacro, setIsAddingMacro] = useState(false);

    const [isSaving, setIsSaving] = useState(false);

    // Fetch Settings on Mount
    useEffect(() => {
        fetch("/api/settings")
            .then(res => res.json())
            .then(data => {
                if (data.keyword) setKeyword(data.keyword);
                if (data.macros) setMacros(data.macros);
                if (data.autoReply) { setAutoReply(data.autoReply); setTempAutoReply(data.autoReply); }
                if (data.dmReply) { setDmReply(data.dmReply); setTempDmReply(data.dmReply); }
            });
    }, []);

    const saveKeyword = async () => {
        setIsSaving(true);
        try {
            const res = await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ keyword: tempKeyword })
            });
            const data = await res.json();
            setKeyword(data.keyword);
            setIsEditingKeyword(false);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    const saveAutoReply = async () => {
        setIsSaving(true);
        try {
            await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ autoReply: tempAutoReply })
            });
            setAutoReply(tempAutoReply);
            setIsEditingAutoReply(false);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    const saveDmReply = async () => {
        setIsSaving(true);
        try {
            await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ dmReply: tempDmReply })
            });
            setDmReply(tempDmReply);
            setIsEditingDmReply(false);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    const deleteMacro = async (index: number) => {
        const updated = macros.filter((_, i) => i !== index);
        setMacros(updated);
        await saveMacros(updated);
    };

    const addMacro = async () => {
        if (!newMacroLabel || !newMacroText) return;
        const updated = [...macros, { label: newMacroLabel, text: newMacroText }];
        setMacros(updated);
        await saveMacros(updated);
        setNewMacroLabel("");
        setNewMacroText("");
        setIsAddingMacro(false);
    };

    const saveMacros = async (updatedMacros: Macro[]) => {
        setIsSaving(true);
        try {
            await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ macros: updatedMacros })
            });
        } catch (e) {
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="editorial-panel flex flex-col h-full overflow-hidden">
            {/* Header / Tabs - Hidden if controlled by parent */}
            {!forceTab && (
                <div className="p-4 border-b border-border bg-black/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Settings className="w-4 h-4 text-brand-purple" />
                        <h3 className="font-display text-[10px] uppercase tracking-widest text-white">System Config</h3>
                    </div>
                    <div className="flex gap-1">
                        {(["automation", "macros"] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-[4px] transition-all",
                                    activeTab === tab ? "bg-brand-purple text-whiteShadow" : "text-gray-500 hover:text-white"
                                )}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* AUTOMATION TAB */}
                {activeTab === "automation" && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* Keyword Section */}
                        <div className="glass-panel p-5 relative group/item">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-4 bg-brand-purple rounded-full" />
                                    <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">Trigger Keyword</span>
                                </div>
                                {!isEditingKeyword ? (
                                    <button onClick={() => { setTempKeyword(keyword); setIsEditingKeyword(true); }} className="p-1.5 hover:bg-white/5 rounded-[4px] text-gray-500 hover:text-white transition-all">
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                ) : (
                                    <button onClick={saveKeyword} disabled={isSaving} className="p-1.5 hover:bg-brand-purple/20 rounded-[4px] text-brand-purple hover:text-white transition-all">
                                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                    </button>
                                )}
                            </div>

                            {isEditingKeyword ? (
                                <input
                                    autoFocus
                                    value={tempKeyword}
                                    onChange={(e) => setTempKeyword(e.target.value.toUpperCase())}
                                    className="w-full bg-black/40 border-2 border-brand-purple/50 px-4 py-3 text-brand-purple font-display text-center tracking-[0.2em] text-xl focus:outline-none rounded-[8px] shadow-inner shadow-brand-purple/10"
                                />
                            ) : (
                                <div className="w-full bg-black/20 border border-white/5 px-4 py-3 text-white font-display text-center tracking-[0.2em] text-xl rounded-[8px] group-hover/item:border-brand-purple/20 transition-all">
                                    {keyword}
                                </div>
                            )}
                            <p className="mt-4 text-[10px] text-gray-500 text-center leading-relaxed font-sans opacity-60">
                                Comments with this keyword activate the automated engine.
                            </p>
                        </div>

                        {/* Comment Reply Section */}
                        <div className="glass-panel p-5 relative group/item">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-4 bg-brand-purple rounded-full" />
                                    <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">Public Comment Reply</span>
                                </div>
                                {!isEditingAutoReply ? (
                                    <button onClick={() => { setTempAutoReply(autoReply); setIsEditingAutoReply(true); }} className="p-1.5 hover:bg-white/5 rounded-[4px] text-gray-500 hover:text-white transition-all">
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                ) : (
                                    <button onClick={saveAutoReply} disabled={isSaving} className="p-1.5 hover:bg-brand-purple/20 rounded-[4px] text-brand-purple hover:text-white transition-all">
                                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                    </button>
                                )}
                            </div>

                            {isEditingAutoReply ? (
                                <textarea
                                    autoFocus
                                    value={tempAutoReply}
                                    onChange={(e) => setTempAutoReply(e.target.value)}
                                    className="w-full bg-black/40 border border-brand-purple/40 px-4 py-3 text-white font-sans text-xs focus:outline-none rounded-[8px] h-20 resize-none shadow-inner"
                                    placeholder="Check your DM for access! 🚀"
                                />
                            ) : (
                                <div className="w-full bg-black/20 border border-white/5 px-4 py-3 text-gray-300 font-sans text-xs leading-relaxed min-h-[50px] rounded-[8px] group-hover/item:border-brand-purple/20 transition-all flex items-center justify-center text-center">
                                    {autoReply || <span className="text-gray-600 italic">No public reply established.</span>}
                                </div>
                            )}
                        </div>

                        {/* DM Reply Section */}
                        <div className="glass-panel p-5 relative group/item border-brand-purple/10">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-4 bg-brand-purple rounded-full" />
                                    <span className="text-[10px] font-bold tracking-widest text-brand-purple uppercase">Private DM Message</span>
                                </div>
                                {!isEditingDmReply ? (
                                    <button onClick={() => { setTempDmReply(dmReply); setIsEditingDmReply(true); }} className="p-1.5 hover:bg-white/5 rounded-[4px] text-gray-500 hover:text-white transition-all">
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                ) : (
                                    <button onClick={saveDmReply} disabled={isSaving} className="p-1.5 hover:bg-brand-purple/20 rounded-[4px] text-brand-purple hover:text-white transition-all">
                                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                    </button>
                                )}
                            </div>

                            {isEditingDmReply ? (
                                <textarea
                                    autoFocus
                                    value={tempDmReply}
                                    onChange={(e) => setTempDmReply(e.target.value)}
                                    className="w-full bg-black/40 border border-brand-purple/40 px-4 py-3 text-white font-sans text-xs focus:outline-none rounded-[8px] h-24 resize-none shadow-inner"
                                    placeholder="Here is your link: ..."
                                />
                            ) : (
                                <div className="w-full bg-black/20 border border-brand-purple/10 px-4 py-3 text-gray-300 font-sans text-xs leading-relaxed min-h-[60px] rounded-[8px] group-hover/item:border-brand-purple/20 transition-all flex items-center justify-center text-center">
                                    {dmReply || <span className="text-gray-600 italic">No private message established.</span>}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* MACROS TAB */}
                {activeTab === "macros" && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="space-y-3">
                            {macros.length === 0 && (
                                <div className="text-center text-gray-600 text-[11px] font-sans py-12 opacity-50 italic">
                                    No response templates saved.
                                </div>
                            )}
                            {macros.map((macro, idx) => (
                                <div key={idx} className="glass-panel p-4 group/macro hover:border-brand-purple/20 transition-all">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-brand-purple shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                                            <span className="text-white font-bold text-[10px] uppercase tracking-widest">{macro.label}</span>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover/macro:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(macro.text);
                                                    setCopiedMacroIdx(idx);
                                                    setTimeout(() => setCopiedMacroIdx(null), 2000);
                                                }}
                                                className={cn("p-1.5 rounded-[4px] transition-all", copiedMacroIdx === idx ? "text-green-400" : "text-gray-500 hover:text-white hover:bg-white/5")}
                                            >
                                                {copiedMacroIdx === idx ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                            </button>
                                            <button onClick={() => deleteMacro(idx)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-[4px]">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="bg-black/20 p-3 rounded-[6px] border border-white/[0.02]">
                                        <p className="text-gray-400 text-[11px] font-sans leading-relaxed line-clamp-2">{macro.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Add New Macro Form */}
                        {isAddingMacro ? (
                            <div className="glass-panel p-5 border-brand-purple/30 bg-brand-purple/[0.02] space-y-3 animate-in slide-in-from-bottom-2">
                                <input
                                    placeholder="Template Name (e.g. ⚡ Pricing)"
                                    value={newMacroLabel}
                                    onChange={(e) => setNewMacroLabel(e.target.value)}
                                    className="w-full bg-black/60 border border-white/10 px-3 py-2 text-[11px] text-white focus:outline-none focus:border-brand-purple/50 rounded-[6px]"
                                />
                                <textarea
                                    placeholder="Template content..."
                                    value={newMacroText}
                                    onChange={(e) => setNewMacroText(e.target.value)}
                                    className="w-full bg-black/60 border border-white/10 px-3 py-2 text-[11px] text-white focus:outline-none focus:border-brand-purple/50 rounded-[6px] h-20 resize-none font-sans"
                                />
                                <div className="flex gap-2">
                                    <button onClick={addMacro} className="flex-1 bg-brand-purple hover:bg-brand-purple-hover text-white py-2 text-[10px] font-bold uppercase tracking-widest rounded-[6px] shadow-lg shadow-brand-purple/20">Save Template</button>
                                    <button onClick={() => setIsAddingMacro(false)} className="px-4 py-2 bg-white/5 text-gray-400 hover:text-white text-[10px] font-bold uppercase tracking-widest border border-white/5 rounded-[6px]">Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsAddingMacro(true)}
                                className="w-full group py-4 glass-panel border-dashed hover:border-brand-purple/50 hover:bg-brand-purple/[0.02] flex items-center justify-center gap-2 transition-all"
                            >
                                <Plus className="w-3.5 h-3.5 text-gray-600 group-hover:text-brand-purple transition-all" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 group-hover:text-brand-purple transition-all">Establish New Template</span>
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Footer Tip */}
            {activeTab === "macros" && (
                <div className="p-4 bg-black/40 border-t border-border flex items-center gap-3">
                    <div className="p-2 bg-brand-purple/10 rounded-full">
                        <Zap className="w-3 h-3 text-brand-purple" />
                    </div>
                    <p className="text-[9px] text-gray-500 font-sans leading-tight">
                        Use <span className="text-brand-purple font-mono">[handle]</span> in your macros to automatically personalize messages with the lead's username.
                    </p>
                </div>
            )}
        </div>
    );
}
