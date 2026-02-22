"use client";

import { useState, useEffect } from "react";
import { Check, Edit2, Loader2 } from "lucide-react";

export default function KeywordManager() {
    const [keyword, setKeyword] = useState("PRO");
    const [isEditing, setIsEditing] = useState(false);
    const [tempKeyword, setTempKeyword] = useState("PRO");
    const [isSaving, setIsSaving] = useState(false);

    // Fetch initial settings
    useEffect(() => {
        fetch("/api/settings")
            .then(res => res.json())
            .then(data => {
                if (data.keyword) {
                    setKeyword(data.keyword);
                    setTempKeyword(data.keyword);
                }
            });
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ keyword: tempKeyword })
            });
            const data = await res.json();
            if (data.keyword) {
                setKeyword(data.keyword);
            }
        } catch (error) {
            console.error("Failed to save keyword", error);
        } finally {
            setIsEditing(false);
            setIsSaving(false);
        }
    };

    return (
        <div className="glass-panel p-6 rounded-2xl w-full">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-400 uppercase text-xs tracking-widest">Trigger Keyword</h3>
                {!isEditing && (
                    <button
                        onClick={() => {
                            setTempKeyword(keyword);
                            setIsEditing(true);
                        }}
                        className="text-gray-500 hover:text-brand-purple transition-colors"
                    >
                        <Edit2 className="w-3 h-3" />
                    </button>
                )}
            </div>

            <div className="relative">
                {isEditing ? (
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={tempKeyword}
                            onChange={(e) => setTempKeyword(e.target.value.toUpperCase())}
                            className="w-full bg-black/50 border border-brand-purple/50 rounded px-3 py-2 text-brand-purple font-mono text-center tracking-widest focus:outline-none focus:border-brand-purple transition-colors uppercase"
                            autoFocus
                        />
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="p-2 bg-brand-purple/20 hover:bg-brand-purple/40 text-brand-purple rounded transition-colors"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </button>
                    </div>
                ) : (
                    <div className="w-full bg-black/30 border border-white/5 rounded px-3 py-2 text-white font-mono text-center tracking-widest text-lg">
                        {keyword}
                    </div>
                )}
            </div>

            <div className="mt-2 text-[10px] text-gray-500 text-center">
                Comments containing this word will trigger the automation.
            </div>
        </div>
    );
}
