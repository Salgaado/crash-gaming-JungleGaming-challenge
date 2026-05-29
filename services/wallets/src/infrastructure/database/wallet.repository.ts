import { Injectable } from "@nestjs/common";
import {
  Wallet,
  TransactionType,
  WalletTransaction,
} from "../../domain/aggregates/wallet.aggregate";
import {
  IdempotencyKey,
  PlayerId,
  TransactionId,
  WalletId,
} from "../../domain/value-objects/ids.vo";
import { Money } from "../../domain/value-objects/money.vo";
import { PrismaService } from "./prisma.service";

@Injectable()
export class WalletRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(wallet: Wallet): Promise<void> {
    await this.prisma.wallet.upsert({
      where: { id: wallet.id.value },
      create: {
        id: wallet.id.value,
        playerId: wallet.playerId.value,
        balanceCents: wallet.balance.cents,
        createdAt: wallet.createdAt,
      },
      update: {
        balanceCents: wallet.balance.cents,
      },
    });
  }

  async saveTransaction(tx: WalletTransaction): Promise<void> {
    await this.prisma.walletTransaction.create({
      data: {
        id: tx.id.value,
        walletId: tx.walletId.value,
        playerId: tx.playerId.value,
        type: tx.type as any,
        amountCents: tx.amount.cents,
        referenceType: tx.referenceType,
        referenceId: tx.referenceId,
        idempotencyKey: tx.idempotencyKey.value,
        createdAt: tx.createdAt,
      },
    });
  }

  async findByPlayerId(playerId: string): Promise<Wallet | null> {
    const row = await this.prisma.wallet.findUnique({
      where: { playerId },
      include: { transactions: true },
    });
    return row ? this.toDomain(row) : null;
  }

  async transactionExistsByIdempotencyKey(key: string): Promise<boolean> {
    const tx = await this.prisma.walletTransaction.findUnique({
      where: { idempotencyKey: key },
    });
    return !!tx;
  }

  private toDomain(row: any): Wallet {
    const transactions: WalletTransaction[] = (row.transactions ?? []).map(
      (t: any) => ({
        id: new TransactionId(t.id),
        walletId: new WalletId(t.walletId),
        playerId: new PlayerId(t.playerId),
        type: t.type as TransactionType,
        amount: Money.fromCents(t.amountCents),
        referenceType: t.referenceType,
        referenceId: t.referenceId,
        idempotencyKey: new IdempotencyKey(t.idempotencyKey),
        createdAt: t.createdAt,
      }),
    );

    return Wallet.reconstitute({
      id: new WalletId(row.id),
      playerId: new PlayerId(row.playerId),
      balance: Money.fromCents(row.balanceCents),
      transactions,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
