import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
  Post,
  Body,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { JwtGuard } from "../../infrastructure/auth/jwt.guard";
import { RoundRepository } from "../../infrastructure/database/round.repository";
import { PlaceBetUseCase } from "../../application/use-cases/place-bet.use-case";
import { CashOutUseCase } from "../../application/use-cases/cashout.use-case";
import { ProvablyFairService } from "../../domain/services/provably-fair.service";
import { Multiplier } from "../../domain/value-objects/multiplier.vo";
import { RoundStatus } from "../../domain/aggregates/round.aggregate";
@ApiTags("games")
@Controller()
export class RoundsController {
  constructor(
    private readonly roundRepository: RoundRepository,
    private readonly placeBetUseCase: PlaceBetUseCase,
    private readonly cashOutUseCase: CashOutUseCase,
  ) {}

  @Get("rounds/current")
  async getCurrent() {
    const round = await this.roundRepository.findCurrentRound();
    if (!round) {
      return { status: "WAITING", message: "No active round" };
    }

    const multiplier =
      round.status === RoundStatus.RUNNING
        ? round.currentMultiplier().toString()
        : "1.00x";

    return {
      roundId: round.id.value,
      roundIndex: round.roundIndex,
      status: round.status,
      serverSeedHash: round.serverSeedHash,
      multiplier,
      bettingClosesAt: round.bettingClosesAt.toISOString(),
      startedAt: round.startedAt?.toISOString() ?? null,
      bets: round.bets.map((b) => ({
        betId: b.id.value,
        playerId: b.playerId.value,
        amountCents: b.amount.cents.toString(),
        status: b.status,
        cashoutMultiplier: b.cashoutMultiplier?.toString() ?? null,
        payoutCents: b.payoutAmount?.cents.toString() ?? null,
      })),
    };
  }

  @Get("rounds/history")
  async getHistory(
    @Query("limit") limit = "20",
    @Query("offset") offset = "0",
  ) {
    const rounds = await this.roundRepository.findHistory(
      parseInt(limit),
      parseInt(offset),
    );
    return rounds.map((r) => ({
      roundId: r.id.value,
      roundIndex: r.roundIndex,
      crashPointScaled: r.crashPointScaled.toString(),
      crashPoint: Multiplier.fromScaled(r.crashPointScaled).toString(),
      crashedAt: r.crashedAt?.toISOString() ?? null,
      serverSeedHash: r.serverSeedHash,
      serverSeed: r.serverSeed,
      clientSeed: r.clientSeed,
    }));
  }

  @Get("rounds/:roundId/verify")
  async verify(@Param("roundId") roundId: string) {
    const round = await this.roundRepository.findById(roundId);
    if (!round) throw new NotFoundException("Round not found");
    return {
      roundId: round.id.value,
      roundIndex: round.roundIndex,
      serverSeed: round.serverSeed,
      serverSeedHash: round.serverSeedHash,
      clientSeed: round.clientSeed,
      crashPointScaled: round.crashPointScaled.toString(),
      crashPoint: Multiplier.fromScaled(round.crashPointScaled).toString(),
      verified: ProvablyFairService.verify(
        round.serverSeed,
        round.clientSeed,
        round.crashPointScaled,
      ),
    };
  }

  @Get("bets/me")
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  async getMyBets(
    @Request() req: any,
    @Query("limit") limit = "20",
    @Query("offset") offset = "0",
  ) {
    const playerId: string = req.user.sub;
    const bets = await this.roundRepository.findBetsWithRoundByPlayer(
      playerId,
      parseInt(limit),
      parseInt(offset),
    );
    return bets.map((b) => ({
      betId: b.id,
      roundId: b.roundId,
      roundIndex: b.roundIndex,
      amountCents: b.amountCents.toString(),
      status: b.status,
      cashoutMultiplier: b.cashoutMultiplier
        ? Multiplier.fromScaled(b.cashoutMultiplier).toString()
        : null,
      payoutCents: b.payoutCents?.toString() ?? null,
      crashPoint: Multiplier.fromScaled(b.crashPointScaled).toString(),
      createdAt: b.createdAt.toISOString(),
    }));
  }

  @Post("bet")
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  async placeBet(@Request() req: any, @Body() body: { amountCents: string }) {
    const playerId: string = req.user.sub;
    const amountCents = BigInt(body.amountCents);
    try {
      return await this.placeBetUseCase.execute({ playerId, amountCents });
    } catch (err: any) {
      throw new BadRequestException(err.message ?? "Failed to place bet");
    }
  }

  @Post("bet/cashout")
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  async cashOut(@Request() req: any) {
    const playerId: string = req.user.sub;
    try {
      return await this.cashOutUseCase.execute({ playerId });
    } catch (err: any) {
      throw new BadRequestException(err.message ?? "Failed to cash out");
    }
  }
}
