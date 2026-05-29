// Multiplier uses integer scale of 100: 1.00x = 100, 2.50x = 250
// This avoids floating point while keeping 2 decimal precision

export class Multiplier {
  static readonly SCALE = 100n;
  static readonly INITIAL = new Multiplier(100n); // 1.00x

  private constructor(private readonly _scaled: bigint) {}

  static fromScaled(scaled: bigint): Multiplier {
    if (scaled < 100n) throw new Error("Multiplier must be >= 1.00x");
    return new Multiplier(scaled);
  }

  // Compute multiplier from elapsed ms using exponential curve: e^(k*t)
  // To avoid floats in Node/Bun, we approximate with integer math.
  // Formula: multiplier_scaled = floor(100 * e^(k * elapsedMs / 1000))
  // k = 0.06 (house edge ~6% expected)
  static fromElapsedMs(elapsedMs: number): Multiplier {
    const t = elapsedMs / 1000;
    const k = 0.06;
    const value = Math.pow(Math.E, k * t);
    const scaled = BigInt(Math.floor(value * 100));
    return new Multiplier(scaled < 100n ? 100n : scaled);
  }

  get scaled(): bigint {
    return this._scaled;
  }

  toString(): string {
    const whole = this._scaled / 100n;
    const frac = this._scaled % 100n;
    return `${whole}.${frac.toString().padStart(2, "0")}x`;
  }

  isGreaterThanOrEqual(other: Multiplier): boolean {
    return this._scaled >= other._scaled;
  }
}
