import { useState, useSyncExternalStore } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  Globe,
  DollarSign,
  Bell,
  FileText,
  Mic,
  Volume2,
  VolumeX,
  Check,
  LogOut,
  User,
  Phone,
  Mail,
  Save,
} from 'lucide-react';
import { LANGUAGES, CURRENCIES, COUNTRY_CODES } from '@/types';
import type { LanguageCode } from '@/types';
import { SpeakButton } from '@/components/ui/SpeakButton';
import { displayRole } from '@/lib/utils';
import {
  speakTranslated,
  getVoiceEnabled,
  subscribeVoiceEnabled,
  setVoiceEnabled,
} from '@/lib/voice';

// Extract the country dialing code (+256...) from a stored phone number, or
// default to Uganda when none matches.
function extractCountryCode(phoneValue: string | null | undefined): string {
  const p = phoneValue || '';
  for (const c of COUNTRY_CODES) {
    if (p.includes(c.dial)) return c.dial;
  }
  return '+256';
}

// Remove the dialing code from a stored phone number, leaving the local number
// for editing in the input field.
function stripDial(phoneValue: string | null | undefined): string {
  const p = phoneValue || '';
  for (const c of COUNTRY_CODES) {
    if (p.includes(c.dial)) return p.replace(c.dial, '').replace(/\s+/g, ' ').trim();
  }
  return p;
}

