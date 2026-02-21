'use client';

import React from 'react';
import { 
  ArrowLeft, User, Shield, Bell, Globe, Mail, 
  MessageSquare, Star, Share2, LogIn, Database, 
  ChevronRight, Info, AlertCircle, LogOut, Layers
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface ProfileSectionProps {
  title: string;
  children: React.ReactNode;
}

const ProfileSection = ({ title, children }: ProfileSectionProps) => (
  <div className="mb-8">
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
  value?: string;
  onClick?: () => void;
  danger?: boolean;
}

const ProfileItem = ({ icon, label, value, onClick, danger = false }: ProfileItemProps) => (
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
      {value && <span className="text-xs text-text-desc">{value}</span>}
      <ChevronRight size={16} className="text-text-desc opacity-40 group-hover:opacity-100 transition-opacity" />
    </div>
  </button>
);

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  
  // Statistics Widget State
  const [widgets, setWidgets] = React.useState<string[]>(['7d', '30d', 'year', 'trend7', 'trend30']);
  const [showStatisticsSettings, setShowStatisticsSettings] = React.useState(false);

  React.useEffect(() => {
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

  const WIDGET_OPTIONS = [
    { id: '7d', label: 'Last 7 Days' },
    { id: '30d', label: 'Last 30 Days' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'year', label: 'This Year' },
    { id: 'trend7', label: '7-Day Trend Chart' },
    { id: 'trend30', label: '30-Day Trend Chart' },
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

  // If showing statistics settings, render the sub-view
  if (showStatisticsSettings) {
    return (
      <div className="min-h-screen bg-folio-black text-text-primary pb-20">
        <header className="sticky top-0 z-30 bg-folio-black/80 backdrop-blur-xl p-6 flex items-center gap-6">
          <button onClick={() => setShowStatisticsSettings(false)} className="text-text-desc hover:text-white transition-colors bg-white/5 p-3 rounded-full">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold font-serif tracking-wide text-white">Statistics</h1>
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

  return (
    <div className="min-h-screen bg-folio-black text-text-primary pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-folio-black/80 backdrop-blur-xl p-6 flex items-center gap-6">
        <button onClick={handleBack} className="text-text-desc hover:text-white transition-colors bg-white/5 p-3 rounded-full">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold font-serif tracking-wide text-white">Profile</h1>
      </header>

      <main className="max-w-md mx-auto p-6">
        {/* User Card */}
        <div className="bg-gradient-to-br from-folio-card to-black p-8 rounded-3xl border border-white/10 mb-10 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent-gold/10 blur-[60px] rounded-full -mr-16 -mt-16 transition-all group-hover:bg-accent-gold/20" />
          
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-20 h-20 rounded-full bg-accent-gold flex items-center justify-center border-4 border-white/5 shadow-2xl">
              <User size={40} className="text-folio-black" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-1">
                {user?.is_anonymous === false ? (user.email?.split('@')[0]) : "Guest Curator"}
              </h2>
              <p className="text-xs text-text-desc tracking-widest uppercase font-bold opacity-60">
                {user?.is_anonymous === false ? "Master Curator" : "Apprentice"}
              </p>
            </div>
            
            {user?.is_anonymous !== false && (
                <button className="mt-4 px-6 py-2 bg-white text-black rounded-full text-xs font-black uppercase tracking-widest hover:bg-gray-200 transition-all flex items-center gap-2">
                    <LogIn size={14} /> Login to Sync
                </button>
            )}
          </div>
        </div>

        {/* Sections */}
        <ProfileSection title="Account & Sync">
          <ProfileItem icon={<Database size={18} />} label="Cloud Backup" value="Auto-Sync On" />
          <ProfileItem icon={<Shield size={18} />} label="Security & Privacy" />
        </ProfileSection>

        <ProfileSection title="Settings">
          <ProfileItem icon={<Globe size={18} />} label="Language" value="系統預設 (繁體中文)" />
          <ProfileItem icon={<Bell size={18} />} label="Notifications" value="On" />
          <ProfileItem icon={<Layers size={18} />} label="Statistics" onClick={() => setShowStatisticsSettings(true)} />
        </ProfileSection>

        <ProfileSection title="Community & Support">
          <ProfileItem icon={<Share2 size={18} />} label="Share Storio" onClick={handleShare} />
          <ProfileItem icon={<Star size={18} />} label="Rate on App Store" />
          <ProfileItem icon={<Mail size={18} />} label="Contact Us" value="feedback@storio.io" />
          <ProfileItem icon={<MessageSquare size={18} />} label="Suggest a Feature" />
          <ProfileItem icon={<AlertCircle size={18} />} label="Report a Bug" />
        </ProfileSection>

        <ProfileSection title="About">
          <ProfileItem icon={<Info size={18} />} label="Terms of Use" />
          <ProfileItem icon={<Shield size={18} />} label="Privacy Policy" />
          <div className="p-4 text-center">
            <span className="text-[10px] text-text-desc font-bold tracking-[0.3em] uppercase opacity-40">
              Version 2.0.4 (Build 20260216)
            </span>
          </div>
        </ProfileSection>

        {user?.is_anonymous === false && (
          <button className="w-full flex items-center justify-center gap-2 p-4 bg-red-950/20 border border-red-500/20 rounded-2xl text-red-500 font-bold text-sm hover:bg-red-900/30 transition-all">
            <LogOut size={18} /> Sign Out
          </button>
        )}

      </main>
    </div>
  );
}
