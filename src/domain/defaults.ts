import type { Settings } from '@/domain/models';

/**
 * Settings for a brand-new workspace. US English users get US formatting and weeks
 * starting on Sunday; everyone else gets British English formatting and Monday weeks.
 */
export function createDefaultSettings(browserLocale?: string): Settings {
  const isUnitedStates = browserLocale?.toLowerCase().startsWith('en-us') ?? false;
  return {
    ownerName: '',
    businessName: '',
    businessEmail: null,
    businessAddress: null,
    taxId: null,
    currency: 'EUR',
    locale: isUnitedStates ? 'en-US' : 'en-GB',
    defaultHourlyRateCents: 7500,
    weekStartsOn: isUnitedStates ? 0 : 1,
    weeklyTargetHours: 35,
    roundingIncrementMinutes: 0,
    roundingMode: 'up',
    invoicePrefix: 'INV-',
    paymentTermsDays: 30,
    defaultTaxRateBps: 0,
  };
}
