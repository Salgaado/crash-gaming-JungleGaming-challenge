/**
 * E2E tests for the Wallets Service API.
 * Requires the service to be running (docker:up).
 * Run with: cd services/wallets && bun test tests/e2e
 */
import { describe, expect, it, beforeAll } from "bun:test";

const BASE = process.env.WALLETS_URL ?? "http://localhost:4002";

async function getToken(): Promise<string> {
  const keycloakUrl = process.env.KEYCLOAK_URL ?? "http://localhost:8080";
  const res = await fetch(
    `${keycloakUrl}/realms/crash-game/protocol/openid-connect/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "password",
        client_id: "crash-game-client",
        username: "player",
        password: "player123",
        scope: "openid",
      }),
    },
  );
  const data = await res.json() as any;
  return data.access_token as string;
}

describe("Wallets Service E2E", () => {
  let token: string;

  beforeAll(async () => {
    token = await getToken();
  });

  it("GET /health returns ok", async () => {
    const res = await fetch(`${BASE}/health`);
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.status).toBe("ok");
  });

  it("POST / rejects without token", async () => {
    const res = await fetch(`${BASE}/`, { method: "POST" });
    expect(res.status).toBe(401);
  });

  it("GET /me rejects without token", async () => {
    const res = await fetch(`${BASE}/me`);
    expect(res.status).toBe(401);
  });

  it("POST / creates wallet and GET /me returns balance", async () => {
    // Create wallet (may already exist — that's ok)
    const createRes = await fetch(`${BASE}/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    // 201 = created, 409 = already exists
    expect([201, 409]).toContain(createRes.status);

    // Get wallet
    const getRes = await fetch(`${BASE}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(getRes.status).toBe(200);
    const body = await getRes.json() as any;
    expect(body).toHaveProperty("balanceCents");
    expect(typeof body.balanceCents).toBe("string"); // bigint serialized as string
    expect(BigInt(body.balanceCents) >= 0n).toBe(true);
  });
});
