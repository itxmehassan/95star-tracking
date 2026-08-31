import React, { useState, useEffect } from 'react';
import { X, Hash, User, Mail, Plus, Car, Phone, UserPlus, ShieldCheck, Check, Sparkles } from 'lucide-react';
import { apiFetch, fetchDrivers, createDriver as apiCreateDriver } from '../../lib/api';
import { ClientStorage } from '../../lib/storage';
import { Ride, Driver } from '../../types';

interface CreateRideModalProps {
  onClose: () => void;
  onRideCreated: (ride: Ride) => void;
  onOpenManageDrivers?: () => void;
}

export default function CreateRideModal({ onClose, onRideCreated, onOpenManageDrivers }: CreateRideModalProps) {
  const [reservationId, setReservationId] = useState('');
  const [passengerName, setPassengerName] = useState('');
  const [passengerEmail, setPassengerEmail] = useState('');
  const [additionalEmails, setAdditionalEmails] = useState<string[]>([]);
  const [newExtraEmail, setNewExtraEmail] = useState('');
  
  // Centralized Drivers Collection State
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  
  // Inline Add New Driver Drawer
  const [showInlineAddDriver, setShowInlineAddDriver] = useState(false);
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverPhone, setNewDriverPhone] = useState('');
  const [newDriverEmail, setNewDriverEmail] = useState('');
  const [newDriverVehicle, setNewDriverVehicle] = useState('');
  const [newDriverLicensePlate, setNewDriverLicensePlate] = useState('');
  const [savingDriver, setSavingDriver] = useState(false);
  
  // Submission & Validation State
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Drivers from Centralized Collection
  const loadDriversList = async () => {
    try {
      setLoadingDrivers(true);
      const list = await fetchDrivers();
      setDrivers(list || []);
      ClientStorage.saveLocalDrivers(list || []);
    } catch (err) {
      console.error('Failed to load drivers from database:', err);
      // Fallback to local storage
      const local = ClientStorage.getLocalDrivers();
      if (local && local.length > 0) {
        setDrivers(local);
      }
    } finally {
      setLoadingDrivers(false);
    }
  };

  useEffect(() => {
    loadDriversList();
  }, []);

  // Quick Add Driver to Centralized Database Collection
  const handleSaveNewDriverToCollection = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newDriverName.trim()) {
      setError('Driver full name is required.');
      return;
    }

    setSavingDriver(true);
    setError(null);

    try {
      const created = await apiCreateDriver({
        name: newDriverName.trim(),
        phone: newDriverPhone.trim() || undefined,
        email: newDriverEmail.trim() || undefined,
        vehicle: newDriverVehicle.trim() || undefined,
        licensePlate: newDriverLicensePlate.trim() || undefined
      });

      // Update drivers list with new persistent driver
      const updatedList = [...drivers.filter(d => d.id !== created.id), created];
      setDrivers(updatedList);
      ClientStorage.saveLocalDrivers(updatedList);
      
      // Auto-select newly created driver in dropdown
      setSelectedDriverId(created.id);
      
      // Reset inline form
      setShowInlineAddDriver(false);
      setNewDriverName('');
      setNewDriverPhone('');
      setNewDriverEmail('');
      setNewDriverVehicle('');
      setNewDriverLicensePlate('');
    } catch (err: any) {
      setError(err.message || 'Failed to save driver to database collection.');
    } finally {
      setSavingDriver(false);
    }
  };

  const handleAddExtraEmail = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newExtraEmail.trim().toLowerCase();
    if (!clean) return;
    if (!clean.includes('@') || !clean.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (additionalEmails.some(em => em.toLowerCase() === clean) || passengerEmail.toLowerCase() === clean) {
      setError('This email address is already added.');
      return;
    }
    setAdditionalEmails(prev => [...prev, clean]);
    setNewExtraEmail('');
    setError(null);
  };

  const handleRemoveExtraEmail = (emailToRemove: string) => {
    setAdditionalEmails(prev => prev.filter(em => em.toLowerCase() !== emailToRemove.toLowerCase()));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!reservationId.trim()) {
      setError('Reservation / Order ID is required.');
      return;
    }
    if (!passengerName.trim()) {
      setError('Passenger name is required.');
      return;
    }
    if (!passengerEmail.trim()) {
      setError('Passenger email is required for tracking access.');
      return;
    }

    setSubmitting(true);
    try {
      const selectedDriver = drivers.find(d => d.id === selectedDriverId);

      const newRide = await apiFetch<Ride>('/api/rides', {
        method: 'POST',
        body: JSON.stringify({
          reservationId: reservationId.trim().toUpperCase(),
          passengerName: passengerName.trim(),
          passengerEmail: passengerEmail.trim().toLowerCase(),
          additionalPassengerEmails: additionalEmails,
          driverId: selectedDriver?.id || undefined,
          driverName: selectedDriver?.name || undefined,
          driverPhone: selectedDriver?.phone || undefined
        })
      });

      // Save to client vault for backup redundancy
      ClientStorage.saveSingleRide(newRide);

      onRideCreated(newRide);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create ride. Please check required fields.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedDriverProfile = drivers.find(d => d.id === selectedDriverId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">Create New Ride</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter reservation, passenger details, and select a permanent driver.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {error}
            </div>
          )}

          {/* 1. Reservation ID */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              1. Reservation / Order ID <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Hash className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={reservationId}
                onChange={(e) => setReservationId(e.target.value)}
                placeholder="e.g. 54324 or STAR-8921"
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
              />
            </div>
          </div>

          {/* 2. Passenger Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              2. Passenger Full Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={passengerName}
                onChange={(e) => setPassengerName(e.target.value)}
                placeholder="e.g. Chad Aarhaus"
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
              />
            </div>
          </div>

          {/* 3. Passenger Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              3. Primary Passenger Email <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={passengerEmail}
                onChange={(e) => setPassengerEmail(e.target.value)}
                placeholder="e.g. passenger@example.com"
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
              />
            </div>
          </div>

          {/* Additional Passenger Emails (Optional) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Additional Passenger Emails (Optional)
              </label>
              <span className="text-[11px] text-slate-400">{additionalEmails.length} added</span>
            </div>

            {additionalEmails.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {additionalEmails.map((em) => (
                  <span
                    key={em}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-800 rounded-md text-xs"
                  >
                    <span>{em}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveExtraEmail(em)}
                      className="text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="email"
                value={newExtraEmail}
                onChange={(e) => setNewExtraEmail(e.target.value)}
                placeholder="Add another recipient email..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
              />
              <button
                type="button"
                onClick={() => handleAddExtraEmail()}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1 shrink-0 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* 4. Centralized Driver Collection Dropdown */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                4. Assigned Fleet Driver (Optional)
              </label>
              <div className="flex items-center gap-2">
                {!showInlineAddDriver && (
                  <button
                    type="button"
                    onClick={() => setShowInlineAddDriver(true)}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>+ Add Driver</span>
                  </button>
                )}
                {onOpenManageDrivers && (
                  <button
                    type="button"
                    onClick={onOpenManageDrivers}
                    className="text-[11px] font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Manage Fleet
                  </button>
                )}
              </div>
            </div>

            {/* Quick Add Driver Drawer (Saves directly to Drivers database collection) */}
            {showInlineAddDriver ? (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs animate-in fade-in duration-100">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <UserPlus className="w-3.5 h-3.5 text-slate-700" />
                    <span>Add Driver to Centralized Database</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowInlineAddDriver(false)}
                    className="text-slate-400 hover:text-slate-700 text-[11px] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="Driver Full Name *"
                    value={newDriverName}
                    onChange={(e) => setNewDriverName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Phone (e.g. +1 555-0199)"
                    value={newDriverPhone}
                    onChange={(e) => setNewDriverPhone(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                  <input
                    type="email"
                    placeholder="Driver Email"
                    value={newDriverEmail}
                    onChange={(e) => setNewDriverEmail(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Vehicle (e.g. Mercedes S580)"
                    value={newDriverVehicle}
                    onChange={(e) => setNewDriverVehicle(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                  <input
                    type="text"
                    placeholder="License Plate (e.g. 95STR-01)"
                    value={newDriverLicensePlate}
                    onChange={(e) => setNewDriverLicensePlate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>

                <button
                  type="button"
                  disabled={savingDriver}
                  onClick={handleSaveNewDriverToCollection}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {savingDriver ? (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save to Fleet & Select</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <select
                    value={selectedDriverId}
                    onChange={(e) => {
                      if (e.target.value === '__add_new__') {
                        setShowInlineAddDriver(true);
                      } else {
                        setSelectedDriverId(e.target.value);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
                  >
                    <option value="">— Select a Driver (or leave unassigned) —</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.vehicle ? `• ${d.vehicle}` : ''} {d.phone ? `(${d.phone})` : ''}
                      </option>
                    ))}
                    <option value="__add_new__">+ Add New Driver to Fleet...</option>
                  </select>
                </div>

                {/* Persistent Driver Profile Card Preview */}
                {selectedDriverProfile && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 animate-in fade-in duration-100">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>{selectedDriverProfile.name}</span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                          Fleet Driver
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedDriverId('')}
                        className="text-[11px] text-slate-400 hover:text-rose-600 font-medium cursor-pointer"
                      >
                        Unassign
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-slate-600 text-[11px]">
                      {selectedDriverProfile.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{selectedDriverProfile.phone}</span>
                        </div>
                      )}
                      {selectedDriverProfile.email && (
                        <div className="flex items-center gap-1.5 font-mono">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{selectedDriverProfile.email}</span>
                        </div>
                      )}
                      {selectedDriverProfile.vehicle && (
                        <div className="flex items-center gap-1.5 col-span-2">
                          <Car className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>
                            {selectedDriverProfile.vehicle}
                            {selectedDriverProfile.licensePlate ? ` [${selectedDriverProfile.licensePlate}]` : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-xs font-semibold rounded-xl transition shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>CREATE RIDE</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