export function Settings() {
  const { profile, refreshProfile, signOut } = useAuth();
  const [language, setLanguage] = useState<LanguageCode>(profile?.preferred_language || 'en');
  const [currency, setCurrency] = useState(profile?.preferred_currency || 'UGX');
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(stripDial(profile?.phone));
  const [countryCode, setCountryCode] = useState(extractCountryCode(profile?.phone));
  const [email, setEmail] = useState(profile?.email || '');
  const [notifPrefs, setNotifPrefs] = useState(profile?.notification_prefs || {});
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const voiceOn = useSyncExternalStore(subscribeVoiceEnabled, getVoiceEnabled);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    await supabase
      .from('profiles')
      .update({
        preferred_language: language,
        preferred_currency: currency,
        full_name: fullName,
        phone: `${countryCode} ${phone}`.trim(),
        email,
        notification_prefs: notifPrefs,
      })
      .eq('id', profile.id);
    await refreshProfile();
    setSaving(false);
    setSavedMsg(true);
    speakTranslated('Settings saved.', language);
    setTimeout(() => setSavedMsg(false), 3000);
  };

  // Persist just the profile / contact fields (name, phone + country code, email)
  // and refresh the profile so the rest of the app reflects the edited data.
  const handleSaveProfile = async () => {
    if (!profile) return;
    setProfileSaving(true);
    await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        phone: `${countryCode} ${phone}`.trim(),
        email,
      })
      .eq('id', profile.id);
    await refreshProfile();
    setProfileSaving(false);
    setProfileSaved(true);
    speakTranslated('Profile saved.', language);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  // Saving the language as soon as it is chosen lets the voice summaries and
  // translated text across the app (Dashboard, Reports) update automatically.
  const handleLanguageSelect = async (code: LanguageCode, name: string) => {
    setLanguage(code);
    speakTranslated(`You selected ${name}`, code);
    if (!profile || code === profile.preferred_language) return;
    await supabase
      .from('profiles')
      .update({ preferred_language: code })
      .eq('id', profile.id);
    await refreshProfile();
  };

  const toggleNotif = (key: string) => {
    setNotifPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const notifItems = [
    { key: 'rent_due', label: 'Rent Due Reminders', desc: 'Get notified when rent is due' },
    { key: 'rent_received', label: 'Rent Received', desc: 'When a tenant logs a payment' },
    { key: 'lease_expiring', label: 'Lease Expiring', desc: 'Alert before a lease ends' },
    { key: 'maintenance_updates', label: 'Maintenance Updates', desc: 'Status changes on requests' },
  ];

  return (
    <div className="p-4 space-y-4 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-stone-800">Settings</h2>
        <p className="text-stone-500 text-sm mt-1">Manage your preferences and account</p>
      </div>

      {/* Profile */}
      <div className="bg-white rounded-2.5xl shadow-card border border-stone-100/80 p-5">
        <h3 className="font-semibold text-stone-800 mb-4 flex items-center gap-2">
          <User size={18} className="text-teal-600" /> Profile
        </h3>
        <div className="flex items-center gap-4 mb-4 p-4 rounded-2xl bg-stone-50">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-xl font-bold shadow-md shadow-teal-500/20 flex-shrink-0">
            {(profile?.full_name || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-stone-800 truncate">{profile?.full_name || 'User'}</p>
            <p className="text-sm text-stone-500 capitalize">{displayRole(profile?.role)}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-stone-400">
              {profile?.email && (
                <span className="inline-flex items-center gap-1">
                  <Mail size={12} className="text-stone-400" /> {profile.email}
                </span>
              )}
              {profile?.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone size={12} className="text-stone-400" /> {profile.phone}
                </span>
              )}
              {!profile?.email && !profile?.phone && (
                <span>Registration contact not added</span>
              )}
            </div>
            
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1.5">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1.5">Phone</label>
            <div className="flex gap-2">
              <div className="relative flex-shrink-0">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="pl-9 pr-3 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  aria-label="Country dial code"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.dial}>
                      {c.dial}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="712 345 678"
                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <p className="text-xs text-stone-400 mt-1.5">
              Saved as {countryCode} {phone}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1.5">
              Email <span className="text-stone-400 font-normal">(for system alerts)</span>
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-9 pr-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={profileSaving}
            className="w-full flex items-center justify-center gap-2 mt-1 py-3 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            {profileSaving ? (
              'Saving...'
            ) : profileSaved ? (
              <>
                <Check size={18} /> Profile saved!
              </>
            ) : (
              <>
                <Save size={18} /> Save Profile
              </>
            )}
          </button>
        </div>
      </div>

      {/* Language */}
      <div className="bg-white rounded-2.5xl shadow-card border border-stone-100/80 p-5">
        <h3 className="font-semibold text-stone-800 mb-1 flex items-center gap-2">
          <Globe size={18} className="text-teal-600" /> Language
        </h3>
        <p className="text-sm text-stone-500 mb-4">Choose your interaction language. The app will use this for voice prompts and translations.</p>
        <div className="space-y-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                handleLanguageSelect(l.code, l.name);
              }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${
                language === l.code
                  ? 'border-teal-600 bg-teal-50'
                  : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{l.flag}</span>
                <div className="text-left">
                  <p className="font-medium text-stone-800">{l.name}</p>
                </div>
              </div>
              {language === l.code && (
                <div className="w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center">
                  <Check size={14} className="text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Currency */}
      <div className="bg-white rounded-2.5xl shadow-card border border-stone-100/80 p-5">
        <h3 className="font-semibold text-stone-800 mb-1 flex items-center gap-2">
          <DollarSign size={18} className="text-teal-600" /> Currency
        </h3>
        <p className="text-sm text-stone-500 mb-4">Default currency for rent and payments.</p>
        <div className="grid grid-cols-3 gap-2">
          {CURRENCIES.map((c) => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              className={`px-4 py-3 rounded-xl border-2 font-semibold transition-all ${
                currency === c
                  ? 'border-teal-600 bg-teal-50 text-teal-700'
                  : 'border-stone-200 text-stone-600 hover:border-stone-300'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-2.5xl shadow-card border border-stone-100/80 p-5">
        <h3 className="font-semibold text-stone-800 mb-1 flex items-center gap-2">
          <Bell size={18} className="text-teal-600" /> Notification Preferences
        </h3>
        <p className="text-sm text-stone-500 mb-4">Choose which alerts you want to receive.</p>
        <div className="space-y-2">
          {notifItems.map((n) => (
            <label key={n.key} className="flex items-center justify-between p-3 rounded-xl hover:bg-stone-50 cursor-pointer">
              <div>
                <p className="text-sm font-medium text-stone-700">{n.label}</p>
                <p className="text-xs text-stone-400">{n.desc}</p>
              </div>
              <input
                type="checkbox"
                checked={notifPrefs[n.key] ?? true}
                onChange={() => toggleNotif(n.key)}
                className="w-5 h-5 rounded accent-teal-600"
              />
            </label>
          ))}
        </div>
      </div>

      {/* Accessibility */}
      <div className="bg-white rounded-2.5xl shadow-card border border-stone-100/80 p-5">
        <h3 className="font-semibold text-stone-800 mb-1 flex items-center gap-2">
          <Mic size={18} className="text-teal-600" /> Voice & Audio
        </h3>
        <p className="text-sm text-stone-500 mb-4">Control and test your voice features.</p>

        <div className="flex items-center justify-between gap-3 mb-4 p-3 rounded-xl bg-stone-50">
          <div className="flex items-center gap-2">
            {voiceOn ? (
              <Volume2 size={18} className="text-teal-600" />
            ) : (
              <VolumeX size={18} className="text-stone-400" />
            )}
            <div>
              <p className="text-sm font-medium text-stone-700">Voice features</p>
              <p className="text-xs text-stone-400">
                {voiceOn ? 'Turned on — the app reads prompts aloud' : 'Turned off'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = !voiceOn;
              setVoiceEnabled(next);
              if (next) speakTranslated('Voice enabled.', language);
            }}
            className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none ${
              voiceOn ? 'bg-teal-500' : 'bg-stone-300'
            }`}
            aria-pressed={voiceOn}
            role="switch"
          >
            <span
              className={`absolute left-0 top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                voiceOn ? 'translate-x-[22px]' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        <div className="flex flex-wrap gap-3">
          <SpeakButton
            text="Hello, this is a test of the audio playback feature."
            language={language}
            label="Test Audio Playback"
          />
          <button
            type="button"
            onClick={() => {
              speakTranslated('This is a language voice test.', language);
            }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
          >
            <Volume2 size={16} /> Test {language !== 'en' ? (LANGUAGES.find((l) => l.code === language)?.name || '') : 'English'} voice
          </button>
        </div>
      </div>

      {/* Terms */}
      <div className="bg-white rounded-2.5xl shadow-card border border-stone-100/80 p-5">
        <h3 className="font-semibold text-stone-800 mb-1 flex items-center gap-2">
          <FileText size={18} className="text-teal-600" /> Terms & Privacy
        </h3>
        <p className="text-sm text-stone-500 mb-3">
          Accepted on {profile?.terms_accepted_at ? new Date(profile.terms_accepted_at).toLocaleDateString() : 'first launch'}
        </p>
        <button
          onClick={() => setShowTerms(!showTerms)}
          className="text-sm text-teal-600 font-medium hover:underline"
        >
          {showTerms ? 'Hide' : 'View'} Terms & Conditions
        </button>
        {showTerms && (
          <div className="mt-3 bg-stone-50 rounded-xl p-4 text-sm text-stone-600 space-y-2 max-h-48 overflow-y-auto">
            <p><strong>1. Data Usage:</strong> Your data is stored securely and used only for rental management.</p>
            <p><strong>2. Payment Records:</strong> This app does not process, hold, or move money. All payments happen outside the app.</p>
            <p><strong>3. Voice & Audio:</strong> Voice inputs are transcribed to text. You can edit before saving.</p>
            <p><strong>4. Privacy:</strong> Tenant information is visible only to you and authorized staff.</p>
            <p><strong>5. Responsibility:</strong> You are responsible for the accuracy of records.</p>
          </div>
        )}
      </div>

      {/* Save & Sign Out */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-3 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {saving ? 'Saving...' : savedMsg ? (
            <>
              <Check size={18} /> Saved!
            </>
          ) : (
            'Save Settings'
          )}
        </button>
        <button
          onClick={() => signOut()}
          className="px-5 py-3 rounded-xl border border-stone-200 text-stone-600 font-medium hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors flex items-center gap-2"
        >
          <LogOut size={18} /> Sign Out
        </button>
      </div>
    </div>
  );
}
