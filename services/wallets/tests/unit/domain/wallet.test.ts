import { describe, expect, it } from "bun:test";
import { Wallet } from "../../../src/domain/aggregates/wallet.aggregate";
import {
  InsufficientFundsError,
  InvalidAmountError,
} from "../../../src/domain/errors/domain-errors";
import {
  IdempotencyKey,
  PlayerId,
  TransactionId,
  WalletId,
} from "../../../src/domain/value-objects/ids.vo";
import { Money } from "../../../src/domain/value-objects/money.vo";

const makeWallet = () => Wallet.create(new WalletId("w1"), new PlayerId("p1"));

const debit = (wallet: Wallet, cents: bigint, key = "k1") =>
  wallet.debit(
    new TransactionId("tx-" + key),
    Money.fromCents(cents),
    "BET_DEBIT",
    "bet-1",
    new IdempotencyKey(key),
  );

const credit = (wallet: Wallet, cents: bigint, key = "k2") =>
  wallet.credit(
    new TransactionId("tx-" + key),
    Money.fromCents(cents),
    "CASHOUT_CREDIT",
    "bet-1",
    new IdempotencyKey(key),
  );

describe("Wallet", () => {
  it("creates with initial balance of 1000.00", () => {
    const wallet = makeWallet();
    expect(wallet.balance.cents).toBe(100000n);
  });

  it("debits correctly", () => {
    const wallet = makeWallet();
    debit(wallet, 500n);
    expect(wallet.balance.cents).toBe(99500n);
  });

  it("credits correctly", () => {
    const wallet = makeWallet();
    credit(wallet, 1000n);
    expect(wallet.balance.cents).toBe(101000n);
  });

  it("throws InsufficientFundsError when debit exceeds balance", () => {
    const wallet = makeWallet();
    expect(() => debit(wallet, 200000n)).toThrow(InsufficientFundsError);
  });

  it("balance never goes negative", () => {
    const wallet = makeWallet();
    try { debit(wallet, 999999n); } catch {}
    expect(wallet.balance.cents >= 0n).toBe(true);
  });

  it("throws on zero debit", () => {
    const wallet = makeWallet();
    expect(() => debit(wallet, 0n)).toThrow(InvalidAmountError);
  });

  it("throws on zero credit", () => {
    const wallet = makeWallet();
    expect(() => credit(wallet, 0n)).toThrow(InvalidAmountError);
  });

  it("records transaction in ledger", () => {
    const wallet = makeWallet();
    debit(wallet, 500n);
    expect(wallet.transactions.length).toBe(1);
    expect(wallet.transactions[0].amount.cents).toBe(500n);
  });

  it("preserves monetary precision — no float drift", () => {
    const wallet = makeWallet();
    // 333 cents debited and credited back 10 times should be exact
    for (let i = 0; i < 10; i++) {
      debit(wallet, 333n, `d${i}`);
      credit(wallet, 333n, `c${i}`);
    }
    expect(wallet.balance.cents).toBe(100000n);
  });
});
