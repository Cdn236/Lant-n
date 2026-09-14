import { type ReactNode, useSyncExternalStore } from 'react';
import {
  Building2,
  Home,
  Users,
  Wallet,
  Wrench,
  BarChart3,
  Settings,
  LogOut,
  MoreHorizontal,
  MessageSquare,
  ChevronRight,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  speakTranslated,
  getVoiceEnabled,
  subscribeVoiceEnabled,
  setVoiceEnabled,
} from '@/lib/voice';
import type { LanguageCode } from '@/types';

export type NavView =
  | 'dashboard'
  | 'properties'
  | 'tenants'
  | 'rent'
  | 'maintenance'
  | 'messages'
  | 'reports'
  | 'settings'
  | 'more';

interface NavItem {
  id: NavView;
  label: string;
  icon: typeof Home;
  voicePrompt: string;
}

const primaryTabs: NavItem[] = [
  { id: 'dashboard', label: 'Home', icon: Home, voicePrompt: 'Dashboard overview' },
  { id: 'properties', label: 'Properties', icon: Building2, voicePrompt: 'Manage properties and units' },
  { id: 'rent', label: 'Rent', icon: Wallet, voicePrompt: 'Rent tracking and payments' },
  { id: 'maintenance', label: 'Repairs', icon: Wrench, voicePrompt: 'Maintenance requests' },
];

const moreItems: NavItem[] = [
  { id: 'tenants', label: 'Tenants & Leases', icon: Users, voicePrompt: 'Manage tenants and leases' },
  { id: 'messages', label: 'Messages', icon: MessageSquare, voicePrompt: 'Messages with tenants' },
  { id: 'reports', label: 'Reports', icon: BarChart3, voicePrompt: 'Financial reports' },
  { id: 'settings', label: 'Settings', icon: Settings, voicePrompt: 'Settings and preferences' },
];

interface AppShellProps {
  currentView: NavView;
  onViewChange: (view: NavView) => void;
  children: ReactNode;
}

export function AppShell({ currentView, onViewChange, children }: AppShellProps) {
  const { profile, signOut } = useAuth();
  const lang = (profile?.preferred_language || 'en') as LanguageCode;
  const voiceOn = useSyncExternalStore(subscribeVoiceEnabled, getVoiceEnabled);

  const toggleVoice = () => {
    const next = !voiceOn;
    setVoiceEnabled(next);
    if (next) speakTranslated('Voice enabled.', lang);
  };

  const handleNavClick = (item: NavItem) => {
    onViewChange(item.id);
    speakTranslated(item.voicePrompt, lang);
  };

  const handleSignOut = () => {
    speakTranslated('Signing out. Goodbye.', lang);
    signOut();
  };

  const allItems = [...primaryTabs, ...moreItems];
  const currentLabel = allItems.find((n) => n.id === currentView)?.label || 'Home';
  const isPrimary = primaryTabs.some((t) => t.id === currentView);
  const isMoreActive = !isPrimary || currentView === 'more';

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col max-w-md mx-auto relative shadow-2xl shadow-stone-900/20">
      {/* Top App Bar */}
      <header className="sticky top-0 z-30 bg-stone-900 text-white safe-top">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Building2 size={18} />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight tracking-tight">Lantèn</h1>
              <p className="text-[10px] text-stone-400 leading-tight">Renting, synchronized</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={toggleVoice}
              title={voiceOn ? 'Turn voice off' : 'Turn voice on'}
              aria-pressed={voiceOn}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                voiceOn
                  ? 'bg-teal-500 text-white'
                  : 'bg-stone-700 text-stone-400 hover:bg-stone-600'
              }`}
            >
              {voiceOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24 bg-stone-100">
        {currentView === 'more' ? (
          <div className="p-4 space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-stone-800 tracking-tight">More</h2>
              <p className="text-stone-500 text-sm mt-1">All features and settings</p>
            </div>

            {/* Menu items */}
            <div className="space-y-2">
              {moreItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item)}
                    className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-white shadow-card border border-stone-100/80 hover:border-teal-200 hover:shadow-card-hover transition-all text-stone-700 tap-feedback"
                  >
                    <div className="w-11 h-11 rounded-xl bg-stone-50 flex items-center justify-center">
                      <Icon size={20} />
                    </div>
                    <span className="font-medium text-base flex-1 text-left">{item.label}</span>
                    <ChevronRight size={20} className="text-stone-300" />
                  </button>
                );
              })}
            </div>

            {/* Sign Out */}
            <div className="pt-2">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-red-500 bg-white shadow-card border border-stone-100/80 hover:bg-red-50 transition-colors tap-feedback"
              >
                <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center">
                  <LogOut size={20} />
                </div>
                <span className="font-medium text-base">Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          children
        )}
      </main>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 inset-x-0 z-30 max-w-md mx-auto">
        <div className="glass-bar bg-white/90 border-t border-stone-200/60 px-2 py-1.5 flex items-center justify-around safe-bottom shadow-float">
          {primaryTabs.map((item) => {
            const Icon = item.icon;
            const active = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[58px] tap-feedback ${
                  active ? 'text-teal-600' : 'text-stone-400'
                }`}
              >
                <div className={`p-1 rounded-lg transition-all ${active ? 'bg-teal-50' : ''}`}>
                  <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                </div>
                <span className={`text-[10px] font-medium ${active ? 'font-semibold' : ''}`}>
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* More button */}
          <button
            onClick={() => handleNavClick({ id: 'more', label: 'More', icon: MoreHorizontal, voicePrompt: 'More options' })}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[58px] tap-feedback ${
              isMoreActive ? 'text-teal-600' : 'text-stone-400'
            }`}
          >
            <div className={`p-1 rounded-lg transition-all ${isMoreActive ? 'bg-teal-50' : ''}`}>
              <MoreHorizontal size={22} strokeWidth={isMoreActive ? 2.5 : 2} />
            </div>
            <span className={`text-[10px] font-medium ${isMoreActive ? 'font-semibold' : ''}`}>
              More
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
}
