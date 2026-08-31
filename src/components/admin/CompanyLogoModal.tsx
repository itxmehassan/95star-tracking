import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Upload, Image as ImageIcon, Trash2, CheckCircle2, 
  RotateCcw, Sparkles, Smartphone, FileText, AlertCircle, RefreshCw
} from 'lucide-react';
import { useBranding } from '../../lib/BrandingContext';
import { NinetyFiveStarShield, CompanyLogoIcon } from '../common/Logo';

interface CompanyLogoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CompanyLogoModal({ isOpen, onClose }: CompanyLogoModalProps) {
  const { 
    companyName, 
    tagline, 
    logoUrl, 
    isCustomLogo, 
    updateBranding, 
    resetLogo, 
    isLoading 
  } = useBranding();

  const [customName, setCustomName] = useState(companyName);
  const [customTagline, setCustomTagline] = useState(tagline);
  const [selectedImage, setSelectedImage] = useState<string | null>(logoUrl);
  const [previewTab, setPreviewTab] = useState<'navbar' | 'driver' | 'passenger' | 'pdf'>('navbar');
  const [dragActive, setDragActive] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCustomName(companyName);
      setCustomTagline(tagline);
      setSelectedImage(logoUrl);
      setSaveSuccess(false);
      setErrorMessage(null);
    }
  }, [isOpen, companyName, tagline, logoUrl]);

  if (!isOpen) return null;

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please upload a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) {
        setErrorMessage('Failed to read image file.');
        setIsProcessing(false);
        return;
      }

      // If image is larger than 1.5MB, optimize via canvas to ensure snappy transfer
      if (file.size > 1.5 * 1024 * 1024) {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 800;
          let width = img.width;
          let height = img.height;

          if (width > height && width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const optimized = canvas.toDataURL('image/png', 0.92);
            setSelectedImage(optimized);
          } else {
            setSelectedImage(result);
          }
          setIsProcessing(false);
        };
        img.onerror = () => {
          setSelectedImage(result);
          setIsProcessing(false);
        };
        img.src = result;
      } else {
        setSelectedImage(result);
        setIsProcessing(false);
      }
    };
    reader.onerror = () => {
      setErrorMessage('Error reading uploaded image.');
      setIsProcessing(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleSave = async () => {
    setErrorMessage(null);
    setSaveSuccess(false);

    const success = await updateBranding({
      companyName: customName.trim() || '95 Star Tracking',
      tagline: customTagline.trim() || 'Airport Sedan Service',
      logoUrl: selectedImage
    });

    if (success) {
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1200);
    } else {
      setErrorMessage('Failed to save company branding. Please try again.');
    }
  };

  const handleResetToDefault = async () => {
    if (window.confirm('Reset company logo to default 95 Star Interstate Shield?')) {
      setSelectedImage(null);
      const success = await resetLogo();
      if (success) {
        setSaveSuccess(true);
        setTimeout(() => {
          setSaveSuccess(false);
        }, 1200);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">
                Company Logo & Branding
              </h2>
              <p className="text-xs text-slate-500">
                Upload your company logo to use across Dashboard, Driver View, Passenger Monitor, and PDF Reports.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">

          {/* Success Banner */}
          {saveSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-800 text-xs font-semibold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Company logo updated successfully! Changes are live everywhere.</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-800 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Upload Dropzone */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Upload Logo Image
            </label>
            
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center ${
                dragActive
                  ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]'
                  : selectedImage
                  ? 'border-slate-300 bg-slate-50/40 hover:bg-slate-50 hover:border-slate-400'
                  : 'border-slate-300 hover:border-slate-400 bg-slate-50/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/jpg, image/svg+xml, image/webp"
                onChange={handleFileChange}
                className="hidden"
              />

              {selectedImage ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-24 h-24 p-2 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-center">
                    <img
                      src={selectedImage}
                      alt="Uploaded company logo preview"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 font-semibold text-xs rounded-full border border-indigo-200">
                      <Sparkles className="w-3.5 h-3.5" />
                      Custom Logo Ready
                    </span>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Click or drag a new image to replace
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2.5">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      Click to upload or drag & drop logo
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      PNG, JPG, SVG or WebP with transparent background recommended
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions below upload */}
            {selectedImage && (
              <div className="flex items-center justify-between mt-2.5 px-1">
                <span className="text-[11px] text-slate-500">
                  Logo will automatically scale crisply across all screens & PDF documents.
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImage(null);
                  }}
                  className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-semibold transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Custom Image</span>
                </button>
              </div>
            )}
          </div>

          {/* Brand Name & Tagline Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Company / Brand Name
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. 95 Star Tracking"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Tagline / Subtitle
              </label>
              <input
                type="text"
                value={customTagline}
                onChange={(e) => setCustomTagline(e.target.value)}
                placeholder="e.g. Airport Sedan Service"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Live Multi-View Previews */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Live Appearance Previews
              </label>

              {/* Preview View Selector */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setPreviewTab('navbar')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    previewTab === 'navbar' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('driver')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    previewTab === 'driver' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Driver View
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('passenger')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    previewTab === 'passenger' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Passenger
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('pdf')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    previewTab === 'pdf' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  PDF Report
                </button>
              </div>
            </div>

            {/* Preview Box */}
            <div className="border border-slate-200 rounded-2xl bg-slate-100/70 p-4">
              
              {/* Dashboard Navbar Preview */}
              {previewTab === 'navbar' && (
                <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    {selectedImage ? (
                      <div className="w-11 h-11 flex items-center justify-center overflow-hidden rounded-lg">
                        <img src={selectedImage} alt="Logo" className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <NinetyFiveStarShield size={44} />
                    )}
                    <div>
                      <span className="font-black text-slate-900 text-base tracking-tight block leading-tight">
                        {customName || '95 Star Tracking'}
                      </span>
                      <span className="text-[11px] text-slate-400 uppercase tracking-wider font-bold block">
                        Operations Console
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 rounded-lg text-slate-600">
                    Admin Navbar
                  </span>
                </div>
              )}

              {/* Driver View Preview */}
              {previewTab === 'driver' && (
                <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between max-w-md mx-auto">
                  <div className="flex items-center gap-3">
                    {selectedImage ? (
                      <div className="w-11 h-11 flex items-center justify-center overflow-hidden rounded-lg">
                        <img src={selectedImage} alt="Logo" className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <NinetyFiveStarShield size={44} />
                    )}
                    <div>
                      <span className="font-black text-slate-900 text-sm tracking-tight block leading-tight">
                        {customName || '95 Star Tracking'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">
                        Driver Portal • Res #10842
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                    Driver Mobile
                  </span>
                </div>
              )}

              {/* Passenger View Preview */}
              {previewTab === 'passenger' && (
                <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between max-w-md mx-auto">
                  <div className="flex items-center gap-3">
                    {selectedImage ? (
                      <div className="w-12 h-12 flex items-center justify-center overflow-hidden rounded-lg">
                        <img src={selectedImage} alt="Logo" className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <NinetyFiveStarShield size={46} />
                    )}
                    <div>
                      <span className="font-black text-slate-900 text-sm tracking-tight block leading-tight">
                        {customName || '95 Star Tracking'}
                      </span>
                      <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider block">
                        Passenger Live Monitor
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                    Passenger View
                  </span>
                </div>
              )}

              {/* PDF Preview */}
              {previewTab === 'pdf' && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-3.5">
                      {selectedImage ? (
                        <div className="w-12 h-12 flex items-center justify-center overflow-hidden rounded-lg">
                          <img src={selectedImage} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <NinetyFiveStarShield size={44} />
                      )}
                      <div>
                        <span className="font-black text-slate-900 text-lg tracking-tight block leading-tight">
                          {customName || '95 Star Tracking'}
                        </span>
                        <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold block mt-0.5">
                          {customTagline || 'Airport Sedan Service'} • Audit Report
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-800 block">Status: DONE</span>
                      <span className="text-[10px] text-slate-400 block">Authoritative Record</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 italic mt-2 text-center">
                    Official PDF documents will automatically stamp this logo at the top left of every generated report.
                  </p>
                </div>
              )}

            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={handleResetToDefault}
            disabled={!isCustomLogo && !selectedImage}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-slate-600 hover:text-slate-900 font-semibold text-xs rounded-xl hover:bg-slate-200/60 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Default Shield</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isLoading || isProcessing}
              className="inline-flex items-center gap-2 px-5 py-2 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-semibold text-xs rounded-xl shadow-sm disabled:opacity-50 transition"
            >
              {isLoading || isProcessing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Save & Apply Everywhere</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
