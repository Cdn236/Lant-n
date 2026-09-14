/*
# Rental Management System - Core Schema

## Overview
Creates the complete database schema for a rental/tenant management system with:
- User profiles with role, language, and currency preferences
- Properties and units management
- Tenants and lease agreements
- Rent tracking with receipt uploads (no in-app payments)
- Maintenance requests with voice/photo support
- In-app messaging with translation support
- Broadcast announcements
- Document storage references

## Tables Created

### profiles
Extends auth.users with role (owner/manager/staff/tenant), preferred language, currency, notification preferences, and T&C acceptance.

### properties
Landlord-owned properties with name, address, type, and description.

### units
Individual units within properties — size, bedrooms, bathrooms, rent amount, status (vacant/occupied/maintenance), photos.

### tenants
Tenant profiles — contact info, ID docs, emergency contacts, linked to auth user if they have a portal account.

### leases
Lease agreements — start/end dates, rent, deposit, renewal terms, status, generated text, audio consent flag, template used.

### payments
Rent payment records — amount, currency, payment method, receipt photo URL, status (pending/verified/rejected), due date, paid date. No money movement — records only.

### maintenance_requests
Maintenance tickets — description (text from voice or typing), photos, status (open/in_progress/resolved), assigned staff/vendor, cost logging.

### messages
In-app messages between landlord/manager and tenants — text, original language, translated text, voice audio URL.

### announcements
Broadcast notices — text, audio, target property/scope.

### documents
Central document repository — type (lease/id/inspection/receipt/other), file URL, linked to tenant/property/unit.

## Security
- RLS enabled on ALL tables.
- All tables are owner-scoped: the landlord (owner/manager) who created the data can access it.
- Staff role inherits access through the owner relationship.
- Tenant role can read their own lease, payment, maintenance, and message data.
- Uses auth.uid() for ownership checks.
- Owner columns default to auth.uid() for seamless inserts.
*/

-- ============ PROFILES ============
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'manager', 'staff', 'tenant')),
  preferred_language text NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en', 'lug', 'nyn', 'ate', 'luo')),
  preferred_currency text NOT NULL DEFAULT 'UGX',
  phone text DEFAULT '',
  email text DEFAULT '',
  notification_prefs jsonb NOT NULL DEFAULT '{"rent_due": true, "rent_received": true, "lease_expiring": true, "maintenance_updates": true}'::jsonb,
  terms_accepted boolean NOT NULL DEFAULT false,
  terms_accepted_at timestamptz,
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add email column to already-created profiles tables (backward-compatible).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text DEFAULT '';

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============ PROPERTIES ============
CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text DEFAULT '',
  property_type text NOT NULL DEFAULT 'residential' CHECK (property_type IN ('residential', 'commercial', 'mixed')),
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_properties" ON properties;
CREATE POLICY "select_own_properties" ON properties FOR SELECT
  TO authenticated USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "insert_own_properties" ON properties;
CREATE POLICY "insert_own_properties" ON properties FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "update_own_properties" ON properties;
CREATE POLICY "update_own_properties" ON properties FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "delete_own_properties" ON properties;
CREATE POLICY "delete_own_properties" ON properties FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

-- ============ UNITS ============
CREATE TABLE IF NOT EXISTS units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL,
  size_sqm numeric,
  bedrooms integer DEFAULT 0,
  bathrooms integer DEFAULT 0,
  rent_amount numeric NOT NULL DEFAULT 0,
  rent_currency text NOT NULL DEFAULT 'UGX',
  status text NOT NULL DEFAULT 'vacant' CHECK (status IN ('vacant', 'occupied', 'maintenance')),
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_units" ON units;
CREATE POLICY "select_own_units" ON units FOR SELECT
  TO authenticated USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "insert_own_units" ON units;
CREATE POLICY "insert_own_units" ON units FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "update_own_units" ON units;
CREATE POLICY "update_own_units" ON units FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "delete_own_units" ON units;
CREATE POLICY "delete_own_units" ON units FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

