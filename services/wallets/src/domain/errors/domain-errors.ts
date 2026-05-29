export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export class InsufficientFundsError extends DomainError {
  constructor() {
    super("Insufficient funds", "INSUFFICIENT_FUNDS");
  }
}

export class WalletNotFoundError extends DomainError {
  constructor() {
    super("Wallet not found", "WALLET_NOT_FOUND");
  }
}

export class WalletAlreadyExistsError extends DomainError {
  constructor() {
    super("Wallet already exists for this player", "WALLET_ALREADY_EXISTS");
  }
}

export class InvalidAmountError extends DomainError {
  constructor(message = "Amount must be positive") {
    super(message, "INVALID_AMOUNT");
  }
}

export class DuplicateTransactionError extends DomainError {
  constructor() {
    super("Transaction with this idempotency key already exists", "DUPLICATE_TRANSACTION");
  }
}
