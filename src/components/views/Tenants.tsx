import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  Users,
  Plus,
  Phone,
  Mail,
  Trash2,
  Pencil,
  FileText,
  Mic,
  Check,
  Calendar,
  DollarSign,
  PlayCircle,
  FileSignature,
} from 'lucide-react';
import type { Tenant, Property, Unit, Lease, LanguageCode } from '@/types';
import { LANGUAGES } from '@/types';
import { VoiceInput } from '@/components/ui/VoiceInput';
import { SpeakButton } from '@/components/ui/SpeakButton';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { formatCurrency, formatDate, daysUntil } from '@/lib/utils';
import { speakTranslated } from '@/lib/voice';

export function Tenants() {
  const { profile } = useAuth();
  const [tenants, setTenants] = useState<(Tenant & { lease?: Lease; unit_label?: string; property_name?: string })[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [showLeaseModal, setShowLeaseModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  // Tenant form
  const [tName, setTName] = useState('');
  const [tPhone, setTPhone] = useState('');
  const [tEmail, setTEmail] = useState('');
  const [tLang, setTLang] = useState<LanguageCode>('en');
  const [tEmergencyName, setTEmergencyName] = useState('');
  const [tEmergencyPhone, setTEmergencyPhone] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Lease form
  const [leasePropId, setLeasePropId] = useState('');
  const [leaseUnitId, setLeaseUnitId] = useState('');
  const [leaseStart, setLeaseStart] = useState('');
  const [leaseEnd, setLeaseEnd] = useState('');
  const [leaseRent, setLeaseRent] = useState('');
  const [leaseDeposit, setLeaseDeposit] = useState('');
  const [leaseRules, setLeaseRules] = useState('');
  const [leaseRenewal, setLeaseRenewal] = useState('');
  const [agreementText, setAgreementText] = useState('');
  const [useTemplate, setUseTemplate] = useState(false);
  const [leaseStep, setLeaseStep] = useState(0);
  const [confirmConsent, setConfirmConsent] = useState(false);

  const lang = profile?.preferred_language || 'en';
  const currency = profile?.preferred_currency || 'UGX';

  const fetchData = async () => {
    setLoading(true);
    const { data: props } = await supabase.from('properties').select('*');
    const { data: allUnits } = await supabase.from('units').select('*');
    const { data: allTenants } = await supabase.from('tenants').select('*').order('created_at', { ascending: false });
    const { data: leases } = await supabase.from('leases').select('*').eq('status', 'active');

    const leaseMap = new Map((leases || []).map((l: any) => [l.tenant_id, l]));
    const unitMap = new Map((allUnits || []).map((u: any) => [u.id, u]));
    const propMap = new Map((props || []).map((p: any) => [p.id, p]));

    const enriched = (allTenants || []).map((t: any) => {
      const lease = leaseMap.get(t.id) as Lease | undefined;
      const unit = lease ? unitMap.get(lease.unit_id) : undefined;
      const prop = unit ? propMap.get(unit.property_id) : undefined;
      return {
        ...t,
        lease,
        unit_label: unit?.label,
        property_name: prop?.name,
      } as Tenant & { lease?: Lease; unit_label?: string; property_name?: string };
    });

    setProperties((props || []) as Property[]);
    setUnits((allUnits || []) as Unit[]);
    setTenants(enriched);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetTenantForm = () => {
    setTName('');
    setTPhone('');
    setTEmail('');
    setTLang('en');
    setTEmergencyName('');
    setTEmergencyPhone('');
    setEditingId(null);
  };

  const resetLeaseForm = () => {
    setLeasePropId('');
    setLeaseUnitId('');
    setLeaseStart('');
    setLeaseEnd('');
    setLeaseRent('');
    setLeaseDeposit('');
    setLeaseRules('');
    setLeaseRenewal('');
    setAgreementText('');
    setUseTemplate(false);
    setLeaseStep(0);
    setConfirmConsent(false);
  };

  const saveTenant = async () => {
    if (!tName.trim()) return;
    if (editingId) {
      await supabase
        .from('tenants')
        .update({
          full_name: tName,
          phone: tPhone,
          email: tEmail,
          preferred_language: tLang,
          emergency_contact_name: tEmergencyName,
          emergency_contact_phone: tEmergencyPhone,
        })
        .eq('id', editingId);
    } else {
      await supabase.from('tenants').insert({
        full_name: tName,
        phone: tPhone,
        email: tEmail,
        preferred_language: tLang,
        emergency_contact_name: tEmergencyName,
        emergency_contact_phone: tEmergencyPhone,
      });
    }
    resetTenantForm();
    setShowTenantModal(false);
    fetchData();
  };

  const generateAgreement = () => {
    const prop = properties.find((p) => p.id === leasePropId);
    const unit = units.find((u) => u.id === leaseUnitId);
    const tenant = selectedTenant;

    if (useTemplate) {
      const template = `TENANCY AGREEMENT

This Tenancy Agreement is made on ${formatDate(new Date())} between the Landlord (the Owner) and the Tenant as follows:

1. PARTIES
Landlord: ${profile?.full_name || 'The Owner'}
Tenant: ${tenant?.full_name || 'The Tenant'}

2. PROPERTY
The Landlord rents to the Tenant the unit known as ${unit?.label || 'the Unit'} located at ${prop?.name || 'the Property'}, ${prop?.address || ''}.

3. TERM
The tenancy shall commence on ${formatDate(leaseStart)} and shall continue until ${leaseEnd ? formatDate(leaseEnd) : 'on a month-to-month basis'}.

4. RENT
The Tenant shall pay rent of ${formatCurrency(parseFloat(leaseRent) || 0, currency)} per month, payable in advance on or before the first day of each month.

5. SECURITY DEPOSIT
The Tenant has paid a security deposit of ${formatCurrency(parseFloat(leaseDeposit) || 0, currency)}, which shall be refunded at the end of the tenancy subject to deductions for any damages or unpaid rent.

6. OBLIGATIONS OF THE TENANT
- To pay rent on time
- To keep the unit in good condition
- To not make any structural alterations without written consent
- To allow the Landlord reasonable access for inspections and repairs
- To use the unit for residential purposes only

7. OBLIGATIONS OF THE LANDLORD
- To maintain the structure and exterior of the property
- To ensure the unit is habitable at the start of the tenancy
- To carry out necessary repairs in a timely manner

8. TERMINATION
Either party may terminate this agreement by giving one month's written notice. ${leaseRenewal || 'The agreement may be renewed by mutual consent.'}

9. HOUSE RULES
${leaseRules || 'The Tenant shall comply with all reasonable house rules as communicated by the Landlord.'}

10. ENTIRE AGREEMENT
This agreement constitutes the entire agreement between the parties. No variation shall be effective unless in writing and signed by both parties.

SIGNED BY:
Landlord: _______________________ Date: __________
Tenant: _______________________ Date: __________`;
      setAgreementText(template);
    } else {
      const text = `Tenancy Agreement between ${profile?.full_name || 'Landlord'} and ${tenant?.full_name || 'Tenant'} for ${unit?.label || 'Unit'} at ${prop?.name || 'Property'}. Rent: ${formatCurrency(parseFloat(leaseRent) || 0, currency)} per month. Deposit: ${formatCurrency(parseFloat(leaseDeposit) || 0, currency)}. Start date: ${formatDate(leaseStart)}. ${leaseEnd ? `End date: ${formatDate(leaseEnd)}.` : 'Month-to-month.'} ${leaseRules ? `Rules: ${leaseRules}` : ''} ${leaseRenewal ? `Renewal: ${leaseRenewal}` : ''}`;
      setAgreementText(text);
    }
  };

  const saveLease = async () => {
    if (!selectedTenant || !leasePropId || !leaseUnitId || !leaseStart) return;
    await supabase.from('leases').insert({
      tenant_id: selectedTenant.id,
      property_id: leasePropId,
      unit_id: leaseUnitId,
      start_date: leaseStart,
      end_date: leaseEnd || null,
      rent_amount: parseFloat(leaseRent) || 0,
      rent_currency: currency,
      deposit: parseFloat(leaseDeposit) || 0,
      deposit_currency: currency,
      renewal_terms: leaseRenewal,
      rules: leaseRules,
      agreement_text: agreementText,
      template_used: useTemplate ? 'standard_ug' : 'custom_voice',
      audio_consent_url: confirmConsent ? 'voice_consent_recorded' : '',
      status: 'active',
    });

    await supabase
      .from('units')
      .update({ status: 'occupied' })
      .eq('id', leaseUnitId);

    resetLeaseForm();
    setShowLeaseModal(false);
    setSelectedTenant(null);
    fetchData();
  };

  const openCreateLease = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    resetLeaseForm();
    setLeaseStep(0);
    setShowLeaseModal(true);
    speakTranslated(`Creating a lease agreement for ${tenant.full_name}. You can type or speak the terms.`, lang);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from('tenants').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    fetchData();
  };

  const availableUnits = units.filter(
    (u) => u.property_id === leasePropId && (u.status === 'vacant' || u.id === leaseUnitId)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-stone-400">Loading tenants...</div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-stone-800 tracking-tight">Tenants & Leases</h2>
          <p className="text-stone-500 text-sm mt-1">
            {tenants.length} {tenants.length === 1 ? 'tenant' : 'tenants'}
          </p>
        </div>
        <button
          onClick={() => {
            resetTenantForm();
            setShowTenantModal(true);
            speakTranslated('Add a new tenant. You can type or speak their details.', lang);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors tap-feedback shadow-md shadow-teal-600/20"
        >
          <Plus size={20} />
          <span>Add</span>
        </button>
      </div>

      {tenants.length === 0 ? (
        <EmptyState
          icon={<Users size={36} />}
          title="No tenants yet"
          description="Add your first tenant to create a lease agreement."
          action={
            <button
              onClick={() => setShowTenantModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors tap-feedback shadow-md shadow-teal-600/20"
            >
              <Plus size={20} /> Add Tenant
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {tenants.map((tenant) => {
            const lease = tenant.lease;
            const daysLeft = lease?.end_date ? daysUntil(lease.end_date) : null;
            return (
              <div key={tenant.id} className="bg-white rounded-2.5xl shadow-card border border-stone-100/80 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center">
                      <Users size={22} className="text-teal-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-stone-800 text-sm">{tenant.full_name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        {tenant.phone && (
                          <span className="text-xs text-stone-500 flex items-center gap-1">
                            <Phone size={12} /> {tenant.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditingId(tenant.id);
                        setTName(tenant.full_name);
                        setTPhone(tenant.phone);
                        setTEmail(tenant.email);
                        setTLang(tenant.preferred_language);
                        setTEmergencyName(tenant.emergency_contact_name);
                        setTEmergencyPhone(tenant.emergency_contact_phone);
                        setShowTenantModal(true);
                      }}
                      className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget({ id: tenant.id, name: tenant.full_name })}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-stone-400 hover:text-red-500"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {tenant.email && (
                  <p className="text-xs text-stone-500 flex items-center gap-1 mb-2">
                    <Mail size={12} /> {tenant.email}
                  </p>
                )}

                {lease ? (
                  <div className="mt-3 pt-3 border-t border-stone-50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-stone-500">
                        {tenant.property_name} - {tenant.unit_label}
                      </span>
                      <Badge variant="green">Active lease</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-stone-500 flex items-center gap-1">
                        <DollarSign size={14} />
                        {formatCurrency(lease.rent_amount, lease.rent_currency)}/mo
                      </span>
                      {lease.end_date && (
                        <span className={`flex items-center gap-1 ${daysLeft !== null && daysLeft <= 30 ? 'text-amber-600' : 'text-stone-400'}`}>
                          <Calendar size={14} />
                          {daysLeft}d left
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => openCreateLease(tenant)}
                        className="flex-1 text-sm py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
                      >
                        New Lease
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 pt-3 border-t border-stone-50">
                    <button
                      onClick={() => openCreateLease(tenant)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-teal-50 text-teal-700 text-sm font-medium hover:bg-teal-100 transition-colors"
                    >
                      <FileSignature size={16} /> Create Lease Agreement
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tenant Modal */}
      <Modal
        open={showTenantModal}
        onClose={() => { setShowTenantModal(false); resetTenantForm(); }}
        title={editingId ? 'Edit Tenant' : 'Add Tenant'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1.5">Full Name</label>
            <VoiceInput value={tName} onChange={setTName} language={lang} placeholder="Tenant name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1.5">Phone</label>
              <input
                type="tel"
                value={tPhone}
                onChange={(e) => setTPhone(e.target.value)}
                placeholder="+256..."
                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1.5">Email (optional)</label>
              <input
                type="email"
                value={tEmail}
                onChange={(e) => setTEmail(e.target.value)}
                placeholder="tenant@email.com"
                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1.5">Preferred Language</label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setTLang(l.code)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    tLang === l.code
                      ? 'bg-teal-600 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {l.flag} {l.name}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1.5">Emergency Contact Name</label>
              <input
                type="text"
                value={tEmergencyName}
                onChange={(e) => setTEmergencyName(e.target.value)}
                placeholder="Contact name"
                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1.5">Emergency Phone</label>
              <input
                type="tel"
                value={tEmergencyPhone}
                onChange={(e) => setTEmergencyPhone(e.target.value)}
                placeholder="+256..."
                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { setShowTenantModal(false); resetTenantForm(); }}
              className="px-5 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-medium hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveTenant}
              disabled={!tName.trim()}
              className="flex-1 py-2.5 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {editingId ? 'Save Changes' : 'Add Tenant'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Lease Modal - Multi-step */}
      <Modal
        open={showLeaseModal}
        onClose={() => { setShowLeaseModal(false); resetLeaseForm(); }}
        title="Create Lease Agreement"
        size="xl"
      >
        <div className="space-y-4">
          {/* Step indicator */}
          <div className="flex items-center justify-between mb-4">
            {['Details', 'Agreement', 'Confirm'].map((s, i) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  i <= leaseStep ? 'bg-teal-600 text-white' : 'bg-stone-100 text-stone-400'
                }`}>
                  {i < leaseStep ? <Check size={16} /> : i + 1}
                </div>
                {i < 2 && <div className={`w-16 h-0.5 mx-1 ${i < leaseStep ? 'bg-teal-600' : 'bg-stone-200'}`} />}
              </div>
            ))}
          </div>

          {/* Step 0: Lease Details */}
          {leaseStep === 0 && (
            <div className="space-y-4">
              <div className="bg-teal-50 rounded-xl p-4 flex items-start gap-3">
                <Mic size={20} className="text-teal-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-teal-700">
                  Creating a lease for <strong>{selectedTenant?.full_name}</strong>. You can type or speak the terms. The agreement will be read back to you before saving.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1.5">Property</label>
                <select
                  value={leasePropId}
                  onChange={(e) => { setLeasePropId(e.target.value); setLeaseUnitId(''); }}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Select property</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1.5">Unit</label>
                <select
                  value={leaseUnitId}
                  onChange={(e) => {
                    setLeaseUnitId(e.target.value);
                    const u = units.find((u) => u.id === e.target.value);
                    if (u) setLeaseRent(String(u.rent_amount));
                  }}
                  disabled={!leasePropId}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
                >
                  <option value="">Select unit</option>
                  {availableUnits.map((u) => (
                    <option key={u.id} value={u.id}>{u.label} - {formatCurrency(u.rent_amount, u.rent_currency)}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={leaseStart}
                    onChange={(e) => setLeaseStart(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1.5">End Date (optional)</label>
                  <input
                    type="date"
                    value={leaseEnd}
                    onChange={(e) => setLeaseEnd(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1.5">Monthly Rent ({currency})</label>
                  <input
                    type="number"
                    value={leaseRent}
                    onChange={(e) => setLeaseRent(e.target.value)}
                    placeholder="500000"
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1.5">Deposit ({currency})</label>
                  <input
                    type="number"
                    value={leaseDeposit}
                    onChange={(e) => setLeaseDeposit(e.target.value)}
                    placeholder="1000000"
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1.5">House Rules (speak or type)</label>
                <VoiceInput
                  value={leaseRules}
                  onChange={setLeaseRules}
                  language={lang}
                  placeholder="e.g. No pets, no loud music after 10pm..."
                  multiline
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1.5">Renewal Terms (optional)</label>
                <VoiceInput
                  value={leaseRenewal}
                  onChange={setLeaseRenewal}
                  language={lang}
                  placeholder="e.g. Auto-renew for 1 year..."
                  multiline
                />
              </div>

              <div className="flex items-center gap-2 p-3 rounded-xl bg-stone-50">
                <input
                  type="checkbox"
                  id="useTemplate"
                  checked={useTemplate}
                  onChange={(e) => setUseTemplate(e.target.checked)}
                  className="w-5 h-5 rounded accent-teal-600"
                />
                <label htmlFor="useTemplate" className="text-sm text-stone-600 cursor-pointer">
                  Use a standard Ugandan tenancy template (recommended for formal agreements)
                </label>
              </div>

              <button
                onClick={() => { setLeaseStep(1); generateAgreement(); }}
                disabled={!leasePropId || !leaseUnitId || !leaseStart}
                className="w-full py-3 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                Generate Agreement <FileText size={18} />
              </button>
            </div>
          )}

          {/* Step 1: Review Agreement */}
          {leaseStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-stone-800">Review Agreement</h3>
                <SpeakButton text={agreementText} language={lang} label="Read Aloud" />
              </div>
              <div className="bg-amber-50 rounded-xl p-3 flex items-start gap-2">
                <PlayCircle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-700">
                  Listen to the agreement being read aloud. Edit the text below if anything needs correcting before you confirm.
                </p>
              </div>
              <textarea
                value={agreementText}
                onChange={(e) => setAgreementText(e.target.value)}
                rows={14}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 resize-y"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setLeaseStep(0)}
                  className="px-5 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-medium hover:bg-stone-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    setLeaseStep(2);
                    speakTranslated('Please confirm this agreement. You can give voice consent by tapping the checkbox below.', lang);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-colors"
                >
                  Proceed to Confirm
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Confirm & Sign */}
          {leaseStep === 2 && (
            <div className="space-y-4">
              <div className="bg-teal-50 rounded-2xl p-5 text-center">
                <FileSignature size={40} className="text-teal-600 mx-auto mb-3" />
                <h3 className="font-semibold text-stone-800 mb-1">Voice Consent</h3>
                <p className="text-sm text-stone-600 mb-4">
                  To sign this agreement with voice consent, tap the button below and say "I agree to this tenancy agreement". Or simply check the box to confirm.
                </p>
                <SpeakButton
                  text="I agree to this tenancy agreement"
                  language={lang}
                  label="Play consent statement"
                  className="mb-3"
                />
              </div>

              <label className="flex items-start gap-3 p-4 rounded-xl border-2 border-stone-200 cursor-pointer hover:border-teal-500 transition-colors">
                <input
                  type="checkbox"
                  checked={confirmConsent}
                  onChange={(e) => setConfirmConsent(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded accent-teal-600"
                />
                <div>
                  <span className="text-stone-700 font-medium">I confirm this agreement</span>
                  <p className="text-sm text-stone-500 mt-0.5">
                    By checking this box, I acknowledge that the agreement terms are correct and I consent to this tenancy agreement on behalf of both parties.
                  </p>
                </div>
              </label>

              <div className="flex gap-3">
                <button
                  onClick={() => setLeaseStep(1)}
                  className="px-5 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-medium hover:bg-stone-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={saveLease}
                  disabled={!confirmConsent}
                  className="flex-1 py-2.5 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Check size={18} /> Finalize Agreement
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Tenant"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This will also remove their lease records.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
