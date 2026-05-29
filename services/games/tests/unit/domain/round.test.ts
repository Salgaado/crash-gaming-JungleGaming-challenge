import { describe, expect, it } from "bun:test";
import { Round, RoundStatus } from "../../../src/domain/aggregates/round.aggregate";
import { Bet, BetStatus } from "../../../src/domain/entities/bet.entity";
import {
  BetAlreadyExistsError,
  BetNotFoundError,
  BettingClosedError,
  InvalidRoundTransitionError,
  RoundNotRunningError,
} from "../../../src/domain/errors/domain-errors";
import { BetId, PlayerId, RoundId } from "../../../src/domain/value-objects/ids.vo";
import { Money } from "../../../src/domain/value-objects/money.vo";
import { Multiplier } from "../../../src/domain/value-objects/multiplier.vo";

const makeRound = (status = RoundStatus.BETTING_OPEN) =>
  Round.create({
    id: new RoundId("round-1"),
    status,
    roundIndex: 1,
    crashPointScaled: 200n,
    serverSeed: "seed",
    serverSeedHash: "hash",
    clientSeed: "1",
    bettingOpenedAt: new Date(),
    bettingClosesAt: new Date(Date.now() + 10000),
    bets: [],
  });

const makeBet = (playerId = "player-1", betId = "bet-1") =>
  Bet.create(
    new BetId(betId),
    new RoundId("round-1"),
    new PlayerId(playerId),
    Money.fromCents(500n),
  );

describe("Round", () => {
  it("starts in BETTING_OPEN status", () => {
    expect(makeRound().status).toBe(RoundStatus.BETTING_OPEN);
  });

  it("transitions to RUNNING", () => {
    const round = makeRound();
    round.startRound();
    expect(round.status).toBe(RoundStatus.RUNNING);
  });

  it("throws on invalid transition from RUNNING to RUNNING", () => {
    const round = makeRound(RoundStatus.RUNNING);
    expect(() => round.startRound()).toThrow(InvalidRoundTransitionError);
  });

  it("accepts bet in BETTING_OPEN", () => {
    const round = makeRound();
    round.placeBet(makeBet());
    expect(round.bets.length).toBe(1);
  });

  it("rejects bet when not BETTING_OPEN", () => {
    const round = makeRound(RoundStatus.RUNNING);
    expect(() => round.placeBet(makeBet())).toThrow(BettingClosedError);
  });

  it("rejects duplicate bet from same player", () => {
    const round = makeRound();
    round.placeBet(makeBet("p1", "bet-1"));
    const duplicate = makeBet("p1", "bet-2");
    expect(() => round.placeBet(duplicate)).toThrow(BetAlreadyExistsError);
  });

  it("crashes round and marks pending bets as lost", () => {
    const round = makeRound();
    const bet = makeBet("p1");
    round.placeBet(bet);
    bet.confirmDebit(); // now PENDING
    round.startRound();
    round.crash();
    expect(round.status).toBe(RoundStatus.CRASHED);
    expect(bet.status).toBe(BetStatus.LOST);
  });

  it("does not mark cashed-out bets as lost on crash", () => {
    const round = makeRound();
    const bet = makeBet("p1");
    round.placeBet(bet);
    bet.confirmDebit();
    round.startRound();
    round.cashOut(new PlayerId("p1"), Multiplier.fromScaled(150n));
    round.crash();
    expect(bet.status).toBe(BetStatus.CASHOUT_PENDING_CREDIT);
  });

  it("throws when cashing out in non-RUNNING round", () => {
    const round = makeRound();
    expect(() =>
      round.cashOut(new PlayerId("p1"), Multiplier.fromScaled(150n)),
    ).toThrow(RoundNotRunningError);
  });

  it("throws when player has no pending bet", () => {
    const round = makeRound(RoundStatus.RUNNING);
    expect(() =>
      round.cashOut(new PlayerId("nobody"), Multiplier.fromScaled(150n)),
    ).toThrow(BetNotFoundError);
  });

  it("calculates payout correctly on cashout", () => {
    const round = makeRound();
    const bet = makeBet("p1");
    round.placeBet(bet);
    bet.confirmDebit();
    round.startRound();
    const cashedBet = round.cashOut(new PlayerId("p1"), Multiplier.fromScaled(250n));
    // 500 cents * 250 / 100 = 1250 cents
    expect(cashedBet.payoutAmount?.cents).toBe(1250n);
  });
});
