"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Clock, AlertCircle, Send, X, MessageCircle, MoreHorizontal, Zap, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActivityItem {
    id: string;
    handle: string;
    comment: string;
    status: "sent" | "pending" | "failed" | "partial";
    timestamp: string;
    postImage?: string;
    postCaption?: string;
    commentId?: string;
    userId?: string;
    replyText?: string;
}

interface Macro {
    label: string;
    text: string;
}

interface LiveActivityFeedProps {
    feed: ActivityItem[];
    onReply?: (item: ActivityItem, message: string) => void;
    macros?: Macro[];
}

type FilterStatus = "all" | "sent" | "pending" | "failed" | "partial";

const STATUS_CONFIG = {
    sent: { icon: CheckCircle, color: "text-green-500", label: "REPLIED", bg: "bg-green-500/10", border: "border-green-500/20" },
    partial: { icon: Zap, color: "text-amber-500", label: "PARTIAL", bg: "bg-amber-500/10", border: "border-amber-500/20" },
    pending: { icon: Clock, color: "text-brand-purple", label: "PROCESSING", bg: "bg-brand-purple/10", border: "border-brand-purple/20" },
    failed: { icon: AlertCircle, color: "text-red-500", label: "FAILED", bg: "bg-red-500/10", border: "border-red-500/20" },
};