-- ============ TENANTS ============
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  phone text DEFAULT '',
  email text DEFAULT '',
  id_doc_url text DEFAULT '',
  id_doc_type text DEFAULT '',
  emergency_contact_name text DEFAULT '',
  emergency_contact_phone text DEFAULT '',
  preferred_language text NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en', 'lug', 'nyn', 'ate', 'luo')),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_tenants" ON tenants;
CREATE POLICY "select_own_tenants" ON tenants FOR SELECT
  TO authenticated USING (auth.uid() = owner_id OR auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_tenants" ON tenants;
CREATE POLICY "insert_own_tenants" ON tenants FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "update_own_tenants" ON tenants;
CREATE POLICY "update_own_tenants" ON tenants FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "delete_own_tenants" ON tenants;
CREATE POLICY "delete_own_tenants" ON tenants FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

-- ============ LEASES ============
CREATE TABLE IF NOT EXISTS leases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date,
  rent_amount numeric NOT NULL DEFAULT 0,
  rent_currency text NOT NULL DEFAULT 'UGX',
  deposit numeric NOT NULL DEFAULT 0,
  deposit_currency text NOT NULL DEFAULT 'UGX',
  renewal_terms text DEFAULT '',
  rules text DEFAULT '',
  agreement_text text NOT NULL DEFAULT '',
  template_used text DEFAULT '',
  audio_consent_url text DEFAULT '',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'expired', 'terminated')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE leases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_leases" ON leases;
CREATE POLICY "select_own_leases" ON leases FOR SELECT
  TO authenticated USING (
    auth.uid() = owner_id
    OR EXISTS (SELECT 1 FROM tenants WHERE tenants.id = leases.tenant_id AND tenants.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_leases" ON leases;
CREATE POLICY "insert_own_leases" ON leases FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "update_own_leases" ON leases;
CREATE POLICY "update_own_leases" ON leases FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "delete_own_leases" ON leases;
CREATE POLICY "delete_own_leases" ON leases FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

-- ============ PAYMENTS ============
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  lease_id uuid REFERENCES leases(id) ON DELETE SET NULL,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES units(id) ON DELETE SET NULL,
  property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'UGX',
  payment_method text NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'mobile_money', 'bank_transfer', 'cheque', 'other')),
  receipt_url text DEFAULT '',
  due_date date,
  paid_date date,
  period_month integer,
  period_year integer,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  notes text DEFAULT '',
  late_fee numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_payments" ON payments;
