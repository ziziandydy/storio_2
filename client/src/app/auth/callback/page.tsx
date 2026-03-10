'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import Image from 'next/image';

export default function AuthCallbackPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { t } = useTranslation();

    useEffect(() => {
        // Supabase client automatically handles hash fragments and updates the session
        // Just wait for the session to be populated in the store and redirect
        if (user) {
            router.replace('/');
        } else {
            // If we land here but supabase client doesn't find a session after a timeout, 
            // redirect back
            const timer = setTimeout(() => {
                router.replace('/?auth=failed');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [user, router]);

    return (
        <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center p-6">
            <div className="flex flex-col items-center gap-8 max-w-sm mb-12">
                <div className="relative w-48 h-48 opacity-90">
                    <Image src="/image/loading.gif" alt="Loading..." fill className="object-contain" unoptimized priority />
                </div>
                <div className="text-center space-y-3">
                    <p className="text-accent-gold font-bold tracking-[0.3em] uppercase text-xs animate-pulse">
                        Authenticating...
                    </p>
                </div>
            </div>
        </div>
    );
}
