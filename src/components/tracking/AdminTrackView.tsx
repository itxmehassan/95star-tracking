import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Clock, CheckCircle2, Circle, 
  Download, AlertCircle, RefreshCw, ArrowLeft, ExternalLink, MessageSquare, User
} from 'lucide-react';
import { Ride, RideStatus, STATUS_SEQUENCE, STATUS_LABELS } from '../../types';
import { apiFetch, useRealtimeRideStream } from '../../lib/api';
import { formatDateTime, formatDuration, downloadSingleRidePdf, getTimeRemaining } from '../../lib/pdf';
import { CompanyLogoIcon } from '../common/Logo';
import { useBranding } from '../../lib/BrandingContext';

interface AdminTrackViewProps {
  token: string;
}

export default function AdminTrackView({ token }: AdminTrackViewProps) {
  const { companyName } = useBranding();
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { lastUpdate, connectionStatus } = useRealtimeRideStream({ token });

  const loadAdminTrackData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch(`/api/track/${token}`);
      if (res.role !== 'admin' || !res.ride) {
        throw new Error('This tracking link is not configured for admin monitor access.');
      }
      setRide(res.ride);
    } catch (err: any) {
      setError(err.message || 'Invalid admin tracking link.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminTrackData();
  }, [token]);

  useEffect(() => {
    if (lastUpdate && ride && lastUpdate.rideId === ride.id) {
      loadAdminTrackData();
    }
  }, [lastUpdate]);

  if (loading && !ride) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-800">
        <div className="w-10 h-10 border-3 border-slate-900 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-600">Loading Authoritative Admin Monitor...</p>
      </div>
    );
  }

  if (error && !ride) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Tracking Link Unavailable</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">{error}</p>
        <a
          href="/"
          className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold inline-block"
        >
          Go to Dashboard
        </a>
      </div>
    );
  }

  if (!ride) return null;

  const statusLabel = STATUS_LABELS[ride.currentStatus] || ride.currentStatus;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-16">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <CompanyLogoIcon size={46} />
            <div>
              <span className="font-black text-slate-900 text-base tracking-tight block leading-tight">
                {companyName}
              </span>
              <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider block">
                Admin Monitor • Res {ride.reservationId}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-[11px] font-medium text-slate-700">
              <span className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-ping'}`} />
              <span>{connectionStatus === 'connected' ? 'Live Monitor' : 'Reconnecting...'}</span>
            </div>

            <button
              onClick={() => downloadSingleRidePdf(ride)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 pt-6 space-y-6">
        
        {/* Passenger & Metadata Header Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                  {ride.reservationId}
                </span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                  ride.currentStatus === 'done'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {statusLabel}
                </span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1.5">
                {ride.passengerName}
              </h1>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {ride.passengerEmail}
              </p>
            </div>

            <div className="text-left sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Created Timestamp
              </span>
              <span className="text-xs font-mono text-slate-800 font-medium block mt-0.5">
                {formatDateTime(ride.createdAt)}
              </span>
              <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block mt-1.5">
                Tracking Link Status
              </span>
              <span className="text-xs font-mono text-emerald-900 font-semibold block">
                Permanent Active Link
              </span>
              {ride.completedAt && (
                <>
                  <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block mt-2">
                    Completed Timestamp
                  </span>
                  <span className="text-xs font-mono text-emerald-800 font-medium block mt-0.5">
                    {formatDateTime(ride.completedAt)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Authoritative Status Timeline Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-700" />
                <span>Complete Status Timeline & Durations</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Authoritative start, end, and duration logs permanently retained in the database.
              </p>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="divide-y divide-slate-100">
              {STATUS_SEQUENCE.map((statusKey, index) => {
                const event = ride.events.find(e => e.status === statusKey);
                const isCurrent = ride.currentStatus === statusKey;
                const isPast = event !== undefined;

                return (
                  <div 
                    key={statusKey}
                    className={`p-4 transition ${
                      isCurrent 
                        ? 'bg-blue-50/40' 
                        : isPast 
                        ? 'bg-white' 
                        : 'bg-slate-50/50 opacity-55'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="shrink-0">
                          {event ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          ) : isCurrent ? (
                            <div className="w-5 h-5 rounded-full border-2 border-blue-600 flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                            </div>
                          ) : (
                            <Circle className="w-5 h-5 text-slate-300" />
                          )}
                        </div>

                        <div>
                          <span className="text-xs font-bold text-slate-900 block">
                            {index + 1}. {STATUS_LABELS[statusKey]}
                          </span>
                          {event && (
                            <span className="text-[11px] text-slate-500 font-mono">
                              Started: {formatDateTime(event.startedAt)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="sm:text-right pl-8 sm:pl-0">
                        {event ? (
                          <div className="space-y-0.5">
                            <div className="text-xs font-mono text-slate-700">
                              {event.endedAt ? `Ended: ${formatDateTime(event.endedAt)}` : 'In Progress'}
                            </div>
                            {event.endedAt && event.durationSeconds !== undefined && event.status !== 'done' && (
                              <div className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded inline-block">
                                Duration: {formatDuration(event.durationSeconds)}
                              </div>
                            )}
                          </div>
                        ) : isCurrent ? (
                          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                            Active Stage
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Driver Note Display */}
                    {event?.comment && (
                      <div className="mt-2.5 ml-8 p-2.5 rounded-xl bg-amber-50/90 border border-amber-200/80 text-xs text-amber-950 flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-[11px] text-amber-900 flex items-center gap-1">
                            <span>Driver Comment</span>
                            {event.driverName && <span className="font-normal text-amber-800">({event.driverName})</span>}:
                          </span>
                          <p className="text-xs text-amber-950 font-normal leading-relaxed mt-0.5">{event.comment}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
