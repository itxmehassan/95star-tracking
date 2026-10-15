/**
 * American Time Zones & Date-Time Formatting Utilities
 *
 * Configured by default to America/New_York (US Eastern Time),
 * with built-in support for all primary American time zones:
 * - Eastern (ET / EDT) - America/New_York (Default)
 * - Central (CT / CDT) - America/Chicago
 * - Mountain (MT / MDT) - America/Denver
 * - Pacific (PT / PDT) - America/Los_Angeles
 * - Arizona (MST - No DST) - America/Phoenix
 * - Alaska (AKDT) - America/Anchorage
 * - Hawaii (HST) - Pacific/Honolulu
 */

export interface TimeZoneOption {
  value: string;
  label: string;
  shortLabel: string;
}

export const US_TIME_ZONES: TimeZoneOption[] = [
  { value: 'America/New_York', label: 'Eastern Time (ET)', shortLabel: 'ET' },
  { value: 'America/Chicago', label: 'Central Time (CT)', shortLabel: 'CT' },
  { value: 'America/Denver', label: 'Mountain Time (MT)', shortLabel: 'MT' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)', shortLabel: 'PT' },
  { value: 'America/Phoenix', label: 'Arizona (MST)', shortLabel: 'AZ' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)', shortLabel: 'AKT' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)', shortLabel: 'HT' },
];

export const DEFAULT_TIMEZONE = 'America/New_York';
const STORAGE_TZ_KEY = 'ride_tracking_american_timezone';

let memoryTimeZone = DEFAULT_TIMEZONE;

/**
 * Returns the currently active American timezone (from localStorage, cached branding, or default Eastern Time)
 */
export function getActiveTimeZone(): string {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_TZ_KEY);
      if (stored && US_TIME_ZONES.some(tz => tz.value === stored)) {
        return stored;
      }
      const brandingCache = localStorage.getItem('company_branding_cache');
      if (brandingCache) {
        const parsed = JSON.parse(brandingCache);
        if (parsed.timeZone && US_TIME_ZONES.some(tz => tz.value === parsed.timeZone)) {
          return parsed.timeZone;
        }
      }
    } catch {}
  }
  return memoryTimeZone || DEFAULT_TIMEZONE;
}

/**
 * Update the active American timezone and notify components
 */
export function setActiveTimeZone(timeZone: string) {
  if (!US_TIME_ZONES.some(tz => tz.value === timeZone)) {
    timeZone = DEFAULT_TIMEZONE;
  }
  memoryTimeZone = timeZone;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_TZ_KEY, timeZone);
      window.dispatchEvent(new CustomEvent('app_timezone_changed', { detail: { timeZone } }));
    } catch {}
  }
}

/**
 * Get current timezone abbreviation (e.g. "EDT", "EST", "CDT", "PDT")
 */
export function getTimeZoneAbbr(date: Date = new Date(), timeZone: string = getActiveTimeZone()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'short'
    }).formatToParts(date);
    return parts.find(p => p.type === 'timeZoneName')?.value || '';
  } catch {
    return 'ET';
  }
}

/**
 * Format timestamp into standard American 12-hour clock time (e.g. "08:36 AM EDT" or "8:36 AM")
 */
export function formatAmericanTime(
  isoString?: string, 
  options: { includeTzAbbr?: boolean; timeZone?: string } = {}
): string {
  if (!isoString) return '';
  const targetTz = options.timeZone || getActiveTimeZone();
  const includeAbbr = options.includeTzAbbr ?? true;

  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';

    const timeStr = d.toLocaleTimeString('en-US', {
      timeZone: targetTz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    if (includeAbbr) {
      const abbr = getTimeZoneAbbr(d, targetTz);
      return abbr ? `${timeStr} ${abbr}` : timeStr;
    }
    return timeStr;
  } catch {
    return '';
  }
}

/**
 * Format full date & time according to American conventions (e.g. "Aug 31, 2026, 08:36:35 AM EDT")
 */
export function formatAmericanDateTime(
  isoString?: string,
  options: { includeSeconds?: boolean; timeZone?: string } = {}
): string {
  if (!isoString) return '—';
  const targetTz = options.timeZone || getActiveTimeZone();
  const includeSeconds = options.includeSeconds ?? true;

  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;

    const dateStr = d.toLocaleDateString('en-US', {
      timeZone: targetTz,
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const timeStr = d.toLocaleTimeString('en-US', {
      timeZone: targetTz,
      hour: '2-digit',
      minute: '2-digit',
      second: includeSeconds ? '2-digit' : undefined,
      hour12: true
    });

    const abbr = getTimeZoneAbbr(d, targetTz);
    return abbr ? `${dateStr}, ${timeStr} ${abbr}` : `${dateStr}, ${timeStr}`;
  } catch {
    return isoString;
  }
}

/**
 * Get YYYY-MM-DD key for a given date in the target American timezone
 */
export function getAmericanDateKey(date: Date, timeZone: string = getActiveTimeZone()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(date);
    const m = parts.find(p => p.type === 'month')?.value || '01';
    const d = parts.find(p => p.type === 'day')?.value || '01';
    const y = parts.find(p => p.type === 'year')?.value || '1970';
    return `${y}-${m}-${d}`;
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/**
 * Check if an ISO date string falls on "Today" in the target American timezone
 */
export function isAmericanDateToday(isoString: string, timeZone: string = getActiveTimeZone()): boolean {
  if (!isoString) return false;
  try {
    const rideDateKey = getAmericanDateKey(new Date(isoString), timeZone);
    const todayKey = getAmericanDateKey(new Date(), timeZone);
    return rideDateKey === todayKey;
  } catch {
    return false;
  }
}

/**
 * Check if an ISO date string falls on "Yesterday" in the target American timezone
 */
export function isAmericanDateYesterday(isoString: string, timeZone: string = getActiveTimeZone()): boolean {
  if (!isoString) return false;
  try {
    const rideDateKey = getAmericanDateKey(new Date(isoString), timeZone);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const yesterdayKey = getAmericanDateKey(yesterday, timeZone);
    return rideDateKey === yesterdayKey;
  } catch {
    return false;
  }
}

/**
 * Check if an ISO date string falls on "Tomorrow" in the target American timezone
 */
export function isAmericanDateTomorrow(isoString: string, timeZone: string = getActiveTimeZone()): boolean {
  if (!isoString) return false;
  try {
    const rideDateKey = getAmericanDateKey(new Date(isoString), timeZone);
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const tomorrowKey = getAmericanDateKey(tomorrow, timeZone);
    return rideDateKey === tomorrowKey;
  } catch {
    return false;
  }
}
