import { Injectable, Logger } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { Bet } from "../../domain/entities/bet.entity";
import { BetId, PlayerId } from "../../domain/value-objects/ids.vo";
import { Money } from "../../domain/value-objects/money.vo";
import { RoundRepository } from "../../infrastructure/database/round.repository";
import {
  EXCHANGES,
  RabbitMQService,
  WalletDebitRequestedEvent,
} from "../../infrastructure/messaging/rabbitmq.service";
import { GameGateway } from "../../presentation/gateways/game.gateway";

export interface PlaceBetDto {
  playerId: string;
  amountCents: bigint;
}

@Injectable()
export class PlaceBetUseCase {
  private readonly logger = new Logger(PlaceBetUseCase.name);

  constructor(
    private readonly roundRepository: RoundRepository,
    private readonly rabbitMQ: RabbitMQService,
    private readonly gateway: GameGateway,
  ) {}

  async execute(dto: PlaceBetDto): Promise<{ betId: string }> {
    const round = await this.roundRepository.findCurrentRound();
    if (!round) throw new Error("BETTING_CLOSED");

    const amount = Money.fromCents(dto.amountCents);
    const betId = uuidv4();
    const bet = Bet.create(
      new BetId(betId),
      round.id,
      new PlayerId(dto.playerId),
      amount,
    );

    round.placeBet(bet);
    await this.roundRepository.save(round);

    // Publish debit command to Wallet Service
    const idempotencyKey = `bet-debit:${round.id.value}:${betId}:${dto.playerId}`;
    const event: WalletDebitRequestedEvent = {
      eventId: uuidv4(),
      idempotencyKey,
      playerId: dto.playerId,
      amountCents: dto.amountCents.toString(),
      referenceType: "BET_DEBIT",
      referenceId: betId,
      roundId: round.id.value,
      occurredAt: new Date().toISOString(),
    };
    await this.rabbitMQ.publish(EXCHANGES.WALLET_COMMANDS, "wallet.debit.requested", event);

    // Notify all clients about the new bet
    this.gateway.emitBetPlaced({
      betId,
      roundId: round.id.value,
      playerId: dto.playerId,
      amountCents: dto.amountCents.toString(),
    });

    return { betId };
  }
}
