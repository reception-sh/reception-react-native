import type { Appearance } from './types';

export function warnInvalid(field: string): void {
  console.warn(`[Reception] Invalid ${field}; ignored.`);
}
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
const hex = (value: unknown) =>
  typeof value === 'string' && /^#[\da-f]{6}([\da-f]{2})?$/i.test(value);
const color = (value: unknown) =>
  hex(value) ||
  (isRecord(value) &&
    Object.keys(value).length === 2 &&
    hex(value.light) &&
    hex(value.dark));
const text = (value: unknown) => typeof value === 'string';
const boolean = (value: unknown) => typeof value === 'boolean';
const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const nullable = (check: (value: unknown) => boolean) => (value: unknown) =>
  value === null || check(value);
const oneOf =
  (...values: unknown[]) =>
  (value: unknown) =>
    values.includes(value);
const validators: Record<keyof Appearance, (value: unknown) => boolean> = {
  accentColor: color,
  onAccentColor: nullable(color),
  title: text,
  welcomeTitle: text,
  welcomeText: text,
  showsCloseButton: boolean,
  chatBackground: nullable(color),
  incomingBackground: nullable(color),
  incomingForeground: nullable(color),
  preferredColorScheme: oneOf(null, 'light', 'dark'),
  closeIcon: oneOf('xmark', 'chevron.down', 'arrow.down'),
  closeImage: nullable(text),
  fontDesign: oneOf(null, 'default', 'rounded', 'serif', 'monospaced'),
  fontFamily: nullable(text),
  fadesOlderMessages: boolean,
  welcomeIconColor: nullable(color),
  welcomeIconSize: nullable(
    (value) => finite(value) && value >= 16 && value <= 160,
  ),
  welcomeIconCornerRadius: (value) =>
    finite(value) && value >= 0 && value <= 80,
  welcomeIconOffset: (value) =>
    isRecord(value) && finite(value.x) && finite(value.y),
  hidesTitle: boolean,
  hidesWelcomeTitle: boolean,
  hidesWelcomeText: boolean,
  welcomeIcon: nullable(
    (value) =>
      isRecord(value) &&
      Object.keys(value).length === 1 &&
      (typeof value.symbol === 'string' ||
        typeof value.image === 'string' ||
        value.hidden === true),
  ),
};

/** Invalid fields retain their previous value instead of resetting a working customization. */
export function validateAppearance(
  value: unknown,
  previous: Appearance,
): Appearance | null {
  if (!isRecord(value)) {
    warnInvalid('appearance');
    return null;
  }
  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!Object.hasOwn(validators, key)) {
      warnInvalid('appearance option');
      continue;
    }
    const field = key as keyof Appearance;
    if (entry === undefined) continue;
    if (validators[field](entry)) result[field] = entry;
    else {
      warnInvalid(`appearance.${field}`);
      if (previous[field] !== undefined) result[field] = previous[field];
    }
  }
  return result;
}

const optional = (value: unknown, type: 'string' | 'boolean') =>
  value === undefined || typeof value === type;
const isProduct = (value: unknown) =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  optional(value.price, 'string') &&
  optional(value.period, 'string') &&
  optional(value.trial, 'string');
/** A paywall entry: id and title, plus optional details the Swift SDK validates further. */
export function isPaywall(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    optional(value.source, 'string') &&
    optional(value.presentable, 'boolean') &&
    (value.products === undefined ||
      (Array.isArray(value.products) && value.products.every(isProduct)))
  );
}