export default function LiveActivityFeed({ feed, onReply, macros = [] }: LiveActivityFeedProps) {
    const [replyingId, setReplyingId] = useState<string | null>(null);
    const [replyText, setReplyText] = useState("");
    const [filter, setFilter] = useState<FilterStatus>("sent");
    const [isPurging, setIsPurging] = useState(false);

    const handlePurge = async () => {
        if (!window.confirm("🔥 Purge ALL activity and leads? This cannot be undone.")) return;
        setIsPurging(true);
        try {
            await fetch("/api/purge", { method: "POST" });
            window.location.reload();
        } catch (e) {
            console.error("Purge failed", e);
        } finally {
            setIsPurging(false);
        }
    };

    const handleSend = (item: ActivityItem) => {
        if (!replyText.trim()) return;
        onReply?.(item, replyText);
        setReplyingId(null);
        setReplyText("");
    };

    // 1. Consolidation Logic
    const consolidatedMap = new Map<string, ActivityItem & { _timestamp: number }>();
    const selfHandles = ["traknpro"];

    // Helper to extract timestamp from ID
    const getTs = (id: string) => {
        const match = id.match(/\d+/);
        return match ? parseInt(match[0]) : 0;
    };

    // Sort raw feed by time (oldest first for sequential processing)
    const sortedFeed = [...feed].sort((a, b) => getTs(a.id) - getTs(b.id));

    let lastUserKey: string | null = null;

    sortedFeed.forEach(item => {
        const isSelf = selfHandles.includes(item.handle.toLowerCase());
        const ts = getTs(item.id);

        if (!isSelf) {
            const key = item.commentId || item.id;
            consolidatedMap.set(key, { ...item, _timestamp: ts });
            lastUserKey = key;
        } else {
            const targetId = item.commentId;
            const matchKey = (targetId && consolidatedMap.has(targetId)) ? targetId : lastUserKey;

            if (matchKey && consolidatedMap.has(matchKey)) {
                const existing = consolidatedMap.get(matchKey)!;
                existing.replyText = item.comment.replace('✅ Replied: ', '').replace(/\"/g, '');
                existing.status = 'sent';
                // Update timestamp so threads with recent replies jump to the top
                existing._timestamp = ts;
            }
        }
    });

    const consolidatedFeed = Array.from(consolidatedMap.values())
        .filter(item => !item.handle.includes("6346") && !item.userId?.includes("6346"))
        .sort((a, b) => b._timestamp - a._timestamp); // Latest activity first

    // 2. Filter & Counts
    const counts = {
        all: consolidatedFeed.length,
        sent: consolidatedFeed.filter((f) => f.status === "sent").length,
        pending: consolidatedFeed.filter((f) => f.status === "pending").length,
        failed: consolidatedFeed.filter((f) => f.status === "failed").length,
        partial: consolidatedFeed.filter((f) => f.status === "partial").length,
    };

    const filtered = filter === "all" ? consolidatedFeed : consolidatedFeed.filter((f) => f.status === filter);

    return (
        <div className="flex flex-col h-full bg-black/10">
            {/* Sub-Header / Filters */}
            <div className="p-4 border-b border-border bg-black/20 flex items-center justify-between sticky top-0 z-20 backdrop-blur-sm">
                <div className="flex gap-1">
                    {(["sent", "pending", "failed"] as FilterStatus[]).map((s) => (
                        <button
                            key={s}
                            onClick={() => setFilter(s)}
                            className={cn(
                                "text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-[4px] border transition-all",
                                filter === s
                                    ? "bg-brand-purple text-white border-brand-purple"
                                    : "border-transparent text-gray-500 hover:text-white"
                            )}
                        >
                            {s} <span className="ml-1.5 opacity-40">{counts[s]}</span>
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handlePurge}
                        disabled={isPurging}
                        title="Purge all activity & leads"
                        className="text-red-500/40 hover:text-red-500 p-1.5 rounded-[4px] hover:bg-red-500/10 transition-all disabled:opacity-30"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <button className="text-gray-500 hover:text-white p-1.5 rounded-[4px] hover:bg-white/5 transition-all">
                        <MoreHorizontal className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Feed Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/5">
                {filtered.length === 0 && (
                    <div className="h-40 flex flex-col items-center justify-center text-gray-600 font-sans italic opacity-40">
                        <MessageCircle className="w-10 h-10 mb-3 opacity-20" />
                        <span>No activity in this queue.</span>
                    </div>
                )}

                <AnimatePresence initial={false}>
                    {filtered.map((item) => {
                        const statusCfg = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
                        const StatusIcon = statusCfg.icon;

                        return (
                            <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="group relative"
                            >
                                <div className={cn(
                                    "glass-panel transition-all duration-300 relative overflow-hidden",
                                    replyingId === item.id ? "border-brand-purple/40 bg-brand-purple/[0.03]" : "hover:border-white/10 hover:bg-white/[0.02]"
                                )}>
                                    {/* Action Bar Overlay */}
                                    <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                        <button
                                            onClick={() => setReplyingId(replyingId === item.id ? null : item.id)}
                                            className="p-1.5 bg-brand-purple text-white rounded-[4px] shadow-lg shadow-brand-purple/20 hover:scale-105 transition-all"
                                        >
                                            <Send className="w-3.5 h-3.5" />
                                        </button>
                                        <button className="p-1.5 bg-white/5 text-gray-400 hover:text-white rounded-[4px] border border-white/5">
                                            <MoreHorizontal className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    <div className="p-5">
                                        {/* Status & Timestamp Header */}
                                        <div className="flex items-center justify-between mb-4">
                                            <div className={cn(
                                                "flex items-center gap-2 px-2 py-0.5 rounded-[4px] border border-transparent transition-all",
                                                statusCfg.bg, statusCfg.border
                                            )}>
                                                <StatusIcon className={cn("w-3 h-3", statusCfg.color)} />
                                                <span className={cn("text-[9px] font-bold tracking-widest", statusCfg.color)}>
                                                    {statusCfg.label}
                                                </span>
                                            </div>
                                            <span className="text-[10px] font-mono text-gray-600 uppercase tracking-tight">
                                                {item.timestamp}
                                            </span>
                                        </div>

                                        {/* Item Content */}
                                        <div className="flex gap-4">
                                            <div className="flex flex-col flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="font-display text-[11px] text-white tracking-widest uppercase truncate max-w-[200px]">
                                                        {item.handle}
                                                    </span>
                                                    <div className="h-1 w-1 rounded-full bg-white/10" />
                                                    <span className="text-[10px] text-gray-500 font-mono">Channel: IG</span>
                                                </div>
                                                <p className="text-gray-300 text-sm leading-relaxed mb-4 bg-white/[0.03] p-3 rounded-[6px] border border-white/[0.02]">
                                                    "{item.comment}"
                                                </p>

                                                {/* Parent Post Preview (If exists) */}
                                                {(item.postImage || item.postCaption) && (
                                                    <div className="flex items-center gap-3 bg-black/40 p-2 rounded-[8px] border border-white/5 mb-4 group/post cursor-pointer">
                                                        <div className="w-12 h-12 rounded-[4px] overflow-hidden border border-white/10 bg-white/5 flex-shrink-0">
                                                            {item.postImage && <img src={item.postImage} alt="" className="w-full h-full object-cover group-hover/post:scale-110 transition-all duration-500" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-[9px] text-gray-500 font-mono uppercase tracking-widest mb-1">Attached Post</div>
                                                            <div className="text-[10px] text-gray-300 font-sans truncate pr-4">{item.postCaption || "No caption"}</div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Threaded Reply */}
                                                {item.replyText && (
                                                    <div className="mt-2 pl-6 relative border-t border-white/5 pt-4">
                                                        <div className="absolute -left-1 top-0 bottom-1/2 w-4 border-l-2 border-b-2 border-brand-purple/20 rounded-bl-lg" />
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <div className="w-5 h-5 rounded-full bg-brand-purple flex items-center justify-center shadow-lg shadow-brand-purple/20">
                                                                <Zap className="w-3 h-3 text-white" />
                                                            </div>
                                                            <span className="text-[10px] font-bold text-brand-purple uppercase tracking-widest">Trakn Automator</span>
                                                        </div>
                                                        <div className="text-xs text-gray-400 italic bg-brand-purple/5 p-3 rounded-r-[8px] rounded-bl-[8px] border border-brand-purple/10 leading-relaxed">
                                                            "{item.replyText}"
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Inline Form Reveal */}
                                    <AnimatePresence>
                                        {replyingId === item.id && (
                                            <motion.div
                                                initial={{ height: 0 }}
                                                animate={{ height: "auto" }}
                                                exit={{ height: 0 }}
                                                className="overflow-hidden border-t border-brand-purple/20 bg-brand-purple/5"
                                            >
                                                <div className="p-4 space-y-3">
                                                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                                                        {macros.map((macro) => (
                                                            <button
                                                                key={macro.label}
                                                                onClick={() => setReplyText("@" + item.handle + " " + macro.text)}
                                                                className="text-[9px] font-bold uppercase tracking-widest bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-brand-purple/40 px-3 py-1.5 rounded-[4px] whitespace-nowrap transition-all"
                                                            >
                                                                {macro.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            autoFocus
                                                            value={replyText}
                                                            onChange={(e) => setReplyText(e.target.value)}
                                                            placeholder={`Compose response to @${item.handle}...`}
                                                            className="flex-1 bg-black border border-white/10 px-4 py-2.5 text-xs text-white focus:outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple/20 rounded-[6px]"
                                                            onKeyDown={(e) => e.key === "Enter" && handleSend(item)}
                                                        />
                                                        <button
                                                            onClick={() => handleSend(item)}
                                                            className="bg-brand-purple hover:bg-brand-purple-hover text-white px-6 py-2 transition-all font-bold text-[10px] uppercase rounded-[6px] shadow-lg shadow-brand-purple/20"
                                                        >
                                                            Reply
                                                        </button>
                                                        <button
                                                            onClick={() => setReplyingId(null)}
                                                            className="p-2.5 bg-white/5 text-gray-500 hover:text-white rounded-[6px] border border-white/10"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
}
