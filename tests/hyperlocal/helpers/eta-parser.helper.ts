/**
 * Parses delivery ETA as shown on the Sangeetha PDP into total minutes.
 *
 * The site renders ETA in two ways (verified against live markup):
 *   1. Hyperlocal badge — an <img> in `.details-text` with alt like
 *      "30-minntes-delivery-image" (site typo preserved).
 *   2. Standard delivery — text in `.details-text` like
 *      "Get delivery in\n24 hrs".
 */

/** Known hyperlocal image alt/src fragments → minutes. Extend as new badges appear. */
const HYPERLOCAL_IMAGE_MINUTES: Array<{ pattern: RegExp; minutes: number }> = [
  { pattern: /30[- ]?min/i, minutes: 30 },
  { pattern: /35_min_dlvry/i, minutes: 35 },
  { pattern: /45[- ]?min/i, minutes: 45 },
  { pattern: /60[- ]?min/i, minutes: 60 },
];

const UNDELIVERABLE_PATTERNS = [
  /not deliverable/i,
  /not available/i,
  /unavailable for delivery/i,
  /currently unavailable/i,
  /out of (delivery )?range/i,
  /out of stock/i,
  /unavailable/i,
  /no delivery/i,
  /unserviceable/i,
  /cannot deliver/i,
  /delivery not available/i,
];

const INVALID_PINCODE_PATTERNS = [
  /invalid pincode/i,
  /invalid pin code/i,
  /enter a valid pincode/i,
  /enter valid pincode/i,
  /please enter valid/i,
  /pincode is not valid/i,
  /pin code is not valid/i,
];

export function parseEtaToMinutes(rawText: string | null): number | null {
  if (!rawText) return null;

  const text = rawText.toLowerCase().trim();

  const hoursMatch = text.match(/(\d+)\s*(?:hrs?|hours?)/);
  const minsMatch = text.match(/(\d+)\s*(?:mins?|minutes?)/);

  const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
  const mins = minsMatch ? parseInt(minsMatch[1], 10) : 0;

  if (!hoursMatch && !minsMatch) return null;

  return hours * 60 + mins;
}

/** Derive minutes from a hyperlocal delivery badge image alt/src. */
export function parseEtaFromDeliveryImage(alt: string | null, src: string | null): number | null {
  const combined = `${alt ?? ''} ${src ?? ''}`;
  for (const { pattern, minutes } of HYPERLOCAL_IMAGE_MINUTES) {
    if (pattern.test(combined)) return minutes;
  }
  return null;
}

export function isUndeliverableText(rawText: string | null): boolean {
  if (!rawText) return false;
  return UNDELIVERABLE_PATTERNS.some((pattern) => pattern.test(rawText));
}

export function isInvalidPincodeText(rawText: string | null): boolean {
  if (!rawText) return false;
  return INVALID_PINCODE_PATTERNS.some((pattern) => pattern.test(rawText));
}

export function formatMinutesAsHrsMins(totalMinutes: number): string {
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hrs === 0) return `${mins} mins`;
  if (mins === 0) return `${hrs} hr${hrs > 1 ? 's' : ''}`;
  return `${hrs} hr${hrs > 1 ? 's' : ''} ${mins} mins`;
}
