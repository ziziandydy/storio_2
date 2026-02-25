'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PrivacyPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-folio-black text-white/90 pb-20 font-serif">
            <header className="sticky top-0 z-30 bg-folio-black/80 backdrop-blur-xl p-6 flex items-center gap-6 border-b border-white/10">
                <button onClick={() => router.back()} className="text-white/60 hover:text-white transition-colors bg-white/5 p-3 rounded-full shrink-0">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-xl font-bold tracking-widest text-accent-gold">PRIVACY POLICY</h1>
            </header>

            <main className="max-w-2xl mx-auto p-6 space-y-8 mt-4 text-sm leading-relaxed">
                <p className="text-white/70 italic text-xs mb-8">
                    At Storio, we treat your memories and data with respect. This Privacy Policy outlines how we collect, use, and safeguard your information.
                </p>

                <section className="space-y-3">
                    <h2 className="text-lg font-bold text-white tracking-wide">1. Information We Collect</h2>
                    <p className="text-white/70">
                        We collect information you directly provide to us, such as your email address when you create an account, as well as the content you add to your Folio (e.g., ratings, reviews, collection lists). Furthermore, we may automatically collect certain device and usage information when you interact with the application.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-lg font-bold text-white tracking-wide">2. How We Use Your Information</h2>
                    <p className="text-white/70">
                        The data we collect is primarily used to provide, maintain, and improve the Storio service. This includes synchronizing your data across devices securely.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-lg font-bold text-white tracking-wide">3. Analytics, Training, and Personalization</h2>
                    <p className="text-white/70 bg-white/5 p-4 rounded-xl border border-white/10 mt-2">
                        <strong>Data Processing Rights:</strong> To ensure the continuous evolution and sustainability of Storio, we reserve the right to utilize collected data (including usage patterns and generalized collection metrics) for analytic and operational purposes. This encompasses, but is not limited to:
                        <br /><br />
                        • <strong>Tracking and Analytics:</strong> Integration of third-party tracking scripts or cookies to monitor app performance and user interactions.<br />
                        • <strong>Personalized Advertising:</strong> Delivering targeted advertisements or promotional content based on your interaction history.<br />
                        • <strong>Machine Learning & Data Training:</strong> Utilizing anonymized dataset aggregations to train AI models that power features such as "Storio Recommendations" or automated insights.<br /><br />
                        We prioritize stripping Personally Identifiable Information (PII) before using your data for broad statistical or training purposes.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-lg font-bold text-white tracking-wide">4. Data Sharing and Disclosure</h2>
                    <p className="text-white/70">
                        We do not sell your personal data to data brokers. We may share necessary data with trusted third-party service providers who assist us in operating our application, conducting our business, or serving our users, so long as those parties agree to keep this information confidential according to industry standards.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-lg font-bold text-white tracking-wide">5. Security of Your Information</h2>
                    <p className="text-white/70">
                        We implement a variety of security measures to maintain the safety of your personal information. However, please be aware that no transmission of data over the internet or any wireless network can be guaranteed to be 100% secure.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-lg font-bold text-white tracking-wide">6. Your Rights</h2>
                    <p className="text-white/70">
                        You maintain the right to access, correct, or delete your personal data stored within Storio. You can execute these rights directly through the Profile settings within the application or by contacting us at andismtu@gmail.com.
                    </p>
                </section>

                <div className="pt-8 mb-10 border-t border-white/10 text-white/40 text-xs">
                    Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </div>
            </main>
        </div>
    );
}
