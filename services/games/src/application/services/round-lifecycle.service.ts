import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { Round, RoundStatus } from "../../domain/aggregates/round.aggregate";
import { RoundId } from "../../domain/value-objects/ids.vo";
import { Multiplier } from "../../domain/value-objects/multiplier.vo";
import { ProvablyFairService } from "../../domain/services/provably-fair.service";
import { RoundRepository } from "../../infrastructure/database/round.repository";
import { GameGateway } from "../../presentation/gateways/game.gateway";

const BETTING_WINDOW_MS = parseInt(process.env.BETTING_WINDOW_MS ?? "10000");
const TICK_MS = parseInt(process.env.ROUND_TICK_MS ?? "100");

@Injectable()
export class RoundLifecycleService implements OnModuleInit {
  private readonly logger = new Logger(RoundLifecycleService.name);
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private currentRoundId: string | null = null;

  constructor(
    private readonly roundRepository: RoundRepository,
    private readonly gateway: GameGateway,
  ) {}

  async onModuleInit(): Promise<void> {
    // Small delay to ensure DB is ready
    setTimeout(() => this.startCycle(), 2000);
  }

  private async startCycle(): Promise<void> {
    try {
      await this.openBettingPhase();
    } catch (err) {
      this.logger.error("Failed to start round cycle", err);
      setTimeout(() => this.startCycle(), 5000);
    }
  }

  private async openBettingPhase(): Promise<void> {
    const roundIndex = await this.roundRepository.getNextRoundIndex();
    const { serverSeed, serverSeedHash, crashPointScaled } =
      ProvablyFairService.prepareCrashPoint(roundIndex);

    const now = new Date();
    const bettingClosesAt = new Date(now.getTime() + BETTING_WINDOW_MS);

    const round = Round.create({
      id: new RoundId(uuidv4()),
      status: RoundStatus.BETTING_OPEN,
      roundIndex,
      crashPointScaled,
      serverSeed,
      serverSeedHash,
      clientSeed: roundIndex.toString(),
      bettingOpenedAt: now,
      bettingClosesAt,
      bets: [],
    });

    await this.roundRepository.save(round);
    this.currentRoundId = round.id.value;

    this.gateway.emitBettingOpened({
      roundId: round.id.value,
      roundIndex,
      serverSeedHash,
      bettingClosesAt: bettingClosesAt.toISOString(),
    });

    this.logger.log(`[Round ${roundIndex}] Betting opened — crash at ${Multiplier.fromScaled(crashPointScaled).toString()}`);

    setTimeout(() => this.startRound(round.id.value), BETTING_WINDOW_MS);
  }

  private async startRound(roundId: string): Promise<void> {
    const round = await this.roundRepository.findById(roundId);
    if (!round) return;

    round.startRound();
    await this.roundRepository.save(round);

    this.gateway.emitRoundStarted({
      roundId: round.id.value,
      roundIndex: round.roundIndex,
      startedAt: round.startedAt!.toISOString(),
      serverSeedHash: round.serverSeedHash,
    });

    this.logger.log(`[Round ${round.roundIndex}] Running`);
    this.startTick(roundId, round.startedAt!);
  }

  private startTick(roundId: string, startedAt: Date): void {
    this.tickInterval = setInterval(async () => {
      const round = await this.roundRepository.findById(roundId);
      if (!round || round.status !== RoundStatus.RUNNING) {
        this.clearTick();
        return;
      }

      const elapsedMs = Date.now() - startedAt.getTime();
      const multiplier = Multiplier.fromElapsedMs(elapsedMs);

      // Send snapshot every tick for real-time sync
      this.gateway.emitRoundSnapshot({
        roundId,
        multiplierScaled: multiplier.scaled.toString(),
        elapsedMs,
      });

      if (round.hasCrashed(multiplier)) {
        this.clearTick();
        await this.crashRound(roundId);
      }
    }, TICK_MS);
  }

  private clearTick(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  private async crashRound(roundId: string): Promise<void> {
    const round = await this.roundRepository.findById(roundId);
    if (!round) return;

    round.crash();
    await this.roundRepository.save(round);

    this.gateway.emitRoundCrashed({
      roundId: round.id.value,
      crashPointScaled: round.crashPointScaled.toString(),
      serverSeed: round.serverSeed,
      clientSeed: round.clientSeed,
      crashedAt: round.crashedAt!.toISOString(),
    });

    this.logger.log(`[Round ${round.roundIndex}] Crashed at ${Multiplier.fromScaled(round.crashPointScaled).toString()}`);

    round.settle();
    await this.roundRepository.save(round);

    // Wait 3 seconds then start next round
    setTimeout(() => this.openBettingPhase(), 3000);
  }
}
