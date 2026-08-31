import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CompanyBranding } from '../types';
import { apiFetch } from './api';

const DEFAULT_BRANDING: CompanyBranding = {
  companyName: '95 Star Tracking',
  tagline: 'Airport Sedan Service',
  logoUrl: null
};

interface BrandingContextValue {
  branding: CompanyBranding;
  companyName: string;
  tagline: string;
  logoUrl: string | null;
  isCustomLogo: boolean;
  isLoading: boolean;
  updateBranding: (updates: Partial<CompanyBranding>) => Promise<boolean>;
  uploadLogo: (base64DataUrl: string) => Promise<boolean>;
  resetLogo: () => Promise<boolean>;
  refreshBranding: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextValue | null>(null);

const STORAGE_KEY = 'company_branding_cache';

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<CompanyBranding>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {}
    return DEFAULT_BRANDING;
  });
  const [isLoading, setIsLoading] = useState(false);

  const persistCache = (data: CompanyBranding) => {
    setBranding(data);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  };

  const refreshBranding = useCallback(async () => {
    try {
      const res = await apiFetch<CompanyBranding>('/api/branding');
      const cached = localStorage.getItem(STORAGE_KEY);
      let localCachedData: CompanyBranding | null = null;
      if (cached) {
        try {
          localCachedData = JSON.parse(cached);
        } catch {}
      }

      if (res && res.companyName) {
        // If server has no logo, but local storage has a custom uploaded logo, restore to server
        if (!res.logoUrl && localCachedData?.logoUrl) {
          apiFetch<{ success: boolean; branding: CompanyBranding }>('/api/branding', {
            method: 'POST',
            body: JSON.stringify({ logoUrl: localCachedData.logoUrl, companyName: localCachedData.companyName || res.companyName })
          }).then(syncRes => {
            if (syncRes.success && syncRes.branding) {
              persistCache(syncRes.branding);
            }
          }).catch(() => {});
        } else {
          persistCache(res);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch company branding:', err);
    }
  }, []);

  useEffect(() => {
    refreshBranding();

    // Listen for custom broadcast events if dispatched
    const handleBrandingSync = (e: CustomEvent<CompanyBranding>) => {
      if (e.detail) {
        persistCache(e.detail);
      }
    };
    window.addEventListener('company_branding_sync' as any, handleBrandingSync);
    return () => window.removeEventListener('company_branding_sync' as any, handleBrandingSync);
  }, [refreshBranding]);

  const updateBranding = async (updates: Partial<CompanyBranding>): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await apiFetch<{ success: boolean; branding: CompanyBranding }>('/api/branding', {
        method: 'POST',
        body: JSON.stringify(updates)
      });
      if (res.success && res.branding) {
        persistCache(res.branding);
        window.dispatchEvent(new CustomEvent('company_branding_sync', { detail: res.branding }));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to update company branding:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const uploadLogo = async (base64DataUrl: string): Promise<boolean> => {
    return updateBranding({ logoUrl: base64DataUrl });
  };

  const resetLogo = async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await apiFetch<{ success: boolean; branding: CompanyBranding }>('/api/branding/logo', {
        method: 'DELETE'
      });
      if (res.success && res.branding) {
        persistCache(res.branding);
        window.dispatchEvent(new CustomEvent('company_branding_sync', { detail: res.branding }));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to reset company logo:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BrandingContext.Provider
      value={{
        branding,
        companyName: branding.companyName || '95 Star Tracking',
        tagline: branding.tagline || 'Airport Sedan Service',
        logoUrl: branding.logoUrl || null,
        isCustomLogo: Boolean(branding.logoUrl),
        isLoading,
        updateBranding,
        uploadLogo,
        resetLogo,
        refreshBranding
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      branding: DEFAULT_BRANDING,
      companyName: DEFAULT_BRANDING.companyName,
      tagline: DEFAULT_BRANDING.tagline || '',
      logoUrl: null,
      isCustomLogo: false,
      isLoading: false,
      updateBranding: async () => false,
      uploadLogo: async () => false,
      resetLogo: async () => false,
      refreshBranding: async () => {}
    };
  }
  return context;
}
