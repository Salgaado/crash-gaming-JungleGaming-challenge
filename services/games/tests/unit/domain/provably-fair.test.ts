import { describe, expect, it } from "bun:test";
import { ProvablyFairService } from "../../../src/domain/services/provably-fair.service";

describe("ProvablyFairService", () => {
  it("generates a 64-char hex server seed", () => {
    const seed = ProvablyFairService.generateServerSeed();
    expect(seed).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(seed)).toBe(true);
  });

  it("hash is deterministic", () => {
    const h1 = ProvablyFairService.hashServerSeed("myseed");
    const h2 = ProvablyFairService.hashServerSeed("myseed");
    expect(h1).toBe(h2);
  });

  it("different seeds produce different hashes", () => {
    const h1 = ProvablyFairService.hashServerSeed("seed1");
    const h2 = ProvablyFairService.hashServerSeed("seed2");
    expect(h1).not.toBe(h2);
  });

  it("crash point is deterministic for same inputs", () => {
    const cp1 = ProvablyFairService.computeCrashPoint("serverSeed", "clientSeed");
    const cp2 = ProvablyFairService.computeCrashPoint("serverSeed", "clientSeed");
    expect(cp1).toBe(cp2);
  });

  it("crash point changes when server seed changes", () => {
    const cp1 = ProvablyFairService.computeCrashPoint("seed-A", "client");
    const cp2 = ProvablyFairService.computeCrashPoint("seed-B", "client");
    // may or may not be different but overwhelmingly likely
    expect(cp1 === cp2).toBe(false);
  });

  it("crash point is >= 100 (1.00x)", () => {
    for (let i = 0; i < 20; i++) {
      const seed = ProvablyFairService.generateServerSeed();
      const cp = ProvablyFairService.computeCrashPoint(seed, String(i));
      expect(cp >= 100n).toBe(true);
    }
  });

  it("verify returns true for correct seeds", () => {
    const serverSeed = "test-server-seed";
    const clientSeed = "42";
    const cp = ProvablyFairService.computeCrashPoint(serverSeed, clientSeed);
    expect(ProvablyFairService.verify(serverSeed, clientSeed, cp)).toBe(true);
  });

  it("verify returns false for wrong server seed", () => {
    const cp = ProvablyFairService.computeCrashPoint("real-seed", "client");
    expect(ProvablyFairService.verify("wrong-seed", "client", cp)).toBe(false);
  });
});
