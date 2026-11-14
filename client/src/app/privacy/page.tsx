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
                        <br /><br />
                        We may also use the email address on your account to contact you about your account or important changes to the service, and occasionally to ask for your feedback about Storio. If you would rather not hear from us, email andismtu@gmail.com and we will stop.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-lg font-bold text-white tracking-wide">3. AI-Assisted Features and Third-Party Processing</h2>
                    <p className="text-white/70">
                        Some Storio features use third-party AI services to generate their results: Google (Gemini API) and OpenAI. When you use these features, the following is sent to these providers for processing:
                        <br /><br />
                        • <strong>Reflection polishing:</strong> the reflection text you write.<br />
                        • <strong>Reflection suggestions:</strong> the title, synopsis, media type and rating of the work you are viewing.<br />
                        • <strong>AI search:</strong> the search description you type.<br /><br />
                        This happens only when you use those features, and the data is used to deliver the result you requested. We do not send your email address, name or account identifier to these providers. How these providers handle the data is governed by their own privacy policies and terms.
                        <br /><br />
                        Searches for movies, series and books are answered by TMDB and Google Books: the text you type into search is forwarded to them to find matching titles. We do not send them your email address, name or account identifier.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-lg font-bold text-white tracking-wide">4. Analytics and Your Data</h2>
                    <p className="text-white/70">
                        Storio does not use third-party tracking scripts, advertising networks or tracking cookies, and we do not show advertisements. We do keep basic first-party usage records so we can tell whether the app works and which features are used: for example, that the app was opened, a list was browsed, a search was made, an item was added to your Folio, or a share was completed. These records are linked to your account (or to a random identifier if you use Storio without signing in) and do not contain your reflection text. We also log technical details of AI requests, such as which feature was used, how long it took and how many tokens it used, without your content or account identifier.
                        <br /><br />
                        We do not sell your personal data, and we do not use your reflections or collections to train AI models. If this changes, we will update this policy before it takes effect.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-lg font-bold text-white tracking-wide">5. Data Sharing and Disclosure</h2>
                    <p className="text-white/70">
                        We do not sell your personal data to data brokers. We may share necessary data with trusted third-party service providers who assist us in operating our application, conducting our business, or serving our users, so long as those parties agree to keep this information confidential according to industry standards.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-lg font-bold text-white tracking-wide">6. Security of Your Information</h2>
                    <p className="text-white/70">
                        We implement a variety of security measures to maintain the safety of your personal information. However, please be aware that no transmission of data over the internet or any wireless network can be guaranteed to be 100% secure.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-lg font-bold text-white tracking-wide">7. Your Rights</h2>
                    <p className="text-white/70">
                        You maintain the right to access, correct, or delete your personal data stored within Storio. You can execute these rights directly through the Profile settings within the application or by contacting us at andismtu@gmail.com.
                    </p>
                </section>

                <div className="pt-8 mb-10 border-t border-white/10 text-white/40 text-xs">
                    Last Updated: November 2026
                </div>
            </main>
        </div>
    );
}
