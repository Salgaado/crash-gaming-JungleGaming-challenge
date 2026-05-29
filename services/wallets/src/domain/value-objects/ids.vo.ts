export class WalletId {
  constructor(readonly value: string) {}
  equals(other: WalletId): boolean { return this.value === other.value; }
  toString(): string { return this.value; }
}

export class PlayerId {
  constructor(readonly value: string) {}
  equals(other: PlayerId): boolean { return this.value === other.value; }
  toString(): string { return this.value; }
}

export class TransactionId {
  constructor(readonly value: string) {}
  toString(): string { return this.value; }
}

export class IdempotencyKey {
  constructor(readonly value: string) {}
  toString(): string { return this.value; }
}
