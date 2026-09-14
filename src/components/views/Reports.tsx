import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Home,
  Users,
  Download,
  Calendar,
  Wallet,
  Wrench,
} from 'lucide-react';
import { formatCurrency, monthName } from '@/lib/utils';
import { SpeakButton } from '@/components/ui/SpeakButton';
import { Badge } from '@/components/ui/Badge';
import { translateText } from '@/lib/voice';
import type { LanguageCode } from '@/types';

interface ReportData {
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  occupancyRate: number;
  totalUnits: number;
  occupiedUnits: number;
  rentRoll: { tenant_name: string; unit_label: string; property_name: string; rent: number; status: string }[];
  arrears: { tenant_name: string; amount: number; months: number }[];
  monthlyIncome: { month: number; year: number; amount: number }[];
  expenses: { description: string; cost: number; property_name: string }[];
}

export function Reports() {
  const { profile } = useAuth();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year' | 'all'>('month');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const currency = profile?.preferred_currency || 'UGX';
  const lang = (profile?.preferred_language || 'en') as LanguageCode;

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      const { data: payments } = await supabase
        .from('payments')
        .select('*, tenant:tenants(full_name), unit:units(label), property:properties(name)')
        .eq('status', 'verified');
      const { data: maintenance } = await supabase
        .from('maintenance_requests')
        .select('*, property:properties(name)')
        .gt('cost', 0);
      const { data: units } = await supabase.from('units').select('*');
      const { data: leases } = await supabase
        .from('leases')
        .select('*, tenant:tenants(full_name), unit:units(label), property:properties(name)')
        .eq('status', 'active');

      const totalIncome = (payments || []).reduce((sum: number, p: any) => sum + Number(p.amount), 0);
      const totalExpenses = (maintenance || []).reduce((sum: number, m: any) => sum + Number(m.cost), 0);

      const occupied = (units || []).filter((u: any) => u.status === 'occupied').length;
      const totalUnits = (units || []).length;

      const rentRoll = (leases || []).map((l: any) => ({
        tenant_name: l.tenant?.full_name || 'Unknown',
        unit_label: l.unit?.label || '—',
        property_name: l.property?.name || '—',
        rent: Number(l.rent_amount),
        status: l.status,
      }));

      // Monthly income for chart
      const monthlyMap = new Map<string, number>();
      (payments || []).forEach((p: any) => {
        if (p.period_month && p.period_year === selectedYear) {
          const key = `${p.period_month}`;
          monthlyMap.set(key, (monthlyMap.get(key) || 0) + Number(p.amount));
        }
      });
      const monthlyIncome = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        year: selectedYear,
        amount: monthlyMap.get(String(i + 1)) || 0,
      }));

      // Expenses
      const expenses = (maintenance || []).map((m: any) => ({
        description: m.title || m.description?.substring(0, 50) || 'Maintenance',
        cost: Number(m.cost),
        property_name: m.property?.name || '—',
      }));

      // Arrears (pending payments)
      const { data: pending } = await supabase
        .from('payments')
        .select('*, tenant:tenants(full_name)')
        .eq('status', 'pending');
      const arrearsMap = new Map<string, { tenant_name: string; amount: number; months: number }>();
      (pending || []).forEach((p: any) => {
        const existing = arrearsMap.get(p.tenant_id);
        if (existing) {
          existing.amount += Number(p.amount);
          existing.months += 1;
        } else {
          arrearsMap.set(p.tenant_id, {
            tenant_name: p.tenant?.full_name || 'Unknown',
            amount: Number(p.amount),
            months: 1,
          });
        }
      });
      const arrears = Array.from(arrearsMap.values());

      setData({
        totalIncome,
        totalExpenses,
        netIncome: totalIncome - totalExpenses,
        occupancyRate: totalUnits ? Math.round((occupied / totalUnits) * 100) : 0,
        totalUnits,
        occupiedUnits: occupied,
        rentRoll,
        arrears,
        monthlyIncome,
        expenses,
      });
      setLoading(false);
    };
    fetchReport();
  }, [selectedYear]);

  // Financial summary text (English) used for display and translation.
  const summaryText = data
    ? `Financial summary: Total income ${formatCurrency(data.totalIncome, currency)}. Total expenses ${formatCurrency(data.totalExpenses, currency)}. Net income ${formatCurrency(data.netIncome, currency)}. Occupancy rate ${data.occupancyRate} percent. ${data.arrears.length} tenants with arrears.`
    : 'Financial summary unavailable.';

  // Translate the summary into the language selected in Settings so the displayed
  // and spoken financial summary follows the user's chosen language. English is
  // only shown when English is the selected language — never as a fallback.
  const [translatedSummary, setTranslatedSummary] = useState<string>(
    lang === 'en' ? summaryText : ''
  );

  useEffect(() => {
    let active = true;
    if (lang === 'en') {
      setTranslatedSummary(summaryText);
      return () => {
        active = false;
      };
    }
    // Clear any previous text so English is never shown for a non-English language.
    setTranslatedSummary('');
    if (data) {
      void translateText(summaryText, 'en', lang).then((translated) => {
        // Only accept a real translation; translateText returns the English
        // source untouched on failure, which we must not display.
        if (active && translated && translated !== summaryText) {
          setTranslatedSummary(translated);
        }
      });
    }
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, data]);

  const exportCSV = () => {
    if (!data) return;
    const rows = [
      ['Report', 'Value'],
      ['Total Income', formatCurrency(data.totalIncome, currency)],
      ['Total Expenses', formatCurrency(data.totalExpenses, currency)],
      ['Net Income', formatCurrency(data.netIncome, currency)],
      ['Occupancy Rate', `${data.occupancyRate}%`],
      ['Occupied Units', String(data.occupiedUnits)],
      ['Total Units', String(data.totalUnits)],
      [],
      ['Rent Roll'],
      ['Tenant', 'Unit', 'Property', 'Monthly Rent'],
      ...data.rentRoll.map((r) => [r.tenant_name, r.unit_label, r.property_name, formatCurrency(r.rent, currency)]),
      [],
      ['Arrears'],
      ['Tenant', 'Amount', 'Months Overdue'],
      ...data.arrears.map((a) => [a.tenant_name, formatCurrency(a.amount, currency), String(a.months)]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rental-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-stone-400">Generating reports...</div>
      </div>
    );
  }

  const maxMonthly = Math.max(...(data?.monthlyIncome.map((m) => m.amount) || [1]), 1);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-stone-800 tracking-tight">Financial Reports</h2>
          <p className="text-stone-500 text-sm mt-1">Income, expenses, and occupancy</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 rounded-lg border border-stone-200 bg-white text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-800 text-white font-medium hover:bg-stone-900 transition-colors text-sm"
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* Voice summary */}
      <div className="bg-gradient-to-br from-stone-800 to-stone-900 rounded-2.5xl p-5 text-white shadow-float">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-teal-500/20 flex items-center justify-center">
                <BarChart3 size={14} className="text-teal-300" />
              </div>
              <h3 className="font-semibold text-sm tracking-wide">Financial Summary</h3>
            </div>
            <p className="text-stone-300 text-[13px] leading-relaxed">{translatedSummary}</p>
          </div>
          <SpeakButton text={translatedSummary} language={lang} label="Play" className="bg-white/15 text-white hover:bg-white/25" />
        </div>
      </div>

      {/* Key metrics - Net Income hero on left, 3 cards stacked on right */}
      <div className="flex gap-3">
        {/* Hero: Net Income */}
        <div className={`flex-1 rounded-2.5xl p-5 shadow-float border transition-all flex flex-col justify-between min-h-[200px] relative overflow-hidden ${
          (data?.netIncome || 0) >= 0
            ? 'bg-gradient-to-br from-teal-600 to-teal-700 border-teal-700 text-white'
            : 'bg-gradient-to-br from-red-500 to-red-600 border-red-600 text-white'
        }`}>
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/5" />
          <div className="flex items-center justify-between relative">
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
              <DollarSign size={24} />
            </div>
            <span className="text-[10px] font-medium text-white/70 uppercase tracking-wider">Net</span>
          </div>
          <div>
            <p className="text-3xl font-bold leading-tight">{formatCurrency(data?.netIncome || 0, currency)}</p>
            <p className="text-sm text-white/80 mt-1">Net Income</p>
          </div>
        </div>

        {/* Right column: 3 cards stacked */}
        <div className="flex-1 flex flex-col gap-3">
          <div className="flex-1 bg-white rounded-2xl p-4 shadow-card border border-stone-100/80 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
              <TrendingUp size={20} className="text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold text-stone-800 leading-tight">{formatCurrency(data?.totalIncome || 0, currency)}</p>
              <p className="text-xs text-stone-500">Total Income</p>
            </div>
          </div>

          <div className="flex-1 bg-white rounded-2xl p-4 shadow-card border border-stone-100/80 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
              <TrendingDown size={20} className="text-red-500" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold text-stone-800 leading-tight">{formatCurrency(data?.totalExpenses || 0, currency)}</p>
              <p className="text-xs text-stone-500">Expenses</p>
            </div>
          </div>

          <div className="flex-1 bg-white rounded-2xl p-4 shadow-card border border-stone-100/80 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Home size={20} className="text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold text-stone-800 leading-tight">{data?.occupancyRate}%</p>
              <p className="text-xs text-stone-500">{data?.occupiedUnits}/{data?.totalUnits} units</p>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly income chart */}
      <div className="bg-white rounded-2.5xl p-5 shadow-card border border-stone-100/80">
        <h3 className="font-semibold text-stone-800 mb-4 flex items-center gap-2 text-sm">
          <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center">
            <BarChart3 size={15} className="text-teal-600" />
          </div>
          Monthly Income - {selectedYear}
        </h3>
        <div className="flex items-end justify-between gap-1.5 h-44">
          {data?.monthlyIncome.map((m) => (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full bg-stone-100 rounded-t-lg flex items-end h-full overflow-hidden">
                <div
                  className="w-full bg-gradient-to-t from-teal-600 to-teal-400 rounded-t-lg transition-all duration-500"
                  style={{ height: `${(m.amount / maxMonthly) * 100}%`, minHeight: m.amount > 0 ? '4px' : '0' }}
                />
              </div>
              <span className="text-[10px] text-stone-400">{monthName(m.month).substring(0, 3)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Rent Roll & Arrears */}
      <div className="grid grid-cols-1 gap-4">
        <div className="bg-white rounded-2.5xl p-5 shadow-card border border-stone-100/80">
          <h3 className="font-semibold text-stone-800 mb-4 flex items-center gap-2 text-sm">
            <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center">
              <Users size={15} className="text-teal-600" />
            </div>
            Rent Roll
          </h3>
          {data?.rentRoll.length === 0 ? (
            <p className="text-sm text-stone-400">No active leases</p>
          ) : (
            <div className="space-y-2">
              {data?.rentRoll.map((r, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-stone-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-stone-700">{r.tenant_name}</p>
                    <p className="text-xs text-stone-400">{r.property_name} - {r.unit_label}</p>
                  </div>
                  <span className="text-sm font-semibold text-stone-800">{formatCurrency(r.rent, currency)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100">
          <h3 className="font-semibold text-stone-800 mb-4 flex items-center gap-2">
            <Wallet size={18} className="text-amber-500" /> Arrears Report
          </h3>
          {data?.arrears.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <TrendingUp size={16} /> No arrears - all payments up to date
            </div>
          ) : (
            <div className="space-y-2">
              {data?.arrears.map((a, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-stone-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-stone-700">{a.tenant_name}</p>
                    <p className="text-xs text-stone-400">{a.months} month(s) overdue</p>
                  </div>
                  <Badge variant="red">{formatCurrency(a.amount, currency)}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Expenses */}
      {data && data.expenses.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100">
          <h3 className="font-semibold text-stone-800 mb-4 flex items-center gap-2">
            <Wrench size={18} className="text-red-500" /> Maintenance Expenses
          </h3>
          <div className="space-y-2">
            {data.expenses.map((e, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-stone-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-stone-700">{e.description}</p>
                  <p className="text-xs text-stone-400">{e.property_name}</p>
                </div>
                <span className="text-sm font-semibold text-red-600">{formatCurrency(e.cost, currency)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
