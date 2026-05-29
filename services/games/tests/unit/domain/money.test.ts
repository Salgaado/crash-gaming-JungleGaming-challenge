import { describe, expect, it } from "bun:test";
import { Money, MAX_BET, MIN_BET } from "../../../src/domain/value-objects/money.vo";
import { InvalidBetAmountError } from "../../../src/domain/errors/domain-errors";

describe("Money", () => {
  it("creates from valid cents", () => {
    const m = Money.fromCents(100n);
    expect(m.cents).toBe(100n);
  });

  it("throws on negative cents", () => {
    expect(() => Money.fromCents(-1n)).toThrow(InvalidBetAmountError);
  });

  it("adds correctly", () => {
    expect(Money.fromCents(100n).add(Money.fromCents(50n)).cents).toBe(150n);
  });

  it("subtracts correctly", () => {
    expect(Money.fromCents(200n).subtract(Money.fromCents(50n)).cents).toBe(150n);
  });

  it("throws on subtract below zero", () => {
    expect(() => Money.fromCents(50n).subtract(Money.fromCents(100n))).toThrow();
  });

  it("multiplies correctly (floor)", () => {
    // 100 cents * 250 (2.50x) / 100 = 250 cents
    const result = Money.fromCents(100n).multiplyByScaled(250n, 100n);
    expect(result.cents).toBe(250n);
  });

  it("formats to string", () => {
    expect(Money.fromCents(150n).toString()).toBe("1.50");
    expect(Money.fromCents(1000n).toString()).toBe("10.00");
  });

  it("MIN_BET is 1.00", () => {
    expect(MIN_BET.cents).toBe(100n);
  });

  it("MAX_BET is 1000.00", () => {
    expect(MAX_BET.cents).toBe(100000n);
  });
});
