"use client";

import { LayoutDashboard, Users, Zap, Settings, Activity, ShieldCheck, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
    isSystemOnline: boolean;
    activePath?: string;
    onPathChange?: (path: string) => void;
}

export default function Sidebar({ isSystemOnline, activePath = "dashboard", onPathChange }: SidebarProps) {
    const navItems = [
        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
        { id: "contacts", label: "Contacts", icon: Users },
        { id: "automations", label: "Automations", icon: Zap },
        { id: "activity", label: "Activity", icon: Activity },
        { id: "settings", label: "Settings", icon: Settings },
    ];

    return (
        <aside className="w-64 border-r border-border bg-black/40 backdrop-blur-xl flex flex-col h-screen sticky top-0">
            {/* Brand Logo */}
            <div className="p-8 pb-12">
                <h1 className="font-display text-xl tracking-tighter uppercase text-white">
                    Trakn <span className="text-brand-purple">Command</span>
                </h1>
                <p className="text-[10px] font-mono text-gray-500 tracking-[0.3em] uppercase mt-2">Intelligence v1.0</p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 space-y-1">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onPathChange?.(item.id)}
                        className={cn(
                            "sidebar-item w-full",
                            activePath === item.id && "sidebar-item-active"
                        )}
                    >
                        <item.icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{item.label}</span>
                    </button>
                ))}
            </nav>

            {/* System Status Footer */}
            <div className="p-6 mt-auto border-t border-border/50">
                <div className={cn(
                    "flex items-center gap-3 p-3 rounded-[8px] border transition-all duration-500",
                    isSystemOnline
                        ? "bg-green-500/5 border-green-500/20 text-green-500"
                        : "bg-red-500/5 border-red-500/20 text-red-500"
                )}>
                    {isSystemOnline ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-mono tracking-wider font-bold">System {isSystemOnline ? "Live" : "Offline"}</span>
                        <span className="text-[9px] text-gray-500 font-mono">Protected by Trakn</span>
                    </div>
                    <div className={cn(
                        "ml-auto w-1.5 h-1.5 rounded-full",
                        isSystemOnline ? "bg-green-500 animate-pulse" : "bg-red-500"
                    )} />
                </div>
            </div>
        </aside>
    );
}
