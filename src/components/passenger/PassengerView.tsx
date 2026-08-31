import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, Circle, ShieldCheck, 
  MapPin, Clock, AlertCircle, Sparkles, Check, User
} from 'lucide-react';
import { RideStatus, STATUS_SEQUENCE, STATUS_LABELS, RideStatusEvent } from '../../types';
import { apiFetch, useRealtimeRideStream, formatStepTime } from '../../lib/api';
import { getTimeRemaining } from '../../lib/pdf';
import { CompanyLogoIcon } from '../common/Logo';
import { useBranding } from '../../lib/BrandingContext';

interface PassengerViewProps {
  token: string;
}

export default function PassengerView({ token }: PassengerViewProps) {
  const { companyName } = useBranding();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { lastUpdate, connectionStatus } = useRealtimeRideStream({ token });

  const loadPassengerData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch(`/api/track/${token}`);
      if (res.role !== 'passenger') {
        throw new Error('This tracking link is not configured for passenger access.');
      }
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Invalid passenger tracking link.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPassengerData();
  }, [token]);

  // Real-time automatic updates
  useEffect(() => {
    if (lastUpdate && data && lastUpdate.rideId === data.ride?.id) {
      loadPassengerData();
    }
  }, [lastUpdate]);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-800">
        <div className="w-10 h-10 border-3 border-slate-900 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-600">Connecting to Live Ride Stream...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Link Unavailable</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">{error}</p>
      </div>
    );
  }

  const { ride, completedStatuses, currentStatus, events } = data;
  const currentIndex = STATUS_SEQUENCE.indexOf(currentStatus);
  const isDone = currentStatus === 'done';

  const getStatusDescription = (status: RideStatus) => {
    switch (status) {
      case 'created':
        return 'Your ride reservation has been logged. Dispatch is preparing your driver assignment.';
      case 'getting_ready':
        return 'Your driver is inspecting the vehicle and getting ready for dispatch.';
      case 'on_the_way':
        return 'Your driver is actively en route to your designated pickup location.';
      case 'arrived':
        return 'Your driver has arrived at the pickup location and is awaiting your boarding.';
      case 'passenger_on_board':
        return 'Trip in progress. You are on board and cruising toward your destination.';
      case 'drop_off':
        return 'Arrived at your destination. Concluding final drop-off procedures.';
      case 'done':
        return 'Your trip has concluded. Thank you for riding with us!';
      default:
        return 'Live status tracking active.';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-12">
      
      {/* Brand Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3.5 sticky top-0 z-20 shadow-xs">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CompanyLogoIcon size={48} />
            <div>
              <span className="font-black text-slate-900 text-sm sm:text-base tracking-tight block leading-tight">
                {companyName}
              </span>
              <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider block">
                Passenger Live Monitor
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-[11px] font-medium text-slate-700">
            <span className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-ping'}`} />
            <span>{connectionStatus === 'connected' ? 'Live' : 'Reconnecting...'}</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-md mx-auto w-full p-4 space-y-4">
        
        {/* Welcome Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs text-center space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span className="font-bold uppercase tracking-wider">
              Reservation {ride.reservationId}
            </span>
            <span className="text-[10px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              Verified Tracking
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Hello, {ride.passengerName}
          </h1>
          <p className="text-xs text-slate-500">
            Track your ride progress in real time below.
          </p>

          {ride.driverName && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 text-xs text-slate-700 font-medium border border-slate-200">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>Assigned Driver: <strong>{ride.driverName}</strong></span>
            </div>
          )}
        </div>

        {/* Current Active Status Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-bold uppercase tracking-wider shadow-xs">
            {isDone ? <Check className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5 text-blue-400" />}
            <span>{isDone ? 'Ride Complete' : STATUS_LABELS[currentStatus as RideStatus] || currentStatus}</span>
          </div>

          <p className="text-sm font-medium text-slate-700 max-w-xs mx-auto leading-relaxed">
            {getStatusDescription(currentStatus as RideStatus)}
          </p>
        </div>

        {/* 6-Step Visual Progress Stepper with Timestamps */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Trip Progress
            </h3>
            <span className="text-[11px] text-slate-400">
              {isDone ? 'Completed' : `Stage ${Math.max(1, currentIndex + 1)} of 6`}
            </span>
          </div>

          <div className="space-y-4 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-100">
            {STATUS_SEQUENCE.map((statusKey, index) => {
              const isPast = currentIndex > index || (currentIndex === index && isDone);
              const isCurrent = currentStatus === statusKey && !isDone;
              
              const matchingEvent = (events || []).find((e: RideStatusEvent) => e.status === statusKey);
              const eventTime = matchingEvent?.startedAt ? formatStepTime(matchingEvent.startedAt) : null;

              return (
                <div key={statusKey} className="relative flex items-center justify-between pl-9 transition">
                  {/* Step Dot / Icon */}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center justify-center">
                    {isPast ? (
                      <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shadow-xs">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    ) : isCurrent ? (
                      <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-sm">
                        <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-slate-50 text-slate-300 border border-slate-200 flex items-center justify-center">
                        <Circle className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>

                  {/* Step Label & Timing */}
                  <div>
                    <span className={`text-sm block ${
                      isCurrent 
                        ? 'font-black text-slate-900' 
                        : isPast 
                        ? 'font-bold text-slate-800' 
                        : 'font-medium text-slate-400'
                    }`}>
                      {index + 1}. {STATUS_LABELS[statusKey]}
                    </span>
                    {eventTime && (
                      <span className="text-xs text-blue-600 font-mono font-medium block mt-0.5">
                        time {eventTime}
                      </span>
                    )}
                  </div>

                  {/* Status Indicator */}
                  <div>
                    {isPast ? (
                      <span className="text-[11px] font-bold text-emerald-700">
                        ✓ Complete
                      </span>
                    ) : isCurrent ? (
                      <span className="text-[11px] font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full">
                        ● Current
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-300">
                        Upcoming
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center pt-2">
          <p className="text-[11px] text-slate-400">
            This tracking page updates automatically when your driver updates their status.
          </p>
        </div>

        {/* Footer info */}
        <div className="text-center pt-2">
          <p className="text-[11px] text-slate-400">
            This tracking page updates automatically when your driver updates their status.
          </p>
        </div>

      </main>
    </div>
  );
}
