import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, Circle, Car, ShieldCheck, 
  ArrowRight, AlertCircle, RefreshCw, Check, Clock, User, MessageSquare, X
} from 'lucide-react';
import { RideStatus, STATUS_SEQUENCE, STATUS_LABELS, RideStatusEvent } from '../../types';
import { apiFetch, useRealtimeRideStream, formatStepTime } from '../../lib/api';
import { getTimeRemaining } from '../../lib/pdf';
import { CompanyLogoIcon } from '../common/Logo';
import { useBranding } from '../../lib/BrandingContext';

interface DriverViewProps {
  token: string;
}

export default function DriverView({ token }: DriverViewProps) {
  const { companyName } = useBranding();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [driverComment, setDriverComment] = useState('');

  const { lastUpdate, connectionStatus } = useRealtimeRideStream({ token });

  const loadDriverData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch(`/api/track/${token}`);
      if (res.role !== 'driver') {
        throw new Error('This tracking link is not configured for driver access.');
      }
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Invalid driver tracking link.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDriverData();
  }, [token]);

  // Real-time update listener
  useEffect(() => {
    if (lastUpdate && data && lastUpdate.rideId === data.ride?.id) {
      loadDriverData();
    }
  }, [lastUpdate]);

  const handleOpenStatusConfirmation = () => {
    if (!data || !data.nextStatus || updating) return;
    setDriverComment('');
    setShowCommentModal(true);
  };

  const handleConfirmAdvanceStatus = async (commentToSubmit?: string) => {
    if (!data || !data.nextStatus || updating) return;

    setUpdating(true);
    setError(null);
    try {
      const finalComment = commentToSubmit !== undefined ? commentToSubmit : driverComment;
      const res = await apiFetch(`/api/track/${token}/status`, {
        method: 'POST',
        body: JSON.stringify({ 
          status: data.nextStatus,
          comment: finalComment.trim() ? finalComment.trim() : undefined
        })
      });

      if (res.success) {
        setShowCommentModal(false);
        setDriverComment('');
        await loadDriverData();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update status.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-800">
        <div className="w-10 h-10 border-3 border-slate-900 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-600">Loading Driver Action Interface...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Access Error</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">{error}</p>
        <button
          onClick={loadDriverData}
          className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  const { ride, nextStatus, nextStatusLabel, isCompleted, events } = data;
  const currentIndex = STATUS_SEQUENCE.indexOf(ride.currentStatus);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-12">
      
      {/* Top Mobile App Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3.5 sticky top-0 z-20 shadow-xs">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CompanyLogoIcon size={46} />
            <div>
              <span className="font-black text-sm sm:text-base text-slate-900 block leading-tight">
                {companyName}
              </span>
              <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider block">
                Driver Portal • Res {ride.reservationId}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
            <span className={`w-1.5 h-1.5 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'}`} />
            <span>{connectionStatus === 'connected' ? 'Live Sync' : 'Reconnecting...'}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-md mx-auto w-full p-4 space-y-4">
        
        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Passenger & Ride Info Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Passenger & Ride Information
            </span>
            <div className="flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 font-medium">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              <span>Active Driver Portal</span>
            </div>
          </div>
          
          <div className="mt-2 flex items-start justify-between gap-2">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                {ride.passengerName}
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {ride.passengerEmail}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Ride / Res ID
              </span>
              <span className="inline-block mt-0.5 px-2.5 py-1 bg-slate-900 text-white font-mono font-bold text-xs rounded-lg shadow-2xs">
                {ride.reservationId}
              </span>
            </div>
          </div>

          {ride.driverName && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-xs text-slate-700 font-medium border border-slate-200">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>Assigned Driver: <strong>{ride.driverName}</strong></span>
            </div>
          )}

          <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Current Status:</span>
            <span className="font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
              {STATUS_LABELS[ride.currentStatus as RideStatus] || ride.currentStatus}
            </span>
          </div>
        </div>

        {/* Large Driver Action Button (If Not Completed) */}
        {!isCompleted && nextStatus && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Next Action Step:
            </span>

            <button
              onClick={handleOpenStatusConfirmation}
              disabled={updating}
              className="w-full py-4 px-6 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white rounded-2xl text-base font-black tracking-wide shadow-md transition flex items-center justify-center gap-2.5 disabled:opacity-60 cursor-pointer"
            >
              {updating ? (
                <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>TAP: {nextStatusLabel?.toUpperCase()}</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            <p className="text-[11px] text-center text-slate-400">
              Press when initiating this stage. You can optionally add a note or comment for dispatch.
            </p>
          </div>
        )}

        {/* Ride Completed Banner */}
        {isCompleted && (
          <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-6 text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto mb-2.5 shadow-sm">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <h3 className="text-base font-bold text-emerald-950">Ride Complete</h3>
            <p className="text-xs text-emerald-800/80 mt-1">
              All 6 status stages have been recorded. Thank you for your service!
            </p>
          </div>
        )}

        {/* 6-Step Status Checklist with Exact Timestamps & Driver Notes */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Status Progression Sequence
          </h3>

          <div className="divide-y divide-slate-100">
            {STATUS_SEQUENCE.map((statusKey, index) => {
              const isPast = currentIndex >= index;
              const isCurrent = ride.currentStatus === statusKey;
              const isNext = !isPast && nextStatus === statusKey;

              const matchingEvent = (events || []).find((e: RideStatusEvent) => e.status === statusKey);
              const eventTime = matchingEvent?.startedAt ? formatStepTime(matchingEvent.startedAt) : null;
              const stepComment = matchingEvent?.comment;

              return (
                <div 
                  key={statusKey} 
                  className={`py-3 transition ${
                    isCurrent 
                      ? 'font-bold text-slate-900' 
                      : isPast 
                      ? 'text-slate-800' 
                      : isNext 
                      ? 'text-slate-900 font-semibold' 
                      : 'text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="shrink-0">
                        {isPast ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        ) : isNext ? (
                          <div className="w-5 h-5 rounded-full border-2 border-slate-900 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-slate-900 animate-ping" />
                          </div>
                        ) : (
                          <Circle className="w-5 h-5 text-slate-300" />
                        )}
                      </div>
                      <div>
                        <span className="text-xs block">
                          {index + 1}. {STATUS_LABELS[statusKey]}
                        </span>
                        {eventTime && (
                          <span className="text-[11px] text-blue-600 font-mono font-medium block mt-0.5">
                            time {eventTime}
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      {isPast ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                          Completed
                        </span>
                      ) : isNext ? (
                        <span className="text-[10px] font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                          Next Up
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Driver Note Display */}
                  {stepComment && (
                    <div className="mt-2 ml-8 p-2 rounded-lg bg-amber-50/80 border border-amber-200/70 text-xs text-amber-950 flex items-start gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-[11px] text-amber-900 block">Driver Note:</span>
                        <p className="text-xs text-amber-900 font-normal leading-relaxed">{stepComment}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </main>

      {/* Optional Driver Comment & Action Modal */}
      {showCommentModal && nextStatus && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Confirm Status Progression
                </span>
                <h3 className="text-base font-black text-slate-900">
                  Advance to: {nextStatusLabel}
                </h3>
              </div>
              <button
                onClick={() => setShowCommentModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div className="font-semibold text-slate-800">
                  Res {ride.reservationId} • {ride.passengerName}
                </div>
                <div className="text-[11px] text-slate-500">
                  Advancing to <strong className="text-slate-800">{nextStatusLabel}</strong> records an authoritative server timestamp in the permanent database.
                </div>
              </div>

              {/* Optional Comment Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                  <span>Driver Note / Comment (Optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={driverComment}
                  onChange={(e) => setDriverComment(e.target.value)}
                  placeholder="e.g., Arrived at Terminal 2 pickup zone, waiting at pillar 4B, passenger luggage loaded..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                />
                <p className="text-[11px] text-slate-400">
                  Notes are permanently logged with this status update and visible to dispatch/admins.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleConfirmAdvanceStatus()}
                  className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white rounded-xl text-xs font-bold tracking-wide shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {updating ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{driverComment.trim() ? 'SUBMIT STATUS WITH NOTE' : `CONFIRM: ${nextStatusLabel?.toUpperCase()}`}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={updating}
                  onClick={() => setShowCommentModal(false)}
                  className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
