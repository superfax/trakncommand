"use client";

import { Lock, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-background text-foreground font-sans p-8 md:p-24">
            <div className="max-w-3xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-xs font-mono uppercase tracking-widest">
                    <ArrowLeft className="w-3 h-3" /> Back to App
                </Link>

                <header className="space-y-4">
                    <div className="w-12 h-12 rounded-[12px] bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center">
                        <Lock className="w-6 h-6 text-brand-purple" />
                    </div>
                    <h1 className="text-4xl font-display uppercase tracking-tighter text-white">Privacy Policy</h1>
                    <p className="text-gray-500 font-mono text-sm">Effective Date: February 21, 2026</p>
                </header>

                <section className="space-y-8 text-gray-400 leading-relaxed font-sans">
                    <div className="space-y-4">
                        <h2 className="text-xl font-display text-white uppercase tracking-wide">1. Introduction</h2>
                        <p>
                            Trakn Command ("we", "us", or "our") provides automation services for Instagram and Facebook via the Meta Graph API.
                            We are committed to protecting your privacy and ensuring transparency in how we handle data.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-xl font-display text-white uppercase tracking-wide">2. Data We Collect</h2>
                        <p>
                            To provide our services, we access specific data through Meta's official API:
                        </p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Public Comments</strong>: To detect automation keywords.</li>
                            <li><strong>Direct Messages</strong>: To provide automated responses to fans.</li>
                            <li><strong>User Handles</strong>: To manage your lead list within the app.</li>
                        </ul>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-xl font-display text-white uppercase tracking-wide">3. How We Use Data</h2>
                        <p>
                            We use your data EXCLUSIVELY to perform requested automations (e.g., replying to a keyword).
                            WE NEVER SELL YOUR DATA OR SHARE IT WITH THIRD PARTIES.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-xl font-display text-white uppercase tracking-wide">4. Data Retention</h2>
                        <p>
                            Lead data and activity logs are stored locally for your reference. You can clear these logs or delete contacts
                            at any time within the app settings.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-xl font-display text-white uppercase tracking-wide">5. Your Choices</h2>
                        <p>
                            You can revoke our app's access at any time through your Meta / Facebook settings.
                            Within Trakn, you can toggle the "Master Switch" to immediately stop all background activity.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-xl font-display text-white uppercase tracking-wide">6. Contact</h2>
                        <p>
                            For any questions regarding this policy, contact the system administrator.
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
