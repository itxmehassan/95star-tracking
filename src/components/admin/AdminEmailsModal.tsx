import React, { useState, useEffect } from 'react';
import { 
  X, Mail, Plus, Trash2, Shield, Check, AlertCircle, 
  Send, Eye, Sparkles, CheckCircle2, RefreshCw, Bell, User, Car, Handshake,
  CheckSquare, AlertTriangle, HelpCircle, Activity
} from 'lucide-react';
import { 
  apiFetch, 
  fetchEmailSettings, 
  updateEmailSettings, 
  fetchEmailLogs, 
  sendTestEmailMessage 
} from '../../lib/api';
import { EmailNotificationSettings, EmailLogEntry } from '../../types';
import { formatAmericanTime } from '../../lib/timezone';

interface AdminEmailsModalProps {
  onClose: () => void;
  defaultTab?: 'notifications' | 'recipients' | 'logs' | 'test';
}

export default function AdminEmailsModal({ onClose, defaultTab = 'notifications' }: AdminEmailsModalProps) {
  const [activeTab, setActiveTab] = useState<'notifications' | 'recipients' | 'logs' | 'test'>(defaultTab);
  
  // 1. Email Notifications Settings State
  const [settings, setSettings] = useState<EmailNotificationSettings>({
    admin: true,
    customer: true,
    driver: true,
    affiliate: true,
    updatedAt: new Date().toISOString()
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsFeedback, setSettingsFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 2. Recipients Tab State
  const [adminEmails, setAdminEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 3. Delivery Logs State
  const [logs, setLogs] = useState<EmailLogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logFilter, setLogFilter] = useState<'all' | 'sent' | 'failed' | 'skipped'>('all');

  // 4. Test Email Tab State
  const [testTargetEmail, setTestTargetEmail] = useState('');
  const [testTemplate, setTestTemplate] = useState<'admin' | 'customer' | 'driver' | 'affiliate'>('admin');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    mode: string;
    templateType: string;
    previewHtml?: string;
    messageId?: string;
  } | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [emailServiceStatus, setEmailServiceStatus] = useState<{ isConfigured: boolean; fromEmail: string; mode: string } | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const emailConfig = await fetchEmailSettings();
      if (emailConfig) {
        if (emailConfig.settings) {
          setSettings(emailConfig.settings);
        }
        if (Array.isArray(emailConfig.adminEmails)) {
          setAdminEmails(emailConfig.adminEmails);
          if (emailConfig.adminEmails.length > 0 && !testTargetEmail) {
            setTestTargetEmail(emailConfig.adminEmails[0]);
          }
        }
        if (emailConfig.serviceStatus) {
          setEmailServiceStatus(emailConfig.serviceStatus);
        }
      }
    } catch (err: any) {
      console.warn('Failed to load initial email settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetchEmailLogs(150);
      if (res && Array.isArray(res.logs)) {
        setLogs(res.logs);
      }
    } catch (err: any) {
      console.warn('Failed to load email logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'logs') {
      loadLogs();
    }
  }, [activeTab]);

  // Toggle Handlers
  const handleToggle = (key: keyof Pick<EmailNotificationSettings, 'admin' | 'customer' | 'driver' | 'affiliate'>) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    setSettingsFeedback(null);
    try {
      const res = await updateEmailSettings(settings);
      if (res && res.success) {
        setSettings(res.settings);
        setSettingsFeedback({
          type: 'success',
          message: 'EMAIL NOTIFICATIONS settings successfully saved and synced.'
        });
        setTimeout(() => setSettingsFeedback(null), 3500);
      }
    } catch (err: any) {
      setSettingsFeedback({
        type: 'error',
        message: err.message || 'Failed to save notification settings.'
      });
    } finally {
      setSavingSettings(false);
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

  const handleSaveRecipients = async () => {
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
      const result = await sendTestEmailMessage(target, testTemplate);
      setTestResult({
        success: result.success,
        message: result.message || (result.success ? 'Test email dispatched successfully.' : 'Test email failed.'),
        mode: (result as any).mode || 'live',
        templateType: testTemplate,
        previewHtml: (result as any).previewHtml,
        messageId: result.messageId
      });
      if (activeTab === 'logs') {
        loadLogs();
      }
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

  const filteredLogs = logs.filter(log => {
    if (logFilter === 'all') return true;
    return log.status === logFilter;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full my-auto overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 max-h-[92vh]">
        
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">EMAIL NOTIFICATIONS</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Resend transactional email integration for 95 Star Tracking
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 sm:px-6 pt-2 bg-slate-50 border-b border-slate-200 flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('notifications')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'notifications'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>

          <button
            onClick={() => setActiveTab('recipients')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'recipients'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Admin Recipients ({adminEmails.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'logs'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Delivery Logs ({logs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('test')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'test'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Test Email</span>
            {emailServiceStatus?.isConfigured ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500" title="Resend Live Configured" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-500" title="Simulation / Pending API Key" />
            )}
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          
          {/* TAB 1: EMAIL NOTIFICATIONS SETTINGS */}
          {activeTab === 'notifications' && (
            <div className="space-y-5">
              {settingsFeedback && (
                <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  settingsFeedback.type === 'success' 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  {settingsFeedback.type === 'success' ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{settingsFeedback.message}</span>
                </div>
              )}

              {/* Status Header */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                      Automatic Trigger Rules
                    </span>
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                      Persistent DB
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    When a ride is created or updated, emails are automatically sent to active categories.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${emailServiceStatus?.isConfigured ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span className="text-xs font-semibold text-slate-700">
                    {emailServiceStatus?.isConfigured ? 'Resend Live Active' : 'Resend Simulated'}
                  </span>
                </div>
              </div>

              {/* Four Independent Toggles */}
              <div className="space-y-3">
                
                {/* 1. Admin Email Notifications */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition flex items-center justify-between gap-4 shadow-2xs">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          1. Admin Email Notifications
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          settings.admin 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {settings.admin ? 'ENABLED' : 'DISABLED'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        Sends reservation summary with private <strong>Admin Management & Tracking Link</strong> to all configured admin recipients.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggle('admin')}
                    role="switch"
                    aria-checked={settings.admin}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      settings.admin ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        settings.admin ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* 2. Customer Email Notifications */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition flex items-center justify-between gap-4 shadow-2xs">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          2. Customer Email Notifications
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          settings.customer 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {settings.customer ? 'ENABLED' : 'DISABLED'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        Sends confirmation and the customer's private <strong>Live Chauffeur Tracking Link</strong> to the passenger's email.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggle('customer')}
                    role="switch"
                    aria-checked={settings.customer}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      settings.customer ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        settings.customer ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* 3. Driver Email Notifications */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition flex items-center justify-between gap-4 shadow-2xs">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-100">
                      <Car className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          3. Driver Email Notifications
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          settings.driver 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {settings.driver ? 'ENABLED' : 'DISABLED'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        Sends dispatch assignment and the chauffeur's private <strong>Driver Control Panel Link</strong> to the assigned driver.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggle('driver')}
                    role="switch"
                    aria-checked={settings.driver}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      settings.driver ? 'bg-amber-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        settings.driver ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* 4. Affiliate Email Notifications */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition flex items-center justify-between gap-4 shadow-2xs">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 border border-purple-100">
                      <Handshake className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          4. Affiliate Email Notifications
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          settings.affiliate 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {settings.affiliate ? 'ENABLED' : 'DISABLED'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        Sends client booking notice and partner tracking link to the assigned affiliate partner (if an affiliate with email is assigned).
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggle('affiliate')}
                    role="switch"
                    aria-checked={settings.affiliate}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      settings.affiliate ? 'bg-purple-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        settings.affiliate ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <span className="text-[11px] text-slate-400">
                  Settings persist automatically across refreshes, redeployments, and devices.
                </span>
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {savingSettings ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Notification Settings</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: RECIPIENTS */}
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
                  Admin Notification Recipients:
                </p>
                <p>
                  Every address listed below will receive the private <strong>Admin Realtime Tracking & Management Link</strong> whenever a ride is created or updated (when Admin toggle is ON).
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
                      placeholder="e.g. dispatch@95star.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddEmail()}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 shadow-xs transition cursor-pointer"
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
                            className="text-[11px] text-blue-600 hover:text-blue-800 font-medium underline cursor-pointer"
                            title="Send test email to this address"
                          >
                            Test Send
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveEmail(email)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
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

              {/* Save Recipients Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveRecipients}
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
              </div>
            </div>
          )}

          {/* TAB 3: DELIVERY LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Recent Dispatches
                  </span>
                  <span className="text-[11px] text-slate-500">
                    ({filteredLogs.length} entries)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px] font-medium">
                    {(['all', 'sent', 'failed', 'skipped'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setLogFilter(f)}
                        className={`px-2.5 py-1 rounded-md transition capitalize cursor-pointer ${
                          logFilter === f ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={loadLogs}
                    disabled={loadingLogs}
                    className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                    title="Refresh logs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {loadingLogs ? (
                <div className="py-12 flex justify-center">
                  <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <Mail className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">No email logs found</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Transactional emails sent by the system will be tracked here with Resend message IDs.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
                  {filteredLogs.map(log => (
                    <div key={log.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50/70 transition">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            log.status === 'sent' 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                              : log.status === 'failed' 
                              ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            {log.status}
                          </span>
                          
                          <span className="text-[11px] font-bold text-slate-900 capitalize px-2 py-0.5 bg-slate-100 rounded">
                            {log.recipientType}
                          </span>

                          <span className="text-[11px] font-mono text-slate-500">
                            #{log.reservationId}
                          </span>
                        </div>

                        <div className="text-xs text-slate-700 font-medium truncate">
                          {log.recipientEmail}
                        </div>

                        {log.messageId && (
                          <div className="text-[10px] font-mono text-emerald-700">
                            Resend ID: {log.messageId}
                          </div>
                        )}

                        {log.error && (
                          <div className="text-[11px] text-rose-600 bg-rose-50/80 p-1.5 rounded border border-rose-100">
                            {log.error}
                          </div>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-400 whitespace-nowrap self-end sm:self-auto">
                        {formatAmericanTime(log.timestamp, { includeTzAbbr: true })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: TEST EMAIL DISPATCH */}
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
                    onClick={loadAllData}
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
                      Emails are dispatched directly through Resend's REST API. Check your <strong>Spam / Junk</strong> folder if not seen in Primary.
                    </p>
                    {emailServiceStatus.fromEmail.includes('resend.dev') && (
                      <p className="text-amber-800 bg-amber-100/60 p-2 rounded-lg border border-amber-200">
                        <strong>Sandbox Domain Notice:</strong> Using <code className="font-mono text-[10px]">onboarding@resend.dev</code> allows sending directly to your registered Resend email address. To send to arbitrary customer/driver emails in production, set <code className="font-mono text-[10px]">EMAIL_FROM</code> with your verified domain.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-[11px] text-amber-900 space-y-1.5 pt-1">
                    <p className="font-semibold text-amber-950">
                      Configure Resend for Production Delivery:
                    </p>
                    <p className="leading-relaxed">
                      Set environment variables in Render: <code className="font-mono font-bold">RESEND_API_KEY</code>, <code className="font-mono font-bold">EMAIL_FROM</code>, and <code className="font-mono font-bold">ADMIN_EMAIL</code>.
                    </p>
                  </div>
                )}
              </div>

              {/* Template Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Select Email Template to Test
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'admin', label: 'Admin Monitor', sub: 'Private Admin Token' },
                    { id: 'customer', label: 'Customer Live', sub: 'Passenger Tracker' },
                    { id: 'driver', label: 'Driver Dispatch', sub: 'Chauffeur Control' },
                    { id: 'affiliate', label: 'Affiliate Portal', sub: 'Partner Live View' }
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
                      <span>Sending Test Email via Resend...</span>
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
                        {testResult.success ? 'Test Email Dispatched' : 'Test Email Failed'}
                      </span>
                    </div>

                    {testResult.previewHtml && (
                      <button
                        type="button"
                        onClick={() => setShowPreviewModal(true)}
                        className="text-[11px] font-bold text-slate-900 underline flex items-center gap-1 hover:text-slate-700 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview HTML Output</span>
                      </button>
                    )}
                  </div>

                  <p className="text-xs leading-relaxed">
                    {testResult.message}
                  </p>

                  {testResult.messageId && (
                    <p className="text-[10px] font-mono text-emerald-800">
                      Resend ID: {testResult.messageId}
                    </p>
                  )}
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

          <span className="text-[11px] text-slate-400">
            95 Star Tracking Email Service • Powered by Resend
          </span>
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
              <span>95 Star Tracking live template preview with recipient-specific token URLs.</span>
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
