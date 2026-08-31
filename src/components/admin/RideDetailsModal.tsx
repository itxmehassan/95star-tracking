import React, { useState } from 'react';
import { 
  X, Download, RefreshCw, Smartphone, Users, Shield, 
  Clock, CheckCircle2, Circle, Copy, Check, ExternalLink, Calendar, User, UserPlus, Car, Phone, Mail, Plus, Send, MessageSquare, Trash2
} from 'lucide-react';
import { Ride, STATUS_LABELS, STATUS_SEQUENCE, RideStatus } from '../../types';
import { formatDateTime, formatDuration, downloadSingleRidePdf, getTimeRemaining } from '../../lib/pdf';
import { apiFetch } from '../../lib/api';
import ConfirmDeleteModal from './ConfirmDeleteModal';

interface RideDetailsModalProps {
  ride: Ride;
  onClose: () => void;
  onRideUpdated: () => void;
  onOpenAssignDriver?: (ride: Ride) => void;
  onDeleteRide?: (ride: Ride) => Promise<boolean | void> | void;
}

export default function RideDetailsModal({ ride, onClose, onRideUpdated, onOpenAssignDriver, onDeleteRide }: RideDetailsModalProps) {
  const [currentRide, setCurrentRide] = useState<Ride>(ride);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [newExtraEmail, setNewExtraEmail] = useState('');
  const [savingEmails, setSavingEmails] = useState(false);
  const [sendingEmails, setSendingEmails] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const origin = window.location.origin;
  const driverUrl = `${origin}/driver/${currentRide.tokens.driverToken}`;
  const passengerUrl = `${origin}/passenger/${currentRide.tokens.passengerToken}`;
  const adminUrl = `${origin}/track/${currentRide.tokens.adminToken}`;

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleAddExtraEmail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newExtraEmail.trim().toLowerCase();
    if (!clean) return;

    if (!clean.includes('@') || !clean.includes('.')) {
      setFeedback('Please enter a valid email address.');
      return;
    }

    const currentList = currentRide.additionalPassengerEmails || [];
    if (currentList.some(em => em.toLowerCase() === clean) || currentRide.passengerEmail.toLowerCase() === clean) {
      setFeedback('This email address is already added.');
      return;
    }

    const updatedList = [...currentList, clean];
    await saveAdditionalEmails(updatedList);
    setNewExtraEmail('');
  };

  const handleRemoveExtraEmail = async (emailToRemove: string) => {
    const currentList = currentRide.additionalPassengerEmails || [];
    const updatedList = currentList.filter(em => em.toLowerCase() !== emailToRemove.toLowerCase());
    await saveAdditionalEmails(updatedList);
  };

  const saveAdditionalEmails = async (emails: string[]) => {
    setSavingEmails(true);
    try {
      const res = await apiFetch<{ success: boolean; ride: Ride }>(`/api/rides/${currentRide.id}/passenger-emails`, {
        method: 'PUT',
        body: JSON.stringify({ additionalPassengerEmails: emails })
      });

      if (res.success && res.ride) {
        setCurrentRide(res.ride);
        setFeedback('Passenger email recipients updated.');
        onRideUpdated();
      }
    } catch (err: any) {
      setFeedback(err.message || 'Failed to update additional emails');
    } finally {
      setSavingEmails(false);
    }
  };

  const handleSendEmailsManually = async () => {
    setSendingEmails(true);
    setFeedback(null);
    try {
      const res = await apiFetch<{ success: boolean; ride: Ride; emailResult: any }>(`/api/rides/${currentRide.id}/send-emails`, {
        method: 'POST'
      });

      if (res.success && res.ride) {
        setCurrentRide(res.ride);
        const attempted = res.emailResult?.attempted || 0;
        const sent = res.emailResult?.sent || 0;
        setFeedback(`Tracking links dispatched to ${sent} of ${attempted} recipient(s).`);
        onRideUpdated();
      }
    } catch (err: any) {
      setFeedback(err.message || 'Failed to send tracking emails');
    } finally {
      setSendingEmails(false);
    }
  };

  const handleRegenerateToken = async (type: 'driver' | 'passenger' | 'admin' | 'all') => {
    setRegenerating(type);
    setFeedback(null);
    try {
      const res = await apiFetch<{ success: boolean; tokens: any }>(`/api/rides/${currentRide.id}/regenerate-token`, {
        method: 'POST',
        body: JSON.stringify({ type })
      });

      if (res.success && res.tokens) {
        setCurrentRide({
          ...currentRide,
          tokens: res.tokens
        });
        setFeedback(`Successfully regenerated ${type.toUpperCase()} link.`);
        onRideUpdated();
      }
    } catch (err: any) {
      setFeedback(err.message || 'Failed to regenerate link');
    } finally {
      setRegenerating(null);
    }
  };

  const statusLabel = STATUS_LABELS[currentRide.currentStatus] || currentRide.currentStatus;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full my-auto overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 shrink-0 bg-white">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                {currentRide.reservationId}
              </span>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                currentRide.currentStatus === 'done'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : currentRide.currentStatus === 'created'
                  ? 'bg-slate-100 text-slate-700 border-slate-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}>
                {statusLabel}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
              Ride Details & Timestamp Audit
            </h3>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadSingleRidePdf(currentRide)}
              className="px-2.5 sm:px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1">
          
          {feedback && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs flex items-center justify-between">
              <span>{feedback}</span>
              <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Passenger & Metadata Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">Passenger Name</span>
              <span className="text-sm font-bold text-slate-900 block mt-0.5">{currentRide.passengerName}</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">Passenger Email</span>
              <span className="text-sm text-slate-700 block mt-0.5 font-mono">{currentRide.passengerEmail}</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">Created At</span>
              <span className="text-xs text-slate-700 block mt-0.5">{formatDateTime(currentRide.createdAt)}</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">Completed At</span>
              <span className="text-xs text-slate-700 block mt-0.5">
                {currentRide.completedAt ? formatDateTime(currentRide.completedAt) : 'In Progress'}
              </span>
            </div>
          </div>

          {/* Driver Assignment Card */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">Assigned Fleet Driver</span>
              {currentRide.driverName ? (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-slate-600" />
                    {currentRide.driverName}
                  </span>
                  {currentRide.driverPhone && (
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {currentRide.driverPhone}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-xs text-slate-400 italic block">No driver currently assigned</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {currentRide.driverId && (
                <button
                  type="button"
                  onClick={handleSendEmailsManually}
                  disabled={sendingEmails}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs disabled:opacity-50"
                  title="Resend Tracking Links to Driver, Passenger, and Admin recipients"
                >
                  <Send className={`w-3.5 h-3.5 ${sendingEmails ? 'animate-pulse' : ''}`} />
                  <span>{sendingEmails ? 'Sending...' : 'Dispatch Emails'}</span>
                </button>
              )}

              {onOpenAssignDriver && (
                <button
                  onClick={() => onOpenAssignDriver(currentRide)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{currentRide.driverName ? 'Change Driver' : 'Assign Driver'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Additional Passenger Emails Section */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-slate-500" />
                  <span>Additional Passenger Emails</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  These optional recipients receive the Passenger Tracking Link for this ride.
                </p>
              </div>
              <span className="text-[11px] font-medium text-slate-500">
                {(currentRide.additionalPassengerEmails || []).length} added
              </span>
            </div>

            {/* List of Additional Emails */}
            {(currentRide.additionalPassengerEmails || []).length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {currentRide.additionalPassengerEmails?.map((extraEmail) => (
                  <div
                    key={extraEmail}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 shadow-2xs"
                  >
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span>{extraEmail}</span>
                    <button
                      type="button"
                      disabled={savingEmails}
                      onClick={() => handleRemoveExtraEmail(extraEmail)}
                      className="p-0.5 text-slate-400 hover:text-rose-600 rounded transition ml-0.5"
                      title={`Remove ${extraEmail}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Additional Email Form */}
            <form onSubmit={handleAddExtraEmail} className="flex gap-2 pt-1">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <input
                  type="email"
                  value={newExtraEmail}
                  onChange={(e) => setNewExtraEmail(e.target.value)}
                  placeholder="Add another passenger / assistant email..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                />
              </div>
              <button
                type="button"
                onClick={() => handleAddExtraEmail()}
                disabled={savingEmails || !newExtraEmail.trim()}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1 shrink-0 transition disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Email</span>
              </button>
            </form>

            {/* Email Dispatch History Banner */}
            {currentRide.lastEmailDispatchedAt && (
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tracking links last dispatched on {formatDateTime(currentRide.lastEmailDispatchedAt)}</span>
                </span>
              </div>
            )}
          </div>

          {/* Status Timeline & Exact Timestamps */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-500" />
                <span>Status Timeline & Durations</span>
              </h4>
              <span className="text-[11px] text-slate-400">Server-Authoritative Timestamps</span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="divide-y divide-slate-100">
                {STATUS_SEQUENCE.map((statusKey, index) => {
                  const event = currentRide.events.find(e => e.status === statusKey);
                  const isCurrent = currentRide.currentStatus === statusKey;
                  const isPast = event !== undefined;
                  const isPending = !event && !isCurrent;

                  return (
                    <div 
                      key={statusKey}
                      className={`p-3.5 transition ${
                        isCurrent 
                          ? 'bg-blue-50/40 font-medium' 
                          : isPast 
                          ? 'bg-white' 
                          : 'bg-slate-50/40 opacity-55'
                      }`}
                    >
                      <div className="flex items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="shrink-0 mt-0.5 sm:mt-0">
                            {event ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : isCurrent ? (
                              <div className="w-4 h-4 rounded-full border-2 border-blue-600 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                              </div>
                            ) : (
                              <Circle className="w-4 h-4 text-slate-300" />
                            )}
                          </div>

                          <div>
                            <span className="text-xs font-bold text-slate-900 block">
                              {index + 1}. {STATUS_LABELS[statusKey]}
                            </span>
                            <span className="text-[11px] text-slate-500 block sm:hidden mt-0.5">
                              {event ? `Start: ${formatDateTime(event.startedAt)}` : 'Pending'}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {event ? (
                            <div className="space-y-0.5">
                              <div className="text-xs font-mono text-slate-800">
                                {formatDateTime(event.startedAt)}
                              </div>
                              {event.endedAt && event.durationSeconds !== undefined && event.status !== 'done' && (
                                <div className="text-[11px] text-slate-500 font-semibold">
                                  Duration: {formatDuration(event.durationSeconds)}
                                </div>
                              )}
                            </div>
                          ) : isCurrent ? (
                            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                              Active Now
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">
                              —
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Driver Note Display */}
                      {event?.comment && (
                        <div className="mt-2 ml-7 p-2 rounded-lg bg-amber-50/90 border border-amber-200/80 text-xs text-amber-950 flex items-start gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-[11px] text-amber-900 flex items-center gap-1">
                              <span>Driver Note</span>
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

          {/* Tracking Links & Security */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Tracking Links & Security
                </h4>
                <p className="text-[11px] text-emerald-700 font-medium">
                  Permanent Active Links • Secure Token Mappings
                </p>
              </div>
              <button
                onClick={() => handleRegenerateToken('all')}
                disabled={regenerating === 'all'}
                className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition self-start sm:self-auto bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg"
              >
                <RefreshCw className={`w-3 h-3 ${regenerating === 'all' ? 'animate-spin' : ''}`} />
                <span>Regenerate All Links</span>
              </button>
            </div>

            <div className="space-y-3">
              {/* Driver Link */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center">
                    <Smartphone className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Driver Link</span>
                    <span className="text-[10px] text-slate-400 font-mono truncate max-w-xs block">/driver/{currentRide.tokens.driverToken}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    onClick={() => copyToClipboard(driverUrl, 'driver')}
                    className="px-2.5 py-1 text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 font-medium flex items-center gap-1 transition"
                  >
                    {copiedType === 'driver' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedType === 'driver' ? 'Copied' : 'Copy'}</span>
                  </button>
                  <a
                    href={driverUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
                    title="Open in new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => handleRegenerateToken('driver')}
                    disabled={regenerating === 'driver'}
                    className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                    title="Regenerate Driver Link"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${regenerating === 'driver' ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Passenger Link */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-700 flex items-center justify-center">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Passenger Link</span>
                    <span className="text-[10px] text-slate-400 font-mono truncate max-w-xs block">/passenger/{currentRide.tokens.passengerToken}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    onClick={() => copyToClipboard(passengerUrl, 'passenger')}
                    className="px-2.5 py-1 text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 font-medium flex items-center gap-1 transition"
                  >
                    {copiedType === 'passenger' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedType === 'passenger' ? 'Copied' : 'Copy'}</span>
                  </button>
                  <a
                    href={passengerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
                    title="Open in new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => handleRegenerateToken('passenger')}
                    disabled={regenerating === 'passenger'}
                    className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                    title="Regenerate Passenger Link"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${regenerating === 'passenger' ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Admin Link */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Shield className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Admin Tracking Link</span>
                    <span className="text-[10px] text-slate-400 font-mono truncate max-w-xs block">/track/{currentRide.tokens.adminToken}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    onClick={() => copyToClipboard(adminUrl, 'admin')}
                    className="px-2.5 py-1 text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 font-medium flex items-center gap-1 transition"
                  >
                    {copiedType === 'admin' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedType === 'admin' ? 'Copied' : 'Copy'}</span>
                  </button>
                  <a
                    href={adminUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
                    title="Open in new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => handleRegenerateToken('admin')}
                    disabled={regenerating === 'admin'}
                    className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                    title="Regenerate Admin Link"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${regenerating === 'admin' ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Close
            </button>

            {onDeleteRide && (
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="px-3.5 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Ride</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => downloadSingleRidePdf(currentRide)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Ride PDF</span>
          </button>
        </div>

      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && onDeleteRide && (
        <ConfirmDeleteModal
          ride={currentRide}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={async () => {
            await onDeleteRide(currentRide);
            setShowDeleteModal(false);
            onClose();
            onRideUpdated();
          }}
        />
      )}

    </div>
  );
}
