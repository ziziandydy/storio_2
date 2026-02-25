'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function TermsPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-folio-black text-white/90 pb-20 font-serif">
            <header className="sticky top-0 z-30 bg-folio-black/80 backdrop-blur-xl p-6 flex items-center gap-6 border-b border-white/10">
                <button onClick={() => router.back()} className="text-white/60 hover:text-white transition-colors bg-white/5 p-3 rounded-full shrink-0">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-xl font-bold tracking-widest text-accent-gold">TERMS OF USE</h1>
            </header>

            <main className="max-w-2xl mx-auto p-6 space-y-8 mt-4 text-sm leading-relaxed">
                <section className="space-y-3">
                    <h2 className="text-lg font-bold text-white tracking-wide">1. Acceptance of Terms</h2>
                    <p className="text-white/70">
                        Welcome to Storio. By accessing or using our application, you agree to comply with and be bound by these Terms of Use. If you do not agree with any part of these terms, please refrain from using the application.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-lg font-bold text-white tracking-wide">2. User Account and Data</h2>
                    <p className="text-white/70">
                        To unlock certain features such as cloud synchronization, you may be required to register for an account. You are responsible for maintaining the confidentiality of your account credentials. The insights, reflections, and story entries you add are owned by you. However, by using Storio, you grant us a non-exclusive license to process your data to maintain the service.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-lg font-bold text-white tracking-wide">3. Content and Conduct</h2>
                    <p className="text-white/70">
                        Storio allows you to collect metadata about movies, series, and books. You agree not to use Storio to store illegal, infringing, or malicious content. We reserve the right to remove any content or suspend accounts that violate these terms or applicable laws.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-lg font-bold text-white tracking-wide">4. Data Utilization for Service Improvement</h2>
                    <p className="text-white/70">
                        We continuously strive to enhance Storio&apos;s user experience. As part of our service, we may use anonymized or aggregated data (such as rating distributions or curation trends) to train generalized machine learning models, personalize content recommendations, or optimize app performance. Your private reflections will not be publicly exposed.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-lg font-bold text-white tracking-wide">5. Changes to Terms</h2>
                    <p className="text-white/70">
                        We reserve the right to modify these Terms of Use at any time. We will provide notice of significant changes within the application. Your continued use of Storio following the posting of changes constitutes your acceptance of such changes.
                    </p>
                </section>

                <section className="space-y-3">
                    <h2 className="text-lg font-bold text-white tracking-wide">6. Limitation of Liability</h2>
                    <p className="text-white/70">
                        Storio is provided &quot;as is&quot; without warranties of any kind, whether express or implied. We do not guarantee that the service will be uninterrupted or error-free. In no event shall we be liable for any indirect, incidental, special, or consequential damages arising out of your use of the service.
                    </p>
                </section>

                <div className="pt-8 mb-10 border-t border-white/10 text-white/40 text-xs">
                    Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </div>
            </main>
        </div>
    );
}
