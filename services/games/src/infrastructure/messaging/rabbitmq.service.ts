import * as amqp from "amqplib";
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";

export const EXCHANGES = {
  WALLET_COMMANDS: "wallet.commands",
  WALLET_EVENTS: "wallet.events",
} as const;

export const QUEUES = {
  WALLET_DEBIT_REQUESTED: "wallet.debit.requested",
  WALLET_CREDIT_REQUESTED: "wallet.credit.requested",
  WALLET_DEBIT_RESULT: "wallet.debit.result.games",
  WALLET_CREDIT_RESULT: "wallet.credit.result.games",
} as const;

export interface WalletDebitRequestedEvent {
  eventId: string;
  idempotencyKey: string;
  playerId: string;
  amountCents: string; // bigint serialized as string
  referenceType: string;
  referenceId: string;
  roundId: string;
  occurredAt: string;
}

export interface WalletCreditRequestedEvent {
  eventId: string;
  idempotencyKey: string;
  playerId: string;
  amountCents: string;
  referenceType: string;
  referenceId: string;
  roundId: string;
  occurredAt: string;
}

export interface WalletDebitResultEvent {
  eventId: string;
  correlationId: string;
  idempotencyKey: string;
  playerId: string;
  referenceId: string;
  success: boolean;
  reason?: string;
  occurredAt: string;
}

export interface WalletCreditResultEvent {
  eventId: string;
  correlationId: string;
  idempotencyKey: string;
  playerId: string;
  referenceId: string;
  success: boolean;
  reason?: string;
  occurredAt: string;
}

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: amqp.Connection | null = null;
  private publishChannel: amqp.Channel | null = null;
  private connectionReady: Promise<void> | null = null;

  async onModuleInit(): Promise<void> {
    this.connectionReady = this.connect();
    await this.connectionReady;
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  private async connect(): Promise<void> {
    const url = process.env.RABBITMQ_URL ?? "amqp://admin:admin@rabbitmq:5672";
    let retries = 10;
    while (retries > 0) {
      try {
        this.connection = await amqp.connect(url);
        this.publishChannel = await this.connection.createChannel();

        // Declare exchanges
        await this.publishChannel!.assertExchange(EXCHANGES.WALLET_COMMANDS, "direct", { durable: true });
        await this.publishChannel!.assertExchange(EXCHANGES.WALLET_EVENTS, "direct", { durable: true });

        // Declare queues for receiving results
        await this.publishChannel!.assertQueue(QUEUES.WALLET_DEBIT_RESULT, { durable: true });
        await this.publishChannel!.assertQueue(QUEUES.WALLET_CREDIT_RESULT, { durable: true });
        await this.publishChannel!.bindQueue(QUEUES.WALLET_DEBIT_RESULT, EXCHANGES.WALLET_EVENTS, "wallet.debit.result.games");
        await this.publishChannel!.bindQueue(QUEUES.WALLET_CREDIT_RESULT, EXCHANGES.WALLET_EVENTS, "wallet.credit.result.games");

        this.logger.log("RabbitMQ connected");
        return;
      } catch (err) {
        retries--;
        this.logger.warn(`RabbitMQ connection failed, retrying... (${retries} left)`);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
    throw new Error("Could not connect to RabbitMQ after retries");
  }

  private async disconnect(): Promise<void> {
    try {
      await this.publishChannel?.close();
      await this.connection?.close();
    } catch {}
  }

  async publish(exchange: string, routingKey: string, payload: object): Promise<void> {
    const msg = Buffer.from(JSON.stringify(payload));
    this.publishChannel?.publish(exchange, routingKey, msg, { persistent: true });
  }

  async consume(
    queue: string,
    handler: (msg: amqp.ConsumeMessage) => Promise<void>,
  ): Promise<void> {
    if (this.connectionReady) await this.connectionReady;
    const channel = await this.connection!.createChannel();
    await channel.assertQueue(queue, { durable: true });
    await channel.prefetch(1);
    await channel.consume(queue, async (msg: amqp.ConsumeMessage | null) => {
      if (!msg) return;
      try {
        await handler(msg);
        channel.ack(msg);
      } catch (err) {
        this.logger.error("Message handler error", err);
        channel.nack(msg, false, true); // requeue
      }
    });
    this.logger.log(`Consuming queue: ${queue}`);
  }
}
