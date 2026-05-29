import {
  BetAlreadyExistsError,
  BetNotFoundError,
  BettingClosedError,
  InvalidRoundTransitionError,
  RoundNotRunningError,
} from "../errors/domain-errors";
import { Bet, BetStatus } from "../entities/bet.entity";
import { BetId, PlayerId, RoundId } from "../value-objects/ids.vo";
import { Money } from "../value-objects/money.vo";
import { Multiplier } from "../value-objects/multiplier.vo";

export enum RoundStatus {
  BETTING_OPEN = "BETTING_OPEN",
  RUNNING = "RUNNING",
  CRASHED = "CRASHED",
  SETTLED = "SETTLED",
}

export interface RoundProps {
  id: RoundId;
  status: RoundStatus;
  roundIndex: number;
  crashPointScaled: bigint;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  bettingOpenedAt: Date;
  bettingClosesAt: Date;
  startedAt?: Date;
  crashedAt?: Date;
  bets: Bet[];
}

export class Round {
  private constructor(private props: RoundProps) {}

  static create(props: RoundProps): Round {
    return new Round(props);
  }

  static reconstitute(props: RoundProps): Round {
    return new Round(props);
  }

  startRound(): void {
    if (this.props.status !== RoundStatus.BETTING_OPEN) {
      throw new InvalidRoundTransitionError(this.props.status, RoundStatus.RUNNING);
    }
    this.props.status = RoundStatus.RUNNING;
    this.props.startedAt = new Date();
  }

  placeBet(bet: Bet): void {
    if (this.props.status !== RoundStatus.BETTING_OPEN) {
      throw new BettingClosedError();
    }
    const duplicate = this.props.bets.find((b) =>
      b.playerId.equals(bet.playerId),
    );
    if (duplicate) throw new BetAlreadyExistsError();
    this.props.bets.push(bet);
  }

  cashOut(playerId: PlayerId, currentMultiplier: Multiplier): Bet {
    if (this.props.status !== RoundStatus.RUNNING) {
      throw new RoundNotRunningError();
    }
    const bet = this.props.bets.find(
      (b) => b.playerId.equals(playerId) && b.isPending(),
    );
    if (!bet) throw new BetNotFoundError();
    bet.cashOut(currentMultiplier);
    return bet;
  }

  crash(): void {
    if (this.props.status !== RoundStatus.RUNNING) {
      throw new InvalidRoundTransitionError(this.props.status, RoundStatus.CRASHED);
    }
    this.props.status = RoundStatus.CRASHED;
    this.props.crashedAt = new Date();
    for (const bet of this.props.bets) {
      bet.markLost();
    }
  }

  settle(): void {
    if (this.props.status !== RoundStatus.CRASHED) {
      throw new InvalidRoundTransitionError(this.props.status, RoundStatus.SETTLED);
    }
    this.props.status = RoundStatus.SETTLED;
  }

  currentMultiplier(): Multiplier {
    if (!this.props.startedAt) return Multiplier.INITIAL;
    const elapsedMs = Date.now() - this.props.startedAt.getTime();
    return Multiplier.fromElapsedMs(elapsedMs);
  }

  hasCrashed(multiplier: Multiplier): boolean {
    return multiplier.isGreaterThanOrEqual(
      Multiplier.fromScaled(this.props.crashPointScaled),
    );
  }

  getBetByPlayer(playerId: PlayerId): Bet | undefined {
    return this.props.bets.find((b) => b.playerId.equals(playerId));
  }

  get id(): RoundId { return this.props.id; }
  get status(): RoundStatus { return this.props.status; }
  get roundIndex(): number { return this.props.roundIndex; }
  get crashPointScaled(): bigint { return this.props.crashPointScaled; }
  get serverSeed(): string { return this.props.serverSeed; }
  get serverSeedHash(): string { return this.props.serverSeedHash; }
  get clientSeed(): string { return this.props.clientSeed; }
  get bettingOpenedAt(): Date { return this.props.bettingOpenedAt; }
  get bettingClosesAt(): Date { return this.props.bettingClosesAt; }
  get startedAt(): Date | undefined { return this.props.startedAt; }
  get crashedAt(): Date | undefined { return this.props.crashedAt; }
  get bets(): ReadonlyArray<Bet> { return this.props.bets; }
}
