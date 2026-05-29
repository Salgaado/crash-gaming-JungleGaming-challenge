import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import {
  EXCHANGES,
  QUEUES,
  RabbitMQService,
  WalletCreditRequestedEvent,
  WalletDebitRequestedEvent,
} from "../../infrastructure/messaging/rabbitmq.service";
import { WalletRepository } from "../../infrastructure/database/wallet.repository";
import {
  IdempotencyKey,
  TransactionId,
} from "../../domain/value-objects/ids.vo";
import { Money } from "../../domain/value-objects/money.vo";
import { InsufficientFundsError } from "../../domain/errors/domain-errors";

@Injectable()
export class WalletCommandsConsumerService implements OnModuleInit {
  private readonly logger = new Logger(WalletCommandsConsumerService.name);

  constructor(
    private readonly rabbitMQ: RabbitMQService,
    private readonly walletRepository: WalletRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rabbitMQ.consume(QUEUES.WALLET_DEBIT_REQUESTED, async (msg) => {
      const event: WalletDebitRequestedEvent = JSON.parse(msg.content.toString());
      await this.handleDebitRequested(event);
    });

    await this.rabbitMQ.consume(QUEUES.WALLET_CREDIT_REQUESTED, async (msg) => {
      const event: WalletCreditRequestedEvent = JSON.parse(msg.content.toString());
      await this.handleCreditRequested(event);
    });
  }

  private async handleDebitRequested(event: WalletDebitRequestedEvent): Promise<void> {
    this.logger.log(`Debit requested: ${event.idempotencyKey}`);

    // Idempotency check
    const alreadyProcessed = await this.walletRepository.transactionExistsByIdempotencyKey(
      event.idempotencyKey,
    );
    if (alreadyProcessed) {
      this.logger.warn(`Duplicate debit request: ${event.idempotencyKey}`);
      await this.publishDebitResult(event, true);
      return;
    }

    const wallet = await this.walletRepository.findByPlayerId(event.playerId);
    if (!wallet) {
      await this.publishDebitResult(event, false, "WALLET_NOT_FOUND");
      return;
    }

    try {
      const tx = wallet.debit(
        new TransactionId(uuidv4()),
        Money.fromCents(BigInt(event.amountCents)),
        event.referenceType,
        event.referenceId,
        new IdempotencyKey(event.idempotencyKey),
      );
      await this.walletRepository.save(wallet);
      await this.walletRepository.saveTransaction(tx);
      await this.publishDebitResult(event, true);
    } catch (err) {
      const reason = err instanceof InsufficientFundsError ? "INSUFFICIENT_FUNDS" : "INTERNAL_ERROR";
      await this.publishDebitResult(event, false, reason);
    }
  }

  private async handleCreditRequested(event: WalletCreditRequestedEvent): Promise<void> {
    this.logger.log(`Credit requested: ${event.idempotencyKey}`);

    const alreadyProcessed = await this.walletRepository.transactionExistsByIdempotencyKey(
      event.idempotencyKey,
    );
    if (alreadyProcessed) {
      await this.publishCreditResult(event, true);
      return;
    }

    const wallet = await this.walletRepository.findByPlayerId(event.playerId);
    if (!wallet) {
      await this.publishCreditResult(event, false, "WALLET_NOT_FOUND");
      return;
    }

    try {
      const tx = wallet.credit(
        new TransactionId(uuidv4()),
        Money.fromCents(BigInt(event.amountCents)),
        event.referenceType,
        event.referenceId,
        new IdempotencyKey(event.idempotencyKey),
      );
      await this.walletRepository.save(wallet);
      await this.walletRepository.saveTransaction(tx);
      await this.publishCreditResult(event, true);
    } catch {
      await this.publishCreditResult(event, false, "INTERNAL_ERROR");
    }
  }

  private async publishDebitResult(
    event: WalletDebitRequestedEvent,
    success: boolean,
    reason?: string,
  ): Promise<void> {
    await this.rabbitMQ.publish(EXCHANGES.WALLET_EVENTS, "wallet.debit.result.games", {
      eventId: uuidv4(),
      correlationId: event.eventId,
      idempotencyKey: event.idempotencyKey,
      playerId: event.playerId,
      referenceId: event.referenceId,
      success,
      reason,
      occurredAt: new Date().toISOString(),
    });
  }

  private async publishCreditResult(
    event: WalletCreditRequestedEvent,
    success: boolean,
    reason?: string,
  ): Promise<void> {
    await this.rabbitMQ.publish(EXCHANGES.WALLET_EVENTS, "wallet.credit.result.games", {
      eventId: uuidv4(),
      correlationId: event.eventId,
      idempotencyKey: event.idempotencyKey,
      playerId: event.playerId,
      referenceId: event.referenceId,
      success,
      reason,
      occurredAt: new Date().toISOString(),
    });
  }
}