CREATE POLICY "select_own_payments" ON payments FOR SELECT
  TO authenticated USING (
    auth.uid() = owner_id
    OR EXISTS (SELECT 1 FROM tenants WHERE tenants.id = payments.tenant_id AND tenants.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_payments" ON payments;
CREATE POLICY "insert_own_payments" ON payments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "update_own_payments" ON payments;
CREATE POLICY "update_own_payments" ON payments FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "delete_own_payments" ON payments;
CREATE POLICY "delete_own_payments" ON payments FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

-- ============ MAINTENANCE REQUESTS ============
CREATE TABLE IF NOT EXISTS maintenance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES units(id) ON DELETE SET NULL,
  tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  voice_note_url text DEFAULT '',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_to text DEFAULT '',
  cost numeric NOT NULL DEFAULT 0,
  cost_currency text NOT NULL DEFAULT 'UGX',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_maintenance" ON maintenance_requests;
CREATE POLICY "select_own_maintenance" ON maintenance_requests FOR SELECT
  TO authenticated USING (
    auth.uid() = owner_id
    OR (tenant_id IS NOT NULL AND EXISTS (SELECT 1 FROM tenants WHERE tenants.id = maintenance_requests.tenant_id AND tenants.user_id = auth.uid()))
  );

DROP POLICY IF EXISTS "insert_own_maintenance" ON maintenance_requests;
CREATE POLICY "insert_own_maintenance" ON maintenance_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "update_own_maintenance" ON maintenance_requests;
CREATE POLICY "update_own_maintenance" ON maintenance_requests FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "delete_own_maintenance" ON maintenance_requests;
CREATE POLICY "delete_own_maintenance" ON maintenance_requests FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

-- ============ MESSAGES ============
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('landlord', 'tenant')),
  body text NOT NULL DEFAULT '',
  original_language text NOT NULL DEFAULT 'en',
  translated_body text DEFAULT '',
  voice_url text DEFAULT '',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_messages" ON messages;
CREATE POLICY "select_own_messages" ON messages FOR SELECT
  TO authenticated USING (
    auth.uid() = owner_id
    OR EXISTS (SELECT 1 FROM tenants WHERE tenants.id = messages.tenant_id AND tenants.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_messages" ON messages;
CREATE POLICY "insert_own_messages" ON messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "update_own_messages" ON messages;
CREATE POLICY "update_own_messages" ON messages FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "delete_own_messages" ON messages;
CREATE POLICY "delete_own_messages" ON messages FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

-- ============ ANNOUNCEMENTS ============
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  voice_url text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_announcements" ON announcements;
CREATE POLICY "select_announcements" ON announcements FOR SELECT
  TO authenticated USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "insert_own_announcements" ON announcements;
CREATE POLICY "insert_own_announcements" ON announcements FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "update_own_announcements" ON announcements;
CREATE POLICY "update_own_announcements" ON announcements FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "delete_own_announcements" ON announcements;
CREATE POLICY "delete_own_announcements" ON announcements FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

-- ============ DOCUMENTS ============
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES units(id) ON DELETE SET NULL,
  tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,
  lease_id uuid REFERENCES leases(id) ON DELETE SET NULL,
  doc_type text NOT NULL DEFAULT 'other' CHECK (doc_type IN ('lease', 'id_document', 'inspection_report', 'receipt', 'agreement', 'other')),
  title text NOT NULL DEFAULT '',
  file_url text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_documents" ON documents;
CREATE POLICY "select_own_documents" ON documents FOR SELECT
  TO authenticated USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "insert_own_documents" ON documents;
CREATE POLICY "insert_own_documents" ON documents FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "update_own_documents" ON documents;
CREATE POLICY "update_own_documents" ON documents FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "delete_own_documents" ON documents;
CREATE POLICY "delete_own_documents" ON documents FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_properties_owner ON properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_units_property ON units(property_id);
CREATE INDEX IF NOT EXISTS idx_units_owner ON units(owner_id);
CREATE INDEX IF NOT EXISTS idx_tenants_owner ON tenants(owner_id);
CREATE INDEX IF NOT EXISTS idx_leases_owner ON leases(owner_id);
CREATE INDEX IF NOT EXISTS idx_leases_tenant ON leases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leases_unit ON leases(unit_id);
CREATE INDEX IF NOT EXISTS idx_payments_owner ON payments(owner_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_lease ON payments(lease_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_owner ON maintenance_requests(owner_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_property ON maintenance_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_messages_owner ON messages(owner_id);
CREATE INDEX IF NOT EXISTS idx_messages_tenant ON messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_announcements_owner ON announcements(owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(owner_id);

-- ============ UPDATED_AT TRIGGER ============
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated ON profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_properties_updated ON properties;
CREATE TRIGGER trg_properties_updated BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_units_updated ON units;
CREATE TRIGGER trg_units_updated BEFORE UPDATE ON units
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_tenants_updated ON tenants;
CREATE TRIGGER trg_tenants_updated BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_leases_updated ON leases;
CREATE TRIGGER trg_leases_updated BEFORE UPDATE ON leases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_payments_updated ON payments;
CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_maintenance_updated ON maintenance_requests;
CREATE TRIGGER trg_maintenance_updated BEFORE UPDATE ON maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();