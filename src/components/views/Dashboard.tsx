import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  Building2,
  Users,
  Wallet,
  Wrench,
  TrendingUp,
  CalendarClock,
  Mic,
  ChevronRight,
} from 'lucide-react';
import { formatCurrency, daysUntil, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { SpeakButton } from '@/components/ui/SpeakButton';
import { speakTranslated, translateText } from '@/lib/voice';
import type { LanguageCode } from '@/types';
import type { NavView } from '@/components/layout/AppShell';

interface DashboardProps {
  onNavigate: (view: NavView) => void;
}

interface DashboardStats {
  propertyCount: number;
  unitCount: number;
  occupiedUnits: number;
  vacantUnits: number;
  tenantCount: number;
  totalMonthlyRent: number;
  pendingPayments: number;
  openMaintenance: number;
  expiringLeases: { id: string; tenant_name: string; end_date: string }[];
  recentPayments: { id: string; tenant_name: string; amount: number; currency: string; status: string; paid_date: string | null }[];
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const currency = profile?.preferred_currency || 'UGX';
  const lang = (profile?.preferred_language || 'en') as LanguageCode;

  // Abbreviate very large currency amounts so they fit the Expected Rent card.
  // e.g. 2,500,000 -> "2.5M", 1,450,000 -> "1.5M"
  const formatExpectedRent = (amount: number) => {
    const abs = Math.abs(amount);
    if (abs >= 1_000_000) {
      const m = amount / 1_000_000;
      const value = Number.isInteger(m) ? m.toString() : m.toFixed(1);
      return `${value}M`;
    }
    if (abs >= 1_000) {
      const k = amount / 1_000;
      return `${k >= 10 ? Math.round(k) : k.toFixed(1)}k`;
    }
    return `${amount}`;
  };

  // Speak an English string in the user's selected language (translated via Sunbird).
  const speakInLanguage = (englishText: string) => {
    speakTranslated(englishText, lang);
  };

  useEffect(() => {
    const fetchStats = async () => {
      const { data: properties } = await supabase.from('properties').select('id, name');
      const { data: units } = await supabase.from('units').select('*');
      const { data: tenants } = await supabase.from('tenants').select('id, full_name');
      const { data: leases } = await supabase
        .from('leases')
        .select('id, tenant_id, end_date, status')
        .eq('status', 'active');
      const { data: payments } = await supabase
        .from('payments')
        .select('id, tenant_id, amount, currency, status, paid_date')
        .order('created_at', { ascending: false })
        .limit(5);
      const { data: maintenance } = await supabase
        .from('maintenance_requests')
        .select('id, status')
        .eq('status', 'open');

      const tenantMap = new Map((tenants || []).map((t: any) => [t.id, t.full_name]));

      const occupied = (units || []).filter((u: any) => u.status === 'occupied').length;
      const vacant = (units || []).filter((u: any) => u.status === 'vacant').length;
      const totalRent = (units || [])
        .filter((u: any) => u.status === 'occupied')
        .reduce((sum: number, u: any) => sum + Number(u.rent_amount), 0);

      const expiring = (leases || [])
        .filter((l: any) => l.end_date && daysUntil(l.end_date) <= 30 && daysUntil(l.end_date) >= 0)
        .map((l: any) => ({
          id: l.id,
          tenant_name: tenantMap.get(l.tenant_id) || 'Unknown',
          end_date: l.end_date,
        }));

      const recentPays = (payments || []).map((p: any) => ({
        id: p.id,
        tenant_name: tenantMap.get(p.tenant_id) || 'Unknown',
        amount: Number(p.amount),
        currency: p.currency,
        status: p.status,
        paid_date: p.paid_date,
      }));

      setStats({
        propertyCount: properties?.length || 0,
        unitCount: units?.length || 0,
        occupiedUnits: occupied,
        vacantUnits: vacant,
        tenantCount: tenants?.length || 0,
        totalMonthlyRent: totalRent,
        pendingPayments: (payments || []).filter((p: any) => p.status === 'pending').length,
        openMaintenance: maintenance?.length || 0,
        expiringLeases: expiring,
        recentPayments: recentPays,
      });
      setLoading(false);
    };
    fetchStats();
  }, []);

  const summaryText = stats
    ? `You have ${stats.propertyCount} properties with ${stats.unitCount} units. ${stats.occupiedUnits} are occupied and ${stats.vacantUnits} are vacant. You have ${stats.tenantCount} tenants. Expected monthly rent is ${formatCurrency(stats.totalMonthlyRent, currency)}. There are ${stats.pendingPayments} pending payments and ${stats.openMaintenance} open maintenance requests.`
    : 'Loading your dashboard...';

  // Translate the summary into the language selected in Settings so the spoken
  // and displayed summary follows the user's chosen language. English is only
  // shown when English is the selected language — never as a fallback.
  const [translatedSummary, setTranslatedSummary] = useState<string>(
    lang === 'en' ? summaryText : ''
  );

  useEffect(() => {
    let active = true;
    const english = stats
      ? `You have ${stats.propertyCount} properties with ${stats.unitCount} units. ${stats.occupiedUnits} are occupied and ${stats.vacantUnits} are vacant. You have ${stats.tenantCount} tenants. Expected monthly rent is ${formatCurrency(stats.totalMonthlyRent, currency)}. There are ${stats.pendingPayments} pending payments and ${stats.openMaintenance} open maintenance requests.`
      : 'Loading your dashboard...';

    if (lang === 'en') {
      setTranslatedSummary(english);
      return () => {
        active = false;
      };
    }

    // Clear any previous text so English is never shown for a non-English language.
    setTranslatedSummary('');
    if (stats) {
      void translateText(english, 'en', lang).then((translated) => {
        // Only accept a real translation; translateText returns the English
        // source untouched on failure, which we must not display.
        if (active && translated && translated !== english) {
          setTranslatedSummary(translated);
        }
      });
    }

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, stats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-stone-200 border-t-teal-500 rounded-full animate-spin" />
          <p className="text-sm text-stone-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Voice Summary Banner */}
      <div className="bg-gradient-to-br from-stone-800 to-stone-900 rounded-2.5xl p-5 text-white shadow-float">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-teal-500/20 flex items-center justify-center">
                <Mic size={14} className="text-teal-300" />
              </div>
              <h3 className="font-semibold text-sm tracking-wide">Voice Summary</h3>
            </div>
            <p className="text-stone-300 text-[13px] leading-relaxed">{translatedSummary}</p>
          </div>
          <SpeakButton
            text={translatedSummary}
            language={profile?.preferred_language}
            label="Play"
            className="bg-white/10 text-white hover:bg-white/20 border border-white/10"
          />
        </div>
      </div>

      {/* Stat Cards - Monthly Rent hero on left, 3 cards stacked on right */}
      <div className="flex gap-3">
        {/* Hero: Monthly Rent */}
        <button
          onClick={() => {
            onNavigate('rent');
            speakInLanguage(`Expected monthly rent is ${formatExpectedRent(stats?.totalMonthlyRent || 0)} ${currency}.`);
          }}
          className="flex-1 bg-gradient-to-br from-teal-600 to-teal-700 rounded-2.5xl p-5 shadow-float text-left text-white flex flex-col justify-between min-h-[200px] tap-feedback relative overflow-hidden"
        >
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/5" />
          <div className="absolute -right-4 -bottom-4 w-16 h-16 rounded-full bg-white/5" />
          <div className="flex items-center justify-between relative">
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
              <Wallet size={24} />
            </div>
            <span className="text-[10px] font-medium text-teal-100 uppercase tracking-wider">Monthly</span>
          </div>
          <div className="relative">
            <p className={`font-bold leading-tight tracking-tight ${stats && stats.totalMonthlyRent >= 1_000_000 ? 'text-2xl' : 'text-3xl'}`}>
              {stats?.totalMonthlyRent && stats.totalMonthlyRent >= 1_000
                ? `${formatExpectedRent(stats.totalMonthlyRent)} ${currency}`
                : formatCurrency(stats?.totalMonthlyRent || 0, currency)}
            </p>
            <p className="text-sm text-teal-100 mt-1">Expected Rent</p>
          </div>
        </button>

        {/* Right column: 3 cards stacked */}
        <div className="flex-1 flex flex-col gap-3">
          <button
            onClick={() => {
              onNavigate('properties');
              speakInLanguage(`You have ${stats?.propertyCount || 0} properties.`);
            }}
            className="flex-1 bg-white rounded-2xl p-4 shadow-card border border-stone-100/80 hover:shadow-card-hover transition-all text-left flex items-center gap-3 tap-feedback"
          >
            <div className="w-11 h-11 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
              <Building2 size={20} className="text-teal-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-stone-800 leading-tight">{stats?.propertyCount || 0}</p>
              <p className="text-xs text-stone-500">Properties</p>
            </div>
          </button>

          <button
            onClick={() => {
              onNavigate('tenants');
              speakInLanguage(`You have ${stats?.tenantCount || 0} tenants.`);
            }}
            className="flex-1 bg-white rounded-2xl p-4 shadow-card border border-stone-100/80 hover:shadow-card-hover transition-all text-left flex items-center gap-3 tap-feedback"
          >
            <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Users size={20} className="text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-stone-800 leading-tight">{stats?.tenantCount || 0}</p>
              <p className="text-xs text-stone-500">Tenants</p>
            </div>
          </button>

          <button
            onClick={() => {
              onNavigate('maintenance');
              speakInLanguage(`You have ${stats?.openMaintenance || 0} open maintenance requests.`);
            }}
            className="flex-1 bg-white rounded-2xl p-4 shadow-card border border-stone-100/80 hover:shadow-card-hover transition-all text-left flex items-center gap-3 tap-feedback"
          >
            <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
              <Wrench size={20} className="text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-stone-800 leading-tight">{stats?.openMaintenance || 0}</p>
              <p className="text-xs text-stone-500">Open Repairs</p>
            </div>
          </button>
        </div>
      </div>

      {/* Occupancy */}
      <div className="bg-white rounded-2.5xl p-5 shadow-card border border-stone-100/80">
        <h3 className="font-semibold text-stone-800 mb-4 flex items-center gap-2 text-sm">
          <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center">
            <TrendingUp size={15} className="text-teal-600" />
          </div>
          Occupancy
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-stone-500">Occupied</span>
            <span className="font-semibold text-stone-800">{stats?.occupiedUnits || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-stone-500">Vacant</span>
            <span className="font-semibold text-stone-800">{stats?.vacantUnits || 0}</span>
          </div>
          <div className="w-full bg-stone-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-teal-500 to-teal-600 h-full rounded-full transition-all duration-500"
              style={{
                width: `${stats?.unitCount ? ((stats.occupiedUnits / stats.unitCount) * 100) : 0}%`,
              }}
            />
          </div>
          <p className="text-sm text-stone-500 text-center">
            {stats?.unitCount ? Math.round((stats.occupiedUnits / stats.unitCount) * 100) : 0}% occupied
          </p>
        </div>
      </div>

      {/* Expiring Leases */}
      <div className="bg-white rounded-2.5xl p-5 shadow-card border border-stone-100/80">
        <h3 className="font-semibold text-stone-800 mb-4 flex items-center gap-2 text-sm">
          <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
            <CalendarClock size={15} className="text-amber-500" />
          </div>
          Expiring Leases
        </h3>
        {(stats?.expiringLeases.length || 0) === 0 ? (
          <p className="text-sm text-stone-400">No leases expiring soon</p>
        ) : (
          <div className="space-y-2">
            {stats?.expiringLeases.map((lease) => (
              <div key={lease.id} className="flex items-center justify-between py-2 border-b border-stone-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-stone-700">{lease.tenant_name}</p>
                  <p className="text-xs text-stone-400">{formatDate(lease.end_date)}</p>
                </div>
                <Badge variant="amber">
                  {daysUntil(lease.end_date)}d left
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Payments */}
      <div className="bg-white rounded-2.5xl p-5 shadow-card border border-stone-100/80">
        <h3 className="font-semibold text-stone-800 mb-4 flex items-center gap-2 text-sm">
          <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
            <Wallet size={15} className="text-green-600" />
          </div>
          Recent Payments
        </h3>
        {(stats?.recentPayments.length || 0) === 0 ? (
          <p className="text-sm text-stone-400">No payments recorded yet</p>
        ) : (
          <div className="space-y-2">
            {stats?.recentPayments.map((pay) => (
              <div key={pay.id} className="flex items-center justify-between py-2 border-b border-stone-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-stone-700">{pay.tenant_name}</p>
                  <p className="text-xs text-stone-400">{formatDate(pay.paid_date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-stone-800">
                    {formatCurrency(pay.amount, pay.currency)}
                  </p>
                  <Badge variant={pay.status === 'verified' ? 'green' : pay.status === 'pending' ? 'amber' : 'red'}>
                    {pay.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2.5xl p-5 shadow-card border border-stone-100/80">
        <h3 className="font-semibold text-stone-800 mb-4 flex items-center gap-2 text-sm">
          <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center">
            <Building2 size={15} className="text-teal-600" />
          </div>
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              onNavigate('properties');
              speakInLanguage('Add a property.');
            }}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-stone-100 hover:border-teal-500 hover:bg-teal-50/50 transition-all tap-feedback"
          >
            <Building2 size={24} className="text-teal-600" />
            <span className="text-sm font-medium text-stone-700">Add Property</span>
          </button>
          <button
            onClick={() => {
              onNavigate('tenants');
              speakInLanguage('Add a tenant.');
            }}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-stone-100 hover:border-teal-500 hover:bg-teal-50/50 transition-all tap-feedback"
          >
            <Users size={24} className="text-blue-600" />
            <span className="text-sm font-medium text-stone-700">Add Tenant</span>
          </button>
          <button
            onClick={() => {
              onNavigate('rent');
              speakInLanguage('Log a payment.');
            }}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-stone-100 hover:border-teal-500 hover:bg-teal-50/50 transition-all tap-feedback"
          >
            <Wallet size={24} className="text-green-600" />
            <span className="text-sm font-medium text-stone-700">Log Payment</span>
          </button>
          <button
            onClick={() => {
              onNavigate('maintenance');
              speakInLanguage('Create a maintenance request.');
            }}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-stone-100 hover:border-teal-500 hover:bg-teal-50/50 transition-all tap-feedback"
          >
            <Wrench size={24} className="text-amber-600" />
            <span className="text-sm font-medium text-stone-700">New Request</span>
          </button>
        </div>
      </div>
    </div>
  );
}
