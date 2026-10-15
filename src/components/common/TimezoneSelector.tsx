import React, { useState, useEffect } from 'react';
import { Clock, Globe, Check, ChevronDown } from 'lucide-react';
import { useBranding } from '../../lib/BrandingContext';
import { US_TIME_ZONES, getTimeZoneAbbr } from '../../lib/timezone';

interface TimezoneSelectorProps {
  className?: string;
  variant?: 'compact' | 'full';
}

export default function TimezoneSelector({ className = '', variant = 'compact' }: TimezoneSelectorProps) {
  const { timeZone, setTimeZone } = useBranding();
  const [isOpen, setIsOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  const currentOption = US_TIME_ZONES.find(t => t.value === timeZone) || US_TIME_ZONES[0];
  const tzAbbr = getTimeZoneAbbr(new Date(), currentOption.value);

  // Live ticking clock in selected American timezone
  useEffect(() => {
    const updateClock = () => {
      try {
        const d = new Date();
        const timeStr = d.toLocaleTimeString('en-US', {
          timeZone: currentOption.value,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
        setCurrentTime(`${timeStr} ${tzAbbr}`);
      } catch {
        setCurrentTime('');
      }
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [currentOption.value, tzAbbr]);

  const handleSelect = async (tzValue: string) => {
    await setTimeZone(tzValue);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block text-left ${className}`}>
      {variant === 'compact' ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs hover:border-slate-300 transition cursor-pointer select-none"
          title={`Active American Timezone: ${currentOption.label}`}
        >
          <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="font-mono text-slate-900 font-bold">{currentOption.shortLabel}</span>
          <span className="text-[11px] text-slate-500 font-mono hidden md:inline">({currentTime.split(' ')[0]})</span>
          <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-left transition cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span>{currentOption.label}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold">
                  {tzAbbr}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                Current Time: <span className="font-semibold text-slate-700">{currentTime}</span>
              </div>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </button>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-1.5 w-64 rounded-2xl bg-white shadow-xl border border-slate-200/90 z-50 py-1.5 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3 py-2 bg-slate-50/70">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Select American Timezone
              </span>
              <span className="text-[11px] text-slate-600 block mt-0.5">
                Updates all rides, timestamps, PDFs and driver trackers.
              </span>
            </div>

            <div className="py-1 max-h-60 overflow-y-auto">
              {US_TIME_ZONES.map((option) => {
                const isSelected = option.value === currentOption.value;
                const optAbbr = getTimeZoneAbbr(new Date(), option.value);

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs transition cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/80 text-blue-900 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                        {optAbbr}
                      </span>
                      <span>{option.label}</span>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-blue-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="px-3 py-2 bg-slate-50/50 text-[10px] text-slate-400 flex items-center gap-1.5">
              <Globe className="w-3 h-3 text-slate-400 shrink-0" />
              <span>Default is Eastern Time (US/Canada)</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
