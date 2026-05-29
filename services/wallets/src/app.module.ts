import { Module } from "@nestjs/common";
import { WalletsController } from "./presentation/controllers/wallets.controller";
import { PrismaService } from "./infrastructure/database/prisma.service";
import { WalletRepository } from "./infrastructure/database/wallet.repository";
import { RabbitMQService } from "./infrastructure/messaging/rabbitmq.service";
import { WalletCommandsConsumerService } from "./application/services/wallet-commands-consumer.service";

@Module({
  controllers: [WalletsController],
  providers: [
    PrismaService,
    WalletRepository,
    RabbitMQService,
    WalletCommandsConsumerService,
  ],
})
export class AppModule {}
