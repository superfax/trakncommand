"use client";

import { motion } from "framer-motion";
import { Power } from "lucide-react";

interface MasterToggleProps {
    isOn: boolean;
    onToggle: () => void;
}

export default function MasterToggle({ isOn, onToggle }: MasterToggleProps) {
    return (
        <button
            onClick={onToggle}
            className={`relative w-16 h-8 rounded-full border transition-all duration-300 ${isOn
                ? "border-brand-purple bg-brand-purple/10 shadow-[0_0_10px_rgba(168,85,247,0.2)]"
                : "border-gray-800 bg-gray-900/50"
                } flex items-center px-1`}
        >
            <motion.div
                layout
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className={`w-6 h-6 rounded-full flex items-center justify-center shadow-md ${isOn ? "bg-brand-purple ml-auto" : "bg-gray-800 border border-gray-700 mr-auto"
                    }`}
            >
                <Power className={`w-3 h-3 ${isOn ? "text-white" : "text-gray-500"}`} />
            </motion.div>
        </button>
    );
}
