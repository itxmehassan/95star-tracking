import React, { useState } from 'react';
import { 
  LayoutDashboard, Radio, History, LogOut, Image as ImageIcon, 
  Menu, X, Users, Mail, Plus, ChevronRight 
} from 'lucide-react';
import { clearAdminToken } from '../../lib/api';
import { CompanyLogoIcon } from '../common/Logo';
import { useBranding } from '../../lib/BrandingContext';

interface NavbarProps {
  activeTab: 'dashboard' | 'tracking' | 'history';
  onSelectTab: (tab: 'dashboard' | 'tracking' | 'history') => void;
  onOpenCreateRide: () => void;
  onOpenManageDrivers?: () => void;
  onOpenCompanyLogo?: () => void;
  onOpenAdminEmails?: () => void;
  onLogout: () => void;
  connectionStatus: 'connected' | 'reconnecting' | 'disconnected';
}

export default function Navbar({
  activeTab,
  onSelectTab,
  onOpenCreateRide,
  onOpenManageDrivers,
  onOpenCompanyLogo,
  onOpenAdminEmails,
  onLogout,
  connectionStatus
}: NavbarProps) {
  const { companyName } = useBranding();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogoutClick = () => {
    clearAdminToken();
    onLogout();
  };

  const handleNavClick = (tab: 'dashboard' | 'tracking' | 'history') => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-6 lg:gap-8">
            <div 
              onClick={() => handleNavClick('dashboard')}
              className="flex items-center gap-3 cursor-pointer select-none group"
            >
              <CompanyLogoIcon size={42} />
              <div>
                <span className="font-black text-slate-900 text-sm sm:text-base tracking-tight block leading-tight group-hover:text-indigo-950 transition">
                  {companyName}
                </span>
                <span className="text-[10px] sm:text-[11px] text-slate-400 uppercase tracking-wider font-bold block">
                  Operations Console
                </span>
              </div>
            </div>

            {/* Desktop Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1">
              <button
                onClick={() => onSelectTab('dashboard')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => onSelectTab('tracking')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                  activeTab === 'tracking'
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Radio className="w-4 h-4" />
                <span>Active Tracking</span>
              </button>

              <button
                onClick={() => onSelectTab('history')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Ride History</span>
              </button>
            </nav>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2">
            {/* Quick Create Ride button in header on all screens */}
            <button
              onClick={onOpenCreateRide}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Create Ride</span>
              <span className="sm:hidden">New</span>
            </button>

            {/* Desktop Settings & Admin buttons */}
            <div className="hidden lg:flex items-center gap-1.5">
              {onOpenAdminEmails && (
                <button
                  onClick={onOpenAdminEmails}
                  className="px-2.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-xl transition cursor-pointer"
                  title="Configure Admin Emails"
                >
                  Admins
                </button>
              )}
              {onOpenCompanyLogo && (
                <button
                  onClick={onOpenCompanyLogo}
                  className="px-2.5 py-2 text-xs font-semibold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 rounded-xl transition flex items-center gap-1 cursor-pointer"
                  title="Company Branding"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Logo</span>
                </button>
              )}
              {onOpenManageDrivers && (
                <button
                  onClick={onOpenManageDrivers}
                  className="px-2.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Drivers
                </button>
              )}
            </div>

            {/* Connection Status indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-[11px] font-medium text-slate-600">
              <span className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'}`} />
              <span>{connectionStatus === 'connected' ? 'Live' : 'Syncing'}</span>
            </div>

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition touch-manipulation cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogoutClick}
              title="Logout"
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Mobile Sub-Navigation Bar (Horizontal Pill Scroll for fast mobile switching) */}
        <div className="flex md:hidden border-t border-slate-100 py-2.5 gap-1.5 overflow-x-auto items-center no-scrollbar">
          <button
            onClick={() => handleNavClick('dashboard')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => handleNavClick('tracking')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              activeTab === 'tracking'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Active Rides
          </button>
          <button
            onClick={() => handleNavClick('history')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              activeTab === 'history'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            History
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1 shrink-0" />

          {onOpenManageDrivers && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenManageDrivers();
              }}
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl whitespace-nowrap cursor-pointer"
            >
              Drivers
            </button>
          )}

          {onOpenAdminEmails && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAdminEmails();
              }}
              className="px-2.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/70 rounded-xl whitespace-nowrap cursor-pointer"
            >
              Emails
            </button>
          )}

          {onOpenCompanyLogo && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenCompanyLogo();
              }}
              className="px-2.5 py-1.5 text-xs font-semibold text-indigo-800 bg-indigo-50 border border-indigo-200/70 rounded-xl whitespace-nowrap flex items-center gap-1 cursor-pointer"
            >
              <ImageIcon className="w-3 h-3" />
              <span>Logo</span>
            </button>
          )}
        </div>

        {/* Mobile Full Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 py-3 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150 bg-white">
            <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Navigation
            </div>
            <button
              onClick={() => handleNavClick('dashboard')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold ${
                activeTab === 'dashboard' ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4 text-slate-500" />
                <span>Operations Dashboard</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={() => handleNavClick('tracking')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold ${
                activeTab === 'tracking' ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Radio className="w-4 h-4 text-slate-500" />
                <span>Active Live Tracking</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={() => handleNavClick('history')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold ${
                activeTab === 'history' ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <History className="w-4 h-4 text-slate-500" />
                <span>Full Ride History & Reports</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <div className="pt-2 pb-1 border-t border-slate-100 mt-2 px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Operations Tools
            </div>

            {onOpenManageDrivers && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenManageDrivers();
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-slate-500" />
                  <span>Manage Drivers & Vehicles</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            )}

            {onOpenAdminEmails && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAdminEmails();
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-emerald-600" />
                  <span>Admin Emails & Test Dispatches</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            )}

            {onOpenCompanyLogo && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenCompanyLogo();
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <div className="flex items-center gap-2.5">
                  <ImageIcon className="w-4 h-4 text-indigo-600" />
                  <span>Company Logo & Branding</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            )}

            <div className="pt-2 border-t border-slate-100 mt-2">
              <button
                onClick={handleLogoutClick}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out of Console</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </header>
  );
}

