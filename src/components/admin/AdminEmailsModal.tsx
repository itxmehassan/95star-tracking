import React, { useState, useEffect } from 'react';
import { 
  X, Mail, Plus, Trash2, Shield, Check, AlertCircle, 
  Send, Eye, Sparkles, CheckCircle2, RefreshCw
} from 'lucide-react';
import { apiFetch } from '../../lib/api';

interface AdminEmailsModalProps {
  onClose: () => void;
}

export default function AdminEmailsModal({ onClose }: AdminEmailsModalProps) {
  const [activeTab, setActiveTab] = useState<'recipients' | 'test'>('recipients');
  
  // Recipients Tab State
  const [adminEmails, setAdminEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Test Email Tab State
  const [testTargetEmail, setTestTargetEmail] = useState('');
  const [testTemplate, setTestTemplate] = useState<'admin' | 'driver' | 'passenger'>('admin');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    mode: string;
    templateType: string;
    previewHtml?: string;
  } | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [emailServiceStatus, setEmailServiceStatus] = useState<{ isConfigured: boolean; fromEmail: string; mode: string } | null>(null);

  useEffect(() => {
    fetchAdminEmails();
    fetchEmailStatus();
  }, []);

  const fetchAdminEmails = async () => {
    try {
      setLoading(true);
      const res = await apiFetch<{ adminEmails: string[] }>('/api/admin/emails');
      if (res && Array.isArray(res.adminEmails)) {
        setAdminEmails(res.adminEmails);
        if (res.adminEmails.length > 0 && !testTargetEmail) {
          setTestTargetEmail(res.adminEmails[0]);
        }
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load admin emails' });
    } finally {
      setLoading(false);
    }
  };

  const fetchEmailStatus = async () => {
    try {
      const status = await apiFetch<{ isConfigured: boolean; fromEmail: string; mode: string }>('/api/admin/emails/status');
      if (status) {
        setEmailServiceStatus(status);
      }
    } catch (e) {
      // ignore
    }
  };

  const handleAddEmail = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newEmail.trim().toLowerCase();
    if (!clean) return;

    if (!clean.includes('@') || !clean.includes('.')) {
      setFeedback({ type: 'error', message: 'Please enter a valid email address.' });
      return;
    }

    if (adminEmails.some(e => e.toLowerCase() === clean)) {
      setFeedback({ type: 'error', message: 'This email is already in the recipient list.' });
      return;
    }

    setAdminEmails(prev => [...prev, clean]);
    setNewEmail('');
    setFeedback(null);
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setAdminEmails(prev => prev.filter(e => e.toLowerCase() !== emailToRemove.toLowerCase()));
    setFeedback(null);
  };

  const handleSaveAll = async () => {
    if (adminEmails.length === 0) {
      setFeedback({ type: 'error', message: 'At least one admin email recipient is required.' });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const res = await apiFetch<{ success: boolean; adminEmails: string[] }>('/api/admin/emails', {
        method: 'POST',
        body: JSON.stringify({ adminEmails })
      });

      if (res.success) {
        setAdminEmails(res.adminEmails);
        setFeedback({ type: 'success', message: 'Admin email recipients saved successfully.' });
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save admin emails' });
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    const target = testTargetEmail.trim().toLowerCase();
    if (!target || !target.includes('@')) {
      setTestResult({
        success: false,
        message: 'Please enter or select a valid recipient email address.',
        mode: 'error',
        templateType: testTemplate
      });
      return;
    }

    setIsSendingTest(true);
    setTestResult(null);

    try {
      const result = await apiFetch<{
        success: boolean;
        message: string;
        templateType: string;
        targetEmail: string;
        mode: string;
        previewHtml: string;
        error?: string;
      }>('/api/admin/emails/test', {
        method: 'POST',
        body: JSON.stringify({
          targetEmail: target,
          templateType: testTemplate
        })
      });

      setTestResult(result);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Failed to trigger test email dispatch.',
        mode: 'error',
        templateType: testTemplate
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Email Dispatch & Notifications</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage admin recipients and test live tracking emails.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 bg-slate-50/75 border-b border-slate-200 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('recipients')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'recipients'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Admin Recipients ({adminEmails.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('test')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'test'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Test Email Dispatch</span>
            {emailServiceStatus?.isConfigured ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500" title="Resend Live Active" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-500" title="Simulation Mode Active" />
            )}
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[65vh]">
          
          {/* TAB 1: RECIPIENTS */}
          {activeTab === 'recipients' && (
            <div className="space-y-5">
              {feedback && (
                <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  feedback.type === 'success' 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  {feedback.type === 'success' ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{feedback.message}</span>
                </div>
              )}

              {/* Info Box */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800">
                  Automatic Notification Rule:
                </p>
                <p>
                  Whenever a fleet driver is assigned to any ride, every admin address listed below automatically receives an email containing the <strong className="text-slate-900">Admin Realtime Tracking Link</strong>.
                </p>
              </div>

              {/* Add Email Form */}
              <form onSubmit={handleAddEmail} className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Add Admin Email Address
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="e.g. manager@95star.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddEmail()}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 shadow-xs transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Email</span>
                  </button>
                </div>
              </form>

              {/* Configured List */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Configured Recipients ({adminEmails.length})
                  </label>
                  {adminEmails.length === 0 && !loading && (
                    <span className="text-[11px] text-rose-500 font-semibold">At least 1 required</span>
                  )}
                </div>

                {loading ? (
                  <div className="py-8 flex justify-center">
                    <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : adminEmails.length === 0 ? (
                  <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl">
                    <Mail className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                    <p className="text-xs text-slate-500">No admin email recipients configured.</p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden bg-white shadow-2xs">
                    {adminEmails.map((email, index) => (
                      <div key={email} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center text-[11px] font-bold shrink-0">
                            {index + 1}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-slate-900 block truncate">
                              {email}
                            </span>
                            {index === 0 && (
                              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-medium inline-block mt-0.5">
                                Primary Admin
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setTestTargetEmail(email);
                              setActiveTab('test');
                            }}
                            className="text-[11px] text-blue-600 hover:text-blue-800 font-medium underline"
                            title="Send test email to this address"
                          >
                            Test Send
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveEmail(email)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title={`Remove ${email}`}
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
          )}

          {/* TAB 2: TEST EMAIL DISPATCH */}
          {activeTab === 'test' && (
            <div className="space-y-4">
              
              {/* Service Status Banner */}
              <div className={`p-4 rounded-xl border text-xs space-y-2 ${
                emailServiceStatus?.isConfigured 
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' 
                  : 'bg-amber-50/80 border-amber-200 text-amber-950'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${emailServiceStatus?.isConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                    <span className="font-bold text-xs">
                      {emailServiceStatus?.isConfigured 
                        ? 'Resend API Key Connected (Live In-Box Delivery Active)' 
                        : 'No RESEND_API_KEY Configured (Simulation & Preview Mode)'}
                    </span>
                  </div>

                  <button
                    onClick={fetchEmailStatus}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded transition cursor-pointer"
                    title="Refresh Service Status"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {emailServiceStatus?.isConfigured ? (
                  <div className="text-[11px] text-emerald-800 space-y-1">
                    <p>
                      <strong>Active Sender:</strong> <code className="bg-emerald-100/70 px-1 py-0.5 rounded font-mono text-[10px]">{emailServiceStatus.fromEmail}</code>
                    </p>
                    <p className="text-slate-600">
                      If an email is dispatched but does not appear in your Primary inbox, please check your <strong>Spam / Junk / Promotions</strong> folder.
                    </p>
                    {emailServiceStatus.fromEmail.includes('resend.dev') && (
                      <p className="text-amber-800 bg-amber-100/60 p-2 rounded-lg border border-amber-200">
                        <strong>Resend Sandbox Note:</strong> When using <code className="font-mono text-[10px]">onboarding@resend.dev</code>, Resend only allows sending to the email registered on your Resend account. To send to any passenger/driver domain, verify your own domain in Resend and set <code className="font-mono text-[10px]">RESEND_FROM_EMAIL</code>.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-[11px] text-amber-900 space-y-1.5 pt-1">
                    <p className="font-semibold text-amber-950">
                      Why are real emails not arriving?
                    </p>
                    <p className="leading-relaxed">
                      Without a <strong>RESEND_API_KEY</strong>, real emails cannot leave the server. The application prepares the emails and generates full HTML previews, but cannot push them to internet mailboxes (like Gmail/Outlook).
                    </p>
                    <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200/80 space-y-1 text-[11px]">
                      <div className="font-bold text-slate-900">How to enable real email delivery in 2 minutes:</div>
                      <ol className="list-decimal list-inside space-y-0.5 text-slate-700">
                        <li>Get a free API key from <a href="https://resend.com" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold">resend.com</a></li>
                        <li>Open <strong>AI Studio Settings → Secrets</strong> (or environment variables)</li>
                        <li>Add variable <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold text-slate-900">RESEND_API_KEY</code> with your key</li>
                        <li>(Optional) Set <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold text-slate-900">RESEND_FROM_EMAIL</code> with your custom domain sender</li>
                      </ol>
                    </div>
                  </div>
                )}
              </div>

              {/* Template Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Select Email Template to Test
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'admin', label: 'Admin Monitor', sub: 'Dispatched to Admins' },
                    { id: 'driver', label: 'Driver Dispatch', sub: 'Chauffeur Control Panel' },
                    { id: 'passenger', label: 'Passenger Tracker', sub: 'Live Arrival View' }
                  ].map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setTestTemplate(tpl.id as any)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        testTemplate === tpl.id
                          ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <span className="block text-xs font-bold">{tpl.label}</span>
                      <span className={`block text-[10px] mt-0.5 ${testTemplate === tpl.id ? 'text-slate-300' : 'text-slate-400'}`}>
                        {tpl.sub}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Recipient Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Test Recipient Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={testTargetEmail}
                    onChange={(e) => setTestTargetEmail(e.target.value)}
                    placeholder="Enter email to receive test message..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
                  />
                </div>

                {/* Quick select admin emails chips */}
                {adminEmails.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-400 font-semibold">Quick Select:</span>
                    {adminEmails.map(email => (
                      <button
                        key={email}
                        type="button"
                        onClick={() => setTestTargetEmail(email)}
                        className={`text-[10px] px-2 py-0.5 rounded-md border transition cursor-pointer ${
                          testTargetEmail === email 
                            ? 'bg-slate-900 text-white border-slate-900' 
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                        }`}
                      >
                        {email}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Send Button & Action Area */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={isSendingTest || !testTargetEmail.trim()}
                  className="flex-1 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSendingTest ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Sending Test Email...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Dispatch Test {testTemplate.toUpperCase()} Email</span>
                    </>
                  )}
                </button>
              </div>

              {/* Test Result Outcome */}
              {testResult && (
                <div className={`p-4 rounded-xl border space-y-2.5 animate-in fade-in zoom-in-95 duration-100 ${
                  testResult.success
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50/70 border-rose-200 text-rose-900'
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {testResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span className="text-xs font-bold">
                        {testResult.success ? 'Test Email Processed' : 'Test Email Failed'}
                      </span>
                    </div>

                    {testResult.previewHtml && (
                      <button
                        type="button"
                        onClick={() => setShowPreviewModal(true)}
                        className="text-[11px] font-bold text-slate-900 underline flex items-center gap-1 hover:text-slate-700"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview HTML Output</span>
                      </button>
                    )}
                  </div>

                  <p className="text-xs leading-relaxed">
                    {testResult.message}
                  </p>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Close
          </button>

          {activeTab === 'recipients' && (
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={saving || adminEmails.length === 0}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Recipients</span>
                </>
              )}
            </button>
          )}
        </div>

      </div>

      {/* HTML Email Interactive Preview Modal */}
      {showPreviewModal && testResult?.previewHtml && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold">
                  Email Preview: {testTemplate.toUpperCase()} Template
                </span>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 bg-slate-100 overflow-hidden">
              <iframe
                title="Email Preview"
                srcDoc={testResult.previewHtml}
                className="w-full h-full border-0"
              />
            </div>

            <div className="p-3 bg-white border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 shrink-0">
              <span>Rendered with live company branding & dynamic tokens.</span>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-3.5 py-1.5 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
