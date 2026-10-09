import { describe, expect, it } from 'vitest';
import { settingsSchema } from '@/domain/models';
import { createDefaultSettings } from './defaults';

describe('createDefaultSettings', () => {
  it('uses US conventions for US English browsers', () => {
    expect(createDefaultSettings('en-US')).toMatchObject({ locale: 'en-US', weekStartsOn: 0 });
  });

  it.each([undefined, 'en-GB', 'fr-FR', 'en'])('uses British conventions for %s', (locale) => {
    expect(createDefaultSettings(locale)).toMatchObject({ locale: 'en-GB', weekStartsOn: 1 });
  });

  it('starts with valid, empty business details and sensible defaults', () => {
    const settings = createDefaultSettings('en-GB');
    expect(settingsSchema.safeParse(settings).success).toBe(true);
    expect(settings).toEqual({
      ownerName: '',
      businessName: '',
      businessEmail: null,
      businessAddress: null,
      taxId: null,
      currency: 'EUR',
      locale: 'en-GB',
      defaultHourlyRateCents: 7500,
      weekStartsOn: 1,
      weeklyTargetHours: 35,
      roundingIncrementMinutes: 0,
      roundingMode: 'up',
      invoicePrefix: 'INV-',
      paymentTermsDays: 30,
      defaultTaxRateBps: 0,
    });
  });
});
