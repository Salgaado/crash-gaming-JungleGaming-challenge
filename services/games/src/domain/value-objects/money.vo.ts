import { InvalidBetAmountError } from "../errors/domain-errors";

export class Money {
  private constructor(private readonly _cents: bigint) {}

  static fromCents(cents: bigint): Money {
    if (cents < 0n) throw new InvalidBetAmountError("Money cannot be negative");
    return new Money(cents);
  }

  static zero(): Money {
    return new Money(0n);
  }

  get cents(): bigint {
    return this._cents;
  }

  add(other: Money): Money {
    return new Money(this._cents + other._cents);
  }

  subtract(other: Money): Money {
    const result = this._cents - other._cents;
    if (result < 0n) throw new InvalidBetAmountError("Insufficient funds");
    return new Money(result);
  }

  // payout = floor(amountCents * multiplierScaled / SCALE)
  // multiplierScaled uses 2 decimal places: 1.00x = 100, 2.50x = 250
  multiplyByScaled(multiplierScaled: bigint, scale: bigint): Money {
    return new Money((this._cents * multiplierScaled) / scale);
  }

  isGreaterThan(other: Money): boolean {
    return this._cents > other._cents;
  }

  isLessThan(other: Money): boolean {
    return this._cents < other._cents;
  }

  equals(other: Money): boolean {
    return this._cents === other._cents;
  }

  toString(): string {
    const whole = this._cents / 100n;
    const fraction = this._cents % 100n;
    return `${whole}.${fraction.toString().padStart(2, "0")}`;
  }
}

export const MIN_BET = Money.fromCents(100n);   // 1.00
export const MAX_BET = Money.fromCents(100000n); // 1000.00
