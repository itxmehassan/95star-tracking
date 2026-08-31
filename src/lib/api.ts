import { useState, useEffect } from 'react';
import { Driver, Ride } from '../types';

const AUTH_TOKEN_KEY = 'ride_track_admin_session';

export function formatStepTime(isoString?: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return '';
  }
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

export async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAdminToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(endpoint, {
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

export function useRealtimeRideStream(options?: { rideId?: string; token?: string }) {
  const [lastUpdate, setLastUpdate] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('connected');

  useEffect(() => {
    let url = '/api/realtime/stream';
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
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'BRANDING_UPDATED' && data.branding) {
            window.dispatchEvent(new CustomEvent('company_branding_sync', { detail: data.branding }));
          }
          if (data.type !== 'CONNECTED') {
            setLastUpdate(data);
          }
        } catch (err) {
          // ignore heartbeats
        }
      };

      eventSource.onerror = () => {
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
