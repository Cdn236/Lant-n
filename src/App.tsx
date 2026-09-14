import { useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AuthPage } from '@/components/auth/AuthPage';
import { Onboarding } from '@/components/auth/Onboarding';
import { AppShell, type NavView } from '@/components/layout/AppShell';
import { Dashboard } from '@/components/views/Dashboard';
import { Properties } from '@/components/views/Properties';
import { Tenants } from '@/components/views/Tenants';
import { RentTracking } from '@/components/views/RentTracking';
import { Maintenance } from '@/components/views/Maintenance';
import { Messages } from '@/components/views/Messages';
import { Reports } from '@/components/views/Reports';
import { Settings } from '@/components/views/Settings';

function AppContent() {
  const { session, profile, loading } = useAuth();
  const [view, setView] = useState<NavView>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-400 animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return <AuthPage />;
  }

  if (profile && !profile.onboarding_completed) {
    return <Onboarding onComplete={() => {}} />;
  }

  return (
    <AppShell currentView={view} onViewChange={setView}>
      {view === 'dashboard' && <Dashboard onNavigate={setView} />}
      {view === 'properties' && <Properties />}
      {view === 'tenants' && <Tenants />}
      {view === 'rent' && <RentTracking />}
      {view === 'maintenance' && <Maintenance />}
      {view === 'messages' && <Messages />}
      {view === 'reports' && <Reports />}
      {view === 'settings' && <Settings />}
    </AppShell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
