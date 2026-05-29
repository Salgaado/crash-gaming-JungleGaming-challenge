import { Module } from "@nestjs/common";
import { GamesController } from "./presentation/controllers/games.controller";
import { RoundsController } from "./presentation/controllers/rounds.controller";
import { GameGateway } from "./presentation/gateways/game.gateway";
import { PrismaService } from "./infrastructure/database/prisma.service";
import { RoundRepository } from "./infrastructure/database/round.repository";
import { RabbitMQService } from "./infrastructure/messaging/rabbitmq.service";
import { PlaceBetUseCase } from "./application/use-cases/place-bet.use-case";
import { CashOutUseCase } from "./application/use-cases/cashout.use-case";
import { RoundLifecycleService } from "./application/services/round-lifecycle.service";
import { WalletEventsConsumerService } from "./application/services/wallet-events-consumer.service";

@Module({
  controllers: [GamesController, RoundsController],
  providers: [
    PrismaService,
    RoundRepository,
    RabbitMQService,
    GameGateway,
    PlaceBetUseCase,
    CashOutUseCase,
    RoundLifecycleService,
    WalletEventsConsumerService,
  ],
})
export class AppModule {}
