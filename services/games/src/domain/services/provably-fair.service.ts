import { createHmac, createHash, randomBytes } from "crypto";

export interface CrashPointResult {
  serverSeed: string;
  serverSeedHash: string;
  crashPointScaled: bigint; // 1.00x = 100, 2.00x = 200
}

export class ProvablyFairService {
  private static readonly HOUSE_EDGE = 0.04; // 4% house edge
  private static readonly SCALE = 100n;

  static generateServerSeed(): string {
    return randomBytes(32).toString("hex");
  }

  static hashServerSeed(serverSeed: string): string {
    return createHash("sha256").update(serverSeed).digest("hex");
  }

  // Crash point is derived deterministically from serverSeed + clientSeed
  // Uses HMAC-SHA256: clientSeed is the round index or a shared nonce
  static computeCrashPoint(serverSeed: string, clientSeed: string): bigint {
    const hmac = createHmac("sha256", serverSeed).update(clientSeed).digest("hex");

    // Take first 8 hex chars as a 32-bit integer
    const h = parseInt(hmac.slice(0, 8), 16);

    // Apply house edge: if h < 2^32 * houseEdge, crash at 1.00x
    const e = 2 ** 32;
    if (h < e * ProvablyFairService.HOUSE_EDGE) {
      return 100n; // instant crash
    }

    // Formula: floor(100 * e / (e - h)) clamped so result >= 100
    const multiplier = Math.floor((100 * e) / (e - h));
    return BigInt(multiplier < 100 ? 100 : multiplier);
  }

  // Verify that a crash point is valid for the given seeds
  static verify(serverSeed: string, clientSeed: string, crashPointScaled: bigint): boolean {
    const computed = ProvablyFairService.computeCrashPoint(serverSeed, clientSeed);
    return computed === crashPointScaled;
  }

  static prepareCrashPoint(roundIndex: number): CrashPointResult {
    const serverSeed = ProvablyFairService.generateServerSeed();
    const serverSeedHash = ProvablyFairService.hashServerSeed(serverSeed);
    const clientSeed = roundIndex.toString();
    const crashPointScaled = ProvablyFairService.computeCrashPoint(serverSeed, clientSeed);
    return { serverSeed, serverSeedHash, crashPointScaled };
  }
}
