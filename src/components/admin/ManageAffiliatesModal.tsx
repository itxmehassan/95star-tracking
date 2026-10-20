import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, Building2, Phone, Mail, FileText, Trash2, Edit2, 
  Check, Plus, Search, ShieldCheck, Handshake, AlertTriangle, Loader2 
} from 'lucide-react';
import { Affiliate } from '../../types';
import { 
  fetchAffiliates, 
  createAffiliate as apiCreateAffiliate, 
  updateAffiliate as apiUpdateAffiliate, 
  deleteAffiliate as apiDeleteAffiliate 
} from '../../lib/api';
import { ClientStorage } from '../../lib/storage';

interface ManageAffiliatesModalProps {
  onClose: () => void;
  onAffiliatesUpdated?: () => void;
}

export default function ManageAffiliatesModal({ onClose, onAffiliatesUpdated }: ManageAffiliatesModalProps) {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAffiliateId, setEditingAffiliateId] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Delete Confirmation State (No window.confirm or alert for iFrame compatibility)
  const [affiliateToDelete, setAffiliateToDelete] = useState<Affiliate | null>(null);
  const [deleting, setDeleting] = useState(false);

  const contentAreaRef = useRef<HTMLDivElement>(null);

  const loadAffiliates = async () => {
    try {
      setLoading(true);
      const data = await fetchAffiliates();
      setAffiliates(data || []);
      ClientStorage.saveLocalAffiliates(data || []);
    } catch (err: any) {
      console.error('Failed to load affiliates from database:', err);
      const local = ClientStorage.getLocalAffiliates();
      if (local && local.length > 0) {
        setAffiliates(local);
      } else {
        setError(err.message || 'Failed to load affiliates');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAffiliates();
  }, []);

  const resetForm = () => {
    setName('');
    setCompany('');
    setPhone('');
    setEmail('');
    setNotes('');
    setEditingAffiliateId(null);
    setShowAddForm(false);
    setError(null);
  };

  const handleStartEdit = (affiliate: Affiliate) => {
    setEditingAffiliateId(affiliate.id);
    setName(affiliate.name);
    setCompany(affiliate.company || '');
    setPhone(affiliate.phone || '');
    setEmail(affiliate.email || '');
    setNotes(affiliate.notes || '');
    setShowAddForm(true);
    setError(null);
    setSuccessMessage(null);
    
    // Smooth scroll to form area
    if (contentAreaRef.current) {
      contentAreaRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSaveAffiliate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Affiliate name is required.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (editingAffiliateId) {
        const updated = await apiUpdateAffiliate(editingAffiliateId, {
          name: name.trim(),
          company: company.trim() || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          notes: notes.trim() || undefined
        });

        const updatedList = affiliates.map(a => (a.id === editingAffiliateId ? updated : a));
        setAffiliates(updatedList);
        ClientStorage.saveLocalAffiliates(updatedList);
        setSuccessMessage(`Affiliate "${updated.name}" updated successfully.`);
      } else {
        const created = await apiCreateAffiliate({
          name: name.trim(),
          company: company.trim() || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          notes: notes.trim() || undefined
        });

        const updatedList = [created, ...affiliates.filter(a => a.id !== created.id)];
        setAffiliates(updatedList);
        ClientStorage.saveLocalAffiliates(updatedList);
        setSuccessMessage(`Affiliate "${created.name}" created successfully.`);
      }

      await loadAffiliates();
      resetForm();
      if (onAffiliatesUpdated) onAffiliatesUpdated();
      
      // Clear success notification after 4 seconds
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to save affiliate to database.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!affiliateToDelete) return;

    setDeleting(true);
    setError(null);

    try {
      await apiDeleteAffiliate(affiliateToDelete.id);
      ClientStorage.removeLocalAffiliate(affiliateToDelete.id);
      const updatedList = affiliates.filter(a => a.id !== affiliateToDelete.id);
      setAffiliates(updatedList);
      ClientStorage.saveLocalAffiliates(updatedList);
      
      const deletedName = affiliateToDelete.name;
      setAffiliateToDelete(null);
      setSuccessMessage(`Affiliate "${deletedName}" removed from database.`);
      
      if (onAffiliatesUpdated) onAffiliatesUpdated();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete affiliate');
    } finally {
      setDeleting(false);
    }
  };

  const filteredAffiliates = useMemo(() => {
    if (!searchQuery.trim()) return affiliates;
    const q = searchQuery.toLowerCase().trim();
    return affiliates.filter(a =>
      a.name.toLowerCase().includes(q) ||
      (a.company && a.company.toLowerCase().includes(q)) ||
      (a.phone && a.phone.toLowerCase().includes(q)) ||
      (a.email && a.email.toLowerCase().includes(q)) ||
      (a.notes && a.notes.toLowerCase().includes(q))
    );
  }, [affiliates, searchQuery]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <Handshake className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Manage Affiliates & Partners</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Centralized registry of affiliate companies for ride assignments and scheduling.
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
                <Plus className="w-3.5 h-3.5" />
                <span>Add Affiliate</span>
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
        <div ref={contentAreaRef} className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Notifications */}
          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-in fade-in duration-100">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">{successMessage}</span>
              </div>
              <button 
                onClick={() => setSuccessMessage(null)}
                className="text-emerald-600 hover:text-emerald-900 cursor-pointer p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between animate-in fade-in duration-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
              <button 
                onClick={() => setError(null)}
                className="text-rose-600 hover:text-rose-900 cursor-pointer p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Delete Confirmation In-Modal Card (Safe, No window.confirm) */}
          {affiliateToDelete && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 animate-in fade-in duration-100 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-rose-950">
                    Delete Affiliate "{affiliateToDelete.name}"?
                  </h4>
                  <p className="text-[11px] text-rose-800 mt-0.5">
                    This will permanently remove this affiliate from your database. Any existing ride histories will retain the reservation details while unlinking this affiliate ID.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-rose-200/60">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setAffiliateToDelete(null)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleConfirmDelete}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-2xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Confirm Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Add / Edit Form Drawer */}
          {showAddForm && (
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Handshake className="w-4 h-4 text-slate-600" />
                  <span>{editingAffiliateId ? 'Edit Affiliate Profile' : 'Add New Affiliate Partner'}</span>
                </h4>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleSaveAffiliate} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Name (Required) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Affiliate / Partner Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Royal Chauffeur Network"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
                    />
                  </div>

                  {/* Company Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Company / Organization (Optional)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. Royal Global Limousine LLC"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Contact Phone (Optional)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="tel"
                        placeholder="+1 (800) 555-0199"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Dispatch Email (Optional)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="email"
                        placeholder="dispatch@affiliate.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Notes & Terms (Optional)
                  </label>
                  <div className="relative">
                    <div className="absolute top-2.5 left-3 text-slate-400 pointer-events-none">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <textarea
                      rows={2}
                      placeholder="e.g. VIP handling, 15% partner commission, private aviation procedures..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/50">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{editingAffiliateId ? 'Update Affiliate' : 'Save Affiliate'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search affiliates by name, company, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
            />
          </div>

          {/* Affiliates List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Registered Affiliates ({filteredAffiliates.length})
              </span>
              <span className="text-[11px] text-slate-400">
                Permanent Database Collection
              </span>
            </div>

            {loading ? (
              <div className="text-center py-10 text-xs text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                <span>Loading affiliates from database...</span>
              </div>
            ) : filteredAffiliates.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
                <Handshake className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">No affiliates found</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {searchQuery ? 'Try matching another name or company.' : 'Click "Add Affiliate" above to create your first partner.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5">
                {filteredAffiliates.map((aff) => (
                  <div
                    key={aff.id}
                    className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">{aff.name}</span>
                        {aff.company && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                            <Building2 className="w-2.5 h-2.5" />
                            {aff.company}
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-slate-400">ID: {aff.id}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                        {aff.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {aff.phone}
                          </span>
                        )}
                        {aff.email && (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {aff.email}
                          </span>
                        )}
                      </div>

                      {aff.notes && (
                        <p className="text-[11px] text-slate-600 line-clamp-1 italic">
                          "{aff.notes}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      <button
                        onClick={() => handleStartEdit(aff)}
                        className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer flex items-center gap-1"
                        title="Edit Affiliate"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => setAffiliateToDelete(aff)}
                        className="px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition cursor-pointer flex items-center gap-1"
                        title="Remove Affiliate"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Centralized Partner Database Synchronized</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold rounded-xl transition cursor-pointer shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
