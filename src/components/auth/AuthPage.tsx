import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Building2, Mail, Lock, User, Mic, Volume2, Globe } from 'lucide-react';
import { VoiceInput } from '@/components/ui/VoiceInput';
import { SpeakButton } from '@/components/ui/SpeakButton';
import { speak } from '@/lib/voice';

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const welcomeText =
    mode === 'signin'
      ? 'Welcome back. Sign in to manage your properties.'
      : 'Create your account to start managing your rental properties.';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result =
      mode === 'signin'
        ? await signIn(email, password)
        : await signUp(email, password, fullName);
    setLoading(false);
    if (result.error) setError(result.error);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-600 via-teal-700 to-stone-800 flex items-center justify-center p-4 max-w-md mx-auto">
      <div className="w-full">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-teal-600 flex items-center justify-center mb-3">
              <Building2 size={32} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-stone-800">Lantèn</h1>
            <p className="text-sm text-stone-400">Renting, synchronized</p>
          </div>

          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-stone-800">
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </h2>
            <SpeakButton text={welcomeText} label="Listen" />
          </div>
          <p className="text-stone-500 mb-6">{welcomeText}</p>

          <div className="flex gap-2 p-1 bg-stone-100 rounded-xl mb-6">
            <button
              onClick={() => setMode('signin')}
              className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-all ${
                mode === 'signin'
                  ? 'bg-white text-stone-800 shadow-sm'
                  : 'text-stone-500'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-all ${
                mode === 'signup'
                  ? 'bg-white text-stone-800 shadow-sm'
                  : 'text-stone-500'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    required
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="animate-pulse">Please wait...</span>
              ) : (
                <>
                  {mode === 'signin' ? 'Sign In' : 'Create Account'}
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-stone-100">
            <div className="flex items-center gap-2 text-sm text-stone-400">
              <Globe size={16} />
              <span>Supports 5 Ugandan languages with voice</span>
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-stone-400">
              <span className="flex items-center gap-1.5">
                <Mic size={14} /> Voice input
              </span>
              <span className="flex items-center gap-1.5">
                <Volume2 size={14} /> Audio playback
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
