import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { LANGUAGES } from '@/types';
import type { LanguageCode } from '@/types';
import { Building2, Globe, Check, ArrowRight, Volume2, Mic } from 'lucide-react';
import { speakTranslated } from '@/lib/voice';
import { SpeakButton } from '@/components/ui/SpeakButton';

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const { profile, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [language, setLanguage] = useState<LanguageCode>(
    profile?.preferred_language || 'en'
  );
  const [currency, setCurrency] = useState(profile?.preferred_currency || 'UGX');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [saving, setSaving] = useState(false);

  const steps = [
    { title: 'Welcome', icon: Building2 },
    { title: 'Choose Language', icon: Globe },
    { title: 'Currency', icon: Check },
    { title: 'Terms', icon: Check },
  ];

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        preferred_language: language,
        preferred_currency: currency,
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
        onboarding_completed: true,
      })
      .eq('id', profile.id);
    setSaving(false);
    if (!error) {
      await refreshProfile();
      onComplete();
    }
  };

  const welcomeText =
    'Welcome to Lantèn. This app helps you manage your rental properties. You can use your voice instead of typing, and the app will read everything aloud. Let us set up your account.';

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-600 via-teal-700 to-stone-800 flex items-center justify-center p-4 max-w-md mx-auto">
      <div className="w-full">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {/* Progress */}
          <div className="flex items-center justify-between mb-8">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    i <= step
                      ? 'bg-teal-600 text-white'
                      : 'bg-stone-100 text-stone-400'
                  }`}
                >
                  {i < step ? <Check size={18} /> : <s.icon size={18} />}
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`w-12 h-0.5 mx-1 ${
                      i < step ? 'bg-teal-600' : 'bg-stone-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="text-center">
              <div className="w-20 h-20 rounded-3xl bg-teal-100 flex items-center justify-center mx-auto mb-6">
                <Building2 size={40} className="text-teal-600" />
              </div>
              <h2 className="text-2xl font-bold text-stone-800 mb-3">
                Welcome to Lantèn
              </h2>
              <p className="text-stone-600 text-lg mb-4">{welcomeText}</p>
              <div className="flex justify-center mb-6">
                <SpeakButton text={welcomeText} label="Listen to welcome" />
              </div>
              <div className="bg-teal-50 rounded-2xl p-4 mb-6 text-left">
                <div className="flex items-center gap-2 text-teal-700 font-medium mb-2">
                  <Mic size={18} />
                  <span>Voice-first design</span>
                </div>
                <p className="text-sm text-teal-600">
                  Every screen lets you speak instead of type. The app reads
                  everything aloud. Perfect for users who prefer not to read or write.
                </p>
              </div>
              <button
                onClick={() => setStep(1)}
                className="w-full py-3.5 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"
              >
                Get Started <ArrowRight size={20} />
              </button>
            </div>
          )}

          {/* Step 1: Language */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-stone-800 mb-2">
                Choose Your Language
              </h2>
              <p className="text-stone-500 mb-6">
                Select the language you want to use. You can change this anytime.
              </p>
              <div className="space-y-3 mb-6">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      speakTranslated(`You selected ${lang.name}`, lang.code);
                    }}
                    className={`w-full flex items-center justify-between px-5 py-4 rounded-xl border-2 transition-all ${
                      language === lang.code
                        ? 'border-teal-600 bg-teal-50'
                        : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{lang.flag}</span>
                      <div className="text-left">
                        <p className="font-semibold text-stone-800">
                          {lang.name}
                        </p>
                      </div>
                    </div>
                    {language === lang.code && (
                      <div className="w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center">
                        <Check size={14} className="text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(0)}
                  className="px-5 py-3 rounded-xl border border-stone-200 text-stone-600 font-medium hover:bg-stone-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"
                >
                  Continue <ArrowRight size={20} />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Currency */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-stone-800 mb-2">
                Select Currency
              </h2>
              <p className="text-stone-500 mb-6">
                Choose the default currency for rent and payments.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {['UGX', 'USD', 'KES', 'TZS', 'RWF'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    className={`px-5 py-4 rounded-xl border-2 font-semibold text-lg transition-all ${
                      currency === c
                        ? 'border-teal-600 bg-teal-50 text-teal-700'
                        : 'border-stone-200 text-stone-600 hover:border-stone-300'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="px-5 py-3 rounded-xl border border-stone-200 text-stone-600 font-medium hover:bg-stone-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"
                >
                  Continue <ArrowRight size={20} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Terms */}
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-stone-800 mb-2">
                Terms & Conditions
              </h2>
              <p className="text-stone-500 mb-4">
                Please review and accept our terms to continue.
              </p>
              <div className="bg-stone-50 rounded-2xl p-5 mb-6 max-h-48 overflow-y-auto text-sm text-stone-600 space-y-2">
                <p>
                  <strong>1. Data Usage:</strong> Your data is stored securely and
                  used only for rental management purposes. We do not sell or share
                  your data with third parties.
                </p>
                <p>
                  <strong>2. Payment Records:</strong> This app does not process,
                  hold, or move money. All payments happen outside the app. We only
                  record payment information that you provide.
                </p>
                <p>
                  <strong>3. Voice & Audio:</strong> Voice inputs are transcribed to
                  text for storage. Audio may be retained for reference. You can
                  always edit transcribed text before saving.
                </p>
                <p>
                  <strong>4. Privacy:</strong> Your tenants' information is visible
                  only to you and authorized staff. Tenants can see only their own
                  information.
                </p>
                <p>
                  <strong>5. Responsibility:</strong> You are responsible for the
                  accuracy of payment records and lease agreements generated through
                  this app.
                </p>
              </div>
              <label className="flex items-start gap-3 mb-6 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded accent-teal-600"
                />
                <span className="text-stone-700">
                  I have read and accept the Terms and Conditions and Privacy Policy
                </span>
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="px-5 py-3 rounded-xl border border-stone-200 text-stone-600 font-medium hover:bg-stone-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSave}
                  disabled={!termsAccepted || saving}
                  className="flex-1 py-3 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {saving ? 'Saving...' : 'Accept & Continue'}
                  {!saving && <Check size={20} />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
