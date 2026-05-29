import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger } from "@nestjs/common";

@WebSocketGateway({
  cors: { origin: "*" },
  namespace: "/",
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(GameGateway.name);

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  emitBettingOpened(payload: {
    roundId: string;
    roundIndex: number;
    serverSeedHash: string;
    bettingClosesAt: string;
  }): void {
    this.server.emit("round:betting-opened", payload);
  }

  emitRoundStarted(payload: {
    roundId: string;
    roundIndex: number;
    startedAt: string;
    serverSeedHash: string;
  }): void {
    this.server.emit("round:started", payload);
  }

  emitRoundSnapshot(payload: {
    roundId: string;
    multiplierScaled: string;
    elapsedMs: number;
  }): void {
    this.server.emit("round:snapshot", payload);
  }

  emitRoundCrashed(payload: {
    roundId: string;
    crashPointScaled: string;
    serverSeed: string;
    clientSeed: string;
    crashedAt: string;
  }): void {
    this.server.emit("round:crashed", payload);
  }

  emitBetPlaced(payload: {
    betId: string;
    roundId: string;
    playerId: string;
    amountCents: string;
  }): void {
    this.server.emit("bet:placed", payload);
  }

  emitBetRejected(payload: { betId: string; playerId: string; reason: string }): void {
    this.server.emit("bet:rejected", payload);
  }

  emitBetCashedOut(payload: {
    betId: string;
    roundId: string;
    playerId: string;
    multiplier: string;
    payoutCents: string;
  }): void {
    this.server.emit("bet:cashed-out", payload);
  }

  emitWalletUpdated(payload: { playerId: string; balanceCents: string }): void {
    this.server.emit("wallet:updated", payload);
  }
}
