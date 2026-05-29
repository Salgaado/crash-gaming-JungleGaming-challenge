import { Injectable } from "@nestjs/common";
import { Bet, BetStatus } from "../../domain/entities/bet.entity";
import { Round, RoundStatus } from "../../domain/aggregates/round.aggregate";
import { BetId, PlayerId, RoundId } from "../../domain/value-objects/ids.vo";
import { Money } from "../../domain/value-objects/money.vo";
import { Multiplier } from "../../domain/value-objects/multiplier.vo";
import { PrismaService } from "./prisma.service";

@Injectable()
export class RoundRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(round: Round): Promise<void> {
    await this.prisma.round.upsert({
      where: { id: round.id.value },
      create: {
        id: round.id.value,
        roundIndex: round.roundIndex,
        status: round.status as any,
        crashPointScaled: round.crashPointScaled,
        serverSeed: round.serverSeed,
        serverSeedHash: round.serverSeedHash,
        clientSeed: round.clientSeed,
        bettingOpenedAt: round.bettingOpenedAt,
        bettingClosesAt: round.bettingClosesAt,
        startedAt: round.startedAt ?? null,
        crashedAt: round.crashedAt ?? null,
      },
      update: {
        status: round.status as any,
        startedAt: round.startedAt ?? null,
        crashedAt: round.crashedAt ?? null,
      },
    });

    for (const bet of round.bets) {
      await this.prisma.bet.upsert({
        where: { id: bet.id.value },
        create: {
          id: bet.id.value,
          roundId: round.id.value,
          playerId: bet.playerId.value,
          amountCents: bet.amount.cents,
          status: bet.status as any,
          cashoutMultiplier: bet.cashoutMultiplier?.scaled ?? null,
          payoutCents: bet.payoutAmount?.cents ?? null,
          createdAt: bet.createdAt,
          cashedOutAt: bet.cashedOutAt ?? null,
        },
        update: {
          status: bet.status as any,
          cashoutMultiplier: bet.cashoutMultiplier?.scaled ?? null,
          payoutCents: bet.payoutAmount?.cents ?? null,
          cashedOutAt: bet.cashedOutAt ?? null,
        },
      });
    }
  }

  async findCurrentRound(): Promise<Round | null> {
    const row = await this.prisma.round.findFirst({
      where: {
        status: { in: [RoundStatus.BETTING_OPEN, RoundStatus.RUNNING] as any[] },
      },
      include: { bets: true },
      orderBy: { roundIndex: "desc" },
    });
    return row ? this.toDomain(row) : null;
  }

  async findById(id: string): Promise<Round | null> {
    const row = await this.prisma.round.findUnique({
      where: { id },
      include: { bets: true },
    });
    return row ? this.toDomain(row) : null;
  }

  async findHistory(limit = 20, offset = 0): Promise<Round[]> {
    const rows = await this.prisma.round.findMany({
      where: { status: RoundStatus.SETTLED as any },
      include: { bets: true },
      orderBy: { roundIndex: "desc" },
      take: limit,
      skip: offset,
    });
    return rows.map((r) => this.toDomain(r));
  }

  async getNextRoundIndex(): Promise<number> {
    const last = await this.prisma.round.findFirst({
      orderBy: { roundIndex: "desc" },
    });
    return (last?.roundIndex ?? 0) + 1;
  }

  async saveBet(bet: Bet): Promise<void> {
    await this.prisma.bet.upsert({
      where: { id: bet.id.value },
      create: {
        id: bet.id.value,
        roundId: bet.roundId.value,
        playerId: bet.playerId.value,
        amountCents: bet.amount.cents,
        status: bet.status as any,
        cashoutMultiplier: null,
        payoutCents: null,
        createdAt: bet.createdAt,
        cashedOutAt: null,
      },
      update: {
        status: bet.status as any,
        cashoutMultiplier: bet.cashoutMultiplier?.scaled ?? null,
        payoutCents: bet.payoutAmount?.cents ?? null,
        cashedOutAt: bet.cashedOutAt ?? null,
      },
    });
  }

  async findBetsByPlayer(playerId: string, limit = 20, offset = 0): Promise<Bet[]> {
    const rows = await this.prisma.bet.findMany({
      where: { playerId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });
    return rows.map((r) => this.betToDomain(r));
  }

  async findBetsWithRoundByPlayer(
    playerId: string,
    limit = 20,
    offset = 0,
  ): Promise<Array<{
    id: string;
    roundId: string;
    roundIndex: number;
    amountCents: bigint;
    status: string;
    cashoutMultiplier: bigint | null;
    payoutCents: bigint | null;
    crashPointScaled: bigint;
    createdAt: Date;
  }>> {
    const rows = await this.prisma.bet.findMany({
      where: { playerId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        round: { select: { roundIndex: true, crashPointScaled: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      roundId: r.roundId,
      roundIndex: r.round.roundIndex,
      amountCents: r.amountCents,
      status: r.status,
      cashoutMultiplier: r.cashoutMultiplier,
      payoutCents: r.payoutCents,
      crashPointScaled: r.round.crashPointScaled,
      createdAt: r.createdAt,
    }));
  }

  private toDomain(row: any): Round {
    const bets = (row.bets ?? []).map((b: any) => this.betToDomain(b));
    return Round.reconstitute({
      id: new RoundId(row.id),
      status: row.status as RoundStatus,
      roundIndex: row.roundIndex,
      crashPointScaled: row.crashPointScaled,
      serverSeed: row.serverSeed,
      serverSeedHash: row.serverSeedHash,
      clientSeed: row.clientSeed,
      bettingOpenedAt: row.bettingOpenedAt,
      bettingClosesAt: row.bettingClosesAt,
      startedAt: row.startedAt ?? undefined,
      crashedAt: row.crashedAt ?? undefined,
      bets,
    });
  }

  private betToDomain(row: any): Bet {
    return Bet.reconstitute({
      id: new BetId(row.id),
      roundId: new RoundId(row.roundId),
      playerId: new PlayerId(row.playerId),
      amount: Money.fromCents(row.amountCents),
      status: row.status as BetStatus,
      cashoutMultiplier: row.cashoutMultiplier
        ? Multiplier.fromScaled(row.cashoutMultiplier)
        : undefined,
      payoutAmount: row.payoutCents ? Money.fromCents(row.payoutCents) : undefined,
      createdAt: row.createdAt,
      cashedOutAt: row.cashedOutAt ?? undefined,
    });
  }
}
