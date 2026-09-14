import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  Wallet,
  Plus,
  Check,
  X,
  Clock,
  Receipt,
  Mic,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import type { Payment, Tenant, PaymentStatus, PaymentMethod } from '@/types';
import { PAYMENT_METHODS } from '@/types';
import { VoiceInput } from '@/components/ui/VoiceInput';
import { SpeakButton } from '@/components/ui/SpeakButton';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCurrency, formatDate, monthName } from '@/lib/utils';
import { speakTranslated } from '@/lib/voice';

const statusConfig: Record<PaymentStatus, { variant: 'amber' | 'green' | 'red'; icon: typeof Clock; label: string }> = {
  pending: { variant: 'amber', icon: Clock, label: 'Pending' },
  verified: { variant: 'green', icon: Check, label: 'Verified' },
  rejected: { variant: 'red', icon: X, label: 'Rejected' },
};

export function RentTracking() {
  const { profile } = useAuth();
  const [payments, setPayments] = useState<(Payment & { tenant_name: string; unit_label?: string })[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<'all' | PaymentStatus>('all');

  // Form state
  const [payTenantId, setPayTenantId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payDueDate, setPayDueDate] = useState('');
  const [payMonth, setPayMonth] = useState(String(new Date().getMonth() + 1));
  const [payYear, setPayYear] = useState(String(new Date().getFullYear()));
  const [payNotes, setPayNotes] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const lang = profile?.preferred_language || 'en';
  const currency = profile?.preferred_currency || 'UGX';

  const fetchData = async () => {
    setLoading(true);
    const { data: pays } = await supabase
      .from('payments')
      .select('*, tenant:tenants!inner(full_name), unit:units(label)')
      .order('created_at', { ascending: false });
    const { data: tens } = await supabase.from('tenants').select('*').order('full_name');

    const enriched = (pays || []).map((p: any) => ({
      ...p,
      tenant_name: p.tenant?.full_name || 'Unknown',
      unit_label: p.unit?.label,
    }));

    setPayments(enriched);
    setTenants((tens || []) as Tenant[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleReceiptUpload = async (file: File) => {
    setUploading(true);
    const fileName = `receipts/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, file);

    if (!uploadError) {
      const { data } = supabase.storage.from('documents').getPublicUrl(fileName);
      setReceiptUrl(data.publicUrl);
    }
    setUploading(false);
  };

  const savePayment = async () => {
    if (!payTenantId || !payAmount) return;
    const { data: lease } = await supabase
      .from('leases')
      .select('id, unit_id, property_id')
      .eq('tenant_id', payTenantId)
      .eq('status', 'active')
      .maybeSingle();

    await supabase.from('payments').insert({
      tenant_id: payTenantId,
      lease_id: lease?.id || null,
      unit_id: lease?.unit_id || null,
      property_id: lease?.property_id || null,
      amount: parseFloat(payAmount) || 0,
      currency,
      payment_method: payMethod,
      receipt_url: receiptUrl,
      due_date: payDueDate || null,
      paid_date: payDate,
      period_month: parseInt(payMonth) || null,
      period_year: parseInt(payYear) || null,
      status: 'pending',
      notes: payNotes,
    });

    setPayTenantId('');
    setPayAmount('');
    setPayMethod('cash');
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayDueDate('');
    setPayMonth(String(new Date().getMonth() + 1));
    setPayYear(String(new Date().getFullYear()));
    setPayNotes('');
    setReceiptUrl('');
    setShowModal(false);
    fetchData();
  };

  const updatePaymentStatus = async (id: string, status: PaymentStatus) => {
    await supabase.from('payments').update({ status }).eq('id', id);
    fetchData();
  };

  const filteredPayments = filter === 'all'
    ? payments
    : payments.filter((p) => p.status === filter);

  const totalCollected = payments
    .filter((p) => p.status === 'verified')
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const pendingCount = payments.filter((p) => p.status === 'pending').length;
  const pendingAmount = payments
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-stone-200 border-t-teal-500 rounded-full animate-spin" />
          <p className="text-sm text-stone-400">Loading payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-stone-800 tracking-tight">Rent Tracking</h2>
          <p className="text-stone-500 text-sm mt-1">Record payments and verify receipts</p>
        </div>
        <button
          onClick={() => {
            setPayTenantId('');
            setPayAmount('');
            setShowModal(true);
            speakTranslated('Log a new rent payment. Select the tenant and enter the amount. You can type or speak the notes.', lang);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors tap-feedback shadow-md shadow-teal-600/20"
        >
          <Plus size={20} />
          <span>Log</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-3.5 shadow-card border border-stone-100/80">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-6 h-6 rounded-lg bg-green-50 flex items-center justify-center">
              <TrendingUp size={13} className="text-green-600" />
            </div>
            <span className="text-[11px] text-stone-500">Collected</span>
          </div>
          <p className="text-base font-bold text-stone-800 truncate">{formatCurrency(totalCollected, currency)}</p>
        </div>
        <div className="bg-white rounded-2xl p-3.5 shadow-card border border-stone-100/80">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center">
              <Clock size={13} className="text-amber-500" />
            </div>
            <span className="text-[11px] text-stone-500">Pending</span>
          </div>
          <p className="text-base font-bold text-stone-800">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-2xl p-3.5 shadow-card border border-stone-100/80">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-6 h-6 rounded-lg bg-red-50 flex items-center justify-center">
              <AlertTriangle size={13} className="text-red-500" />
            </div>
            <span className="text-[11px] text-stone-500">Pending Amt</span>
          </div>
          <p className="text-base font-bold text-stone-800 truncate">{formatCurrency(pendingAmount, currency)}</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {(['all', 'pending', 'verified', 'rejected'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all whitespace-nowrap tap-feedback ${
              filter === f
                ? 'bg-stone-800 text-white shadow-md'
                : 'bg-white text-stone-500 border border-stone-200 hover:bg-stone-50'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {filteredPayments.length === 0 ? (
        <EmptyState
          icon={<Wallet size={36} />}
          title="No payments recorded"
          description="Log your first rent payment to start tracking income."
          action={
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors"
            >
              <Plus size={20} /> Log Payment
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredPayments.map((pay) => {
            const sc = statusConfig[pay.status];
            const StatusIcon = sc.icon;
            return (
              <div key={pay.id} className="bg-white rounded-2.5xl shadow-card border border-stone-100/80 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-stone-50 flex items-center justify-center">
                        <DollarSign size={18} className="text-stone-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-stone-800 text-sm">{pay.tenant_name}</p>
                        <p className="text-xs text-stone-400">
                          {pay.unit_label || 'No unit'} - {pay.period_month ? `${monthName(pay.period_month)} ${pay.period_year}` : formatDate(pay.paid_date)}
                        </p>
                      </div>
                    </div>
                    <Badge variant={sc.variant}>
                      <StatusIcon size={12} className="mr-1" />
                      {sc.label}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold text-stone-800">{formatCurrency(pay.amount, pay.currency)}</p>
                      <p className="text-xs text-stone-400 capitalize">{pay.payment_method.replace('_', ' ')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {pay.receipt_url && (
                        <a
                          href={pay.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-stone-50 text-stone-400 hover:bg-stone-100 transition-colors"
                          title="View receipt"
                        >
                          <Receipt size={16} />
                        </a>
                      )}
                      {pay.status === 'pending' && (
                        <>
                          <button
                            onClick={() => updatePaymentStatus(pay.id, 'verified')}
                            className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors tap-feedback"
                            title="Verify"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => updatePaymentStatus(pay.id, 'rejected')}
                            className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors tap-feedback"
                            title="Reject"
                          >
                            <X size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Payment Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Log Rent Payment"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-teal-50 rounded-xl p-3 flex items-start gap-2">
            <Mic size={18} className="text-teal-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-teal-700">
              The app does not move money. Record a payment the tenant made outside the app (cash, mobile money, etc.) and upload the receipt for verification.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1.5">Tenant</label>
            <select
              value={payTenantId}
              onChange={(e) => setPayTenantId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Select tenant</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>{t.full_name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1.5">Amount ({currency})</label>
              <input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="500000"
                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1.5">Payment Method</label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1.5">Payment Date</label>
              <input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1.5">Due Date (optional)</label>
              <input
                type="date"
                value={payDueDate}
                onChange={(e) => setPayDueDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1.5">Period Month</label>
              <select
                value={payMonth}
                onChange={(e) => setPayMonth(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={String(i + 1)}>
                    {monthName(i + 1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1.5">Year</label>
              <input
                type="number"
                value={payYear}
                onChange={(e) => setPayYear(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1.5">Upload Receipt (photo or screenshot)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleReceiptUpload(file);
              }}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-teal-50 file:text-teal-700 file:font-medium file:cursor-pointer"
            />
            {uploading && <p className="text-sm text-stone-400 mt-1">Uploading...</p>}
            {receiptUrl && (
              <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                <Check size={14} /> Receipt uploaded
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1.5">Notes (speak or type)</label>
            <VoiceInput
              value={payNotes}
              onChange={setPayNotes}
              language={lang}
              placeholder="Any additional notes about this payment..."
              multiline
            />
          </div>

          {payTenantId && payAmount && (
            <div className="bg-amber-50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-700">Voice Confirmation</p>
                  <p className="text-sm text-amber-600">
                    Logging {formatCurrency(parseFloat(payAmount) || 0, currency)} for {tenants.find((t) => t.id === payTenantId)?.full_name || 'this tenant'}.
                  </p>
                </div>
                <SpeakButton
                  text={`You are logging a rent payment of ${formatCurrency(parseFloat(payAmount) || 0, currency)} for ${tenants.find((t) => t.id === payTenantId)?.full_name || 'this tenant'}. Confirm?`}
                  language={lang}
                  label="Play"
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowModal(false)}
              className="px-5 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-medium hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={savePayment}
              disabled={!payTenantId || !payAmount}
              className="flex-1 py-2.5 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <Check size={18} /> Log Payment
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
