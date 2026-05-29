export class RoundId {
  constructor(readonly value: string) {}
  equals(other: RoundId): boolean { return this.value === other.value; }
  toString(): string { return this.value; }
}

export class BetId {
  constructor(readonly value: string) {}
  equals(other: BetId): boolean { return this.value === other.value; }
  toString(): string { return this.value; }
}

export class PlayerId {
  constructor(readonly value: string) {}
  equals(other: PlayerId): boolean { return this.value === other.value; }
  toString(): string { return this.value; }
}
