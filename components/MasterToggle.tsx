"use client";

import { motion } from "framer-motion";
import { Power } from "lucide-react";

interface MasterToggleProps {
    isOn: boolean;
    onToggle: () => void;
}

export default function MasterToggle({ isOn, onToggle }: MasterToggleProps) {
    return (
        <div className="flex flex-col items-center gap-4">
            <div className="text-sm uppercase tracking-widest text-gray-500 font-medium">
                System Status
            </div>

            <button
                onClick={onToggle}
                className={`relative w-14 h-24 rounded-[4px] border transition-all duration-300 ${isOn
                    ? "border-brand-purple bg-brand-purple/10 shadow-[0_0_10px_rgba(168,85,247,0.2)]"
                    : "border-gray-800 bg-gray-900/50"
                    } flex flex-col justify-between p-1`}
            >
                {/* Toggle Indicator */}
                <motion.div
                    layout
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className={`w-full aspect-square rounded-[2px] flex items-center justify-center shadow-md ${isOn ? "bg-brand-purple mb-auto" : "bg-gray-800 border border-gray-700 mt-auto"
                        }`}
                >
                    <Power className={`w-4 h-4 ${isOn ? "text-white" : "text-gray-500"}`} />
                </motion.div>

                {/* Status Text inside switch */}
                <div className={`absolute left-0 right-0 ${isOn ? "bottom-3" : "top-3"} text-center`}>
                    <span className={`text-[9px] font-mono tracking-widest ${isOn ? "text-brand-purple" : "text-gray-600"}`}>
                        {isOn ? "ON" : "OFF"}
                    </span>
                </div>
            </button>

            <div className={`font-display text-xl tracking-wider transition-colors duration-300 ${isOn ? "text-white neon-text" : "text-gray-600"}`}>
                {isOn ? "ONLINE" : "OFFLINE"}
            </div>
        </div>
    );
}
