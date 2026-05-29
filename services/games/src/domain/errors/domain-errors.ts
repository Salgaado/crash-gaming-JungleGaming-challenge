export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export class BettingClosedError extends DomainError {
  constructor() {
    super("Round is not accepting bets", "BETTING_CLOSED");
  }
}

export class RoundNotRunningError extends DomainError {
  constructor() {
    super("Round is not running", "ROUND_NOT_RUNNING");
  }
}

export class BetAlreadyExistsError extends DomainError {
  constructor() {
    super("Player already placed a bet in this round", "BET_ALREADY_EXISTS");
  }
}

export class BetNotFoundError extends DomainError {
  constructor() {
    super("Bet not found for this player", "BET_NOT_FOUND");
  }
}

export class BetAlreadyCashedOutError extends DomainError {
  constructor() {
    super("Bet already cashed out", "BET_ALREADY_CASHED_OUT");
  }
}

export class InvalidBetAmountError extends DomainError {
  constructor(message: string) {
    super(message, "INVALID_BET_AMOUNT");
  }
}

export class InvalidRoundTransitionError extends DomainError {
  constructor(from: string, to: string) {
    super(`Invalid round transition: ${from} -> ${to}`, "INVALID_ROUND_TRANSITION");
  }
}
