import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import {
  QUEUES,
  RabbitMQService,
  WalletDebitResultEvent,
  WalletCreditResultEvent,
} from "../../infrastructure/messaging/rabbitmq.service";
import { RoundRepository } from "../../infrastructure/database/round.repository";
import { GameGateway } from "../../presentation/gateways/game.gateway";

@Injectable()
export class WalletEventsConsumerService implements OnModuleInit {
  private readonly logger = new Logger(WalletEventsConsumerService.name);

  constructor(
    private readonly rabbitMQ: RabbitMQService,
    private readonly roundRepository: RoundRepository,
    private readonly gateway: GameGateway,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rabbitMQ.consume(QUEUES.WALLET_DEBIT_RESULT, async (msg) => {
      const event: WalletDebitResultEvent = JSON.parse(msg.content.toString());
      await this.handleDebitResult(event);
    });

    await this.rabbitMQ.consume(QUEUES.WALLET_CREDIT_RESULT, async (msg) => {
      const event: WalletCreditResultEvent = JSON.parse(msg.content.toString());
      await this.handleCreditResult(event);
    });
  }

  private async handleDebitResult(event: WalletDebitResultEvent): Promise<void> {
    this.logger.log(`Debit result for bet ${event.referenceId}: ${event.success ? "OK" : event.reason}`);

    const rounds = await this.roundRepository.findCurrentRound();
    if (!rounds) return;

    const bet = rounds.bets.find((b) => b.id.value === event.referenceId);
    if (!bet) return;

    if (event.success) {
      bet.confirmDebit();
    } else {
      bet.rejectDebit();
      this.gateway.emitBetRejected({
        betId: event.referenceId,
        playerId: event.playerId,
        reason: event.reason ?? "WALLET_ERROR",
      });
    }
    await this.roundRepository.save(rounds);
  }

  private async handleCreditResult(event: WalletCreditResultEvent): Promise<void> {
    this.logger.log(`Credit result for bet ${event.referenceId}: ${event.success ? "OK" : event.reason}`);

    const round = await this.roundRepository.findCurrentRound();
    if (!round) return;

    const bet = round.bets.find((b) => b.id.value === event.referenceId);
    if (!bet) return;

    if (event.success) {
      bet.confirmCredit();
      this.gateway.emitWalletUpdated({
        playerId: event.playerId,
        balanceCents: "0", // frontend will re-fetch wallet
      });
    }
    await this.roundRepository.save(round);
  }
}
