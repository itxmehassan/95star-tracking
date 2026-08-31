import React, { useState, useEffect, useMemo } from 'react';
import { X, UserPlus, Phone, Mail, Car, Shield, Trash2, Edit2, Check, User, Plus, Search, ShieldCheck } from 'lucide-react';
import { Driver } from '../../types';
import { apiFetch, fetchDrivers, createDriver as apiCreateDriver, updateDriver as apiUpdateDriver, deleteDriver as apiDeleteDriver } from '../../lib/api';
import { ClientStorage } from '../../lib/storage';

interface ManageDriversModalProps {
  onClose: () => void;
  onDriversUpdated?: () => void;
}

export default function ManageDriversModal({ onClose, onDriversUpdated }: ManageDriversModalProps) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDrivers = async () => {
    try {
      setLoading(true);
      const data = await fetchDrivers();
      setDrivers(data || []);
      ClientStorage.saveLocalDrivers(data || []);
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
    loadDrivers();
  }, []);

  const resetForm = () => {
    setName('');
    setPhone('');
    setEmail('');
    setVehicle('');
    setLicensePlate('');
    setEditingDriverId(null);
    setShowAddForm(false);
    setError(null);
  };

  const handleStartEdit = (driver: Driver) => {
    setEditingDriverId(driver.id);
    setName(driver.name);
    setPhone(driver.phone || '');
    setEmail(driver.email || '');
    setVehicle(driver.vehicle || '');
    setLicensePlate(driver.licensePlate || '');
    setShowAddForm(true);
  };

  const handleSaveDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Driver full name is required.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingDriverId) {
        // Update existing driver in permanent database collection
        const updated = await apiUpdateDriver(editingDriverId, {
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          vehicle: vehicle.trim() || undefined,
          licensePlate: licensePlate.trim() || undefined
        });

        const updatedList = drivers.map(d => (d.id === editingDriverId ? updated : d));
        setDrivers(updatedList);
        ClientStorage.saveLocalDrivers(updatedList);
      } else {
        // Create new driver in permanent database collection
        const created = await apiCreateDriver({
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          vehicle: vehicle.trim() || undefined,
          licensePlate: licensePlate.trim() || undefined
        });

        const updatedList = [...drivers, created];
        setDrivers(updatedList);
        ClientStorage.saveLocalDrivers(updatedList);
      }

      await loadDrivers();
      resetForm();
      if (onDriversUpdated) onDriversUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to save driver to database.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDriver = async (id: string, driverName: string) => {
    if (!window.confirm(`Are you sure you want to remove driver "${driverName}" from the fleet database?`)) return;

    try {
      await apiDeleteDriver(id);
      const updatedList = drivers.filter(d => d.id !== id);
      setDrivers(updatedList);
      ClientStorage.saveLocalDrivers(updatedList);
      await loadDrivers();
      if (onDriversUpdated) onDriversUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to delete driver');
    }
  };

  const filteredDrivers = useMemo(() => {
    if (!searchQuery.trim()) return drivers;
    const q = searchQuery.toLowerCase().trim();
    return drivers.filter(d => 
      d.name.toLowerCase().includes(q) ||
      (d.vehicle && d.vehicle.toLowerCase().includes(q)) ||
      (d.phone && d.phone.toLowerCase().includes(q)) ||
      (d.email && d.email.toLowerCase().includes(q)) ||
      (d.licensePlate && d.licensePlate.toLowerCase().includes(q))
    );
  }, [drivers, searchQuery]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Manage Fleet Drivers</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Centralized database collection of permanent drivers for ride assignments.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!showAddForm && (
              <button
                onClick={() => {
                  resetForm();
                  setShowAddForm(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Driver</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Add / Edit Form Drawer */}
          {showAddForm && (
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-slate-600" />
                  <span>{editingDriverId ? 'Edit Driver Profile' : 'Add New Driver to Fleet'}</span>
                </h4>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  {error}
                </div>
              )}

              <form onSubmit={handleSaveDriver} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Name (Required) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Hassan Mehdi Khan"
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +1 (555) 234-5678"
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. driver@95startracking.com"
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                    />
                  </div>

                  {/* Vehicle Description */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Assigned Vehicle
                    </label>
                    <input
                      type="text"
                      value={vehicle}
                      onChange={(e) => setVehicle(e.target.value)}
                      placeholder="e.g. Mercedes-Benz S580 (Black)"
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                    />
                  </div>

                  {/* License Plate */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      License Plate #
                    </label>
                    <input
                      type="text"
                      value={licensePlate}
                      onChange={(e) => setLicensePlate(e.target.value)}
                      placeholder="e.g. 6766744"
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 uppercase font-mono focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                    />
                  </div>

                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {saving ? (
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{editingDriverId ? 'Update Driver' : 'Save to Database'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Registered Fleet Drivers ({drivers.length})
              </span>
            </div>

            {drivers.length > 3 && (
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search drivers or vehicles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
                />
              </div>
            )}
          </div>

          {/* Drivers List */}
          <div>
            {loading ? (
              <div className="py-12 flex justify-center">
                <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredDrivers.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <User className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">
                  {searchQuery ? 'No drivers match your search.' : 'No Fleet Drivers Found'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5 mb-4">
                  {searchQuery ? 'Try another search query.' : 'Add your drivers to assign them cleanly to rides.'}
                </p>
                {!showAddForm && (
                  <button
                    onClick={() => {
                      resetForm();
                      setShowAddForm(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Driver</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredDrivers.map((driver) => (
                  <div
                    key={driver.id}
                    className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          {driver.name}
                        </span>
                        {driver.vehicle && (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                            <Car className="w-3 h-3 text-slate-500" />
                            {driver.vehicle}
                          </span>
                        )}
                        {driver.licensePlate && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {driver.licensePlate}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        {driver.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {driver.phone}
                          </span>
                        )}
                        {driver.email && (
                          <span className="flex items-center gap-1 font-mono text-[11px]">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {driver.email}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      <button
                        onClick={() => handleStartEdit(driver)}
                        className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 flex items-center gap-1 transition cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteDriver(driver.id, driver.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Remove Driver"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
