import React, { useState, useEffect } from 'react';
import {
  X,
  Hash,
  User,
  Mail,
  Plus,
  Car,
  Phone,
  UserPlus,
  ShieldCheck,
  Check,
  Calendar,
  Clock,
  Tag,
  Handshake,
  MapPin,
  Bell,
  ChevronDown,
  Info,
  AlertCircle
} from 'lucide-react';
import {
  apiFetch,
  fetchDrivers,
  createDriver as apiCreateDriver,
  fetchAffiliates,
  createAffiliate as apiCreateAffiliate,
  fetchEmailSettings
} from '../../lib/api';
import { ClientStorage } from '../../lib/storage';
import { Ride, Driver, Affiliate } from '../../types';

interface CreateRideModalProps {
  onClose: () => void;
  onRideCreated: (ride: Ride) => void;
  onOpenManageDrivers?: () => void;
  onOpenManageAffiliates?: () => void;
}

export default function CreateRideModal({
  onClose,
  onRideCreated,
  onOpenManageDrivers,
  onOpenManageAffiliates
}: CreateRideModalProps) {
  const [reservationId, setReservationId] = useState('');
  const [passengerName, setPassengerName] = useState('');
  const [passengerEmail, setPassengerEmail] = useState('');
  const [additionalEmails, setAdditionalEmails] = useState<string[]>([]);
  const [newExtraEmail, setNewExtraEmail] = useState('');

  // Optional Ride Date & Time
  const [rideDate, setRideDate] = useState('');
  const [rideTime, setRideTime] = useState('');

  // Optional Pickup & Dropoff Route Details
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [showLocationsDrawer, setShowLocationsDrawer] = useState(false);

  // Per-Ride Email Notification Controls (defaulted from global settings)
  const [emailOverrides, setEmailOverrides] = useState<{
    admin: boolean;
    customer: boolean;
    driver: boolean;
    affiliate: boolean;
  }>({
    admin: true,
    customer: true,
    driver: true,
    affiliate: true
  });

  // Optional Affiliate Info & Selection
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [selectedAffiliateId, setSelectedAffiliateId] = useState('');
  const [affiliateName, setAffiliateName] = useState('');
  const [affiliateId, setAffiliateId] = useState('');
  const [loadingAffiliates, setLoadingAffiliates] = useState(false);
  const [showInlineAddAffiliate, setShowInlineAddAffiliate] = useState(false);
  const [newAffiliateName, setNewAffiliateName] = useState('');
  const [newAffiliateCompany, setNewAffiliateCompany] = useState('');
  const [newAffiliatePhone, setNewAffiliatePhone] = useState('');
  const [newAffiliateEmail, setNewAffiliateEmail] = useState('');
  const [savingAffiliate, setSavingAffiliate] = useState(false);

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
      const local = ClientStorage.getLocalDrivers();
      if (local && local.length > 0) {
        setDrivers(local);
      }
    } finally {
      setLoadingDrivers(false);
    }
  };

  // Load Affiliates from Centralized Collection
  const loadAffiliatesList = async () => {
    try {
      setLoadingAffiliates(true);
      const list = await fetchAffiliates();
      setAffiliates(list || []);
      ClientStorage.saveLocalAffiliates(list || []);
    } catch (err) {
      console.error('Failed to load affiliates from database:', err);
      const local = ClientStorage.getLocalAffiliates();
      if (local && local.length > 0) {
        setAffiliates(local);
      }
    } finally {
      setLoadingAffiliates(false);
    }
  };

  useEffect(() => {
    loadDriversList();
    loadAffiliatesList();

    // Load global email notification toggles to set defaults for this ride
    fetchEmailSettings()
      .then((res) => {
        if (res && res.settings) {
          setEmailOverrides({
            admin: res.settings.admin ?? true,
            customer: res.settings.customer ?? true,
            driver: res.settings.driver ?? true,
            affiliate: res.settings.affiliate ?? true
          });
        }
      })
      .catch((err) => {
        console.warn('Could not pre-load email settings:', err);
      });
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

      const updatedList = [...drivers.filter((d) => d.id !== created.id), created];
      setDrivers(updatedList);
      ClientStorage.saveLocalDrivers(updatedList);

      setSelectedDriverId(created.id);

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

  const handleSelectAffiliate = (id: string) => {
    setSelectedAffiliateId(id);
    if (!id) {
      setAffiliateName('');
      setAffiliateId('');
      return;
    }
    const match = affiliates.find((a) => a.id === id);
    if (match) {
      setAffiliateName(match.name);
      setAffiliateId(match.id);
    }
  };

  const handleSaveNewAffiliateToCollection = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newAffiliateName.trim()) {
      setError('Affiliate name is required.');
      return;
    }

    setSavingAffiliate(true);
    setError(null);

    try {
      const created = await apiCreateAffiliate({
        name: newAffiliateName.trim(),
        company: newAffiliateCompany.trim() || undefined,
        phone: newAffiliatePhone.trim() || undefined,
        email: newAffiliateEmail.trim() || undefined
      });

      const updatedList = [...affiliates.filter((a) => a.id !== created.id), created];
      setAffiliates(updatedList);
      ClientStorage.saveLocalAffiliates(updatedList);

      setSelectedAffiliateId(created.id);
      setAffiliateName(created.name);
      setAffiliateId(created.id);

      setShowInlineAddAffiliate(false);
      setNewAffiliateName('');
      setNewAffiliateCompany('');
      setNewAffiliatePhone('');
      setNewAffiliateEmail('');
    } catch (err: any) {
      setError(err.message || 'Failed to save affiliate to database.');
    } finally {
      setSavingAffiliate(false);
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
    if (
      additionalEmails.some((em) => em.toLowerCase() === clean) ||
      passengerEmail.toLowerCase() === clean
    ) {
      setError('This email address is already added.');
      return;
    }
    setAdditionalEmails((prev) => [...prev, clean]);
    setNewExtraEmail('');
    setError(null);
  };

  const handleRemoveExtraEmail = (emailToRemove: string) => {
    setAdditionalEmails((prev) =>
      prev.filter((em) => em.toLowerCase() !== emailToRemove.toLowerCase())
    );
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
      const selectedDriver = drivers.find((d) => d.id === selectedDriverId);

      const newRide = await apiFetch<Ride>('/api/rides', {
        method: 'POST',
        body: JSON.stringify({
          reservationId: reservationId.trim().toUpperCase(),
          passengerName: passengerName.trim(),
          passengerEmail: passengerEmail.trim().toLowerCase(),
          additionalPassengerEmails: additionalEmails,
          driverId: selectedDriver?.id || undefined,
          driverName: selectedDriver?.name || undefined,
          driverPhone: selectedDriver?.phone || undefined,
          rideDate: rideDate.trim() || undefined,
          rideTime: rideTime.trim() || undefined,
          pickupLocation: pickupLocation.trim() || undefined,
          dropoffLocation: dropoffLocation.trim() || undefined,
          affiliateName: affiliateName.trim() || undefined,
          affiliateId: affiliateId.trim() || undefined,
          emailOverrides
        })
      });

      ClientStorage.saveSingleRide(newRide);

      onRideCreated(newRide);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create ride. Please check required fields.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedDriverProfile = drivers.find((d) => d.id === selectedDriverId);
  const filledLocationCount =
    (pickupLocation.trim() ? 1 : 0) + (dropoffLocation.trim() ? 1 : 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 bg-[#061436]/55 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-ride-modal-title"
    >
      <div className="bg-white rounded-[24px] border border-slate-200/80 shadow-[0_24px_64px_-12px_rgba(6,24,68,0.42)] max-w-[620px] w-full my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        {/* Deep Navy Premium Header */}
        <div className="relative shrink-0 bg-gradient-to-br from-[#061844] via-[#0a286d] to-[#071d52] px-5 sm:px-7 pt-5 pb-7 text-white overflow-hidden">
          {/* Subtle Network / Ambient Accent */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                'radial-gradient(circle at 82% 24%, rgba(69, 148, 255, 0.45) 0%, transparent 48%), radial-gradient(circle at 14% 12%, rgba(37, 99, 235, 0.35) 0%, transparent 45%)'
            }}
          />
          <svg
            aria-hidden="true"
            viewBox="0 0 620 26"
            preserveAspectRatio="none"
            className="pointer-events-none absolute bottom-0 left-0 w-full h-4 text-white"
          >
            <path
              d="M0,26 L0,10 C150,24 440,24 620,2 L620,26 Z"
              fill="currentColor"
            />
          </svg>

          <div className="relative flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              {/* Pin-style Blue Ride Icon Badge */}
              <div className="relative shrink-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-[#2f84ff] to-[#1356d6] shadow-lg shadow-blue-950/50 border border-white/25 flex items-center justify-center">
                  <Car className="w-6 h-6 text-white" strokeWidth={2.1} />
                </div>
              </div>

              <div className="hidden sm:block w-px h-10 bg-white/20 shrink-0" />

              <div className="min-w-0">
                <h3
                  id="create-ride-modal-title"
                  className="text-lg sm:text-[21px] font-bold tracking-tight text-white leading-snug"
                >
                  Create New Ride
                </h3>
                <p className="text-xs sm:text-[13px] text-blue-100/85 mt-0.5 leading-snug">
                  Enter reservation, passenger details, and select a permanent driver.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 active:bg-white/30 text-white/90 hover:text-white flex items-center justify-center shrink-0 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Form Body + Pinned Footer */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="px-5 sm:px-7 pt-3 pb-5 space-y-4 overflow-y-auto flex-1">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-[13px] flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* 1. Reservation / Order ID */}
            <div>
              <label
                htmlFor="create-ride-reservation-id"
                className="flex items-center gap-2.5 text-xs sm:text-[13px] font-bold text-[#0c2459] mb-2"
              >
                <span className="w-6 h-6 rounded-full bg-[#0d3b8c] text-white text-xs font-bold tabular-nums flex items-center justify-center shrink-0">
                  1
                </span>
                <span>
                  Reservation / Order ID <span className="text-rose-500">*</span>
                </span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#2c4b85]">
                  <Hash className="w-4 h-4" />
                </div>
                <input
                  id="create-ride-reservation-id"
                  type="text"
                  required
                  value={reservationId}
                  onChange={(e) => setReservationId(e.target.value)}
                  placeholder="e.g. 54324 or STAR-8921"
                  className="w-full h-11 pl-10 pr-4 bg-[#f8faff] focus:bg-white border border-[#d6e0f0] rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/15 focus:border-[#1d5fd6] transition"
                />
              </div>
            </div>

            {/* 2. Passenger Full Name */}
            <div>
              <label
                htmlFor="create-ride-passenger-name"
                className="flex items-center gap-2.5 text-xs sm:text-[13px] font-bold text-[#0c2459] mb-2"
              >
                <span className="w-6 h-6 rounded-full bg-[#0d3b8c] text-white text-xs font-bold tabular-nums flex items-center justify-center shrink-0">
                  2
                </span>
                <span>
                  Passenger Full Name <span className="text-rose-500">*</span>
                </span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#2c4b85]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="create-ride-passenger-name"
                  type="text"
                  required
                  value={passengerName}
                  onChange={(e) => setPassengerName(e.target.value)}
                  placeholder="e.g. Chad Aarhaus"
                  className="w-full h-11 pl-10 pr-4 bg-[#f8faff] focus:bg-white border border-[#d6e0f0] rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/15 focus:border-[#1d5fd6] transition"
                />
              </div>
            </div>

            {/* 3. Primary Passenger Email */}
            <div>
              <label
                htmlFor="create-ride-passenger-email"
                className="flex items-center gap-2.5 text-xs sm:text-[13px] font-bold text-[#0c2459] mb-2"
              >
                <span className="w-6 h-6 rounded-full bg-[#0d3b8c] text-white text-xs font-bold tabular-nums flex items-center justify-center shrink-0">
                  3
                </span>
                <span>
                  Primary Passenger Email <span className="text-rose-500">*</span>
                </span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#2c4b85]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="create-ride-passenger-email"
                  type="email"
                  required
                  value={passengerEmail}
                  onChange={(e) => setPassengerEmail(e.target.value)}
                  placeholder="e.g. passenger@example.com"
                  className="w-full h-11 pl-10 pr-4 bg-[#f8faff] focus:bg-white border border-[#d6e0f0] rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/15 focus:border-[#1d5fd6] transition"
                />
              </div>
            </div>

            {/* Additional Passenger Emails (Optional) */}
            <div className="p-4 rounded-2xl bg-[#f1f6fe] border border-[#dce6f7] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="create-ride-extra-email"
                  className="flex items-center gap-2 text-xs sm:text-[13px] font-bold text-[#0d3b8c]"
                >
                  <span className="w-5 h-5 rounded-full bg-[#0d3b8c] text-white flex items-center justify-center shrink-0">
                    <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </span>
                  <span>Additional Passenger Emails (Optional)</span>
                </label>
                <span className="text-xs font-medium text-[#1b4a96] tabular-nums shrink-0">
                  {additionalEmails.length} added
                </span>
              </div>

              {additionalEmails.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {additionalEmails.map((em) => (
                    <span
                      key={em}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#cad9f2] text-[#0c2d6b] rounded-lg text-xs font-medium shadow-2xs"
                    >
                      <span>{em}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveExtraEmail(em)}
                        aria-label={`Remove ${em}`}
                        className="text-slate-400 hover:text-rose-600 transition cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2.5">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#2c4b85]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="create-ride-extra-email"
                    type="email"
                    value={newExtraEmail}
                    onChange={(e) => setNewExtraEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddExtraEmail();
                      }
                    }}
                    placeholder="Add another recipient email..."
                    className="w-full h-10 pl-10 pr-3.5 bg-white border border-[#d6e0f0] rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/15 focus:border-[#1d5fd6] transition"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleAddExtraEmail()}
                  className="h-10 px-4 bg-white hover:bg-blue-50 active:bg-blue-100/70 text-[#0d3b8c] border border-[#3b76e6]/70 hover:border-[#1d5fd6] rounded-xl text-xs sm:text-[13px] font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Ride Date (Optional) & Ride Time (Optional) Side by Side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="create-ride-date"
                  className="flex items-center gap-1.5 text-xs sm:text-[13px] font-bold text-[#0c2459] mb-2"
                >
                  <Calendar className="w-4 h-4 text-[#0d3b8c] shrink-0" />
                  <span>
                    Ride Date <span className="font-semibold">(Optional)</span>
                  </span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#2c4b85]">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <input
                    id="create-ride-date"
                    type="date"
                    value={rideDate}
                    onChange={(e) => setRideDate(e.target.value)}
                    className="w-full h-11 pl-10 pr-3.5 bg-[#f8faff] focus:bg-white border border-[#d6e0f0] rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/15 focus:border-[#1d5fd6] transition cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="create-ride-time"
                  className="flex items-center gap-1.5 text-xs sm:text-[13px] font-bold text-[#0c2459] mb-2"
                >
                  <Clock className="w-4 h-4 text-[#0d3b8c] shrink-0" />
                  <span>
                    Ride Time{' '}
                    <span className="text-[11px] font-medium text-slate-600">(Optional)</span>
                  </span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#2c4b85]">
                    <Clock className="w-4 h-4" />
                  </div>
                  <input
                    id="create-ride-time"
                    type="time"
                    value={rideTime}
                    onChange={(e) => setRideTime(e.target.value)}
                    className="w-full h-11 pl-10 pr-3.5 bg-[#f8faff] focus:bg-white border border-[#d6e0f0] rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/15 focus:border-[#1d5fd6] transition cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Optional Pickup & Drop-off Locations (Organized Collapsible Card) */}
            <div className="rounded-xl bg-[#eef3fb] border border-[#dbe5f4] overflow-hidden">
              <button
                type="button"
                onClick={() => setShowLocationsDrawer((prev) => !prev)}
                aria-expanded={showLocationsDrawer}
                className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left hover:bg-[#e7eef9] transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-[#0d3b8c] text-white flex items-center justify-center shrink-0">
                    <Info className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-xs sm:text-[13px] font-medium text-[#1b3a70] truncate">
                    Pickup &amp; Drop-off locations (Optional)
                  </span>
                  {filledLocationCount > 0 && !showLocationsDrawer && (
                    <span className="text-[11px] font-semibold text-[#0d3b8c] tabular-nums shrink-0">
                      ({filledLocationCount} set)
                    </span>
                  )}
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-[#2c4b85] shrink-0 transition-transform duration-150 ${
                    showLocationsDrawer ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {showLocationsDrawer && (
                <div className="px-4 pb-4 pt-2 border-t border-[#dbe5f4] bg-white/80 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in duration-100">
                  <div>
                    <label
                      htmlFor="create-ride-pickup-location"
                      className="text-[11px] font-semibold text-[#1b3a70] mb-1.5 block"
                    >
                      Pickup Location
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#2c4b85]">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <input
                        id="create-ride-pickup-location"
                        type="text"
                        value={pickupLocation}
                        onChange={(e) => setPickupLocation(e.target.value)}
                        placeholder="e.g. JFK Airport Terminal 4"
                        className="w-full h-10 pl-9 pr-3 bg-white border border-[#d6e0f0] rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/15 focus:border-[#1d5fd6] transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="create-ride-dropoff-location"
                      className="text-[11px] font-semibold text-[#1b3a70] mb-1.5 block"
                    >
                      Drop-off Location
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#2c4b85]">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <input
                        id="create-ride-dropoff-location"
                        type="text"
                        value={dropoffLocation}
                        onChange={(e) => setDropoffLocation(e.target.value)}
                        placeholder="e.g. Manhattan Hotel Suite"
                        className="w-full h-10 pl-9 pr-3 bg-white border border-[#d6e0f0] rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/15 focus:border-[#1d5fd6] transition"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Centralized Affiliate Collection Dropdown & Quick Add */}
            <div className="pt-3 border-t border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs sm:text-[13px] font-bold text-[#0c2459]">
                  <Handshake className="w-4 h-4 text-[#0d3b8c]" />
                  <span>
                    Affiliate / Partner{' '}
                    <span className="font-medium text-slate-500">(Optional)</span>
                  </span>
                </label>
                <div className="flex items-center gap-3">
                  {!showInlineAddAffiliate && (
                    <button
                      type="button"
                      onClick={() => setShowInlineAddAffiliate(true)}
                      className="text-xs font-semibold text-[#1d5fd6] hover:text-[#0d3b8c] flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Affiliate</span>
                    </button>
                  )}
                  {onOpenManageAffiliates && (
                    <button
                      type="button"
                      onClick={onOpenManageAffiliates}
                      className="text-xs font-medium text-slate-500 hover:text-[#0c2459] cursor-pointer"
                    >
                      Manage Affiliates
                    </button>
                  )}
                </div>
              </div>

              {showInlineAddAffiliate && (
                <div className="p-3.5 bg-[#f4f7fd] border border-[#dce6f7] rounded-xl space-y-2.5 text-xs animate-in fade-in duration-100">
                  <div className="flex items-center justify-between border-b border-[#dce6f7] pb-2">
                    <div className="flex items-center gap-1.5 font-bold text-[#0c2459]">
                      <Handshake className="w-3.5 h-3.5 text-[#0d3b8c]" />
                      <span>Add Affiliate to Centralized Registry</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowInlineAddAffiliate(false)}
                      className="text-slate-500 hover:text-slate-800 text-xs font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Affiliate / Partner Name *"
                      value={newAffiliateName}
                      onChange={(e) => setNewAffiliateName(e.target.value)}
                      className="w-full h-9 px-3 bg-white border border-[#d6e0f0] rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1d5fd6]"
                    />
                    <input
                      type="text"
                      placeholder="Company / Org Name (Optional)"
                      value={newAffiliateCompany}
                      onChange={(e) => setNewAffiliateCompany(e.target.value)}
                      className="w-full h-9 px-3 bg-white border border-[#d6e0f0] rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1d5fd6]"
                    />
                    <input
                      type="tel"
                      placeholder="Contact Phone (Optional)"
                      value={newAffiliatePhone}
                      onChange={(e) => setNewAffiliatePhone(e.target.value)}
                      className="w-full h-9 px-3 bg-white border border-[#d6e0f0] rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1d5fd6]"
                    />
                    <input
                      type="email"
                      placeholder="Dispatch Email (Optional)"
                      value={newAffiliateEmail}
                      onChange={(e) => setNewAffiliateEmail(e.target.value)}
                      className="w-full h-9 px-3 bg-white border border-[#d6e0f0] rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1d5fd6]"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#dce6f7]">
                    <button
                      type="button"
                      onClick={() => setShowInlineAddAffiliate(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={savingAffiliate}
                      onClick={handleSaveNewAffiliateToCollection}
                      className="px-3.5 py-1.5 bg-[#0d3b8c] hover:bg-[#0a2c6b] disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{savingAffiliate ? 'Saving...' : 'Save & Select Affiliate'}</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2.5">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#2c4b85]">
                    <Handshake className="w-4 h-4" />
                  </div>
                  <select
                    value={selectedAffiliateId}
                    onChange={(e) => handleSelectAffiliate(e.target.value)}
                    disabled={loadingAffiliates}
                    className="w-full h-11 pl-10 pr-9 bg-[#f8faff] focus:bg-white border border-[#d6e0f0] rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/15 focus:border-[#1d5fd6] transition appearance-none cursor-pointer"
                  >
                    <option value="">-- Select Registered Affiliate (Optional) --</option>
                    {affiliates.map((aff) => (
                      <option key={aff.id} value={aff.id}>
                        {aff.name} {aff.company ? `(${aff.company})` : ''} - ID: {aff.id}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-[#2c4b85]">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="create-ride-affiliate-name"
                      className="text-[11px] font-medium text-slate-500 mb-1 block"
                    >
                      Affiliate Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#2c4b85]">
                        <Tag className="w-3.5 h-3.5" />
                      </div>
                      <input
                        id="create-ride-affiliate-name"
                        type="text"
                        value={affiliateName}
                        onChange={(e) => {
                          setAffiliateName(e.target.value);
                          if (!e.target.value) setSelectedAffiliateId('');
                        }}
                        placeholder="e.g. Royal Chauffeur Network"
                        className="w-full h-10 pl-9 pr-3 bg-[#f8faff] focus:bg-white border border-[#d6e0f0] rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/15 focus:border-[#1d5fd6] transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="create-ride-affiliate-id"
                      className="text-[11px] font-medium text-slate-500 mb-1 block"
                    >
                      Affiliate ID
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#2c4b85]">
                        <Hash className="w-3.5 h-3.5" />
                      </div>
                      <input
                        id="create-ride-affiliate-id"
                        type="text"
                        value={affiliateId}
                        onChange={(e) => {
                          setAffiliateId(e.target.value);
                          if (!e.target.value) setSelectedAffiliateId('');
                        }}
                        placeholder="e.g. AFF-1049"
                        className="w-full h-10 pl-9 pr-3 bg-[#f8faff] focus:bg-white border border-[#d6e0f0] rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/15 focus:border-[#1d5fd6] transition"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Assigned Fleet Driver (Optional) */}
            <div className="pt-3 border-t border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2.5 text-xs sm:text-[13px] font-bold text-[#0c2459]">
                  <span className="w-6 h-6 rounded-full bg-[#0d3b8c] text-white text-xs font-bold tabular-nums flex items-center justify-center shrink-0">
                    4
                  </span>
                  <span>
                    Assigned Fleet Driver{' '}
                    <span className="font-medium text-slate-500">(Optional)</span>
                  </span>
                </label>
                <div className="flex items-center gap-3">
                  {!showInlineAddDriver && (
                    <button
                      type="button"
                      onClick={() => setShowInlineAddDriver(true)}
                      className="text-xs font-semibold text-[#1d5fd6] hover:text-[#0d3b8c] flex items-center gap-1 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Add Driver</span>
                    </button>
                  )}
                  {onOpenManageDrivers && (
                    <button
                      type="button"
                      onClick={onOpenManageDrivers}
                      className="text-xs font-medium text-slate-500 hover:text-[#0c2459] cursor-pointer"
                    >
                      Manage Fleet
                    </button>
                  )}
                </div>
              </div>

              {showInlineAddDriver ? (
                <div className="p-3.5 bg-[#f4f7fd] border border-[#dce6f7] rounded-xl space-y-2.5 text-xs animate-in fade-in duration-100">
                  <div className="flex items-center justify-between border-b border-[#dce6f7] pb-2">
                    <div className="flex items-center gap-1.5 font-bold text-[#0c2459]">
                      <UserPlus className="w-3.5 h-3.5 text-[#0d3b8c]" />
                      <span>Add Driver to Centralized Database</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowInlineAddDriver(false)}
                      className="text-slate-500 hover:text-slate-800 text-xs font-medium cursor-pointer"
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
                      className="w-full h-9 px-3 bg-white border border-[#d6e0f0] rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1d5fd6]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Phone (e.g. +1 555-0199)"
                      value={newDriverPhone}
                      onChange={(e) => setNewDriverPhone(e.target.value)}
                      className="w-full h-9 px-3 bg-white border border-[#d6e0f0] rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1d5fd6]"
                    />
                    <input
                      type="email"
                      placeholder="Driver Email"
                      value={newDriverEmail}
                      onChange={(e) => setNewDriverEmail(e.target.value)}
                      className="w-full h-9 px-3 bg-white border border-[#d6e0f0] rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1d5fd6]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Vehicle (e.g. Mercedes S580)"
                      value={newDriverVehicle}
                      onChange={(e) => setNewDriverVehicle(e.target.value)}
                      className="w-full h-9 px-3 bg-white border border-[#d6e0f0] rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1d5fd6]"
                    />
                    <input
                      type="text"
                      placeholder="License Plate (e.g. 95STR-01)"
                      value={newDriverLicensePlate}
                      onChange={(e) => setNewDriverLicensePlate(e.target.value)}
                      className="w-full h-9 px-3 bg-white border border-[#d6e0f0] rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1d5fd6]"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={savingDriver}
                    onClick={handleSaveNewDriverToCollection}
                    className="w-full h-9 bg-[#0d3b8c] hover:bg-[#0a2c6b] text-white rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {savingDriver ? (
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Save to Fleet &amp; Select</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#2c4b85]">
                      <Car className="w-4 h-4" />
                    </div>
                    <select
                      value={selectedDriverId}
                      disabled={loadingDrivers}
                      onChange={(e) => {
                        if (e.target.value === '__add_new__') {
                          setShowInlineAddDriver(true);
                        } else {
                          setSelectedDriverId(e.target.value);
                        }
                      }}
                      className="w-full h-11 pl-10 pr-9 bg-[#f8faff] focus:bg-white border border-[#d6e0f0] rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/15 focus:border-[#1d5fd6] transition appearance-none cursor-pointer"
                    >
                      <option value="">— Select a Driver (or leave unassigned) —</option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} {d.vehicle ? `• ${d.vehicle}` : ''}{' '}
                          {d.phone ? `(${d.phone})` : ''}
                        </option>
                      ))}
                      <option value="__add_new__">+ Add New Driver to Fleet...</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-[#2c4b85]">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>

                  {selectedDriverProfile && (
                    <div className="p-3.5 rounded-xl bg-[#f1f6fe] border border-[#dce6f7] text-xs space-y-1.5 animate-in fade-in duration-100">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-[#0c2459] flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{selectedDriverProfile.name}</span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                            Fleet Driver
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedDriverId('')}
                          className="text-xs text-slate-500 hover:text-rose-600 font-medium cursor-pointer"
                        >
                          Unassign
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-slate-600 text-[11px]">
                        {selectedDriverProfile.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-[#2c4b85] shrink-0" />
                            <span>{selectedDriverProfile.phone}</span>
                          </div>
                        )}
                        {selectedDriverProfile.email && (
                          <div className="flex items-center gap-1.5 font-mono">
                            <Mail className="w-3 h-3 text-[#2c4b85] shrink-0" />
                            <span className="truncate">{selectedDriverProfile.email}</span>
                          </div>
                        )}
                        {selectedDriverProfile.vehicle && (
                          <div className="flex items-center gap-1.5 sm:col-span-2">
                            <Car className="w-3 h-3 text-[#2c4b85] shrink-0" />
                            <span>
                              {selectedDriverProfile.vehicle}
                              {selectedDriverProfile.licensePlate
                                ? ` [${selectedDriverProfile.licensePlate}]`
                                : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Per-Ride Email Notification Controls */}
            <div className="pt-3 border-t border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#0d3b8c]" />
                  <span className="text-xs sm:text-[13px] font-bold text-[#0c2459]">
                    Email Notifications (Per-Ride Controls)
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                  Default from Dashboard Settings
                </span>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Select which recipients will automatically receive their secure tracking links for
                this ride:
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(
                  [
                    { key: 'admin', label: 'Admin', desc: 'Monitor Link' },
                    { key: 'customer', label: 'Customer', desc: 'Live Tracker' },
                    { key: 'driver', label: 'Driver', desc: 'Control Link' },
                    { key: 'affiliate', label: 'Affiliate', desc: 'Partner Link' }
                  ] as const
                ).map(({ key, label, desc }) => {
                  const isActive = emailOverrides[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        setEmailOverrides((prev) => ({ ...prev, [key]: !prev[key] }))
                      }
                      className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                        isActive
                          ? 'bg-[#0a2a6c] text-white border-[#0a2a6c] shadow-xs'
                          : 'bg-[#f8faff] text-slate-500 border-[#d6e0f0] hover:border-[#9eb7e0]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full gap-1">
                        <span className="text-xs font-bold">{label}</span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            isActive ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
                          }`}
                        >
                          {isActive ? 'ON' : 'OFF'}
                        </span>
                      </div>
                      <span
                        className={`text-[11px] mt-1 ${
                          isActive ? 'text-blue-100/85' : 'text-slate-400'
                        }`}
                      >
                        {desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sticky Footer Bar */}
          <div className="shrink-0 px-5 sm:px-7 py-3.5 bg-white border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-5 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-[13px] font-semibold transition whitespace-nowrap cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-10 px-5 bg-gradient-to-r from-[#08245e] to-[#0d3b8c] hover:from-[#0b2f78] hover:to-[#1148a8] active:from-[#071f4f] active:to-[#0a2e6d] text-white text-xs sm:text-[13px] font-semibold rounded-xl transition shadow-md shadow-blue-950/20 flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap cursor-pointer"
            >
              {submitting ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Car className="w-4 h-4" />
                  <span>Create Ride</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
