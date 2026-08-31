import React, { useState } from 'react';
import { X, Smartphone, Users, Shield, Copy, Check, ExternalLink, ArrowRight, Clock } from 'lucide-react';
import { Ride } from '../../types';
import { formatDateTime, getTimeRemaining } from '../../lib/pdf';

interface GeneratedLinksModalProps {
  ride: Ride;
  onClose: () => void;
  onViewDetails: (ride: Ride) => void;
}

export default function GeneratedLinksModal({ ride, onClose, onViewDetails }: GeneratedLinksModalProps) {
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const origin = window.location.origin;
  const driverUrl = `${origin}/driver/${ride.tokens.driverToken}`;
  const passengerUrl = `${origin}/passenger/${ride.tokens.passengerToken}`;
  const adminUrl = `${origin}/track/${ride.tokens.adminToken}`;

  const remaining = getTimeRemaining(ride.tokens.expiresAt);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-xs uppercase tracking-wider border border-emerald-200/60">
                Ride Created Successfully
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {ride.reservationId}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1">
              3 Unique Tracking Links Generated
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Permanent Database Persistence Banner */}
        <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/70 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-emerald-900">
            <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong className="font-semibold">Permanent Persistence:</strong> Ride is saved permanently in the database.
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-emerald-800 font-mono text-[11px] font-semibold shrink-0">
            Active Links
          </span>
        </div>

        {/* Links Container */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          
          {/* 1. DRIVER LINK */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    1. Driver Link (Mobile Action Interface)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Send to the driver to progress statuses (Getting Ready → Done)
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                readOnly
                value={driverUrl}
                className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 select-all font-mono"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(driverUrl, 'driver')}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition shrink-0"
              >
                {copiedType === 'driver' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
              <a
                href={driverUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs transition shrink-0"
                title="Open Driver Link in New Tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* 2. PASSENGER LINK */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    2. Passenger Link (Read-Only Live Status)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Send to passenger. Real-time updates without showing exact timestamps.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                readOnly
                value={passengerUrl}
                className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 select-all font-mono"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(passengerUrl, 'passenger')}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition shrink-0"
              >
                {copiedType === 'passenger' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
              <a
                href={passengerUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs transition shrink-0"
                title="Open Passenger Link in New Tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* 3. ADMIN LINK */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    3. Admin Link (Live Timestamp Monitor)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Direct single-ride monitoring view with full timestamps and durations.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                readOnly
                value={adminUrl}
                className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 select-all font-mono"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(adminUrl, 'admin')}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition shrink-0"
              >
                {copiedType === 'admin' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
              <a
                href={adminUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs transition shrink-0"
                title="Open Admin Monitor Link in New Tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
          >
            Close
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onViewDetails(ride);
            }}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-sm"
          >
            <span>View Full Timeline Details</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
}
