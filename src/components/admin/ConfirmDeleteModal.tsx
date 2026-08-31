import React, { useState } from 'react';
import { Trash2, X, AlertTriangle, Loader2 } from 'lucide-react';
import { Ride } from '../../types';

interface ConfirmDeleteModalProps {
  ride?: Ride | null;
  ridesCount?: number;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}

export default function ConfirmDeleteModal({
  ride,
  ridesCount,
  onConfirm,
  onClose
}: ConfirmDeleteModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isBulk = Boolean(ridesCount && ridesCount > 1);

  const handleConfirm = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete ride. Please try again.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
        
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
              <Trash2 className="w-6 h-6" />
            </div>
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-4">
            <h3 className="text-lg font-bold text-slate-900">
              {isBulk ? `Delete ${ridesCount} Selected Reservations?` : 'Delete Reservation?'}
            </h3>
            
            <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
              {isBulk ? (
                <>
                  Are you sure you want to permanently delete these <strong className="text-slate-900">{ridesCount} reservations</strong>?
                </>
              ) : ride ? (
                <>
                  Are you sure you want to permanently delete reservation <strong className="font-mono text-slate-900">{ride.reservationId}</strong> for <strong className="text-slate-900">{ride.passengerName}</strong>?
                </>
              ) : (
                'Are you sure you want to permanently delete this reservation?'
              )}
            </p>

            <div className="mt-3 p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-start gap-2 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                This action cannot be undone. All associated tracking links (Driver, Passenger, and Admin) will be immediately revoked.
              </span>
            </div>

            {error && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-xs"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isBulk ? `Delete ${ridesCount} Rides` : 'Delete Ride'}</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
