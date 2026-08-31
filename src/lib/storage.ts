import { Ride, Driver, CompanyBranding } from '../types';
import { apiFetch } from './api';

const RIDES_STORAGE_KEY = '95star_rides_permanent_vault';
const DRIVERS_STORAGE_KEY = '95star_drivers_permanent_vault';
const BRANDING_STORAGE_KEY = '95star_branding_permanent_vault';

export const ClientStorage = {
  // Rides
  getLocalRides(): Ride[] {
    try {
      const data = localStorage.getItem(RIDES_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to read rides from local storage:', e);
    }
    return [];
  },

  saveLocalRides(rides: Ride[]) {
    try {
      if (Array.isArray(rides)) {
        localStorage.setItem(RIDES_STORAGE_KEY, JSON.stringify(rides));
      }
    } catch (e) {
      console.warn('Failed to save rides to local storage:', e);
    }
  },

  saveSingleRide(ride: Ride) {
    try {
      const existing = this.getLocalRides();
      const index = existing.findIndex(r => r.id === ride.id);
      if (index >= 0) {
        existing[index] = ride;
      } else {
        existing.unshift(ride);
      }
      this.saveLocalRides(existing);
    } catch (e) {
      console.warn('Failed to save single ride to local storage:', e);
    }
  },

  removeLocalRide(rideId: string) {
    try {
      const existing = this.getLocalRides();
      const filtered = existing.filter(r => r.id !== rideId);
      this.saveLocalRides(filtered);
    } catch (e) {
      console.warn('Failed to remove ride from local storage:', e);
    }
  },

  // Drivers
  getLocalDrivers(): Driver[] {
    try {
      const data = localStorage.getItem(DRIVERS_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  },

  saveLocalDrivers(drivers: Driver[]) {
    try {
      if (Array.isArray(drivers)) {
        localStorage.setItem(DRIVERS_STORAGE_KEY, JSON.stringify(drivers));
      }
    } catch (e) {}
  },

  // Branding
  getLocalBranding(): CompanyBranding | null {
    try {
      const data = localStorage.getItem(BRANDING_STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {}
    return null;
  },

  saveLocalBranding(branding: CompanyBranding) {
    try {
      localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(branding));
    } catch (e) {}
  },

  /**
   * Automatically synchronizes local persistent data with the server.
   * If the server was recycled/restarted and has 0 rides or default branding,
   * this re-hydrates the server seamlessly.
   */
  async syncWithServer(): Promise<{ syncedRides: number; syncedBranding: boolean }> {
    const localRides = this.getLocalRides();
    const localDrivers = this.getLocalDrivers();
    const localBranding = this.getLocalBranding();

    if (localRides.length === 0 && !localBranding?.logoUrl && localDrivers.length === 0) {
      return { syncedRides: 0, syncedBranding: false };
    }

    try {
      const res = await apiFetch<{
        success: boolean;
        restoredRides: number;
        serverRides: Ride[];
        branding?: CompanyBranding;
      }>('/api/sync/hydrate', {
        method: 'POST',
        body: JSON.stringify({
          rides: localRides,
          drivers: localDrivers,
          branding: localBranding
        })
      });

      if (res.success && Array.isArray(res.serverRides)) {
        this.saveLocalRides(res.serverRides);
      }

      return {
        syncedRides: res.restoredRides || 0,
        syncedBranding: Boolean(res.branding?.logoUrl)
      };
    } catch (err) {
      console.warn('Hydration sync skipped or server unreachable:', err);
      return { syncedRides: 0, syncedBranding: false };
    }
  }
};
