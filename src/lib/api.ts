import { useState, useEffect } from 'react';
import { Driver, Affiliate, Ride } from '../types';
import { formatAmericanTime } from './timezone';

const AUTH_TOKEN_KEY = 'ride_track_admin_session';

export function formatStepTime(isoString?: string): string {
  return formatAmericanTime(isoString, { includeTzAbbr: true });
}

export function getAdminToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAdminToken(token: string) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAdminToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function getApiBaseUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return '';
}

export async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}, retries: number = 2): Promise<T> {
  const token = getAdminToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const baseUrl = getApiBaseUrl();
  const fullUrl = endpoint.startsWith('http://') || endpoint.startsWith('https://')
    ? endpoint
    : `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  let lastErr: any;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(fullUrl, {
        cache: 'no-store',
        ...options,
        headers
      });

      const contentType = res.headers.get('content-type') || '';
      if (!res.ok) {
        let errMsg = `Request failed (${res.status})`;
        if (contentType.includes('application/json')) {
          try {
            const data = await res.json();
            errMsg = data.error || errMsg;
          } catch {}
        }
        throw new Error(errMsg);
      }

      if (contentType.includes('application/json')) {
        return res.json();
      }

      try {
        return (await res.json()) as T;
      } catch {
        return {} as T;
      }
    } catch (err: any) {
      lastErr = err;
      // Retry transient network/fetch failures (e.g. server starting/reloading)
      const isNetworkError = err instanceof TypeError || (err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')));
      if (isNetworkError && attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 350 * Math.pow(2, attempt)));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

export async function fetchDrivers(): Promise<Driver[]> {
  return apiFetch<Driver[]>('/api/drivers');
}

export async function fetchRides(params?: { search?: string; status?: string; fromDate?: string; toDate?: string }): Promise<Ride[]> {
  const query = new URLSearchParams();
  if (params?.search) query.append('search', params.search);
  if (params?.status) query.append('status', params.status);
  if (params?.fromDate) query.append('fromDate', params.fromDate);
  if (params?.toDate) query.append('toDate', params.toDate);
  const qs = query.toString();
  return apiFetch<Ride[]>(`/api/rides${qs ? `?${qs}` : ''}`);
}

export async function deleteRide(id: string): Promise<{ success: boolean; message?: string }> {
  return apiFetch<{ success: boolean; message?: string }>(`/api/rides/${id}`, {
    method: 'DELETE'
  });
}

export async function createDriver(data: { name: string; phone?: string; email?: string; vehicle?: string; licensePlate?: string }): Promise<Driver> {
  return apiFetch<Driver>('/api/drivers', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateDriver(id: string, data: Partial<Driver>): Promise<Driver> {
  return apiFetch<Driver>(`/api/drivers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function deleteDriver(id: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/api/drivers/${id}`, {
    method: 'DELETE'
  });
}

export async function assignDriver(rideId: string, driverId?: string, driverName?: string, driverPhone?: string): Promise<{ success: boolean; ride: Ride }> {
  return apiFetch<{ success: boolean; ride: Ride }>(`/api/rides/${rideId}/driver`, {
    method: 'POST',
    body: JSON.stringify({ driverId, driverName, driverPhone })
  });
}

export async function fetchAffiliates(): Promise<Affiliate[]> {
  return apiFetch<Affiliate[]>('/api/affiliates');
}

export async function createAffiliate(data: { name: string; phone?: string; email?: string; company?: string; notes?: string }): Promise<Affiliate> {
  return apiFetch<Affiliate>('/api/affiliates', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateAffiliate(id: string, data: Partial<Affiliate>): Promise<Affiliate> {
  return apiFetch<Affiliate>(`/api/affiliates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function deleteAffiliate(id: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/api/affiliates/${id}`, {
    method: 'DELETE'
  });
}

export function useRealtimeRideStream(options?: { rideId?: string; token?: string }) {
  const [lastUpdate, setLastUpdate] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('connected');

  useEffect(() => {
    const baseUrl = getApiBaseUrl();
    let url = `${baseUrl}/api/realtime/stream`;
    const params = new URLSearchParams();
    if (options?.rideId) params.append('rideId', options.rideId);
    if (options?.token) params.append('token', options.token);

    const qs = params.toString();
    if (qs) url += `?${qs}`;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    const connect = () => {
      setConnectionStatus('reconnecting');
      eventSource = new EventSource(url);

      eventSource.onopen = () => {
        setConnectionStatus('connected');
        console.log('[Ride-Diagnostics][SSE] Connected to live SSE stream');
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'BRANDING_UPDATED' && data.branding) {
            window.dispatchEvent(new CustomEvent('company_branding_sync', { detail: data.branding }));
          }
          if (data.type !== 'CONNECTED') {
            console.log(`[Ride-Diagnostics][SSE] Received real-time event: ${data.type}`, data);
            setLastUpdate(data);
          }
        } catch (err) {
          // ignore heartbeats
        }
      };

      eventSource.onerror = () => {
        console.warn('[Ride-Diagnostics][SSE] Connection dropped or interrupted. Reconnecting in 3s...');
        setConnectionStatus('reconnecting');
        if (eventSource) {
          eventSource.close();
        }
        reconnectTimeout = setTimeout(() => {
          connect();
        }, 3000);
      };
    };

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSource) eventSource.close();
    };
  }, [options?.rideId, options?.token]);

  return { lastUpdate, connectionStatus };
}
