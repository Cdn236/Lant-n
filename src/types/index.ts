export type UserRole = 'owner' | 'manager' | 'staff' | 'tenant';
export type LanguageCode = 'en' | 'lug' | 'nyn' | 'ate' | 'luo';
export type UnitStatus = 'vacant' | 'occupied' | 'maintenance';
export type LeaseStatus = 'draft' | 'active' | 'expired' | 'terminated';
export type PaymentStatus = 'pending' | 'verified' | 'rejected';
export type PaymentMethod = 'cash' | 'mobile_money' | 'bank_transfer' | 'cheque' | 'other';
export type MaintenanceStatus = 'open' | 'in_progress' | 'resolved';
export type MaintenancePriority = 'low' | 'normal' | 'high' | 'urgent';
export type DocType = 'lease' | 'id_document' | 'inspection_report' | 'receipt' | 'agreement' | 'other';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  preferred_language: LanguageCode;
  preferred_currency: string;
  phone: string;
  email: string;
  notification_prefs: Record<string, boolean>;
  terms_accepted: boolean;
  terms_accepted_at: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: string;
  owner_id: string;
  name: string;
  address: string;
  property_type: 'residential' | 'commercial' | 'mixed';
  description: string;
  created_at: string;
  updated_at: string;
}

export interface Unit {
  id: string;
  property_id: string;
  owner_id: string;
  label: string;
  size_sqm: number | null;
  bedrooms: number;
  bathrooms: number;
  rent_amount: number;
  rent_currency: string;
  status: UnitStatus;
  photos: string[];
  created_at: string;
  updated_at: string;
}

export interface Tenant {
  id: string;
  owner_id: string;
  user_id: string | null;
  full_name: string;
  phone: string;
  email: string;
  id_doc_url: string;
  id_doc_type: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  preferred_language: LanguageCode;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Lease {
  id: string;
  owner_id: string;
  property_id: string;
  unit_id: string;
  tenant_id: string;
  start_date: string;
  end_date: string | null;
  rent_amount: number;
  rent_currency: string;
  deposit: number;
  deposit_currency: string;
  renewal_terms: string;
  rules: string;
  agreement_text: string;
  template_used: string;
  audio_consent_url: string;
  status: LeaseStatus;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  owner_id: string;
  lease_id: string | null;
  tenant_id: string;
  unit_id: string | null;
  property_id: string | null;
  amount: number;
  currency: string;
  payment_method: PaymentMethod;
  receipt_url: string;
  due_date: string | null;
  paid_date: string | null;
  period_month: number | null;
  period_year: number | null;
  status: PaymentStatus;
  notes: string;
  late_fee: number;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceRequest {
  id: string;
  owner_id: string;
  property_id: string;
  unit_id: string | null;
  tenant_id: string | null;
  title: string;
  description: string;
  photos: string[];
  voice_note_url: string;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  assigned_to: string;
  cost: number;
  cost_currency: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  owner_id: string;
  tenant_id: string;
  sender: 'landlord' | 'tenant';
  body: string;
  original_language: string;
  translated_body: string;
  voice_url: string;
  read: boolean;
  created_at: string;
}

export interface Announcement {
  id: string;
  owner_id: string;
  property_id: string | null;
  title: string;
  body: string;
  voice_url: string;
  created_at: string;
}

export interface DocumentRecord {
  id: string;
  owner_id: string;
  property_id: string | null;
  unit_id: string | null;
  tenant_id: string | null;
  lease_id: string | null;
  doc_type: DocType;
  title: string;
  file_url: string;
  created_at: string;
}

export const LANGUAGES: { code: LanguageCode; name: string; nativeName: string; flag: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'lug', name: 'Luganda', nativeName: 'Luganda', flag: '🇺🇬' },
  { code: 'nyn', name: 'Runyankole', nativeName: 'Runyankole', flag: '🇺🇬' },
  { code: 'ate', name: 'Ateso', nativeName: 'Ateso', flag: '🇺🇬' },
  { code: 'luo', name: 'Luo', nativeName: 'Luo', flag: '🇺🇬' },
];

export const CURRENCIES = ['UGX', 'USD', 'KES', 'TZS', 'RWF'];

// Country dialing codes selectable in the Profile / contact section.
export const COUNTRY_CODES: { code: string; name: string; dial: string }[] = [
  { code: 'UG', name: 'Uganda', dial: '+256' },
  { code: 'KE', name: 'Kenya', dial: '+254' },
  { code: 'TZ', name: 'Tanzania', dial: '+255' },
  { code: 'RW', name: 'Rwanda', dial: '+250' },
  { code: 'SS', name: 'South Sudan', dial: '+211' },
  { code: 'BI', name: 'Burundi', dial: '+257' },
  { code: 'CD', name: 'DR Congo', dial: '+243' },
  { code: 'ET', name: 'Ethiopia', dial: '+251' },
  { code: 'SO', name: 'Somalia', dial: '+252' },
  { code: 'GH', name: 'Ghana', dial: '+233' },
  { code: 'NG', name: 'Nigeria', dial: '+234' },
  { code: 'ZA', name: 'South Africa', dial: '+27' },
  { code: 'EG', name: 'Egypt', dial: '+20' },
  { code: 'MA', name: 'Morocco', dial: '+212' },
  { code: 'US', name: 'United States', dial: '+1' },
  { code: 'CA', name: 'Canada', dial: '+1' },
  { code: 'GB', name: 'United Kingdom', dial: '+44' },
  { code: 'AU', name: 'Australia', dial: '+61' },
  { code: 'DE', name: 'Germany', dial: '+49' },
  { code: 'FR', name: 'France', dial: '+33' },
  { code: 'IN', name: 'India', dial: '+91' },
];

export const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'cash', label: 'Cash', icon: 'banknote' },
  { value: 'mobile_money', label: 'Mobile Money', icon: 'smartphone' },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: 'landmark' },
  { value: 'cheque', label: 'Cheque', icon: 'file-check' },
  { value: 'other', label: 'Other', icon: 'circle' },
];
