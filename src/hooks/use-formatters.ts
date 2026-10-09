import { createDefaultSettings } from '@/domain/defaults';
import type { AppLocale, Currency } from '@/domain/models';
import { createFormatters, type Formatters } from '@/lib/format';
import { useSettings } from '@/services/queries';

/** Intl formatters are costly to build, so every component shares one instance per locale + currency. */
const cache = new Map<string, Formatters>();

function getFormatters(locale: AppLocale, currency: Currency): Formatters {
  const key = `${locale}|${currency}`;
  let formatters = cache.get(key);
  if (!formatters) {
    formatters = createFormatters(locale, currency);
    cache.set(key, formatters);
  }
  return formatters;
}

let fallbackSettings: { locale: AppLocale; currency: Currency } | undefined;

function getFallbackSettings() {
  fallbackSettings ??= createDefaultSettings(navigator.language);
  return fallbackSettings;
}

/** Locale- and currency-aware formatters from the user's settings (browser defaults while loading). */
export function useFormatters(): Formatters {
  const { data: settings } = useSettings();
  const { locale, currency } = settings ?? getFallbackSettings();
  return getFormatters(locale, currency);
}
