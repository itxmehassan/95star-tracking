import React, { useState, useMemo } from 'react';
import { 
  Car, Clock, CheckCircle2, Calendar, Plus, 
  ExternalLink, Eye, Download, Link2, User, UserPlus, Search, X,
  CheckSquare, Square, FileArchive, FileText, FileSpreadsheet, ChevronDown, Trash2
} from 'lucide-react';
import { Ride, DashboardStats, STATUS_LABELS } from '../../types';
import { 
  formatDateTime, 
  downloadSingleRidePdf, 
  downloadSingleRideCsv, 
  downloadBulkCombinedPdf, 
  downloadBulkZip, 
  downloadBulkCsv 
} from '../../lib/pdf';
import ConfirmDeleteModal from './ConfirmDeleteModal';

interface DashboardViewProps {
  stats: DashboardStats;
  rides: Ride[];
  onOpenCreateRide: () => void;
  onViewRide: (ride: Ride) => void;
  onOpenLinksModal: (ride: Ride) => void;
  onNavigateToHistory: () => void;
  onNavigateWithFilter: (filter: 'all' | 'today' | 'active' | 'completed') => void;
  onAssignDriver?: (ride: Ride) => void;
  onOpenManageDrivers?: () => void;
  onOpenCompanyLogo?: () => void;
  onOpenAdminEmails?: () => void;
  onDeleteRide?: (ride: Ride) => Promise<boolean | void> | void;
  onBulkDeleteRides?: (rideIds: string[]) => Promise<void> | void;
}

