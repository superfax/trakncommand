"use client";

import { useState } from "react";
import { ExternalLink, Copy, MessageSquare, Check, X, Search, User, Users, Plus, Trash2, Filter, MoreHorizontal, Mail, Instagram, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Lead {
    id: string;
    handle: string;
    timestamp: string;
    status: "new" | "contacted" | "converted";
    tags?: string[];
    profilePic?: string;
    name?: string;
}

interface Macro {
    label: string;
    text: string;
}

interface MiniCRMProps {
    leads: Lead[];
    macros?: Macro[];
    variant?: "full" | "minimal";
    onRemove?: () => void;
}

export default function MiniCRM({ leads, macros = [], variant = "full", onRemove }: MiniCRMProps) {
    const isMinimal = variant === "minimal";
    const [dmPickerFor, setDmPickerFor] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [manualInput, setManualInput] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [updatingStage, setUpdatingStage] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<"timestamp" | "handle" | "status">("timestamp");
    const [filterStatus, setFilterStatus] = useState<"all" | "new" | "contacted" | "converted">("all");

    const STAGE_CYCLE: Record<string, "new" | "contacted" | "converted"> = {
        contacted: "converted",
    };

    const STAGE_LABELS: Record<string, { label: string; color: string }> = {
        new: { label: "New", color: "text-brand-purple bg-brand-purple/10" },
        contacted: { label: "Contacted", color: "text-blue-400 bg-blue-400/10" },
        converted: { label: "Converted", color: "text-green-400 bg-green-400/10" },
    };

    const handleStageUpdate = async (lead: Lead) => {
        const nextStatus = STAGE_CYCLE[lead.status] || "new";
        setUpdatingStage(lead.id);
        try {
            await fetch("/api/leads", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: lead.id, status: nextStatus }),
            });
            if (onRemove) onRemove(); // re-fetch leads
        } catch (e) {
            console.error("Failed to update stage:", e);
        } finally {
            setUpdatingStage(null);
        }
    };

    const handleRemoveLead = async (id: string, handle: string) => {
        if (!window.confirm(`Remove @${handle} from leads?`)) return;
        try {
            const res = await fetch(`/api/leads?id=${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Delete failed");
            if (onRemove) onRemove();
        } catch (error) {
            console.error("Failed to delete lead:", error);
            alert("Failed to delete lead. Please try again.");
        }
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        });
    };

    const parseHandle = (input: string) => {
        let handle = input.trim();
        if (!handle) return null;
        try {
            if (handle.includes("instagram.com/")) {
                const url = new URL(handle.startsWith("http") ? handle : `https://${handle}`);
                const parts = url.pathname.split("/").filter(p => p.length > 0);
                if (parts.length > 0) handle = parts[0];
            }
        } catch (e) { /* ignore */ }
        handle = handle.replace(/^@/, "").split(" ")[0].split("?")[0].split("/")[0];
        return handle;
    };

    const handleManualAdd = async () => {
        const handle = parseHandle(manualInput);
        if (!handle) return;
        setIsSaving(true);
        try {
            const res = await fetch("/api/leads", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    handle,
                    id: `manual-${Date.now()}`,
                    status: "new",
                    tags: ["Manual"],
                    name: "Manual Lead"
                }),
            });
            if (res.ok) {
                setManualInput("");
                setIsAdding(false);
            }
        } catch (error) {
            console.error("Failed to add lead:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const filteredLeads = leads
        .filter(lead => {
            const matchesSearch = lead.handle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                lead.name?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesFilter = filterStatus === "all" || lead.status === filterStatus;
            return matchesSearch && matchesFilter;
        })
        .sort((a, b) => {
            if (sortBy === "timestamp") {
                return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
            }
            if (sortBy === "handle") {
                return a.handle.localeCompare(b.handle);
            }
            if (sortBy === "status") {
                const order = { new: 0, contacted: 1, converted: 2 };
                return order[a.status] - order[b.status];
            }
            return 0;
        });

    return (
        <div className="editorial-panel flex flex-col min-h-[500px] overflow-hidden">
            {/* Search & Actions - Hidden in Minimal Mode */}
            {!isMinimal && (
                <div className="p-4 border-b border-white/5 bg-black/40 flex items-center justify-between gap-4">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-brand-purple transition-all" />
                        <input
                            type="text"
                            placeholder="Search contacts..."
                            className="w-full bg-black/60 border border-white/10 rounded-[6px] py-1.5 pl-10 pr-4 text-xs font-sans text-white focus:outline-none focus:border-brand-purple/50 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={async () => {
                                if (!window.confirm("Purge ALL leads? This cannot be undone.")) return;
                                try {
                                    await fetch("/api/leads", { method: "DELETE" });
                                    if (onRemove) onRemove();
                                } catch (e) {
                                    alert("Purge failed.");
                                }
                            }}
                            className="p-2 text-red-500/50 hover:text-red-500 hover:bg-red-400/10 rounded-[6px] border border-white/5 transition-all"
                            title="Purge All Leads"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="bg-black/60 border border-white/10 rounded-[6px] px-2 py-1.5 text-[10px] font-mono text-gray-400 focus:outline-none focus:border-brand-purple/50 appearance-none cursor-pointer hover:text-white transition-all uppercase tracking-widest"
                        >
                            <option value="timestamp">Newest</option>
                            <option value="handle">A-Z</option>
                            <option value="status">Status</option>
                        </select>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value as any)}
                            className="bg-black/60 border border-white/10 rounded-[6px] px-2 py-1.5 text-[10px] font-mono text-gray-400 focus:outline-none focus:border-brand-purple/50 appearance-none cursor-pointer hover:text-white transition-all uppercase tracking-widest"
                        >
                            <option value="all">All</option>
                            <option value="new">New</option>
                            <option value="contacted">Contacted</option>
                            <option value="converted">Converted</option>
                        </select>
                        <button
                            onClick={() => setIsAdding(true)}
                            className="bg-brand-purple hover:bg-brand-purple-hover text-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-[6px] shadow-lg shadow-brand-purple/20 flex items-center gap-2"
                        >
                            <Plus className="w-3.5 h-3.5" /> Add Contact
                        </button>
                    </div>
                </div>
            )}

            {/* Manual Add Overlay/Form */}
            {isAdding && (
                <div className="p-4 bg-brand-purple/5 border-b border-brand-purple/20 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-label text-brand-purple font-bold">New Prospect Details</span>
                        <button onClick={() => setIsAdding(false)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            autoFocus
                            placeholder="Instagram handle or profile link..."
                            value={manualInput}
                            onChange={(e) => setManualInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleManualAdd()}
                            className="flex-1 bg-black border border-white/10 rounded-[6px] py-2 px-4 text-xs font-sans text-white focus:outline-none focus:border-brand-purple/50"
                        />
                        <button
                            onClick={handleManualAdd}
                            disabled={isSaving || !manualInput.trim()}
                            className="bg-brand-purple text-white px-6 py-2 text-xs font-bold rounded-[6px] hover:bg-brand-purple-hover disabled:opacity-50"
                        >
                            {isSaving ? "Saving..." : "Save"}
                        </button>
                    </div>
                </div>
            )}

            {/* Table Area */}
            <div className="flex-1 overflow-x-auto">
                <table className="w-full platform-table border-collapse">
                    <thead>
                        <tr className="bg-white/[0.02]">
                            <th className="w-12">
                                <div className="flex justify-center">
                                    <div className="w-4 h-4 rounded-[4px] border border-white/20" />
                                </div>
                            </th>
                            <th>Contact Name</th>
                            {!isMinimal && <th>Platform</th>}
                            {!isMinimal && <th>Status</th>}
                            {!isMinimal && <th>Added</th>}
                            <th className="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLeads.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-20 text-center text-gray-500 font-sans italic opacity-50">
                                    No contacts found matching your criteria.
                                </td>
                            </tr>
                        ) : (
                            filteredLeads.map((lead) => (
                                <tr key={lead.id} className="hover:bg-white/[0.03] transition-colors group">
                                    <td className="w-12">
                                        <div className="flex justify-center">
                                            <div className="w-4 h-4 rounded-[4px] border border-white/20 group-hover:border-brand-purple/50 transition-colors" />
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-brand-purple/10 border border-white/10 overflow-hidden flex-shrink-0 relative">
                                                {lead.profilePic ? (
                                                    <img src={lead.profilePic} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <User className="w-4 h-4 text-brand-purple/40" />
                                                    </div>
                                                )}
                                                {lead.status === 'new' && (
                                                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-brand-purple border-2 border-surface rounded-full" />
                                                )}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-semibold text-white tracking-tight truncate">{lead.name || lead.handle}</span>
                                                <span className="text-[10px] text-gray-500 font-mono truncate">@{lead.handle}</span>
                                            </div>
                                        </div>
                                    </td>
                                    {!isMinimal && (
                                        <td>
                                            <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 w-fit">
                                                <Instagram className="w-3 h-3 text-pink-500" />
                                                <span className="text-[10px] uppercase font-bold text-gray-400">Instagram</span>
                                            </div>
                                        </td>
                                    )}
                                    {!isMinimal && (
                                        <td>
                                            {lead.status === "contacted" ? (
                                                <button
                                                    onClick={() => handleStageUpdate(lead)}
                                                    disabled={updatingStage === lead.id}
                                                    className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-[4px] transition-all hover:opacity-70 text-blue-400 bg-blue-400/10 hover:bg-green-400/20 hover:text-green-400"
                                                    title="Click to mark as Converted"
                                                >
                                                    {updatingStage === lead.id ? "..." : "Contacted →"}
                                                </button>
                                            ) : (
                                                <span className={cn(
                                                    "text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-[4px]",
                                                    STAGE_LABELS[lead.status]?.color
                                                )}>
                                                    {STAGE_LABELS[lead.status]?.label || lead.status}
                                                </span>
                                            )}
                                        </td>
                                    )}
                                    {!isMinimal && (
                                        <td className="text-gray-500 font-mono text-[11px]">
                                            {new Date(lead.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                        </td>
                                    )}
                                    <td className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => setDmPickerFor(dmPickerFor === lead.id ? null : lead.id)}
                                                className={cn(
                                                    "p-2 rounded-[6px] transition-all",
                                                    dmPickerFor === lead.id ? "bg-brand-purple text-white" : "text-gray-500 hover:text-white hover:bg-white/5"
                                                )}
                                            >
                                                <MessageSquare className="w-4 h-4" />
                                            </button>
                                            {!isMinimal && (
                                                <a
                                                    href={`https://instagram.com/${lead.handle}`}
                                                    target="_blank"
                                                    className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-[6px]"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                            )}
                                            {!isMinimal && (
                                                <button
                                                    onClick={() => handleRemoveLead(lead.id, lead.handle)}
                                                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-[6px]"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Floating Macro Picker Overlay */}
            {dmPickerFor && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] glass-panel shadow-2xl z-50 animate-in zoom-in-95 duration-200">
                    <div className="p-4 border-b border-border flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-brand-purple" />
                            <span className="font-display text-[10px] uppercase tracking-widest text-white">DM Intelligence</span>
                        </div>
                        <button onClick={() => setDmPickerFor(null)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
                        {macros.map((macro, idx) => {
                            const lead = leads.find(l => l.id === dmPickerFor);
                            const text = macro.text.replace(/\[handle\]/gi, `@${lead?.handle || ''}`);
                            const key = `${dmPickerFor}-${idx}`;
                            return (
                                <button
                                    key={idx}
                                    onClick={() => copyToClipboard(text, key)}
                                    className="w-full text-left p-3 rounded-[6px] hover:bg-white/5 group transition-all"
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-bold text-white group-hover:text-brand-purple transition-colors">{macro.label}</span>
                                        {copiedId === key ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-gray-600" />}
                                    </div>
                                    <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed">{text}</p>
                                </button>
                            );
                        })}
                    </div>
                    <div className="p-3 bg-black/40 border-t border-border text-center">
                        <p className="text-[9px] text-gray-600 font-mono">Select a template to copy for @{leads.find(l => l.id === dmPickerFor)?.handle}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
