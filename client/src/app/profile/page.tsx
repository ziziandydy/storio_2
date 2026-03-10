'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, User, Shield, Bell, Globe, Mail,
  MessageSquare, Star, Share2, LogIn, Database,
  ChevronRight, Info, AlertCircle, LogOut, Layers,
  Edit3, Save, X, Check, Calendar, Lock, Camera, Loader2
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useSettingsStore } from '@/store/settingsStore';
import { useTranslation } from '@/hooks/useTranslation';
import OnboardingModal from '@/components/OnboardingModal';
import { supabase, getURL } from '@/lib/supabase';
import { getApiUrl } from '@/lib/api';
import { getTitleKeyByCount, TitleTranslationKey } from '@/utils/leveling';
import packageJson from '../../../package.json';

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
  const { user, loading, signOut, updateProfile, token } = useAuth();
  const { language, notificationsEnabled, setLanguage, toggleNotifications } = useSettingsStore();
  const { t } = useTranslation();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // UI States
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [gender, setGender] = useState('');
  const [birthday, setBirthday] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Sub-view States
  const [showStatisticsSettings, setShowStatisticsSettings] = useState(false);
  const [showLanguageSettings, setShowLanguageSettings] = useState(false);
  const [showContactSettings, setShowContactSettings] = useState(false);

  // Statistics Widget State
  const [widgets, setWidgets] = useState<string[]>(['7d', '30d', 'year', 'trend7', 'trend30']);

  // Leveling State
  const [collectionCount, setCollectionCount] = useState(0);

  useEffect(() => {
    if (user && !isEditing) {
      setDisplayName(user.user_metadata?.display_name || user.email?.split('@')[0] || t.profile.guest);
      setGender(user.user_metadata?.gender || '');
      setBirthday(user.user_metadata?.birthday || '');
      setAvatarUrl(user.user_metadata?.avatar_url || '');
    }
  }, [user, t, isEditing]);

  useEffect(() => {
    const saved = localStorage.getItem('storio_dashboard_widgets');
    if (saved) {
      try {
        setWidgets(JSON.parse(saved));
      } catch (e) { }
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetch(getApiUrl('/api/v1/collection/'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => res.json())
        .then(data => {
          const c = Array.isArray(data) ? data.length : 0;
          setCollectionCount(c);
        })
        .catch(err => console.error("Failed to fetch collection for level", err));
    }
  }, [token]);

  const toggleWidget = (id: string) => {
    const next = widgets.includes(id)
      ? widgets.filter(w => w !== id)
      : [...widgets, id];
    setWidgets(next);
    localStorage.setItem('storio_dashboard_widgets', JSON.stringify(next));
  };

  const getGenderLabel = (id: string) => {
    const map: any = {
      'male': t.onboarding.genderMale,
      'female': t.onboarding.genderFemale,
      'non-binary': t.onboarding.genderNonBinary,
      'not-say': t.onboarding.genderPreferNotToSay
    };
    return map[id] || id;
  };

  const formatBirthday = (dateStr: string) => {
    if (!dateStr) return '---';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).replace(/ /g, '-').replace(',', '');
    } catch (e) {
      return dateStr;
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);

      // 自動儲存頭像變更，避免重整後遺失
      if (!isEditing) {
        await updateProfile({ avatar_url: publicUrl });
      }
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleBack = () => router.back();

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    await updateProfile({
      display_name: displayName,
      gender: gender,
      birthday: birthday,
      avatar_url: avatarUrl
    });
    setSavingProfile(false);
    setIsEditing(false);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
    router.refresh();
  };

  const handleLogin = async (provider: 'google' | 'apple' | 'email') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider as any,
        options: {
          redirectTo: getURL('/auth/callback')
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
          text: `${t.profile.shareMessage} ${window.location.origin}`,
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

  const handleContactSelect = (type: 'feature' | 'bug' | 'other') => {
    // @ts-ignore
    const localizedPrefix = t.profile.contactPrefix[type] || 'Contact';
    const subject = `[Storio ${localizedPrefix}] from ${displayName}`;
    window.location.href = `mailto:andismtu@gmail.com?subject=${encodeURIComponent(subject)}`;
  };

  if (showContactSettings) {
    const CONTACT_OPTIONS = [
      // @ts-ignore
      { id: 'feature', icon: MessageSquare, label: t.profile.contactOptions?.feature || 'Suggest a Feature' },
      // @ts-ignore
      { id: 'bug', icon: AlertCircle, label: t.profile.contactOptions?.bug || 'Report a Bug' },
      // @ts-ignore
      { id: 'other', icon: Mail, label: t.profile.contactOptions?.other || 'Other' },
    ];

    return (
      <div className="min-h-screen bg-folio-black text-text-primary pb-20 animate-in slide-in-from-right duration-300">
        <header className="sticky top-0 z-30 bg-folio-black/80 backdrop-blur-xl p-6 flex items-center gap-6">
          <button onClick={() => setShowContactSettings(false)} className="text-text-desc hover:text-white transition-colors bg-white/5 p-3 rounded-full">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold font-serif tracking-wide text-white">{t.profile.items.contact}</h1>
        </header>
        <main className="max-w-md mx-auto p-6">
          <div className="bg-folio-card border border-white/5 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-2 space-y-1">
              {CONTACT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleContactSelect(opt.id as any)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors group rounded-xl"
                >
                  <div className="p-2 rounded-xl bg-white/5 text-accent-gold group-hover:scale-110 transition-transform">
                    <opt.icon size={18} />
                  </div>
                  <span className="text-sm font-medium text-text-primary">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

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
  const levelKey = getTitleKeyByCount(collectionCount, isAnonymous);

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

          {/* Action Icons */}
          {!isAnonymous && (
            <>
              {/* Top Left: Cancel (Only in edit mode) */}
              {isEditing && (
                <div className="absolute top-6 left-6 z-20 animate-in fade-in slide-in-from-left-2 duration-300">
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      // Reset to original values
                      if (user) {
                        setDisplayName(user.user_metadata?.display_name || user.email?.split('@')[0] || t.profile.guest);
                        setGender(user.user_metadata?.gender || '');
                        setBirthday(user.user_metadata?.birthday || '');
                        setAvatarUrl(user.user_metadata?.avatar_url || '');
                      }
                    }}
                    className="p-2 rounded-full bg-white/5 text-white/40 hover:text-white transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}

              {/* Top Right: Edit / Save */}
              <div className="absolute top-6 right-6 z-20 animate-in fade-in zoom-in duration-300">
                {isEditing ? (
                  <button
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    className="p-2 rounded-full bg-accent-gold text-folio-black shadow-lg shadow-accent-gold/20 hover:scale-110 active:scale-95 transition-all"
                  >
                    {savingProfile ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 rounded-full bg-white/5 text-accent-gold hover:bg-accent-gold hover:text-folio-black transition-all hover:scale-110 active:scale-95 shadow-xl"
                  >
                    <Edit3 size={18} />
                  </button>
                )}
              </div>
            </>
          )}

          <div className="flex flex-col items-center gap-6 relative z-10">
            <div
              onClick={() => isEditing && fileInputRef.current?.click()}
              className={`w-24 h-24 rounded-full bg-accent-gold flex items-center justify-center border-4 border-white/5 shadow-2xl overflow-hidden relative group/avatar ${isEditing ? 'cursor-pointer' : ''}`}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User size={48} className="text-folio-black" />
              )}
              {isEditing && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                  <Camera size={20} className="text-white mb-1" />
                  <span className="text-[8px] uppercase font-bold text-white">{t.onboarding.editAvatar}</span>
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <Loader2 size={24} className="text-white animate-spin" />
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

            <div className="w-full flex flex-col items-center text-center">
              {isEditing ? (
                <div className="w-full max-w-[240px] animate-in fade-in slide-in-from-bottom-2">
                  <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col items-center gap-1">
                    <span className="text-[8px] uppercase font-bold tracking-widest text-text-desc">{t.onboarding.username}</span>
                    <input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="bg-transparent text-white text-center text-lg font-bold focus:outline-none w-full"
                      placeholder={t.onboarding.username}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-white mb-1">
                    {displayName}
                  </h2>
                  <p className="text-xs text-text-desc tracking-widest uppercase font-bold opacity-60">
                    {t.profile.titles[levelKey]}
                  </p>
                </>
              )}
            </div>

            {/* Profile Grid (Gender & Birthday) */}
            {!isAnonymous && (
              <div className="w-full grid grid-cols-2 gap-4 mt-2">
                <div className="bg-white/5 border border-white/5 p-4 rounded-2xl flex flex-col items-center gap-1">
                  <span className="text-[8px] uppercase font-bold tracking-widest text-text-desc">{t.onboarding.gender}</span>
                  {isEditing ? (
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="bg-transparent text-white font-bold text-xs focus:outline-none text-center"
                    >
                      <option value="" className="bg-folio-card">{t.onboarding.genderPreferNotToSay}</option>
                      <option value="male" className="bg-folio-card">{t.onboarding.genderMale}</option>
                      <option value="female" className="bg-folio-card">{t.onboarding.genderFemale}</option>
                      <option value="non-binary" className="bg-folio-card">{t.onboarding.genderNonBinary}</option>
                      <option value="not-say" className="bg-folio-card">{t.onboarding.genderPreferNotToSay}</option>
                    </select>
                  ) : (
                    <span className="text-xs font-bold text-white uppercase">{getGenderLabel(gender || '---')}</span>
                  )}
                </div>
                <div className="bg-white/5 border border-white/5 p-4 rounded-2xl flex flex-col items-center gap-1">
                  <span className="text-[8px] uppercase font-bold tracking-widest text-text-desc">{t.onboarding.birthday}</span>
                  {isEditing ? (
                    <input
                      type="date"
                      value={birthday}
                      onChange={(e) => setBirthday(e.target.value)}
                      className="bg-transparent text-white font-bold text-xs focus:outline-none text-center [color-scheme:dark]"
                    />
                  ) : (
                    <span className="text-xs font-bold text-white">{formatBirthday(birthday)}</span>
                  )}
                </div>
              </div>
            )}

            {isAnonymous && (
              <button
                onClick={() => setShowOnboarding(true)}
                className="mt-4 px-8 py-3 bg-white text-black rounded-full text-xs font-black uppercase tracking-widest hover:bg-gray-200 transition-all flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95"
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
        </ProfileSection>

        <ProfileSection title={t.profile.sections.settings}>
          <ProfileItem
            icon={<Globe size={18} />}
            label={t.profile.items.language}
            value={getLanguageLabel(language)}
            onClick={() => setShowLanguageSettings(true)}
          />
          <ProfileItem icon={<Layers size={18} />} label={t.profile.items.statistics} onClick={() => setShowStatisticsSettings(true)} />
        </ProfileSection>

        <ProfileSection title={t.profile.sections.community}>
          <ProfileItem icon={<Share2 size={18} />} label={t.profile.items.share} onClick={handleShare} />
          <ProfileItem icon={<Star size={18} />} label={t.profile.items.rateApp} />
          <ProfileItem icon={<Mail size={18} />} label={t.profile.items.contact} onClick={() => setShowContactSettings(true)} />
        </ProfileSection>

        <ProfileSection title={t.profile.sections.about}>
          <ProfileItem icon={<Info size={18} />} label={t.profile.items.terms} onClick={() => router.push('/terms')} />
          <ProfileItem icon={<Shield size={18} />} label={t.profile.items.privacy} onClick={() => router.push('/privacy')} />
          <div className="p-4 text-center">
            <span className="text-[10px] text-text-desc font-bold tracking-[0.3em] uppercase opacity-40">
              Version {packageJson.version}
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