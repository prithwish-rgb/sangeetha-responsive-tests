/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDP DESIGN VALIDATOR — Shared helpers for PDP Figma-to-Staging audit
 * Figma Source: 4681:102340 (PDP full, 390×4660)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Page } from '@playwright/test';

export type AuditClassification =
  | 'PASS'
  | 'MISSING'
  | 'DESIGN_MISMATCH'
  | 'CONTENT_MISMATCH'
  | 'DYNAMIC_CONTENT'
  | 'MAPPING_UNCERTAIN';

export interface AuditFinding {
  testId: string;
  figmaNodeId: string;
  element: string;
  section: string;
  classification: AuditClassification;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  property?: string;
  figmaExpected?: string | number;
  stagingActual?: string | number;
  difference?: string;
  selector?: string;
  viewport?: string;
  mappingConfidence?: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNMAPPED';
  developerAction?: string;
}

export interface PDPAuditReport {
  figmaNode: string;
  pdpUrl: string;
  viewport: string;
  auditStatus: 'COMPLETE' | 'PARTIAL';
  findings: AuditFinding[];
  screenshots: string[];
  consoleErrors: string[];
  networkFailures: string[];
  visualReferenceStatus: 'NOT_AVAILABLE';
}

export class PDPAuditEngine {
  private findings: AuditFinding[] = [];
  private screenshots: string[] = [];
  private consoleErrors: string[] = [];
  private networkFailures: string[] = [];

  recordFinding(f: AuditFinding) {
    this.findings.push(f);
  }

  addScreenshot(path: string) {
    this.screenshots.push(path);
  }

  addConsoleError(msg: string) {
    this.consoleErrors.push(msg);
  }

  addNetworkFailure(url: string) {
    this.networkFailures.push(url);
  }

  get metrics() {
    const pass = this.findings.filter(f => f.classification === 'PASS').length;
    const missing = this.findings.filter(f => f.classification === 'MISSING').length;
    const mismatch = this.findings.filter(f => f.classification === 'DESIGN_MISMATCH').length;
    const contentMismatch = this.findings.filter(f => f.classification === 'CONTENT_MISMATCH').length;
    const dynamic = this.findings.filter(f => f.classification === 'DYNAMIC_CONTENT').length;
    const uncertain = this.findings.filter(f => f.classification === 'MAPPING_UNCERTAIN').length;
    const total = this.findings.length;

    // Only report parity for reliably mapped items
    const reliablyMapped = pass + missing + mismatch + contentMismatch;
    const parityNote = reliablyMapped >= 10
      ? `${((pass / reliablyMapped) * 100).toFixed(1)}% (of ${reliablyMapped} reliably mapped)`
      : 'Insufficient reliable mappings for trustworthy parity %';

    return { pass, missing, mismatch, contentMismatch, dynamic, uncertain, total, reliablyMapped, parityNote };
  }

  generateReport(pdpUrl: string, viewport: string): PDPAuditReport {
    return {
      figmaNode: '4681:102340 (PDP full)',
      pdpUrl,
      viewport,
      auditStatus: 'COMPLETE',
      findings: this.findings,
      screenshots: this.screenshots,
      consoleErrors: this.consoleErrors,
      networkFailures: this.networkFailures,
      visualReferenceStatus: 'NOT_AVAILABLE',
    };
  }
}

/** Resolve computed font-family to primary family name */
export function primaryFont(computedFontFamily: string): string {
  return computedFontFamily.split(',')[0].replace(/['"]/g, '').trim().toLowerCase();
}

/** Check if actual rendered font matches Figma requirement (case-insensitive partial) */
export function fontMatches(actual: string, expected: string): boolean {
  return primaryFont(actual).includes(expected.toLowerCase());
}

/** Color delta (Euclidean RGB distance) */
export function colorDelta(hex1: string, hex2: string): number {
  const parse = (h: string) => {
    const c = h.replace('#', '');
    if (c.length < 6) return [0, 0, 0];
    return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
  };
  const [r1, g1, b1] = parse(hex1);
  const [r2, g2, b2] = parse(hex2);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

/** Convert computed rgb/rgba string to HEX */
export function rgbToHex(rgb: string): string | null {
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  return `#${parseInt(m[1]).toString(16).padStart(2, '0')}${parseInt(m[2]).toString(16).padStart(2, '0')}${parseInt(m[3]).toString(16).padStart(2, '0')}`.toUpperCase();
}

/** Check if dimension is within tolerance */
export function dimClose(actual: number, expected: number, tolerance = 6): { pass: boolean; diff: number } {
  const diff = Math.abs(actual - expected);
  return { pass: diff <= tolerance, diff };
}

/** Attach console listener and network failure tracker */
export function attachPDPListeners(page: Page) {
  const consoleErrors: string[] = [];
  const networkFails: string[] = [];

  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => {
    consoleErrors.push(`PAGE_ERROR: ${err.message}`);
  });
  page.on('response', response => {
    if (response.status() >= 400 && !response.url().includes('analytics')) {
      networkFails.push(`${response.status()} ${response.url()}`);
    }
  });

  return { consoleErrors, networkFails };
}
