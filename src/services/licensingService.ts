export * from '@/services/licenseService';
import { getCurrentLicenseSync, LicenseStatus, activateLicenseKey, deactivateLicense } from '@/services/licenseService';

export function getCurrentLicense(): { tier: 'free' | 'pro' | 'studio'; key?: string } {
  const lic: LicenseStatus = getCurrentLicenseSync();
  return { tier: lic.tier, key: lic.licenseKey };
}

export function validateAndSaveLicenseKey(key: string, email?: string): { success: boolean; tier?: 'free' | 'pro' | 'studio'; message: string } {
  const cleanKey = key.trim();
  if (cleanKey.toUpperCase().includes('PRO') || cleanKey.toUpperCase().includes('STUDIO')) {
    activateLicenseKey(cleanKey, email);
    return { success: true, tier: cleanKey.toUpperCase().includes('STUDIO') ? 'studio' : 'pro', message: 'License Activated!' };
  }
  return { success: false, message: 'Invalid License Key' };
}

export function resetLicenseToFree(): void {
  deactivateLicense();
}