export default function DashboardView({
  stats,
  rides,
  onOpenCreateRide,
  onViewRide,
  onOpenLinksModal,
  onNavigateToHistory,
  onNavigateWithFilter,
  onAssignDriver,
  onOpenManageDrivers,
  onOpenCompanyLogo,
  onOpenAdminEmails,
  onDeleteRide,
  onBulkDeleteRides
}: DashboardViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [tableFilter, setTableFilter] = useState<'all' | 'today' | 'active' | 'completed'>('all');
  const [showAllRows, setShowAllRows] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [rideToDelete, setRideToDelete] = useState<Ride | null>(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const isDateToday = (isoString: string) => {
    const d = new Date(isoString);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() &&
           d.getMonth() === now.getMonth() &&
           d.getDate() === now.getDate();
  };

  const filteredRides = useMemo(() => {
    return rides.filter((ride) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchRes = ride.reservationId.toLowerCase().includes(q);
        const matchName = ride.passengerName.toLowerCase().includes(q);
        const matchEmail = ride.passengerEmail.toLowerCase().includes(q);
        const matchDriver = (ride.driverName || '').toLowerCase().includes(q);
        if (!matchRes && !matchName && !matchEmail && !matchDriver) return false;
      }

      if (tableFilter === 'today') {
        if (!isDateToday(ride.createdAt)) return false;
      } else if (tableFilter === 'active') {
        if (ride.currentStatus === 'done') return false;
      } else if (tableFilter === 'completed') {
        if (ride.currentStatus !== 'done') return false;
      }

      return true;
    });
  }, [rides, searchTerm, tableFilter]);

  const displayedRides = showAllRows ? filteredRides : filteredRides.slice(0, 10);

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedIds.size === displayedRides.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayedRides.map(r => r.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const selectedRidesList = useMemo(() => {
    return rides.filter(r => selectedIds.has(r.id));
  }, [rides, selectedIds]);

  const targetExportList = selectedRidesList.length > 0 ? selectedRidesList : displayedRides;

  const handleExportZip = async () => {
    if (targetExportList.length === 0) return;
    setIsExporting(true);
    setShowExportDropdown(false);
    try {
      await downloadBulkZip(targetExportList);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCombinedPdf = () => {
    if (targetExportList.length === 0) return;
    setShowExportDropdown(false);
    downloadBulkCombinedPdf(targetExportList);
  };

  const handleExportCsv = () => {
    if (targetExportList.length === 0) return;
    setShowExportDropdown(false);
    downloadBulkCsv(targetExportList);
  };

  const getStatusBadge = (status: string) => {
    const label = STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status;
    switch (status) {
      case 'done':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">✓ Done</span>;
      case 'getting_ready':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">Getting Ready</span>;
      case 'on_the_way':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">On The Way</span>;
      case 'arrived':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">Arrived</span>;
      case 'passenger_on_board':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">Passenger On Board</span>;
      case 'drop_off':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">Drop Off</span>;
      case 'created':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">Created</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">{label}</span>;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Operations Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time live monitoring of all reservations, persistent storage, and fleet tracking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenAdminEmails && (
            <button
              onClick={onOpenAdminEmails}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition hover:border-slate-300 cursor-pointer"
              title="Configure Admin Email Recipients & Test Live Dispatches"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Admin Emails</span>
            </button>
          )}

          {onOpenCompanyLogo && (
            <button
              onClick={onOpenCompanyLogo}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition hover:border-slate-300 cursor-pointer"
              title="Upload & Customize Company Logo"
            >
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <span>Logo</span>
            </button>
          )}

          {onOpenManageDrivers && (
            <button
              onClick={onOpenManageDrivers}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-slate-600" />
              <span>Drivers</span>
            </button>
          )}

          <button
            onClick={onOpenCreateRide}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer ml-auto sm:ml-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create Ride</span>
          </button>
        </div>
      </div>

      {/* 4 Distinctly-Colored Interactive Metric Cards (Click to Filter Table / History) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. Total Rides (Indigo Theme) */}
        <button
          onClick={() => {
            setTableFilter('all');
            onNavigateWithFilter('all');
          }}
          className="text-left bg-white hover:bg-indigo-50/30 p-5 rounded-2xl border border-slate-200/80 hover:border-indigo-300 shadow-xs hover:shadow-md transition-all duration-150 cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 group-hover:text-indigo-700">
              Total Rides
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100 group-hover:scale-105 transition">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-indigo-950">{stats.totalRides}</span>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-indigo-100/60 w-full text-[11px] text-indigo-600 font-medium">
            <span>All stored records</span>
            <span className="group-hover:translate-x-0.5 transition-transform">View all →</span>
          </div>
        </button>

        {/* 2. Today's Rides (Amber Theme) */}
        <button
          onClick={() => {
            setTableFilter('today');
            onNavigateWithFilter('today');
          }}
          className="text-left bg-white hover:bg-amber-50/30 p-5 rounded-2xl border border-slate-200/80 hover:border-amber-300 shadow-xs hover:shadow-md transition-all duration-150 cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900 group-hover:text-amber-700">
              Today's Rides
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200 group-hover:scale-105 transition">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-amber-950">{stats.todayRides}</span>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-amber-100/60 w-full text-[11px] text-amber-700 font-medium">
            <span>Today's schedule</span>
            <span className="group-hover:translate-x-0.5 transition-transform">Filter today →</span>
          </div>
        </button>

        {/* 3. Active Rides (Royal Blue Theme) */}
        <button
          onClick={() => {
            setTableFilter('active');
            onNavigateWithFilter('active');
          }}
          className="text-left bg-white hover:bg-blue-50/30 p-5 rounded-2xl border border-slate-200/80 hover:border-blue-300 shadow-xs hover:shadow-md transition-all duration-150 cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-900 group-hover:text-blue-700">
              Active Rides
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200 group-hover:scale-105 transition">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-blue-700">{stats.activeRides}</span>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-blue-100/60 w-full text-[11px] text-blue-700 font-medium">
            <span>In-progress now</span>
            <span className="group-hover:translate-x-0.5 transition-transform">Filter active →</span>
          </div>
        </button>

        {/* 4. Completed Rides (Emerald Green Theme) */}
        <button
          onClick={() => {
            setTableFilter('completed');
            onNavigateWithFilter('completed');
          }}
          className="text-left bg-white hover:bg-emerald-50/30 p-5 rounded-2xl border border-slate-200/80 hover:border-emerald-300 shadow-xs hover:shadow-md transition-all duration-150 cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 group-hover:text-emerald-700">
              Completed
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 group-hover:scale-105 transition">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-emerald-700">{stats.completedRides}</span>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-emerald-100/60 w-full text-[11px] text-emerald-700 font-medium">
            <span>Done rides</span>
            <span className="group-hover:translate-x-0.5 transition-transform">Filter done →</span>
          </div>
        </button>

      </div>

      {/* Reservations & Rides Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        {/* Table Header & Inline Filter Bar */}
        <div className="p-4 sm:px-6 sm:py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">Reservations & Live Rides</h2>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {filteredRides.length} {filteredRides.length === 1 ? 'ride' : 'rides'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live reservations automatically saved to database and synchronized in real time.
            </p>
          </div>

          {/* Quick Search, Filter & Bulk Export Controls */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Search Input */}
            <div className="relative flex-1 sm:flex-initial">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search reservation..."
                className="pl-8 pr-7 py-1.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 w-full sm:w-56"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Filter Buttons */}
            <div className="inline-flex rounded-xl bg-slate-100 p-0.5 text-xs font-semibold overflow-x-auto">
              <button
                onClick={() => setTableFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  tableFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setTableFilter('today')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  tableFilter === 'today' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setTableFilter('active')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  tableFilter === 'active' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setTableFilter('completed')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  tableFilter === 'completed' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Done
              </button>
            </div>

            {/* Export Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                disabled={isExporting || targetExportList.length === 0}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-2xs transition disabled:opacity-50 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {showExportDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-2xl py-2 z-30 animate-in fade-in zoom-in-95">
                  <div className="px-3.5 py-1.5 border-b border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Export Mode
                    </span>
                    <span className="text-xs text-slate-800 font-semibold">
                      {selectedRidesList.length > 0 
                        ? `${selectedRidesList.length} selected ride(s)` 
                        : `All ${targetExportList.length} displayed rides`}
                    </span>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={handleExportCombinedPdf}
                      className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-rose-600" />
                      <div>
                        <span className="block text-slate-900">Combined PDF</span>
                        <span className="block text-[10px] text-slate-400 font-normal">Consolidated multi-page report</span>
                      </div>
                    </button>

                    <button
                      onClick={handleExportZip}
                      className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition cursor-pointer"
                    >
                      <FileArchive className="w-4 h-4 text-indigo-600" />
                      <div>
                        <span className="block text-slate-900">Separate PDFs (.ZIP)</span>
                        <span className="block text-[10px] text-slate-400 font-normal">Zip archive with each ride PDF</span>
                      </div>
                    </button>

                    <button
                      onClick={handleExportCsv}
                      className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <div>
                        <span className="block text-slate-900">CSV Spreadsheet</span>
                        <span className="block text-[10px] text-slate-400 font-normal">Raw timestamp log data</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={onNavigateToHistory}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 transition flex items-center gap-1 ml-auto sm:ml-1 px-2 py-1 hover:bg-slate-100 rounded-lg cursor-pointer"
              title="Open full ride history archive"
            >
              <span className="hidden sm:inline">Full History</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Selected Banner */}
        {selectedIds.size > 0 && (
          <div className="px-4 sm:px-6 py-2.5 bg-blue-50/70 border-b border-blue-100 flex flex-wrap items-center justify-between gap-2 text-xs text-blue-900">
            <div className="flex items-center gap-2">
              <span>
                <strong>{selectedIds.size}</strong> ride(s) selected
              </span>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-blue-700 hover:text-blue-900 font-bold underline cursor-pointer ml-1"
              >
                Clear Selection
              </button>
            </div>
            
            {onBulkDeleteRides && (
              <button
                onClick={() => setShowBulkDeleteModal(true)}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedIds.size})</span>
              </button>
            )}
          </div>
        )}

        {/* Mobile Responsive Ride Card List (visible on small mobile screens < 640px) */}
        <div className="block sm:hidden divide-y divide-slate-100">
          {displayedRides.length === 0 ? (
            <div className="py-10 px-4 text-center text-slate-400 text-xs">
              {searchTerm || tableFilter !== 'all' 
                ? 'No reservations match your search or filter.' 
                : 'No rides created yet. Tap "+ Create Ride" above to add a reservation.'}
            </div>
          ) : (
            displayedRides.map((ride) => {
              const isSelected = selectedIds.has(ride.id);
              return (
                <div 
                  key={ride.id} 
                  className={`p-4 transition ${isSelected ? 'bg-blue-50/30' : 'hover:bg-slate-50/60'}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleSelect(ride.id)}
                        className="text-slate-400 hover:text-slate-700 p-1 -ml-1 cursor-pointer"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-slate-900" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                      <span className="font-mono font-bold text-sm text-slate-900">
                        {ride.reservationId}
                      </span>
                    </div>
                    <div>
                      {getStatusBadge(ride.currentStatus)}
                    </div>
                  </div>

                  <div className="space-y-1 mb-3">
                    <div className="font-bold text-slate-900 text-sm">{ride.passengerName}</div>
                    <div className="text-xs text-slate-500 font-mono">{ride.passengerEmail}</div>
                    <div className="text-xs text-slate-600 flex items-center gap-1.5 pt-0.5">
                      <span className="text-slate-400">Driver:</span>
                      {ride.driverName ? (
                        <span className="font-semibold text-slate-800">{ride.driverName}</span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                      {onAssignDriver && (
                        <button
                          onClick={() => onAssignDriver(ride)}
                          className="text-blue-600 hover:underline text-[11px] font-semibold ml-1 cursor-pointer"
                        >
                          {ride.driverName ? 'Change' : 'Assign'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {formatDateTime(ride.createdAt)}
                    </span>
                    
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <button
                        onClick={() => onViewRide(ride)}
                        className="px-2 py-1 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Details</span>
                      </button>

                      <button
                        onClick={() => onOpenLinksModal(ride)}
                        className="px-2 py-1 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        <span>Links</span>
                      </button>

                      <button
                        onClick={() => downloadSingleRidePdf(ride)}
                        className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200/60 rounded-lg cursor-pointer"
                        title="Download PDF Report"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>

                      {onDeleteRide && (
                        <button
                          onClick={() => setRideToDelete(ride)}
                          className="p-1.5 text-rose-600 bg-white hover:bg-rose-50 border border-rose-200 rounded-lg cursor-pointer transition"
                          title="Delete Ride"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Table View (Desktop & Tablet) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 w-10 text-center">
                  <button 
                    onClick={handleSelectAll}
                    className="text-slate-400 hover:text-slate-700 transition cursor-pointer"
                    title="Select All"
                  >
                    {selectedIds.size > 0 && selectedIds.size === displayedRides.length ? (
                      <CheckSquare className="w-4 h-4 text-slate-900" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4">Reservation ID</th>
                <th className="py-3 px-4">Passenger Name</th>
                <th className="py-3 px-4">Assigned Driver</th>
                <th className="py-3 px-4">Current Status</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {displayedRides.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    {searchTerm || tableFilter !== 'all' 
                      ? 'No reservations match your search or filter.' 
                      : 'No rides created yet. Click "+ Create Ride" above to add a reservation.'}
                  </td>
                </tr>
              ) : (
                displayedRides.map((ride) => {
                  const isSelected = selectedIds.has(ride.id);
                  return (
                    <tr 
                      key={ride.id} 
                      className={`hover:bg-slate-50/80 transition ${isSelected ? 'bg-blue-50/30' : ''}`}
                    >
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleSelect(ride.id)}
                          className="text-slate-400 hover:text-slate-700 transition cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-slate-900" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {ride.reservationId}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{ride.passengerName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{ride.passengerEmail}</div>
                      </td>
                      <td className="py-3 px-4">
                        {ride.driverName ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-slate-900">{ride.driverName}</span>
                            {onAssignDriver && (
                              <button
                                onClick={() => onAssignDriver(ride)}
                                className="text-[10px] text-blue-600 hover:text-blue-800 underline ml-1 cursor-pointer"
                                title="Change Driver"
                              >
                                Edit
                              </button>
                            )}
                          </div>
                        ) : (
                          onAssignDriver ? (
                            <button
                              onClick={() => onAssignDriver(ride)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer"
                            >
                              <UserPlus className="w-3 h-3 text-slate-500" />
                              <span>Assign Driver</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                          )
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(ride.currentStatus)}
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {formatDateTime(ride.createdAt)}
                      </td>
                      <td className="py-3 px-6 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => onViewRide(ride)}
                            className="px-2.5 py-1 text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg font-semibold text-xs flex items-center gap-1 transition cursor-pointer"
                            title="View Details & Timestamps"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>

                          <button
                            onClick={() => onOpenLinksModal(ride)}
                            className="px-2.5 py-1 text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg font-semibold text-xs flex items-center gap-1 transition cursor-pointer"
                            title="View 3 Tracking Links"
                          >
                            <Link2 className="w-3.5 h-3.5" />
                            <span>Links</span>
                          </button>

                          {/* Single PDF export */}
                          <button
                            onClick={() => downloadSingleRidePdf(ride)}
                            className="px-2.5 py-1 text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg font-semibold text-xs flex items-center gap-1 transition cursor-pointer"
                            title="Download PDF Report"
                          >
                            <FileText className="w-3.5 h-3.5 text-rose-600" />
                            <span>PDF</span>
                          </button>

                          {/* Single CSV export */}
                          <button
                            onClick={() => downloadSingleRideCsv(ride)}
                            className="px-2 py-1 text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg font-semibold text-xs flex items-center gap-1 transition cursor-pointer"
                            title="Download CSV for this ride"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                            <span>CSV</span>
                          </button>

                          {/* Delete Ride Button */}
                          {onDeleteRide && (
                            <button
                              onClick={() => setRideToDelete(ride)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg transition cursor-pointer"
                              title="Delete Ride"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Toggle to Expand / Show All */}
        {filteredRides.length > 10 && (
          <div className="px-6 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>
              Showing {displayedRides.length} of {filteredRides.length} reservations
            </span>
            <button
              onClick={() => setShowAllRows(!showAllRows)}
              className="font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer"
            >
              {showAllRows ? 'Show Recent 10 Only' : `Show All ${filteredRides.length} Reservations`}
            </button>
          </div>
        )}

      </div>

      {/* 1. Single Ride Delete Confirmation Modal */}
      {rideToDelete && onDeleteRide && (
        <ConfirmDeleteModal
          ride={rideToDelete}
          onClose={() => setRideToDelete(null)}
          onConfirm={async () => {
            await onDeleteRide(rideToDelete);
            setSelectedIds(prev => {
              const next = new Set(prev);
              next.delete(rideToDelete.id);
              return next;
            });
          }}
        />
      )}

      {/* 2. Bulk Ride Delete Confirmation Modal */}
      {showBulkDeleteModal && onBulkDeleteRides && selectedIds.size > 0 && (
        <ConfirmDeleteModal
          ridesCount={selectedIds.size}
          onClose={() => setShowBulkDeleteModal(false)}
          onConfirm={async () => {
            const ids = Array.from<string>(selectedIds);
            await onBulkDeleteRides(ids);
            setSelectedIds(new Set<string>());
          }}
        />
      )}

    </div>
  );
}
