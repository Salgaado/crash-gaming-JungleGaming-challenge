import {
  InsufficientFundsError,
  InvalidAmountError,
} from "../errors/domain-errors";
import { IdempotencyKey, PlayerId, TransactionId, WalletId } from "../value-objects/ids.vo";
import { Money } from "../value-objects/money.vo";

export enum TransactionType {
  CREDIT = "CREDIT",
  DEBIT = "DEBIT",
  INITIAL_CREDIT = "INITIAL_CREDIT",
}

export interface WalletTransaction {
  id: TransactionId;
  walletId: WalletId;
  playerId: PlayerId;
  type: TransactionType;
  amount: Money;
  referenceType: string;
  referenceId: string;
  idempotencyKey: IdempotencyKey;
  createdAt: Date;
}

export interface WalletProps {
  id: WalletId;
  playerId: PlayerId;
  balance: Money;
  transactions: WalletTransaction[];
  createdAt: Date;
  updatedAt: Date;
}

export class Wallet {
  private constructor(private props: WalletProps) {}

  static create(id: WalletId, playerId: PlayerId): Wallet {
    return new Wallet({
      id,
      playerId,
      balance: Money.fromCents(100000n), // 1000.00 initial credits
      transactions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: WalletProps): Wallet {
    return new Wallet(props);
  }

  debit(
    txId: TransactionId,
    amount: Money,
    referenceType: string,
    referenceId: string,
    idempotencyKey: IdempotencyKey,
  ): WalletTransaction {
    if (amount.cents <= 0n) throw new InvalidAmountError("Debit amount must be positive");
    if (this.props.balance.isLessThan(amount)) throw new InsufficientFundsError();

    const tx: WalletTransaction = {
      id: txId,
      walletId: this.props.id,
      playerId: this.props.playerId,
      type: TransactionType.DEBIT,
      amount,
      referenceType,
      referenceId,
      idempotencyKey,
      createdAt: new Date(),
    };
    this.props.balance = this.props.balance.subtract(amount);
    this.props.transactions.push(tx);
    this.props.updatedAt = new Date();
    return tx;
  }

  credit(
    txId: TransactionId,
    amount: Money,
    referenceType: string,
    referenceId: string,
    idempotencyKey: IdempotencyKey,
  ): WalletTransaction {
    if (amount.cents <= 0n) throw new InvalidAmountError("Credit amount must be positive");

    const tx: WalletTransaction = {
      id: txId,
      walletId: this.props.id,
      playerId: this.props.playerId,
      type: TransactionType.CREDIT,
      amount,
      referenceType,
      referenceId,
      idempotencyKey,
      createdAt: new Date(),
    };
    this.props.balance = this.props.balance.add(amount);
    this.props.transactions.push(tx);
    this.props.updatedAt = new Date();
    return tx;
  }

  get id(): WalletId { return this.props.id; }
  get playerId(): PlayerId { return this.props.playerId; }
  get balance(): Money { return this.props.balance; }
  get transactions(): ReadonlyArray<WalletTransaction> { return this.props.transactions; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }
}
