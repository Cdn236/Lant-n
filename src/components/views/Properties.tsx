import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  Building2,
  Plus,
  Home,
  BedDouble,
  Bath,
  DollarSign,
  Trash2,
  Pencil,
  ChevronRight,
  Mic,
} from 'lucide-react';
import type { Property, Unit, UnitStatus } from '@/types';
import { VoiceInput } from '@/components/ui/VoiceInput';
import { SpeakButton } from '@/components/ui/SpeakButton';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { formatCurrency } from '@/lib/utils';
import { speakTranslated } from '@/lib/voice';

const statusVariants: Record<UnitStatus, 'green' | 'teal' | 'amber'> = {
  occupied: 'green',
  vacant: 'teal',
  maintenance: 'amber',
};

export function Properties() {
  const { profile } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Record<string, Unit[]>>({});
  const [loading, setLoading] = useState(true);
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [expandedProperty, setExpandedProperty] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'property' | 'unit'; id: string; name: string } | null>(null);

  // Property form
  const [propName, setPropName] = useState('');
  const [propAddress, setPropAddress] = useState('');
  const [propType, setPropType] = useState<'residential' | 'commercial' | 'mixed'>('residential');
  const [propDesc, setPropDesc] = useState('');
  const [editingPropId, setEditingPropId] = useState<string | null>(null);

  // Unit form
  const [unitLabel, setUnitLabel] = useState('');
  const [unitBedrooms, setUnitBedrooms] = useState('1');
  const [unitBathrooms, setUnitBathrooms] = useState('1');
  const [unitRent, setUnitRent] = useState('');
  const [unitStatus, setUnitStatus] = useState<UnitStatus>('vacant');
  const [unitSize, setUnitSize] = useState('');
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [unitPropertyId, setUnitPropertyId] = useState<string | null>(null);

  const currency = profile?.preferred_currency || 'UGX';
  const lang = profile?.preferred_language || 'en';

  const fetchData = async () => {
    setLoading(true);
    const { data: props } = await supabase.from('properties').select('*').order('created_at', { ascending: false });
    const { data: allUnits } = await supabase.from('units').select('*').order('created_at', { ascending: false });

    const unitsByProp: Record<string, Unit[]> = {};
    (allUnits || []).forEach((u: any) => {
      if (!unitsByProp[u.property_id]) unitsByProp[u.property_id] = [];
      unitsByProp[u.property_id].push(u as Unit);
    });

    setProperties((props || []) as Property[]);
    setUnits(unitsByProp);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetPropForm = () => {
    setPropName('');
    setPropAddress('');
    setPropType('residential');
    setPropDesc('');
    setEditingPropId(null);
  };

  const resetUnitForm = () => {
    setUnitLabel('');
    setUnitBedrooms('1');
    setUnitBathrooms('1');
    setUnitRent('');
    setUnitStatus('vacant');
    setUnitSize('');
    setEditingUnitId(null);
    setUnitPropertyId(null);
  };

  const saveProperty = async () => {
    if (!propName.trim()) return;
    if (editingPropId) {
      await supabase
        .from('properties')
        .update({
          name: propName,
          address: propAddress,
          property_type: propType,
          description: propDesc,
        })
        .eq('id', editingPropId);
    } else {
      await supabase.from('properties').insert({
        name: propName,
        address: propAddress,
        property_type: propType,
        description: propDesc,
      });
    }
    resetPropForm();
    setShowPropertyModal(false);
    fetchData();
  };

  const saveUnit = async () => {
    if (!unitLabel.trim() || !unitPropertyId) return;
    const unitData = {
      property_id: unitPropertyId,
      label: unitLabel,
      bedrooms: parseInt(unitBedrooms) || 0,
      bathrooms: parseInt(unitBathrooms) || 0,
      rent_amount: parseFloat(unitRent) || 0,
      rent_currency: currency,
      status: unitStatus,
      size_sqm: unitSize ? parseFloat(unitSize) : null,
    };
    if (editingUnitId) {
      await supabase.from('units').update(unitData).eq('id', editingUnitId);
    } else {
      await supabase.from('units').insert(unitData);
    }
    resetUnitForm();
    setShowUnitModal(false);
    fetchData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'property') {
      await supabase.from('properties').delete().eq('id', deleteTarget.id);
    } else {
      await supabase.from('units').delete().eq('id', deleteTarget.id);
    }
    setDeleteTarget(null);
    fetchData();
  };

  const openEditProperty = (prop: Property) => {
    setEditingPropId(prop.id);
    setPropName(prop.name);
    setPropAddress(prop.address);
    setPropType(prop.property_type);
    setPropDesc(prop.description);
    setShowPropertyModal(true);
  };

  const openEditUnit = (unit: Unit, propId: string) => {
    setEditingUnitId(unit.id);
    setUnitPropertyId(propId);
    setUnitLabel(unit.label);
    setUnitBedrooms(String(unit.bedrooms));
    setUnitBathrooms(String(unit.bathrooms));
    setUnitRent(String(unit.rent_amount));
    setUnitStatus(unit.status);
    setUnitSize(unit.size_sqm ? String(unit.size_sqm) : '');
    setShowUnitModal(true);
  };

  const openAddUnit = (propId: string) => {
    resetUnitForm();
    setUnitPropertyId(propId);
    setShowUnitModal(true);
    speakTranslated('Add a new unit. You can type or speak the details.', lang);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-stone-400">Loading properties...</div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-stone-800 tracking-tight">Properties & Units</h2>
          <p className="text-stone-500 text-sm mt-1">
            {properties.length} {properties.length === 1 ? 'property' : 'properties'}
          </p>
        </div>
        <button
          onClick={() => {
            resetPropForm();
            setShowPropertyModal(true);
            speakTranslated('Add a new property. You can type or speak the name and address.', lang);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors tap-feedback shadow-md shadow-teal-600/20"
        >
          <Plus size={20} />
          <span>Add</span>
        </button>
      </div>

      {properties.length === 0 ? (
        <EmptyState
          icon={<Building2 size={36} />}
          title="No properties yet"
          description="Add your first property to start managing units and tenants."
          action={
            <button
              onClick={() => setShowPropertyModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors tap-feedback shadow-md shadow-teal-600/20"
            >
              <Plus size={20} /> Add Property
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {properties.map((prop) => {
            const propUnits = units[prop.id] || [];
            const isExpanded = expandedProperty === prop.id;
            const occupiedCount = propUnits.filter((u) => u.status === 'occupied').length;
            return (
              <div key={prop.id} className="bg-white rounded-2.5xl shadow-card border border-stone-100/80 overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-stone-50/50 transition-colors tap-feedback"
                  onClick={() => setExpandedProperty(isExpanded ? null : prop.id)}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center flex-shrink-0">
                      <Building2 size={22} className="text-teal-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-stone-800 text-sm truncate">{prop.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-stone-500 truncate">{prop.address || 'No address'}</span>
                        <Badge variant="stone">{prop.property_type}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-xs text-stone-500">{propUnits.length} units</p>
                      <p className="text-[10px] text-stone-400">{occupiedCount} occupied</p>
                    </div>
                    <ChevronRight
                      size={18}
                      className={`text-stone-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    />
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-stone-100 p-4 bg-stone-50/50">
                    {prop.description && (
                      <p className="text-sm text-stone-500 mb-4">{prop.description}</p>
                    )}
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-stone-700 text-sm">Units</h4>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditProperty(prop)}
                          className="p-2 rounded-lg hover:bg-stone-200 text-stone-500 transition-colors tap-feedback"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ type: 'property', id: prop.id, name: prop.name })}
                          className="p-2 rounded-lg hover:bg-red-100 text-stone-500 hover:text-red-500 transition-colors tap-feedback"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button
                          onClick={() => openAddUnit(prop.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors tap-feedback"
                        >
                          <Plus size={16} /> Add Unit
                        </button>
                      </div>
                    </div>

                    {propUnits.length === 0 ? (
                      <p className="text-sm text-stone-400 py-4 text-center">No units added yet</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {propUnits.map((unit) => (
                          <div key={unit.id} className="bg-white rounded-2xl p-4 border border-stone-100/80 shadow-card">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Home size={18} className="text-stone-400" />
                                <span className="font-medium text-stone-800">{unit.label}</span>
                              </div>
                              <Badge variant={statusVariants[unit.status]}>{unit.status}</Badge>
                            </div>
                            <div className="space-y-1 text-sm text-stone-500">
                              <div className="flex items-center gap-2">
                                <BedDouble size={14} /> {unit.bedrooms} bed
                                <Bath size={14} className="ml-2" /> {unit.bathrooms} bath
                              </div>
                              <div className="flex items-center gap-2 font-medium text-stone-700">
                                <DollarSign size={14} />
                                {formatCurrency(unit.rent_amount, unit.rent_currency)}
                              </div>
                              {unit.size_sqm && (
                                <p className="text-xs text-stone-400">{unit.size_sqm} sqm</p>
                              )}
                            </div>
                            <div className="flex gap-2 mt-3 pt-3 border-t border-stone-50">
                              <button
                                onClick={() => openEditUnit(unit, prop.id)}
                                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm text-stone-600 hover:bg-stone-100 transition-colors"
                              >
                                <Pencil size={14} /> Edit
                              </button>
                              <button
                                onClick={() => setDeleteTarget({ type: 'unit', id: unit.id, name: unit.label })}
                                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Property Modal */}
      <Modal
        open={showPropertyModal}
        onClose={() => { setShowPropertyModal(false); resetPropForm(); }}
        title={editingPropId ? 'Edit Property' : 'Add Property'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1.5">
              Property Name
            </label>
            <VoiceInput
              value={propName}
              onChange={setPropName}
              language={lang}
              placeholder="e.g. Plot 12 Kampala Road"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1.5">
              Address
            </label>
            <VoiceInput
              value={propAddress}
              onChange={setPropAddress}
              language={lang}
              placeholder="Street, city, area"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1.5">
              Property Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['residential', 'commercial', 'mixed'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setPropType(t)}
                  className={`px-4 py-2.5 rounded-xl border-2 text-sm font-medium capitalize transition-all ${
                    propType === t
                      ? 'border-teal-600 bg-teal-50 text-teal-700'
                      : 'border-stone-200 text-stone-600 hover:border-stone-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1.5">
              Description (optional)
            </label>
            <VoiceInput
              value={propDesc}
              onChange={setPropDesc}
              language={lang}
              placeholder="Any additional details..."
              multiline
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-stone-400">
            <Mic size={14} /> You can speak instead of typing. Tap the mic icon.
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { setShowPropertyModal(false); resetPropForm(); }}
              className="px-5 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-medium hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveProperty}
              disabled={!propName.trim()}
              className="flex-1 py-2.5 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {editingPropId ? 'Save Changes' : 'Add Property'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Unit Modal */}
      <Modal
        open={showUnitModal}
        onClose={() => { setShowUnitModal(false); resetUnitForm(); }}
        title={editingUnitId ? 'Edit Unit' : 'Add Unit'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1.5">
              Unit Label / Name
            </label>
            <VoiceInput
              value={unitLabel}
              onChange={setUnitLabel}
              language={lang}
              placeholder="e.g. Unit 3B, Shop 1"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1.5">
                Bedrooms
              </label>
              <input
                type="number"
                value={unitBedrooms}
                onChange={(e) => setUnitBedrooms(e.target.value)}
                min="0"
                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1.5">
                Bathrooms
              </label>
              <input
                type="number"
                value={unitBathrooms}
                onChange={(e) => setUnitBathrooms(e.target.value)}
                min="0"
                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1.5">
                Monthly Rent ({currency})
              </label>
              <input
                type="number"
                value={unitRent}
                onChange={(e) => setUnitRent(e.target.value)}
                placeholder="500000"
                min="0"
                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1.5">
                Size (sqm, optional)
              </label>
              <input
                type="number"
                value={unitSize}
                onChange={(e) => setUnitSize(e.target.value)}
                placeholder="45"
                min="0"
                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1.5">
              Status
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['vacant', 'occupied', 'maintenance'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setUnitStatus(s)}
                  className={`px-4 py-2.5 rounded-xl border-2 text-sm font-medium capitalize transition-all ${
                    unitStatus === s
                      ? 'border-teal-600 bg-teal-50 text-teal-700'
                      : 'border-stone-200 text-stone-600 hover:border-stone-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { setShowUnitModal(false); resetUnitForm(); }}
              className="px-5 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-medium hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveUnit}
              disabled={!unitLabel.trim()}
              className="flex-1 py-2.5 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {editingUnitId ? 'Save Changes' : 'Add Unit'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
