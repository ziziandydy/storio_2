'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, UserPlus, X, ShieldCheck, Sparkles, Star, Mail, ArrowLeft, Loader2, Camera, User, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import { useTranslation } from '@/hooks/useTranslation';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ToastProvider';
import { useAuth } from '@/hooks/useAuth';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (provider: 'google' | 'apple' | 'email') => void;
  onContinueAsGuest: () => void;
  initialStep?: 'social' | 'email' | 'otp' | 'profile';
}

export default function OnboardingModal({ isOpen, onClose, onLogin, onContinueAsGuest, initialStep = 'social' }: OnboardingModalProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { updateProfile } = useAuth();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // State
  const [authStep, setAuthStep] = useState<'social' | 'email' | 'otp' | 'profile'>(initialStep);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [gender, setGender] = useState('');
  const [birthday, setBirthday] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Sync initialStep if it changes externally
  React.useEffect(() => {
    if (isOpen) {
      setAuthStep(initialStep);
      // Pre-fill only if metadata exists
      if (initialStep === 'profile') {
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) {
            setUsername(user.user_metadata?.display_name || user.user_metadata?.full_name || '');
            setGender(user.user_metadata?.gender || '');
            setBirthday(user.user_metadata?.birthday || '');
            setAvatarUrl(user.user_metadata?.avatar_url || '');
          }
        });
      }
    }
  }, [initialStep, isOpen]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        showToast('Image must be less than 5MB', 'error');
        return;
    }

    setUploading(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not found');

        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        setAvatarUrl(publicUrl);
        showToast('Avatar uploaded', 'success');
    } catch (error: any) {
        console.error(error);
        showToast(error.message || 'Upload failed', 'error');
    } finally {
        setUploading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
      setAuthStep('otp');
    } catch (error: any) {
      console.error(error);
      showToast(error.message || t.common.error, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email'
      });
      if (error) throw error;
      
      const user = data.user;
      
      // Immediately after login, if metadata is missing, show profile step
      if (user && !user.user_metadata?.profile_completed) {
        setUsername(user.user_metadata?.display_name || user.user_metadata?.full_name || '');
        setAvatarUrl(user.user_metadata?.avatar_url || '');
        setAuthStep('profile');
      } else {
        onClose(); 
      }
    } catch (error: any) {
      console.error(error);
      showToast(error.message || t.common.error, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    setLoading(true);
    try {
        const { error } = await updateProfile({
            gender,
            birthday,
            display_name: username,
            avatar_url: avatarUrl,
            profile_completed: true
        });
        if (error) throw error;
        onClose();
    } catch (error: any) {
        console.error(error);
        showToast(error.message || t.common.error, 'error');
    } finally {
        setLoading(false);
    }
  };

  const handleSkip = () => {
    sessionStorage.setItem('storio_skipped_profile', 'true');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/95 backdrop-blur-xl"
          />

          {/* Modal Content */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className={`relative w-full ${authStep === 'social' ? 'max-w-lg' : 'max-w-md'} bg-folio-black border border-white/10 rounded-[32px] overflow-hidden shadow-[0_0_100px_rgba(233,108,38,0.15)] flex flex-col md:flex-row h-auto min-h-[500px] transition-all duration-500`}
          >
            {/* Left: Visual/Intro */}
            <AnimatePresence>
                {authStep === 'social' && (
                    <motion.div 
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: '40%', opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        className="hidden md:flex relative bg-folio-card overflow-hidden border-r border-white/5"
                    >
                        <Image 
                            src="/image/authBackground.webp" 
                            alt="Storio Art" 
                            fill 
                            className="object-cover opacity-50 grayscale hover:grayscale-0 transition-all duration-1000"
                            sizes="20vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-folio-black via-transparent to-transparent" />
                        <div className="absolute bottom-8 left-8 right-8">
                            <div className="text-accent-gold mb-2"><Sparkles size={24} /></div>
                            <h3 className="text-xl font-serif font-bold text-white leading-tight">{t.onboarding.tagline}</h3>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Right: Actions */}
            <div className="flex-1 p-8 md:p-10 flex flex-col justify-center relative">
                
                {/* Back Button */}
                {(authStep === 'email' || authStep === 'otp') && (
                    <button 
                        onClick={() => setAuthStep(authStep === 'otp' ? 'email' : 'social')}
                        className="absolute top-8 left-8 p-2 text-text-desc hover:text-white transition-colors bg-white/5 rounded-full"
                    >
                        <ArrowLeft size={18} />
                    </button>
                )}

                {/* --- Step 1: Social Login --- */}
                {authStep === 'social' && (
                    <div className="flex flex-col gap-8 animate-in fade-in zoom-in-95 duration-300">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 flex items-center justify-center">
                                    <Image src="/image/logo/logo.png" width={40} height={40} alt="Storio" className="object-contain" />
                                </div>
                                <h2 className="text-2xl font-bold font-serif text-white tracking-wide">{t.onboarding.welcome}</h2>
                            </div>
                            <p className="text-text-secondary text-sm leading-relaxed">
                                {t.onboarding.description}
                            </p>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button 
                                onClick={() => onLogin('google')}
                                className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-gray-200 transition-all shadow-xl active:scale-[0.98]"
                            >
                                <Image src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width={18} height={18} alt="Google" />
                                {t.onboarding.google}
                            </button>
                            
                            <button 
                                onClick={() => onLogin('apple')}
                                className="w-full py-4 bg-black border border-white/20 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-white/5 transition-all active:scale-[0.98]"
                            >
                                <Image src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" width={18} height={18} alt="Apple" className="invert" />
                                {t.onboarding.apple}
                            </button>

                            <button 
                                onClick={() => setAuthStep('email')}
                                className="w-full py-4 bg-white/5 text-white border border-white/10 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-white/10 transition-all active:scale-[0.98]"
                            >
                                <Mail size={18} />
                                {t.onboarding.email}
                            </button>

                            <div className="relative py-2 flex items-center justify-center">
                                <div className="absolute inset-x-0 h-px bg-white/5" />
                                <span className="relative z-10 bg-folio-black px-4 text-[10px] uppercase font-bold tracking-widest text-text-desc">{t.onboarding.or}</span>
                            </div>

                            <button 
                                onClick={onContinueAsGuest}
                                className="w-full py-3 rounded-2xl text-text-desc hover:text-white font-bold uppercase tracking-widest text-[10px] transition-colors border border-dashed border-white/10 hover:border-white/30"
                            >
                                {t.onboarding.guest}
                            </button>
                        </div>
                    </div>
                )}

                {/* --- Step 2: Email Input --- */}
                {authStep === 'email' && (
                    <form onSubmit={handleEmailSubmit} className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="space-y-3 mt-4">
                            <h2 className="text-3xl font-bold font-serif text-white tracking-tight">{t.onboarding.email}</h2>
                            <p className="text-text-desc text-sm leading-relaxed">
                                Enter your email to receive a secure 6-digit login code.
                            </p>
                        </div>

                        <div className="space-y-6">
                            <div className="relative group">
                                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-text-desc group-focus-within:text-accent-gold transition-colors" size={20} />
                                <input 
                                    type="email" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder={t.onboarding.emailPlaceholder}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 py-5 text-white placeholder:text-text-desc/40 focus:outline-none focus:border-accent-gold/50 focus:bg-white/[0.08] transition-all text-base"
                                    autoFocus
                                    required
                                />
                            </div>
                            
                            <button 
                                type="submit"
                                disabled={loading}
                                className="w-full py-5 bg-accent-gold text-folio-black rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-white transition-all shadow-2xl shadow-accent-gold/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : t.onboarding.verify}
                            </button>
                        </div>
                    </form>
                )}

                {/* --- Step 3: OTP Input --- */}
                {authStep === 'otp' && (
                    <form onSubmit={handleOtpSubmit} className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="space-y-3 mt-4 text-center">
                            <h2 className="text-3xl font-bold font-serif text-white tracking-tight">{t.onboarding.otpTitle}</h2>
                            <p className="text-text-desc text-sm leading-relaxed">
                                {t.onboarding.otpDesc} <br/><span className="text-white font-bold">{email}</span>
                            </p>
                        </div>

                        <div className="space-y-8">
                            <input 
                                type="text" 
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="000000"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-6 text-white placeholder:text-white/5 focus:outline-none focus:border-accent-gold/50 focus:bg-white/[0.08] transition-all text-4xl font-mono tracking-[0.4em] text-center"
                                autoFocus
                                maxLength={6}
                            />
                            
                            <div className="flex flex-col gap-4">
                                <button 
                                    type="submit"
                                    disabled={loading || otp.length !== 6}
                                    className="w-full py-5 bg-accent-gold text-folio-black rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-white transition-all shadow-2xl shadow-accent-gold/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : t.onboarding.verify}
                                </button>

                                <button 
                                    type="button"
                                    onClick={handleEmailSubmit}
                                    disabled={loading}
                                    className="w-full py-2 text-text-desc hover:text-white text-[10px] font-black uppercase tracking-[0.2em] transition-colors"
                                >
                                    {t.onboarding.resend}
                                </button>
                            </div>
                        </div>
                    </form>
                )}

                {/* --- Step 4: Profile Completion --- */}
                {authStep === 'profile' && (
                    <form onSubmit={handleProfileSubmit} className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="space-y-2 mt-4">
                            <h2 className="text-2xl font-bold font-serif text-white tracking-tight">{t.onboarding.profileTitle}</h2>
                            <p className="text-text-desc text-[10px] leading-relaxed">
                                {t.onboarding.profileDesc}
                            </p>
                        </div>

                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                            {/* Avatar Edit */}
                            <div className="flex flex-col items-center gap-3 mb-2">
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-20 h-20 rounded-full bg-accent-gold flex items-center justify-center border-4 border-white/5 shadow-xl overflow-hidden relative group/avatar cursor-pointer"
                                >
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={40} className="text-folio-black" />
                                    )}
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                                        <Camera size={20} className="text-white" />
                                    </div>
                                    {uploading && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                            <Loader2 size={20} className="text-white animate-spin" />
                                        </div>
                                    )}
                                </div>
                                <input 
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleAvatarUpload}
                                    accept="image/*"
                                    className="hidden"
                                />
                                <span className="text-[10px] font-bold text-accent-gold uppercase tracking-widest">{t.onboarding.editAvatar}</span>
                            </div>

                            {/* Username Input */}
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold tracking-widest text-text-desc ml-1">{t.onboarding.username}</label>
                                <input 
                                    type="text" 
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Curator Name"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-white focus:outline-none focus:border-accent-gold/50 transition-all text-sm font-bold"
                                />
                            </div>

                            {/* Gender Selection */}
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold tracking-widest text-text-desc ml-1">{t.onboarding.gender}</label>
                                <div className="relative group">
                                    <select 
                                        value={gender}
                                        onChange={(e) => setGender(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-white appearance-none focus:outline-none focus:border-accent-gold/50 transition-all text-sm font-bold [color-scheme:dark]"
                                    >
                                        <option value="" className="bg-folio-black text-text-desc">Select Gender</option>
                                        <option value="male" className="bg-folio-black text-white">{t.onboarding.genderMale}</option>
                                        <option value="female" className="bg-folio-black text-white">{t.onboarding.genderFemale}</option>
                                        <option value="non-binary" className="bg-folio-black text-white">{t.onboarding.genderNonBinary}</option>
                                        <option value="not-say" className="bg-folio-black text-white">{t.onboarding.genderPreferNotToSay}</option>
                                    </select>
                                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-text-desc group-focus-within:text-accent-gold transition-colors">
                                        <ChevronDown size={16} />
                                    </div>
                                </div>
                            </div>

                            {/* Birthday Input */}
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold tracking-widest text-text-desc ml-1">{t.onboarding.birthday}</label>
                                <div className="relative group">
                                    <input 
                                        type="date"
                                        value={birthday}
                                        onChange={(e) => setBirthday(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-white focus:outline-none focus:border-accent-gold/50 transition-all text-sm font-bold [color-scheme:dark]"
                                    />
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex flex-col gap-3 mt-2">
                            <button 
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-accent-gold text-folio-black rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-white transition-all shadow-2xl shadow-accent-gold/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : t.onboarding.complete}
                            </button>

                            <button 
                                type="button"
                                onClick={handleSkip}
                                className="w-full py-2 text-text-desc hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors"
                            >
                                {t.onboarding.skip}
                            </button>
                        </div>
                    </form>
                )}

                {/* Note */}
                {authStep === 'social' && (
                    <div className="mt-6 flex items-center gap-3 bg-white/5 p-4 rounded-xl border border-white/5">
                        <ShieldCheck className="text-accent-gold shrink-0" size={18} />
                        <p className="text-[10px] text-text-desc leading-tight" dangerouslySetInnerHTML={{ __html: t.onboarding.guestNote.replace('<bold>', '<span class="text-white font-bold">').replace('</bold>', '</span>') }} />
                    </div>
                )}
            </div>

            {/* Close Button */}
            {(authStep !== 'profile') && (
                <button 
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 text-text-desc hover:text-white transition-colors z-10"
                >
                    <X size={24} />
                </button>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
