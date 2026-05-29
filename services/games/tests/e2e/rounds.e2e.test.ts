/**
 * E2E tests for the Games Service API.
 * Requires the service to be running (docker:up).
 * Run with: cd services/games && bun test tests/e2e
 */
import { describe, expect, it, beforeAll } from "bun:test";

const BASE = process.env.GAMES_URL ?? "http://localhost:4001";

async function getToken(): Promise<string> {
  // Get a test token from Keycloak using player/player123
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

describe("Games Service E2E", () => {
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

  it("GET /rounds/current returns current round", async () => {
    const res = await fetch(`${BASE}/rounds/current`);
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body).toHaveProperty("status");
  });

  it("GET /rounds/history returns array", async () => {
    const res = await fetch(`${BASE}/rounds/history`);
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(Array.isArray(body)).toBe(true);
  });

  it("GET /bets/me rejects without token", async () => {
    const res = await fetch(`${BASE}/bets/me`);
    expect(res.status).toBe(401);
  });

  it("GET /bets/me returns array with valid token", async () => {
    const res = await fetch(`${BASE}/bets/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(Array.isArray(body)).toBe(true);
  });

  it("POST /bet rejects without token", async () => {
    const res = await fetch(`${BASE}/bet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountCents: "500" }),
    });
    expect(res.status).toBe(401);
  });

  it("POST /bet rejects amount below minimum", async () => {
    const res = await fetch(`${BASE}/bet`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ amountCents: "10" }), // below 100 cents
    });
    expect(res.status).toBe(400);
  });

  it("POST /bet/cashout rejects without active bet", async () => {
    const res = await fetch(`${BASE}/bet/cashout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    // Either 400 (no bet) or 400 (round not running) — both are valid
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
