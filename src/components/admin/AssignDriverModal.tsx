import React, { useState, useEffect } from 'react';
import { X, User, Car, Phone, Check, UserPlus, ShieldCheck, Mail, Plus, Send } from 'lucide-react';
import { Ride, Driver } from '../../types';
import { apiFetch, fetchDrivers, createDriver as apiCreateDriver } from '../../lib/api';
import { ClientStorage } from '../../lib/storage';

interface AssignDriverModalProps {
  ride: Ride;
  onClose: () => void;
  onAssigned: () => void;
  onOpenManageDrivers?: () => void;
}

export default function AssignDriverModal({
  ride,
  onClose,
  onAssigned,
  onOpenManageDrivers
}: AssignDriverModalProps) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string>(ride.driverId || '');
  const [additionalEmails, setAdditionalEmails] = useState<string[]>(ride.additionalPassengerEmails || []);
  const [newExtraEmail, setNewExtraEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick Add New Driver to Centralized Fleet
  const [showInlineAddDriver, setShowInlineAddDriver] = useState(false);
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverPhone, setNewDriverPhone] = useState('');
  const [newDriverEmail, setNewDriverEmail] = useState('');
  const [newDriverVehicle, setNewDriverVehicle] = useState('');
  const [newDriverLicensePlate, setNewDriverLicensePlate] = useState('');
  const [savingNewDriver, setSavingNewDriver] = useState(false);

  const loadDriversList = async () => {
    try {
      setLoading(true);
      const list = await fetchDrivers();
      setDrivers(list || []);
      ClientStorage.saveLocalDrivers(list || []);
    } catch (err: any) {
      console.error('Failed to load drivers from database:', err);
      const local = ClientStorage.getLocalDrivers();
      if (local && local.length > 0) {
        setDrivers(local);
      } else {
        setError(err.message || 'Failed to load drivers');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDriversList();
  }, []);

  const handleSaveNewDriverToCollection = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newDriverName.trim()) {
      setError('Driver full name is required.');
      return;
    }

    setSavingNewDriver(true);
    setError(null);

    try {
      const created = await apiCreateDriver({
        name: newDriverName.trim(),
        phone: newDriverPhone.trim() || undefined,
        email: newDriverEmail.trim() || undefined,
        vehicle: newDriverVehicle.trim() || undefined,
        licensePlate: newDriverLicensePlate.trim() || undefined
      });

      const updated = [...drivers.filter(d => d.id !== created.id), created];
      setDrivers(updated);
      ClientStorage.saveLocalDrivers(updated);
      setSelectedDriverId(created.id);
      
      setShowInlineAddDriver(false);
      setNewDriverName('');
      setNewDriverPhone('');
      setNewDriverEmail('');
      setNewDriverVehicle('');
      setNewDriverLicensePlate('');
    } catch (err: any) {
      setError(err.message || 'Failed to save new driver to database.');
    } finally {
      setSavingNewDriver(false);
    }
  };

  const handleAddEmail = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newExtraEmail.trim().toLowerCase();
    if (!clean) return;

    if (!clean.includes('@') || !clean.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (additionalEmails.some(em => em.toLowerCase() === clean) || ride.passengerEmail.toLowerCase() === clean) {
      setError('This email address is already added.');
      return;
    }

    setAdditionalEmails(prev => [...prev, clean]);
    setNewExtraEmail('');
    setError(null);
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setAdditionalEmails(prev => prev.filter(em => em.toLowerCase() !== emailToRemove.toLowerCase()));
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const selectedDriver = drivers.find(d => d.id === selectedDriverId);

      const res = await apiFetch<{ success: boolean; ride: Ride }>(`/api/rides/${ride.id}/driver`, {
        method: 'POST',
        body: JSON.stringify({
          driverId: selectedDriver?.id || null,
          driverName: selectedDriver?.name || null,
          driverPhone: selectedDriver?.phone || null,
          additionalPassengerEmails: additionalEmails
        })
      });

      if (res.success && res.ride) {
        ClientStorage.saveSingleRide(res.ride);
      }

      onAssigned();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to assign driver');
    } finally {
      setSaving(false);
    }
  };

  const selectedDriverProfile = drivers.find(d => d.id === selectedDriverId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div>
            <h3 className="text-base font-bold text-slate-900">Assign Driver & Send Links</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Reservation {ride.reservationId} • {ride.passengerName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSaveAssignment} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {error}
            </div>
          )}

          {/* Automatic Notification Notice */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 flex items-start gap-2">
            <Send className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              Tracking links will be automatically emailed to the <strong className="text-slate-900">Driver</strong>, <strong className="text-slate-900">Passenger</strong>, and all <strong className="text-slate-900">Admin</strong> recipients upon saving.
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Select Fleet Driver
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
                    onClick={() => {
                      onClose();
                      onOpenManageDrivers();
                    }}
                    className="text-[11px] font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Manage Fleet
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="py-4 flex justify-center">
                <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : showInlineAddDriver ? (
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
                  disabled={savingNewDriver}
                  onClick={handleSaveNewDriverToCollection}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {savingNewDriver ? (
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
                  <option value="">— Unassigned (No Driver) —</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name} {driver.vehicle ? `• ${driver.vehicle}` : ''} {driver.phone ? `(${driver.phone})` : ''}
                    </option>
                  ))}
                  <option value="__add_new__">+ Add New Driver to Fleet...</option>
                </select>

                {/* Selected Driver Info Preview */}
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

          {/* Additional Passenger Emails */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Additional Passenger Emails (Optional)
              </label>
              <span className="text-[11px] text-slate-400">{additionalEmails.length} added</span>
            </div>

            {additionalEmails.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {additionalEmails.map((em) => (
                  <span
                    key={em}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-800 rounded-md text-xs"
                  >
                    <span>{em}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveEmail(em)}
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
                placeholder="passenger2@example.com"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
              />
              <button
                type="button"
                onClick={() => handleAddEmail()}
                className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1 shrink-0 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Assignment</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
