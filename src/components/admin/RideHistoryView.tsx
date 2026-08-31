import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, Filter, Calendar, Download, Eye, Link2, 
  FileArchive, CheckSquare, Square, RefreshCw, X, ChevronDown, User, UserPlus,
  FileSpreadsheet, FileText, Check, Trash2
} from 'lucide-react';
import { Ride, STATUS_LABELS } from '../../types';
import { 
  formatDateTime, 
  downloadSingleRidePdf, 
  downloadBulkZip, 
  downloadBulkCombinedPdf, 
  downloadBulkCsv, 
  downloadSingleRideCsv 
} from '../../lib/pdf';
import ConfirmDeleteModal from './ConfirmDeleteModal';

interface RideHistoryViewProps {
  rides: Ride[];
  onViewRide: (ride: Ride) => void;
  onOpenLinksModal: (ride: Ride) => void;
  onRefresh: () => void;
  initialFilter?: string;
  onAssignDriver?: (ride: Ride) => void;
  onDeleteRide?: (ride: Ride) => Promise<boolean | void> | void;
  onBulkDeleteRides?: (rideIds: string[]) => Promise<void> | void;
}

export default function RideHistoryView({
  rides,
  onViewRide,
  onOpenLinksModal,
  onRefresh,
  initialFilter,
  onAssignDriver,
  onDeleteRide,
  onBulkDeleteRides
}: RideHistoryViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialFilter || 'all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [showBulkDropdown, setShowBulkDropdown] = useState(false);
  const [rideToDelete, setRideToDelete] = useState<Ride | null>(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  useEffect(() => {
    if (initialFilter !== undefined) {
      setStatusFilter(initialFilter);
    }
  }, [initialFilter]);

  // Helper date matchers
  const isDateToday = (isoString: string) => {
    const d = new Date(isoString);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() &&
           d.getMonth() === now.getMonth() &&
           d.getDate() === now.getDate();
  };

  const isDateYesterday = (isoString: string) => {
    const d = new Date(isoString);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return d.getFullYear() === yesterday.getFullYear() &&
           d.getMonth() === yesterday.getMonth() &&
           d.getDate() === yesterday.getDate();
  };

  const isDateTomorrow = (isoString: string) => {
    const d = new Date(isoString);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return d.getFullYear() === tomorrow.getFullYear() &&
           d.getMonth() === tomorrow.getMonth() &&
           d.getDate() === tomorrow.getDate();
  };

  // Filtered List
  const filteredRides = useMemo(() => {
    return rides.filter((ride) => {
      // 1. Search Query
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchRes = ride.reservationId.toLowerCase().includes(q);
        const matchName = ride.passengerName.toLowerCase().includes(q);
        const matchEmail = ride.passengerEmail.toLowerCase().includes(q);
        const matchDriver = (ride.driverName || '').toLowerCase().includes(q);
        if (!matchRes && !matchName && !matchEmail && !matchDriver) return false;
      }

      // 2. Status & Date Preset Filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'today') {
          if (!isDateToday(ride.createdAt)) return false;
        } else if (statusFilter === 'yesterday') {
          if (!isDateYesterday(ride.createdAt)) return false;
        } else if (statusFilter === 'tomorrow') {
          if (!isDateTomorrow(ride.createdAt)) return false;
        } else if (statusFilter === 'active') {
          if (ride.currentStatus === 'done') return false;
        } else if (statusFilter === 'completed') {
          if (ride.currentStatus !== 'done') return false;
        } else {
          if (ride.currentStatus !== statusFilter) return false;
        }
      }

      // 3. Custom Date Range
      if (fromDate) {
        const rideDate = new Date(ride.createdAt).getTime();
        const fDate = new Date(fromDate).getTime();
        if (rideDate < fDate) return false;
      }

      if (toDate) {
        const rideDate = new Date(ride.createdAt).getTime();
        const tDate = new Date(toDate).getTime() + (24 * 60 * 60 * 1000);
        if (rideDate > tDate) return false;
      }

      return true;
    });
  }, [rides, searchTerm, statusFilter, fromDate, toDate]);

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedIds.size === filteredRides.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRides.map(r => r.id)));
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

  const targetExportList = selectedRidesList.length > 0 ? selectedRidesList : filteredRides;

  const handleExportZip = async () => {
    if (targetExportList.length === 0) return;
    setIsExporting(true);
    setShowBulkDropdown(false);
    try {
      await downloadBulkZip(targetExportList);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCombinedPdf = () => {
    if (targetExportList.length === 0) return;
    setShowBulkDropdown(false);
    downloadBulkCombinedPdf(targetExportList);
  };

  const handleExportCsv = () => {
    if (targetExportList.length === 0) return;
    setShowBulkDropdown(false);
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

  const getActiveFilterLabel = () => {
    switch (statusFilter) {
      case 'today': return "Today's Rides";
      case 'yesterday': return "Yesterday's Rides";
      case 'tomorrow': return "Tomorrow's Rides";
      case 'active': return "Active In-Progress Rides";
      case 'completed': return "Completed Rides";
      case 'all': return null;
      default: return STATUS_LABELS[statusFilter as keyof typeof STATUS_LABELS] || statusFilter;
    }
  };

  const activeLabel = getActiveFilterLabel();

  return (
    <div className="space-y-6">
      
      {/* Header & Bulk Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Ride History & Audit Archive</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Search, inspect timestamps, assign fleet drivers, and download bulk or single selected reports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="p-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl transition shadow-xs cursor-pointer"
            title="Refresh History"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Export Dropdown (Handles Single Selected, Multiple Selected, or Bulk Filtered) */}
          <div className="relative">
            <button
              onClick={() => setShowBulkDropdown(!showBulkDropdown)}
              disabled={isExporting || targetExportList.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>
                {selectedRidesList.length > 0 
                  ? `Export Selected (${selectedRidesList.length})` 
                  : `Export Report (${targetExportList.length})`}
              </span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {showBulkDropdown && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-slate-200 shadow-2xl py-2 z-30 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-2 border-b border-slate-100">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                    Export Destination
                  </span>
                  <span className="text-xs text-slate-800 font-semibold">
                    {selectedRidesList.length > 0 
                      ? `${selectedRidesList.length} ride(s) specifically selected` 
                      : `All ${targetExportList.length} filtered rides`}
                  </span>
                </div>

                <div className="py-1">
                  {/* Option 1: Combined Master PDF */}
                  <button
                    onClick={handleExportCombinedPdf}
                    className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-slate-900 font-bold">Combined Master PDF</span>
                      <span className="block text-[10px] text-slate-400 font-normal">Single consolidated document</span>
                    </div>
                  </button>

                  {/* Option 2: ZIP Archive of Separate PDFs */}
                  <button
                    onClick={handleExportZip}
                    className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                      <FileArchive className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-slate-900 font-bold">Individual PDFs (.ZIP Archive)</span>
                      <span className="block text-[10px] text-slate-400 font-normal">Separate PDF file for each reservation</span>
                    </div>
                  </button>

                  {/* Option 3: CSV Spreadsheet */}
                  <button
                    onClick={handleExportCsv}
                    className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block text-slate-900 font-bold">CSV / Excel Spreadsheet</span>
                      <span className="block text-[10px] text-slate-400 font-normal">Spreadsheet with full timestamp log</span>
                    </div>
                  </button>
                </div>

                {selectedRidesList.length > 0 && (
                  <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <button
                      onClick={() => setSelectedIds(new Set())}
                      className="text-rose-600 font-semibold hover:underline"
                    >
                      Clear Selection
                    </button>
                    <span className="text-slate-400">
                      {selectedRidesList.length} of {filteredRides.length}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          
          {/* Search Box */}
          <div className="md:col-span-2 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Reservation ID, Passenger Name, Email, Driver..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status & Date Preset Filter Dropdown */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-slate-900 transition"
            >
              <option value="all">All Statuses</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="tomorrow">Tomorrow</option>
              <option value="active">Active In-Progress</option>
              <option value="completed">Completed (Done)</option>
              <option value="getting_ready">Getting Ready</option>
              <option value="on_the_way">On The Way</option>
              <option value="arrived">Arrived</option>
              <option value="passenger_on_board">Passenger On Board</option>
              <option value="drop_off">Drop Off</option>
              <option value="created">Created</option>
            </select>
          </div>

          {/* Date Range Clear / Count */}
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-1.5 bg-slate-50/70 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-transparent text-xs text-slate-800 focus:outline-none w-full"
              />
            </div>
            <div className="flex-1 flex items-center gap-1.5 bg-slate-50/70 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-transparent text-xs text-slate-800 focus:outline-none w-full"
              />
            </div>
          </div>

        </div>

        {/* Quick Filter Pill Buttons */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">Quick:</span>
            {[
              { id: 'all', label: 'All' },
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'tomorrow', label: 'Tomorrow' },
              { id: 'active', label: 'Active' },
              { id: 'completed', label: 'Completed' }
            ].map(pill => (
              <button
                key={pill.id}
                onClick={() => setStatusFilter(pill.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  statusFilter === pill.id
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {activeLabel && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">
                Filtered by: <strong className="text-slate-900">{activeLabel}</strong> ({filteredRides.length})
              </span>
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setFromDate('');
                  setToDate('');
                  setSearchTerm('');
                }}
                className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>Clear</span>
              </button>
            </div>
          )}
        </div>

        {/* Selected Count Indicator */}
        {selectedIds.size > 0 && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs bg-blue-50/70 p-2.5 rounded-xl text-blue-900">
            <div className="flex items-center gap-2">
              <span className="font-medium">
                <strong>{selectedIds.size}</strong> of {filteredRides.length} rides selected.
              </span>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-blue-700 hover:text-blue-900 font-bold underline cursor-pointer"
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
      </div>

      {/* History Table & Mobile Cards */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        {/* Mobile View for History (<640px) */}
        <div className="block sm:hidden divide-y divide-slate-100">
          {filteredRides.length === 0 ? (
            <div className="py-12 px-4 text-center text-slate-400 text-xs">
              No rides found matching your filters.
            </div>
          ) : (
            filteredRides.map((ride) => {
              const isSelected = selectedIds.has(ride.id);
              return (
                <div 
                  key={ride.id}
                  className={`p-4 transition ${isSelected ? 'bg-blue-50/40' : 'hover:bg-slate-50/60'}`}
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

        {/* Desktop / Tablet Table View */}
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
                    {selectedIds.size > 0 && selectedIds.size === filteredRides.length ? (
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
                <th className="py-3 px-4">Completed Date</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredRides.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No matching rides found for current search or filters.
                  </td>
                </tr>
              ) : (
                filteredRides.map((ride) => {
                  const isSelected = selectedIds.has(ride.id);
                  return (
                    <tr 
                      key={ride.id} 
                      className={`hover:bg-slate-50/80 transition ${isSelected ? 'bg-blue-50/40' : ''}`}
                    >
                      <td className="py-3.5 px-4 text-center">
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
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {ride.reservationId}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{ride.passengerName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{ride.passengerEmail}</div>
                      </td>
                      <td className="py-3.5 px-4">
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
                      <td className="py-3.5 px-4">
                        {getStatusBadge(ride.currentStatus)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {formatDateTime(ride.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {ride.completedAt ? formatDateTime(ride.completedAt) : '—'}
                      </td>
                      <td className="py-3.5 px-6 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => onViewRide(ride)}
                            className="px-2.5 py-1 text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg font-semibold text-xs flex items-center gap-1 transition cursor-pointer"
                            title="View Ride Details & Durations"
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

                          {/* Single Ride PDF Download */}
                          <button
                            onClick={() => downloadSingleRidePdf(ride)}
                            className="px-2.5 py-1 text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg font-semibold text-xs flex items-center gap-1 transition cursor-pointer"
                            title="Download Official PDF Report"
                          >
                            <FileText className="w-3.5 h-3.5 text-rose-600" />
                            <span>PDF</span>
                          </button>

                          {/* Single Ride CSV Download */}
                          <button
                            onClick={() => downloadSingleRideCsv(ride)}
                            className="px-2 py-1 text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg font-semibold text-xs flex items-center gap-1 transition cursor-pointer"
                            title="Download CSV Spreadsheet for this Ride"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                            <span>CSV</span>
                          </button>

                          {/* Delete Ride */}
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
