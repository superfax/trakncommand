"use client";

import { Shield, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function TermsOfService() {
    return (
        <div className="min-h-screen bg-background text-foreground font-sans p-8 md:p-24">
            <div className="max-w-3xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-xs font-mono uppercase tracking-widest">
                    <ArrowLeft className="w-3 h-3" /> Back to App
                </Link>

                <header className="space-y-4">
                    <div className="w-12 h-12 rounded-[12px] bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center">
                        <Shield className="w-6 h-6 text-brand-purple" />
                    </div>
                    <h1 className="text-4xl font-display uppercase tracking-tighter text-white">Terms of Service</h1>
                    <p className="text-gray-500 font-mono text-sm">Last Updated: February 21, 2026</p>
                </header>

                <section className="space-y-8 text-gray-400 leading-relaxed font-sans">
                    <div className="space-y-4">
                        <h2 className="text-xl font-display text-white uppercase tracking-wide">1. Acceptance of Terms</h2>
                        <p>
                            By connecting your Instagram or Facebook account to Trakn Command, you agree to comply with these
                            terms and Meta's Platform Policies.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-xl font-display text-white uppercase tracking-wide">2. Use of Service</h2>
                        <p>
                            This tool is designed for marketing automation. You are responsible for ensuring your auto-replies
                            comply with community standards and anti-spam laws.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-xl font-display text-white uppercase tracking-wide">3. Restrictions</h2>
                        <p>
                            You may not use Trakn Command to:
                        </p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>Send deceptive or harmful links to users.</li>
                            <li>Impersonate other entities or individuals.</li>
                            <li>Exceed Meta's rate limits for messaging.</li>
                        </ul>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-xl font-display text-white uppercase tracking-wide">4. Limitation of Liability</h2>
                        <p>
                            Trakn Command is provided "as is". We are not responsible for any account restrictions or bans
                            resulting from the misuse of automation features.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-xl font-display text-white uppercase tracking-wide">5. Termination</h2>
                        <p>
                            We reserve the right to suspend access to the service if these terms are violated.
                        </p>
                    </div>
                </section>

                <footer className="pt-12 border-t border-white/5 text-[10px] text-gray-600 font-mono uppercase tracking-widest text-center">
                    Trakn Command Intelligence System &copy; 2026
                </footer>
            </div>
        </div>
    );
}
