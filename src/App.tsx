import React, { useState, useEffect } from 'react';
import { apiFetch, getAdminToken, useRealtimeRideStream } from './lib/api';
import { Ride, DashboardStats } from './types';
import { ClientStorage } from './lib/storage';
import LoginPage from './components/auth/LoginPage';
import Navbar from './components/layout/Navbar';
import DashboardView from './components/admin/DashboardView';
import RideHistoryView from './components/admin/RideHistoryView';
import CreateRideModal from './components/admin/CreateRideModal';
import GeneratedLinksModal from './components/admin/GeneratedLinksModal';
import RideDetailsModal from './components/admin/RideDetailsModal';
import ManageDriversModal from './components/admin/ManageDriversModal';
import AssignDriverModal from './components/admin/AssignDriverModal';
import CompanyLogoModal from './components/admin/CompanyLogoModal';
import AdminEmailsModal from './components/admin/AdminEmailsModal';
import DriverView from './components/driver/DriverView';
import PassengerView from './components/passenger/PassengerView';
import AdminTrackView from './components/tracking/AdminTrackView';

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tracking' | 'history'>('dashboard');
  const [historyFilter, setHistoryFilter] = useState<string>('all');

  // Admin Data State with permanent client-side fallback
  const [rides, setRides] = useState<Ride[]>(() => ClientStorage.getLocalRides());
  const [stats, setStats] = useState<DashboardStats>(() => {
    const initialRides = ClientStorage.getLocalRides();
    return {
      totalRides: initialRides.length,
      todayRides: initialRides.length,
      activeRides: initialRides.filter(r => r.currentStatus !== 'done').length,
      completedRides: initialRides.filter(r => r.currentStatus === 'done').length
    };
  });

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isManageDriversOpen, setIsManageDriversOpen] = useState(false);
  const [isCompanyLogoModalOpen, setIsCompanyLogoModalOpen] = useState(false);
  const [isManageAdminEmailsOpen, setIsManageAdminEmailsOpen] = useState(false);
  const [assignDriverRide, setAssignDriverRide] = useState<Ride | null>(null);
  const [generatedLinksRide, setGeneratedLinksRide] = useState<Ride | null>(null);
  const [selectedRideDetails, setSelectedRideDetails] = useState<Ride | null>(null);

  // SSE Stream for Admin & App
  const { lastUpdate, connectionStatus } = useRealtimeRideStream();

  // Listen to popstate (browser back/forward)
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Check Authentication Status
  const checkAuth = async () => {
    const token = getAdminToken();
    if (!token) {
      setIsAuthenticated(false);
      return;
    }

    try {
      const res = await apiFetch<{ authenticated: boolean }>('/api/auth/me');
      setIsAuthenticated(res.authenticated);
      if (res.authenticated) {
        // Run sync/hydration first if local store has saved items
        await ClientStorage.syncWithServer();
        fetchAdminData();
      }
    } catch {
      setIsAuthenticated(false);
    }
  };

  const fetchAdminData = async () => {
    try {
      const [ridesRes, statsRes] = await Promise.all([
        apiFetch<Ride[]>('/api/rides'),
        apiFetch<DashboardStats>('/api/dashboard/stats')
      ]);

      const localCached = ClientStorage.getLocalRides();

      // If server has 0 rides but local storage has rides (e.g. after container restart), re-hydrate server immediately
      if (ridesRes.length === 0 && localCached.length > 0) {
        const syncResult = await ClientStorage.syncWithServer();
        if (syncResult.syncedRides > 0) {
          // Re-fetch after hydration
          const refreshed = await apiFetch<Ride[]>('/api/rides');
          setRides(refreshed);
          ClientStorage.saveLocalRides(refreshed);
          return;
        }
      }

      setRides(ridesRes);
      setStats(statsRes);
      if (ridesRes.length > 0) {
        ClientStorage.saveLocalRides(ridesRes);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    }
  };

  const handleDeleteRide = async (ride: Ride) => {
    try {
      await apiFetch(`/api/rides/${ride.id}`, { method: 'DELETE' });
      ClientStorage.removeLocalRide(ride.id);
      setRides(prev => prev.filter(r => r.id !== ride.id));
      await fetchAdminData();
    } catch (err) {
      console.error('Failed to delete ride:', err);
      throw err;
    }
  };

  const handleBulkDeleteRides = async (rideIds: string[]) => {
    try {
      await Promise.all(rideIds.map(id => apiFetch(`/api/rides/${id}`, { method: 'DELETE' })));
      rideIds.forEach(id => ClientStorage.removeLocalRide(id));
      setRides(prev => prev.filter(r => !rideIds.includes(r.id)));
      await fetchAdminData();
    } catch (err) {
      console.error('Failed to bulk delete rides:', err);
      throw err;
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // Periodic background fallback sync (every 10s) ensuring all reservations and database writes stay in sync
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      fetchAdminData();
    }, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Sync real-time updates for admin dashboard
  useEffect(() => {
    if (lastUpdate && isAuthenticated) {
      fetchAdminData();
      if (selectedRideDetails && lastUpdate.rideId === selectedRideDetails.id) {
        apiFetch<Ride>(`/api/rides/${selectedRideDetails.id}`)
          .then(updated => setSelectedRideDetails(updated))
          .catch(() => {});
      }
      if (assignDriverRide && lastUpdate.rideId === assignDriverRide.id) {
        apiFetch<Ride>(`/api/rides/${assignDriverRide.id}`)
          .then(updated => setAssignDriverRide(updated))
          .catch(() => {});
      }
    }
  }, [lastUpdate, isAuthenticated]);

  // Navigate helper
  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  // Route Dispatcher
  // 1. Driver View Route: /driver/:token
  if (currentPath.startsWith('/driver/')) {
    const token = currentPath.replace('/driver/', '').trim();
    return <DriverView token={token} />;
  }

  // 2. Passenger View Route: /passenger/:token
  if (currentPath.startsWith('/passenger/')) {
    const token = currentPath.replace('/passenger/', '').trim();
    return <PassengerView token={token} />;
  }

  // 3. Admin Tracking Route: /track/:token or /admin-track/:token
  if (currentPath.startsWith('/track/') || currentPath.startsWith('/admin-track/')) {
    const token = currentPath.replace(/\/track\/|\/admin-track\//, '').trim();
    return <AdminTrackView token={token} />;
  }

  // Loading state
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If Not Authenticated -> Show Clean Professional White Login Screen
  if (!isAuthenticated) {
    return (
      <LoginPage
        onLoginSuccess={() => {
          setIsAuthenticated(true);
          navigateTo('/dashboard');
          fetchAdminData();
        }}
      />
    );
  }

  // Authenticated Admin Portal
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col antialiased">
      
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'dashboard') navigateTo('/dashboard');
          if (tab === 'tracking') navigateTo('/rides');
          if (tab === 'history') {
            setHistoryFilter('all');
            navigateTo('/ride-history');
          }
        }}
        onOpenCreateRide={() => setIsCreateModalOpen(true)}
        onOpenManageDrivers={() => setIsManageDriversOpen(true)}
        onOpenCompanyLogo={() => setIsCompanyLogoModalOpen(true)}
        onOpenAdminEmails={() => setIsManageAdminEmailsOpen(true)}
        onLogout={() => {
          setIsAuthenticated(false);
          navigateTo('/login');
        }}
        connectionStatus={connectionStatus}
      />

      {/* Main Admin Page Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {activeTab === 'dashboard' && (
          <DashboardView
            stats={stats}
            rides={rides}
            onOpenCreateRide={() => setIsCreateModalOpen(true)}
            onOpenManageDrivers={() => setIsManageDriversOpen(true)}
            onOpenCompanyLogo={() => setIsCompanyLogoModalOpen(true)}
            onOpenAdminEmails={() => setIsManageAdminEmailsOpen(true)}
            onViewRide={(ride) => setSelectedRideDetails(ride)}
            onOpenLinksModal={(ride) => setGeneratedLinksRide(ride)}
            onAssignDriver={(ride) => setAssignDriverRide(ride)}
            onDeleteRide={handleDeleteRide}
            onBulkDeleteRides={handleBulkDeleteRides}
            onNavigateToHistory={() => {
              setHistoryFilter('all');
              setActiveTab('history');
              navigateTo('/ride-history');
            }}
            onNavigateWithFilter={(filter) => {
              setHistoryFilter(filter);
              setActiveTab('history');
              navigateTo('/ride-history');
            }}
          />
        )}

        {activeTab === 'tracking' && (
          <RideHistoryView
            rides={rides}
            initialFilter="active"
            onViewRide={(ride) => setSelectedRideDetails(ride)}
            onOpenLinksModal={(ride) => setGeneratedLinksRide(ride)}
            onAssignDriver={(ride) => setAssignDriverRide(ride)}
            onDeleteRide={handleDeleteRide}
            onBulkDeleteRides={handleBulkDeleteRides}
            onRefresh={fetchAdminData}
          />
        )}

        {activeTab === 'history' && (
          <RideHistoryView
            rides={rides}
            initialFilter={historyFilter}
            onViewRide={(ride) => setSelectedRideDetails(ride)}
            onOpenLinksModal={(ride) => setGeneratedLinksRide(ride)}
            onAssignDriver={(ride) => setAssignDriverRide(ride)}
            onDeleteRide={handleDeleteRide}
            onBulkDeleteRides={handleBulkDeleteRides}
            onRefresh={fetchAdminData}
          />
        )}
      </main>

      {/* 1. Create Ride Modal (with Driver Dropdown & Quick Add Driver) */}
      {isCreateModalOpen && (
        <CreateRideModal
          onClose={() => setIsCreateModalOpen(false)}
          onOpenManageDrivers={() => {
            setIsCreateModalOpen(false);
            setIsManageDriversOpen(true);
          }}
          onRideCreated={(newRide) => {
            setIsCreateModalOpen(false);
            ClientStorage.saveSingleRide(newRide);
            setRides(prev => [newRide, ...prev.filter(r => r.id !== newRide.id)]);
            setStats(prev => ({
              ...prev,
              totalRides: prev.totalRides + 1,
              todayRides: prev.todayRides + 1,
              activeRides: prev.activeRides + 1
            }));
            fetchAdminData();
            setGeneratedLinksRide(newRide);
          }}
        />
      )}

      {/* 2. Manage Drivers Modal */}
      {isManageDriversOpen && (
        <ManageDriversModal
          onClose={() => setIsManageDriversOpen(false)}
          onDriversUpdated={fetchAdminData}
        />
      )}

      {/* 3. Quick Assign Driver Modal */}
      {assignDriverRide && (
        <AssignDriverModal
          ride={assignDriverRide}
          onClose={() => setAssignDriverRide(null)}
          onAssigned={() => {
            fetchAdminData();
            if (selectedRideDetails && selectedRideDetails.id === assignDriverRide.id) {
              apiFetch<Ride>(`/api/rides/${assignDriverRide.id}`)
                .then(u => setSelectedRideDetails(u))
                .catch(() => {});
            }
          }}
          onOpenManageDrivers={() => setIsManageDriversOpen(true)}
        />
      )}

      {/* 4. Generated 3 Tracking Links Modal */}
      {generatedLinksRide && (
        <GeneratedLinksModal
          ride={generatedLinksRide}
          onClose={() => setGeneratedLinksRide(null)}
          onViewDetails={(ride) => {
            setSelectedRideDetails(ride);
          }}
        />
      )}

      {/* 5. Ride Details Modal & Timeline Durations */}
      {selectedRideDetails && (
        <RideDetailsModal
          ride={selectedRideDetails}
          onClose={() => setSelectedRideDetails(null)}
          onRideUpdated={fetchAdminData}
          onOpenAssignDriver={(r) => setAssignDriverRide(r)}
          onDeleteRide={handleDeleteRide}
        />
      )}

      {/* 6. Company Logo & Branding Modal */}
      {isCompanyLogoModalOpen && (
        <CompanyLogoModal
          isOpen={isCompanyLogoModalOpen}
          onClose={() => setIsCompanyLogoModalOpen(false)}
        />
      )}

      {/* 7. Manage Admin Email Recipients Modal */}
      {isManageAdminEmailsOpen && (
        <AdminEmailsModal
          onClose={() => setIsManageAdminEmailsOpen(false)}
        />
      )}

    </div>
  );
}
