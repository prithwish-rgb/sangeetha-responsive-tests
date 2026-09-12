import { Pincode } from '../types/hyperlocal.types';

/**
 * Tracks which pincode to use next, ADVANCING CONTINUOUSLY ACROSS THE WHOLE
 * RUN (all cycles) rather than resetting every cycle.
 *
 * This is the actual intended design: with 10 variants and an 800-pincode
 * pool, cycle 1 uses pincodes[0..9] (variant[0] gets pincodes[0], variant[1]
 * gets pincodes[1], etc.), cycle 2 uses pincodes[10..19], and so on — the
 * pincode index keeps climbing every single check. It only wraps back to the
 * start of the pool once every pincode has been used at least once.
 *
 * The variant side does NOT need separate wraparound logic here: the
 * orchestrator's `for (const variant of variants)` loop already starts over
 * from variants[0] at the top of every cycle for free — that's what "for the
 * 11th pincode, get back to the first variant" describes. This class only
 * needs to make sure the PINCODE never resets.
 */
export class PincodeTracker {
  private readonly allPincodes: Pincode[];
  private usedEver: Set<string>;
  private cursor: number;

  constructor(pincodes: Pincode[]) {
    if (pincodes.length === 0) {
      throw new Error('PincodeTracker requires at least one pincode.');
    }
    this.allPincodes = pincodes;
    this.usedEver = new Set();
    this.cursor = 0;
  }

  /**
   * Kept for API compatibility with the orchestrator's per-cycle call —
   * intentionally a no-op. Resetting here would undo the continuous
   * advancement this class exists to provide.
   */
  resetForNewCycle(): void {
    // no-op — cursor persists across cycles by design
  }

  getNextUnusedPincode(): Pincode {
    if (this.cursor >= this.allPincodes.length) {
      // Whole pool used at least once — wrap around so a long run (e.g. 100
      // cycles x 10 variants = 1,000 checks against an 800-pincode pool)
      // doesn't hard-fail once it runs past the end. Repeats become possible
      // only after every pincode has been touched once.
      this.cursor = 0;
    }

    const candidate = this.allPincodes[this.cursor];
    this.cursor++;
    this.usedEver.add(candidate.code);
    return candidate;
  }

  /** How many distinct pincodes have been used so far across the whole run. */
  get usedCount(): number {
    return this.usedEver.size;
  }

  get poolSize(): number {
    return this.allPincodes.length;
  }
}