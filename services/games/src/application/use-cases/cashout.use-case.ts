import { Injectable } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { PlayerId } from "../../domain/value-objects/ids.vo";
import { RoundRepository } from "../../infrastructure/database/round.repository";
import {
  EXCHANGES,
  RabbitMQService,
  WalletCreditRequestedEvent,
} from "../../infrastructure/messaging/rabbitmq.service";
import { GameGateway } from "../../presentation/gateways/game.gateway";

export interface CashOutDto {
  playerId: string;
}

@Injectable()
export class CashOutUseCase {
  constructor(
    private readonly roundRepository: RoundRepository,
    private readonly rabbitMQ: RabbitMQService,
    private readonly gateway: GameGateway,
  ) {}

  async execute(dto: CashOutDto): Promise<{ payoutCents: string; multiplier: string }> {
    const round = await this.roundRepository.findCurrentRound();
    if (!round) throw new Error("ROUND_NOT_RUNNING");

    const currentMultiplier = round.currentMultiplier();
    const bet = round.cashOut(new PlayerId(dto.playerId), currentMultiplier);
    await this.roundRepository.save(round);

    const payoutCents = bet.payoutAmount!.cents;
    const idempotencyKey = `cashout-credit:${round.id.value}:${bet.id.value}:${dto.playerId}`;
    const event: WalletCreditRequestedEvent = {
      eventId: uuidv4(),
      idempotencyKey,
      playerId: dto.playerId,
      amountCents: payoutCents.toString(),
      referenceType: "CASHOUT_CREDIT",
      referenceId: bet.id.value,
      roundId: round.id.value,
      occurredAt: new Date().toISOString(),
    };
    await this.rabbitMQ.publish(EXCHANGES.WALLET_COMMANDS, "wallet.credit.requested", event);

    this.gateway.emitBetCashedOut({
      betId: bet.id.value,
      roundId: round.id.value,
      playerId: dto.playerId,
      multiplier: currentMultiplier.toString(),
      payoutCents: payoutCents.toString(),
    });

    return { payoutCents: payoutCents.toString(), multiplier: currentMultiplier.toString() };
  }
}
