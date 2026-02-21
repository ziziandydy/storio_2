'use client';

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, User, Shield, Bell, Globe, Mail, 
  MessageSquare, Star, Share2, LogIn, Database, 
  ChevronRight, Info, AlertCircle, LogOut, Layers,
  Edit3, Save, X, Check
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useSettingsStore } from '@/store/settingsStore';
import { useTranslation } from '@/hooks/useTranslation';
import OnboardingModal from '@/components/OnboardingModal';
import { supabase } from '@/lib/supabase';

interface ProfileSectionProps {
  title: string;
  children: React.ReactNode;
}

const ProfileSection = ({ title, children }: ProfileSectionProps) => (
  <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <h3 className="text-[10px] uppercase tracking-[0.3em] text-text-desc font-bold mb-4 px-2 opacity-60">
      {title}
    </h3>
    <div className="bg-folio-card border border-white/5 rounded-2xl overflow-hidden shadow-xl">
      {children}
    </div>
  </div>
);

interface ProfileItemProps {
  icon: React.ReactNode;
  label: string;
  value?: string | React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  toggle?: boolean;
  checked?: boolean;
}

const ProfileItem = ({ icon, label, value, onClick, danger = false, toggle = false, checked = false }: ProfileItemProps) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors group border-b border-white/5 last:border-0"
  >
    <div className="flex items-center gap-4">
      <div className={`p-2 rounded-xl bg-white/5 ${danger ? 'text-red-500' : 'text-accent-gold'} group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <span className={`text-sm font-medium ${danger ? 'text-red-500' : 'text-text-primary'}`}>{label}</span>
    </div>
    <div className="flex items-center gap-2">
      {toggle ? (
        <div className={`w-10 h-6 rounded-full transition-colors relative flex items-center px-1 ${checked ? 'bg-accent-gold' : 'bg-white/10'}`}>
          <div className={`w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
        </div>
      ) : (
        <>
          {value && <span className="text-xs text-text-desc">{value}</span>}
          <ChevronRight size={16} className="text-text-desc opacity-40 group-hover:opacity-100 transition-opacity" />
        </>
      )}
    </div>
  </button>
);

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, signOut, updateProfile } = useAuth();
  const { language, notificationsEnabled, setLanguage, toggleNotifications } = useSettingsStore();
  const { t } = useTranslation();
  
  // UI States
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Sub-view States
  const [showStatisticsSettings, setShowStatisticsSettings] = useState(false);
  const [showLanguageSettings, setShowLanguageSettings] = useState(false);

  // Statistics Widget State
  const [widgets, setWidgets] = useState<string[]>(['7d', '30d', 'year', 'trend7', 'trend30']);

  useEffect(() => {
    if (user) {
      setDisplayName(user.user_metadata?.display_name || user.email?.split('@')[0] || t.profile.guest);
    }
  }, [user, t]);

  useEffect(() => {
    const saved = localStorage.getItem('storio_dashboard_widgets');
    if (saved) {
      try {
        setWidgets(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const toggleWidget = (id: string) => {
    const next = widgets.includes(id) 
      ? widgets.filter(w => w !== id) 
      : [...widgets, id];
    setWidgets(next);
    localStorage.setItem('storio_dashboard_widgets', JSON.stringify(next));
  };

  const handleBack = () => router.back();

  const handleSaveProfile = async () => {
    if (!displayName.trim()) return;
    setSavingProfile(true);
    await updateProfile({ display_name: displayName });
    setSavingProfile(false);
    setIsEditing(false);
  };

  const handleSignOut = async () => {
    await signOut();
    router.refresh();
  };

  const handleLogin = async (provider: 'google' | 'apple' | 'email') => {
    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: provider as any,
            options: {
                redirectTo: `${window.location.origin}/auth/callback`
            }
        });
        if (error) throw error;
    } catch (error) {
        console.error('Login failed:', error);
    }
  };

  const WIDGET_OPTIONS = [
    { id: '7d', label: t.profile.widgets['7d'] },
    { id: '30d', label: t.profile.widgets['30d'] },
    { id: 'week', label: t.profile.widgets.week },
    { id: 'month', label: t.profile.widgets.month },
    { id: 'year', label: t.profile.widgets.year },
    { id: 'trend7', label: t.profile.widgets.trend7 },
    { id: 'trend30', label: t.profile.widgets.trend30 },
  ];

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Storio',
          text: 'Collect stories in your folio.',
          url: window.location.origin,
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    }
  };

  const getLanguageLabel = (lang: string) => {
    if (lang === 'zh-TW') return '繁體中文';
    if (lang === 'en-US') return 'English';
    return 'System Default';
  };

  // If showing language settings, render sub-view
  if (showLanguageSettings) {
    const LANG_OPTIONS = [
      { id: 'system', label: 'System Default (系統預設)' },
      { id: 'zh-TW', label: '繁體中文 (Traditional Chinese)' },
      { id: 'en-US', label: 'English (US)' },
    ];

    return (
      <div className="min-h-screen bg-folio-black text-text-primary pb-20 animate-in slide-in-from-right duration-300">
        <header className="sticky top-0 z-30 bg-folio-black/80 backdrop-blur-xl p-6 flex items-center gap-6">
          <button onClick={() => setShowLanguageSettings(false)} className="text-text-desc hover:text-white transition-colors bg-white/5 p-3 rounded-full">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold font-serif tracking-wide text-white">{t.profile.langTitle}</h1>
        </header>
        <main className="max-w-md mx-auto p-6">
          <div className="bg-folio-card border border-white/5 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-2 space-y-1">
              {LANG_OPTIONS.map((opt) => (
                <button 
                  key={opt.id}
                  onClick={() => {
                    setLanguage(opt.id as any);
                    setShowLanguageSettings(false);
                  }}
                  className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors group rounded-xl"
                >
                  <span className="text-sm font-medium text-text-primary">{opt.label}</span>
                  {language === opt.id && (
                    <div className="text-accent-gold">
                      <Check size={18} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // If showing statistics settings, render the sub-view
  if (showStatisticsSettings) {
    return (
      <div className="min-h-screen bg-folio-black text-text-primary pb-20">
        <header className="sticky top-0 z-30 bg-folio-black/80 backdrop-blur-xl p-6 flex items-center gap-6">
          <button onClick={() => setShowStatisticsSettings(false)} className="text-text-desc hover:text-white transition-colors bg-white/5 p-3 rounded-full">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold font-serif tracking-wide text-white">{t.profile.statsTitle}</h1>
        </header>
        <main className="max-w-md mx-auto p-6">
          <div className="bg-folio-card border border-white/5 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-2 space-y-1">
              {WIDGET_OPTIONS.map((opt) => (
                <button 
                  key={opt.id}
                  onClick={() => toggleWidget(opt.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors group rounded-xl"
                >
                  <span className="text-sm font-medium text-text-primary">{opt.label}</span>
                  <div className={`w-10 h-6 rounded-full transition-colors relative flex items-center px-1 ${widgets.includes(opt.id) ? 'bg-accent-gold' : 'bg-white/10'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${widgets.includes(opt.id) ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  const isAnonymous = user?.is_anonymous !== false; // Treat null as anonymous too for safety

  return (
    <div className="min-h-screen bg-folio-black text-text-primary pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-folio-black/80 backdrop-blur-xl p-6 flex items-center gap-6">
        <button onClick={handleBack} className="text-text-desc hover:text-white transition-colors bg-white/5 p-3 rounded-full">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold font-serif tracking-wide text-white">{t.profile.title}</h1>
      </header>

      <main className="max-w-md mx-auto p-6">
        {/* User Card */}
        <div className="bg-gradient-to-br from-folio-card to-black p-8 rounded-3xl border border-white/10 mb-10 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent-gold/10 blur-[60px] rounded-full -mr-16 -mt-16 transition-all group-hover:bg-accent-gold/20" />
          
          <div className="flex flex-col items-center gap-4 text-center relative z-10">
            <div className="w-20 h-20 rounded-full bg-accent-gold flex items-center justify-center border-4 border-white/5 shadow-2xl">
              <User size={40} className="text-folio-black" />
            </div>
            
            <div className="w-full flex flex-col items-center">
              {isEditing ? (
                <div className="flex items-center gap-2 mb-1 w-full justify-center animate-in fade-in slide-in-from-bottom-2">
                  <input 
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-center text-lg font-bold text-white focus:outline-none focus:border-accent-gold w-full max-w-[200px]"
                    autoFocus
                  />
                  <button 
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    className="p-2 bg-accent-gold text-folio-black rounded-lg hover:bg-white transition-colors"
                  >
                    {savingProfile ? <div className="w-4 h-4 border-2 border-folio-black border-t-transparent rounded-full animate-spin" /> : <Save size={16} />}
                  </button>
                  <button 
                    onClick={() => { setIsEditing(false); setDisplayName(user?.user_metadata?.display_name || user?.email?.split('@')[0] || t.profile.guest); }}
                    className="p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2 group/edit cursor-pointer" onClick={() => !isAnonymous && setIsEditing(true)}>
                  {displayName}
                  {!isAnonymous && <Edit3 size={14} className="opacity-0 group-hover/edit:opacity-50 text-accent-gold" />}
                </h2>
              )}

              <p className="text-xs text-text-desc tracking-widest uppercase font-bold opacity-60">
                {isAnonymous ? t.profile.guestRole : t.profile.master}
              </p>
            </div>
            
            {isAnonymous && (
                <button 
                    onClick={() => setShowOnboarding(true)}
                    className="mt-4 px-6 py-2 bg-white text-black rounded-full text-xs font-black uppercase tracking-widest hover:bg-gray-200 transition-all flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95"
                >
                    <LogIn size={14} /> {t.profile.loginToSync}
                </button>
            )}
          </div>
        </div>

        {/* Sections */}
        <ProfileSection title={t.profile.sections.account}>
            {!isAnonymous ? (
                 <ProfileItem 
                    icon={<Database size={18} />} 
                    label={t.profile.items.cloudBackup} 
                    value={<span className="text-green-400 flex items-center gap-1"><Check size={12} /> {t.profile.items.active}</span>} 
                 />
            ) : (
                <ProfileItem 
                    icon={<AlertCircle size={18} />} 
                    label={t.profile.items.syncStatus} 
                    value={t.profile.items.notSynced} 
                    danger
                    onClick={() => setShowOnboarding(true)}
                 />
            )}
          <ProfileItem icon={<Shield size={18} />} label={t.profile.items.security} />
        </ProfileSection>

        <ProfileSection title={t.profile.sections.settings}>
          <ProfileItem 
            icon={<Globe size={18} />} 
            label={t.profile.items.language} 
            value={getLanguageLabel(language)} 
            onClick={() => setShowLanguageSettings(true)}
          />
          <ProfileItem 
            icon={<Bell size={18} />} 
            label={t.profile.items.notifications} 
            toggle 
            checked={notificationsEnabled}
            onClick={toggleNotifications}
          />
          <ProfileItem icon={<Layers size={18} />} label={t.profile.items.statistics} onClick={() => setShowStatisticsSettings(true)} />
        </ProfileSection>

        <ProfileSection title={t.profile.sections.community}>
          <ProfileItem icon={<Share2 size={18} />} label={t.profile.items.share} onClick={handleShare} />
          <ProfileItem icon={<Star size={18} />} label={t.profile.items.rateApp} />
          <ProfileItem icon={<Mail size={18} />} label={t.profile.items.contact} value="feedback@storio.io" />
          <ProfileItem icon={<MessageSquare size={18} />} label={t.profile.items.suggest} />
          <ProfileItem icon={<AlertCircle size={18} />} label={t.profile.items.bug} />
        </ProfileSection>

        <ProfileSection title={t.profile.sections.about}>
          <ProfileItem icon={<Info size={18} />} label={t.profile.items.terms} />
          <ProfileItem icon={<Shield size={18} />} label={t.profile.items.privacy} />
          <div className="p-4 text-center">
            <span className="text-[10px] text-text-desc font-bold tracking-[0.3em] uppercase opacity-40">
              Version 2.1.0 (Build 20260221)
            </span>
          </div>
        </ProfileSection>

        {!isAnonymous && (
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 p-4 bg-red-950/20 border border-red-500/20 rounded-2xl text-red-500 font-bold text-sm hover:bg-red-900/30 transition-all active:scale-95"
          >
            <LogOut size={18} /> {t.common.logout}
          </button>
        )}

      </main>

      {/* Login Modal */}
      <OnboardingModal 
        isOpen={showOnboarding} 
        onClose={() => setShowOnboarding(false)} 
        onLogin={handleLogin}
        onContinueAsGuest={() => setShowOnboarding(false)}
      />
    </div>
  );
}