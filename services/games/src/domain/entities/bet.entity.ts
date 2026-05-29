import {
  BetAlreadyCashedOutError,
  InvalidBetAmountError,
} from "../errors/domain-errors";
import { BetId, PlayerId, RoundId } from "../value-objects/ids.vo";
import { MAX_BET, MIN_BET, Money } from "../value-objects/money.vo";
import { Multiplier } from "../value-objects/multiplier.vo";

export enum BetStatus {
  PENDING_DEBIT = "PENDING_DEBIT",
  PENDING = "PENDING",
  CASHOUT_PENDING_CREDIT = "CASHOUT_PENDING_CREDIT",
  CASHED_OUT = "CASHED_OUT",
  LOST = "LOST",
  REJECTED = "REJECTED",
}

export interface BetProps {
  id: BetId;
  roundId: RoundId;
  playerId: PlayerId;
  amount: Money;
  status: BetStatus;
  cashoutMultiplier?: Multiplier;
  payoutAmount?: Money;
  createdAt: Date;
  cashedOutAt?: Date;
}

export class Bet {
  private constructor(private props: BetProps) {}

  static create(id: BetId, roundId: RoundId, playerId: PlayerId, amount: Money): Bet {
    if (amount.isLessThan(MIN_BET)) {
      throw new InvalidBetAmountError(`Minimum bet is ${MIN_BET.toString()}`);
    }
    if (amount.isGreaterThan(MAX_BET)) {
      throw new InvalidBetAmountError(`Maximum bet is ${MAX_BET.toString()}`);
    }
    return new Bet({
      id,
      roundId,
      playerId,
      amount,
      status: BetStatus.PENDING_DEBIT,
      createdAt: new Date(),
    });
  }

  static reconstitute(props: BetProps): Bet {
    return new Bet(props);
  }

  confirmDebit(): void {
    this.props.status = BetStatus.PENDING;
  }

  rejectDebit(): void {
    this.props.status = BetStatus.REJECTED;
  }

  cashOut(multiplier: Multiplier): void {
    if (this.props.status === BetStatus.CASHED_OUT) {
      throw new BetAlreadyCashedOutError();
    }
    if (this.props.status !== BetStatus.PENDING) {
      throw new BetAlreadyCashedOutError();
    }
    const payout = this.props.amount.multiplyByScaled(multiplier.scaled, Multiplier.SCALE);
    this.props.cashoutMultiplier = multiplier;
    this.props.payoutAmount = payout;
    this.props.status = BetStatus.CASHOUT_PENDING_CREDIT;
    this.props.cashedOutAt = new Date();
  }

  confirmCredit(): void {
    this.props.status = BetStatus.CASHED_OUT;
  }

  markLost(): void {
    if (this.props.status === BetStatus.CASHED_OUT) return;
    if (this.props.status === BetStatus.CASHOUT_PENDING_CREDIT) return;
    this.props.status = BetStatus.LOST;
  }

  get id(): BetId { return this.props.id; }
  get roundId(): RoundId { return this.props.roundId; }
  get playerId(): PlayerId { return this.props.playerId; }
  get amount(): Money { return this.props.amount; }
  get status(): BetStatus { return this.props.status; }
  get cashoutMultiplier(): Multiplier | undefined { return this.props.cashoutMultiplier; }
  get payoutAmount(): Money | undefined { return this.props.payoutAmount; }
  get createdAt(): Date { return this.props.createdAt; }
  get cashedOutAt(): Date | undefined { return this.props.cashedOutAt; }

  isPending(): boolean {
    return this.props.status === BetStatus.PENDING;
  }
}
