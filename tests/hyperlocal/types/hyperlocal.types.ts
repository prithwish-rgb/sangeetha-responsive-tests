/** A single product SKU to search for and check delivery ETA against. */
export interface ProductVariant {
  /** The exact string typed into the search box, e.g. "iPhone 16 Pro" */
  searchTerm: string;
  /** Human-readable label for logs/reports — usually same as searchTerm */
  label: string;
}

/** @deprecated Use ProductVariant — kept for backward compatibility with data files. */
export type AppleVariant = ProductVariant;

/** One pincode from the pool. */
export interface Pincode {
  code: string;
}

export type EtaCheckStatus =
  | 'PASS'
  | 'FAIL'
  | 'ERROR'
  | 'UNDELIVERABLE'
  | 'INVALID_PINCODE'
  | 'NOT_FOUND';

/** Result of checking ETA for one (variant, pincode) pair. */
export interface EtaCheckResult {
  cycle: number;
  variant: string;
  pincode: string;
  rawEtaText: string | null;
  etaMinutes: number | null;
  /** true if the site explicitly showed "not deliverable" rather than an ETA */
  undeliverable: boolean;
  status: EtaCheckStatus;
  timestamp: string; // ISO 8601
  /** populated only when status === 'ERROR', 'NOT_FOUND', or 'INVALID_PINCODE' */
  errorMessage?: string;
  /** diagnostic context captured at failure time */
  pageUrl?: string;
  pageTitle?: string;
}

/** Rollup written once at the very end of the full sweep. */
export interface EtaSweepSummary {
  startedAt: string;
  finishedAt: string;
  totalCycles: number;
  totalChecks: number;
  totalPass: number;
  totalFail: number;
  totalUndeliverable: number;
  totalInvalidPincodes: number;
  totalNotFound: number;
  totalErrors: number;
  failuresByVariant: Record<string, number>;
  failuresByPincode: Record<string, number>;
}

/** Config knobs kept in one place rather than scattered as magic numbers. */
export interface EtaSweepConfig {
  totalCycles: number;
  etaFailureThresholdMinutes: number;
  waitBetweenCyclesMs: number;
  searchTimeoutMs: number;
  pincodeApplyTimeoutMs: number;
}

export const DEFAULT_CONFIG: EtaSweepConfig = {
  totalCycles: 100,
  etaFailureThresholdMinutes: 120, // 2 hours
  waitBetweenCyclesMs: 20_000,
  searchTimeoutMs: 8_000,
  pincodeApplyTimeoutMs: 15_000,
};
