import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  Wrench,
  Plus,
  Check,
  Clock,
  AlertCircle,
  Image as ImageIcon,
  Mic,
  Trash2,
  Pencil,
  DollarSign,
  User,
} from 'lucide-react';
import type { MaintenanceRequest, MaintenanceStatus, MaintenancePriority, Property, Tenant } from '@/types';
import { VoiceInput } from '@/components/ui/VoiceInput';
import { SpeakButton } from '@/components/ui/SpeakButton';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { formatCurrency, formatDateTime, timeAgo } from '@/lib/utils';
import { speakTranslated } from '@/lib/voice';

const statusConfig: Record<MaintenanceStatus, { variant: 'red' | 'amber' | 'green'; label: string; icon: typeof Clock }> = {
  open: { variant: 'red', label: 'Open', icon: AlertCircle },
  in_progress: { variant: 'amber', label: 'In Progress', icon: Clock },
  resolved: { variant: 'green', label: 'Resolved', icon: Check },
};

const priorityConfig: Record<MaintenancePriority, 'stone' | 'blue' | 'amber' | 'red'> = {
  low: 'stone',
  normal: 'blue',
  high: 'amber',
  urgent: 'red',
};

export function Maintenance() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<(MaintenanceRequest & { tenant_name?: string; property_name: string })[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<'all' | MaintenanceStatus>('all');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  // Form state
  const [reqPropId, setReqPropId] = useState('');
  const [reqUnitId, setReqUnitId] = useState('');
  const [reqTenantId, setReqTenantId] = useState('');
  const [reqTitle, setReqTitle] = useState('');
  const [reqDesc, setReqDesc] = useState('');
  const [reqPriority, setReqPriority] = useState<MaintenancePriority>('normal');
  const [reqAssigned, setReqAssigned] = useState('');
  const [reqCost, setReqCost] = useState('');
  const [reqPhotos, setReqPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const lang = profile?.preferred_language || 'en';
  const currency = profile?.preferred_currency || 'UGX';

  const fetchData = async () => {
    setLoading(true);
    const { data: reqs } = await supabase
      .from('maintenance_requests')
      .select('*, tenant:tenants(full_name), property:properties(name)')
      .order('created_at', { ascending: false });
    const { data: props } = await supabase.from('properties').select('*');
    const { data: tens } = await supabase.from('tenants').select('*');

    const enriched = (reqs || []).map((r: any) => ({
      ...r,
      tenant_name: r.tenant?.full_name,
      property_name: r.property?.name || 'Unknown',
    }));

    setRequests(enriched);
    setProperties((props || []) as Property[]);
    setTenants((tens || []) as Tenant[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setReqPropId('');
    setReqUnitId('');
    setReqTenantId('');
    setReqTitle('');
    setReqDesc('');
    setReqPriority('normal');
    setReqAssigned('');
    setReqCost('');
    setReqPhotos([]);
    setEditingId(null);
  };

  const handlePhotoUpload = async (file: File) => {
    setUploading(true);
    const fileName = `maintenance/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('documents').upload(fileName, file);
    if (!error) {
      const { data } = supabase.storage.from('documents').getPublicUrl(fileName);
      setReqPhotos((prev) => [...prev, data.publicUrl]);
    }
    setUploading(false);
  };

  const saveRequest = async () => {
    if (!reqPropId || !reqDesc) return;
    const data = {
      property_id: reqPropId,
      unit_id: reqUnitId || null,
      tenant_id: reqTenantId || null,
      title: reqTitle,
      description: reqDesc,
      priority: reqPriority,
      assigned_to: reqAssigned,
      cost: parseFloat(reqCost) || 0,
      cost_currency: currency,
      photos: reqPhotos,
    };
    if (editingId) {
      await supabase.from('maintenance_requests').update(data).eq('id', editingId);
    } else {
      await supabase.from('maintenance_requests').insert(data);
    }
    resetForm();
    setShowModal(false);
    fetchData();
  };

  const updateStatus = async (id: string, status: MaintenanceStatus) => {
    await supabase.from('maintenance_requests').update({ status }).eq('id', id);
    fetchData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from('maintenance_requests').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    fetchData();
  };

  const openEdit = (req: MaintenanceRequest & { tenant_name?: string; property_name: string }) => {
    setEditingId(req.id);
    setReqPropId(req.property_id);
    setReqUnitId(req.unit_id || '');
    setReqTenantId(req.tenant_id || '');
    setReqTitle(req.title);
    setReqDesc(req.description);
    setReqPriority(req.priority);
    setReqAssigned(req.assigned_to);
    setReqCost(req.cost ? String(req.cost) : '');
    setReqPhotos(req.photos || []);
    setShowModal(true);
  };

  const filteredRequests = filter === 'all'
    ? requests
    : requests.filter((r) => r.status === filter);

  const counts = {
    open: requests.filter((r) => r.status === 'open').length,
    in_progress: requests.filter((r) => r.status === 'in_progress').length,
    resolved: requests.filter((r) => r.status === 'resolved').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-stone-400">Loading maintenance requests...</div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-stone-800 tracking-tight">Maintenance Requests</h2>
          <p className="text-stone-500 text-sm mt-1">Track and resolve repair requests</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
            speakTranslated('Create a new maintenance request. You can speak or type the description.', lang);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors tap-feedback shadow-md shadow-teal-600/20"
        >
          <Plus size={20} />
          <span>New</span>
        </button>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-3 gap-3">
        {(['open', 'in_progress', 'resolved'] as MaintenanceStatus[]).map((s) => {
          const sc = statusConfig[s];
          const Icon = sc.icon;
          return (
            <button
              key={s}
              onClick={() => setFilter(filter === s ? 'all' : s)}
              className={`bg-white rounded-2xl p-4 shadow-sm border-2 transition-all text-left ${
                filter === s ? 'border-teal-500' : 'border-stone-100'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon size={16} className={`text-${sc.variant === 'red' ? 'red' : sc.variant === 'amber' ? 'amber' : 'green'}-500`} />
                <span className="text-xs text-stone-500">{sc.label}</span>
              </div>
              <p className="text-2xl font-bold text-stone-800">{counts[s]}</p>
            </button>
          );
        })}
      </div>

      {filteredRequests.length === 0 ? (
        <EmptyState
          icon={<Wrench size={36} />}
          title="No maintenance requests"
          description="Create a request when a tenant reports a repair needed."
          action={
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors tap-feedback shadow-md shadow-teal-600/20"
            >
              <Plus size={20} /> New Request
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req) => {
            const sc = statusConfig[req.status];
            const StatusIcon = sc.icon;
            return (
              <div key={req.id} className="bg-white rounded-2.5xl shadow-card border border-stone-100/80 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge variant={priorityConfig[req.priority]}>{req.priority}</Badge>
                      <Badge variant={sc.variant}>
                        <StatusIcon size={12} className="mr-1" />
                        {sc.label}
                      </Badge>
                    </div>
                    {req.title && <h3 className="font-semibold text-stone-800 text-sm">{req.title}</h3>}
                    <p className="text-xs text-stone-500 mt-0.5">{req.property_name}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(req)}
                      className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 tap-feedback"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget({ id: req.id, title: req.title || 'this request' })}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-stone-400 hover:text-red-500 tap-feedback"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="flex items-start gap-2 mb-3">
                  <p className="text-sm text-stone-600 flex-1">{req.description}</p>
                  <SpeakButton text={req.description} language={lang} label="" />
                </div>

                {req.photos.length > 0 && (
                  <div className="flex gap-2 mb-3">
                    {req.photos.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt="Maintenance" className="w-16 h-16 rounded-lg object-cover border border-stone-200" />
                      </a>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-stone-50">
                  {req.tenant_name && (
                    <span className="text-xs text-stone-500 flex items-center gap-1">
                      <User size={12} /> {req.tenant_name}
                    </span>
                  )}
                  {req.assigned_to && (
                    <span className="text-xs text-stone-500 flex items-center gap-1">
                      <Wrench size={12} /> {req.assigned_to}
                    </span>
                  )}
                  {req.cost > 0 && (
                    <span className="text-xs text-stone-500 flex items-center gap-1">
                      <DollarSign size={12} /> {formatCurrency(req.cost, req.cost_currency)}
                    </span>
                  )}
                  <span className="text-xs text-stone-400 ml-auto">{timeAgo(req.created_at)}</span>
                </div>

                {req.status !== 'resolved' && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-stone-50">
                    {req.status === 'open' && (
                      <button
                        onClick={() => updateStatus(req.id, 'in_progress')}
                        className="flex-1 py-2 rounded-lg bg-amber-50 text-amber-700 text-sm font-medium hover:bg-amber-100 transition-colors"
                      >
                        Start Work
                      </button>
                    )}
                    <button
                      onClick={() => updateStatus(req.id, 'resolved')}
                      className="flex-1 py-2 rounded-lg bg-green-50 text-green-700 text-sm font-medium hover:bg-green-100 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Check size={14} /> Mark Resolved
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingId ? 'Edit Request' : 'New Maintenance Request'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1.5">Property</label>
            <select
              value={reqPropId}
              onChange={(e) => setReqPropId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Select property</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1.5">Tenant (optional)</label>
              <select
                value={reqTenantId}
                onChange={(e) => setReqTenantId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">No specific tenant</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>{t.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1.5">Priority</label>
              <select
                value={reqPriority}
                onChange={(e) => setReqPriority(e.target.value as MaintenancePriority)}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1.5">Title (short summary)</label>
            <VoiceInput
              value={reqTitle}
              onChange={setReqTitle}
              language={lang}
              placeholder="e.g. Leaking tap in bathroom"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1.5">Description (speak or type)</label>
            <VoiceInput
              value={reqDesc}
              onChange={setReqDesc}
              language={lang}
              placeholder="Describe the issue in detail..."
              multiline
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1.5">Upload Photos</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                files.forEach((f) => handlePhotoUpload(f));
              }}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-teal-50 file:text-teal-700 file:font-medium file:cursor-pointer"
            />
            {uploading && <p className="text-sm text-stone-400 mt-1">Uploading...</p>}
            {reqPhotos.length > 0 && (
              <div className="flex gap-2 mt-2">
                {reqPhotos.map((url, i) => (
                  <img key={i} src={url} alt="Upload" className="w-16 h-16 rounded-lg object-cover border border-stone-200" />
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1.5">Assigned To (optional)</label>
              <input
                type="text"
                value={reqAssigned}
                onChange={(e) => setReqAssigned(e.target.value)}
                placeholder="Staff or vendor name"
                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1.5">Cost ({currency})</label>
              <input
                type="number"
                value={reqCost}
                onChange={(e) => setReqCost(e.target.value)}
                placeholder="0"
                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { setShowModal(false); resetForm(); }}
              className="px-5 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-medium hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveRequest}
              disabled={!reqPropId || !reqDesc}
              className="flex-1 py-2.5 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {editingId ? 'Save Changes' : 'Create Request'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Request"
        message={`Delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
