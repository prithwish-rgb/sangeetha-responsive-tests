import { Page } from '@playwright/test';
import { TOLERANCE } from './design-tokens';

// ─── Color utilities ─────────────────────────────────────────────────────────

/**
 * Parse any CSS color string to { r, g, b, a }.
 * Handles: #rrggbb, rgb(...), rgba(...).
 */
export function parseColor(css: string): { r: number; g: number; b: number; a: number } | null {
  css = css.trim();
  const hex6 = /^#([0-9a-f]{6})$/i.exec(css);
  if (hex6) {
    const n = parseInt(hex6[1], 16);
    return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff, a: 1 };
  }
  const hex3 = /^#([0-9a-f]{3})$/i.exec(css);
  if (hex3) {
    const [rh, gh, bh] = hex3[1].split('');
    return { r: parseInt(rh + rh, 16), g: parseInt(gh + gh, 16), b: parseInt(bh + bh, 16), a: 1 };
  }
  const rgba = /^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i.exec(css);
  if (rgba) {
    return { r: +rgba[1], g: +rgba[2], b: +rgba[3], a: rgba[4] !== undefined ? +rgba[4] : 1 };
  }
  return null;
}

/**
 * Compare two CSS color strings with a per-channel tolerance.
 */
export function colorsMatch(actual: string, expected: string, delta = TOLERANCE.colorDelta): boolean {
  const a = parseColor(actual);
  const e = parseColor(expected);
  if (!a || !e) return false;
  return (
    Math.abs(a.r - e.r) <= delta &&
    Math.abs(a.g - e.g) <= delta &&
    Math.abs(a.b - e.b) <= delta &&
    Math.abs(a.a - e.a) <= 0.1
  );
}

// ─── Computed-style helpers ───────────────────────────────────────────────────

export interface ComputedStyles {
  backgroundColor: string;
  color: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
  textAlign: string;
  textDecoration: string;
  borderRadius: string;
  borderColor: string;
  borderWidth: string;
  width: string;
  height: string;
  paddingTop: string;
  paddingBottom: string;
  paddingLeft: string;
  paddingRight: string;
  gap: string;
  boxShadow: string;
}

export async function getComputedStyles(page: Page, selector: string): Promise<Partial<ComputedStyles>> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return {};
    const s = window.getComputedStyle(el);
    return {
      backgroundColor: s.backgroundColor,
      color: s.color,
      fontFamily: s.fontFamily,
      fontSize: s.fontSize,
      fontWeight: s.fontWeight,
      lineHeight: s.lineHeight,
      letterSpacing: s.letterSpacing,
      textAlign: s.textAlign,
      textDecoration: s.textDecoration,
      borderRadius: s.borderRadius,
      borderColor: s.borderColor,
      borderWidth: s.borderWidth,
      width: s.width,
      height: s.height,
      paddingTop: s.paddingTop,
      paddingBottom: s.paddingBottom,
      paddingLeft: s.paddingLeft,
      paddingRight: s.paddingRight,
      gap: s.gap,
      boxShadow: s.boxShadow,
    } as any;
  }, selector);
}

// ─── Dimension helpers ────────────────────────────────────────────────────────

export interface BoundingBox { width: number; height: number; x: number; y: number }

export async function getBoundingBox(page: Page, selector: string): Promise<BoundingBox | null> {
  const el = page.locator(selector).first();
  const box = await el.boundingBox();
  return box;
}

/**
 * Assert dimension with tolerance.
 * Returns { pass, actual, expected, diff }.
 */
export function dimensionClose(
  actual: number,
  expected: number,
  tol = TOLERANCE.pixels
): { pass: boolean; actual: number; expected: number; diff: number } {
  const diff = Math.abs(actual - expected);
  return { pass: diff <= tol, actual, expected, diff };
}

// ─── CSS font-family normaliser ──────────────────────────────────────────────

export function fontFamilyMatches(actual: string, expected: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/['"]/g, '').split(',')[0].trim();
  return norm(actual).startsWith(norm(expected).toLowerCase());
}

// ─── Visibility helper ───────────────────────────────────────────────────────

export async function isVisible(page: Page, selector: string): Promise<boolean> {
  try {
    const el = page.locator(selector).first();
    return await el.isVisible({ timeout: 3000 });
  } catch {
    return false;
  }
}

// ─── Console error capture ───────────────────────────────────────────────────

export interface ConsoleError { type: string; text: string; location?: string }

export function attachConsoleListener(page: Page): ConsoleError[] {
  const errors: ConsoleError[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push({ type: msg.type(), text: msg.text(), location: msg.location()?.url });
    }
  });
  page.on('pageerror', (err) => {
    errors.push({ type: 'pageerror', text: err.message });
  });
  return errors;
}

// ─── Design failure reporter ─────────────────────────────────────────────────

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type FailureCategory = 'FUNCTIONAL' | 'DESIGN' | 'RESPONSIVE' | 'VISUAL' | 'RUNTIME';
export type ContentType = 'DESIGN_STRUCTURE_MISMATCH' | 'DYNAMIC_CONTENT_DIFFERENCE';

export interface DesignFailure {
  element: string;
  selector: string;
  viewport: string;
  category: FailureCategory;
  severity: Severity;
  property: string;
  figmaExpected: string | number;
  stagingActual: string | number;
  difference: string;
  contentType?: ContentType;
}

export class DesignReport {
  private failures: DesignFailure[] = [];
  private passes: string[] = [];

  fail(f: DesignFailure) { this.failures.push(f); }
  pass(label: string) { this.passes.push(label); }

  get allFailures() { return this.failures; }
  get allPasses() { return this.passes; }
  get critical() { return this.failures.filter(f => f.severity === 'CRITICAL'); }
  get high() { return this.failures.filter(f => f.severity === 'HIGH'); }

  summary() {
    return {
      passed: this.passes.length,
      failed: this.failures.length,
      critical: this.critical.length,
      high: this.high.length,
      medium: this.failures.filter(f => f.severity === 'MEDIUM').length,
      low: this.failures.filter(f => f.severity === 'LOW').length,
    };
  }
}
