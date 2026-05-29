import {
  Controller,
  Post,
  Get,
  UseGuards,
  Request,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { v4 as uuidv4 } from "uuid";
import { JwtGuard } from "../../infrastructure/auth/jwt.guard";
import { WalletRepository } from "../../infrastructure/database/wallet.repository";
import { Wallet } from "../../domain/aggregates/wallet.aggregate";
import { PlayerId, WalletId } from "../../domain/value-objects/ids.vo";

@ApiTags("wallets")
@Controller()
export class WalletsController {
  constructor(private readonly walletRepository: WalletRepository) {}

  @Get("health")
  health() {
    return { status: "ok", service: "wallets" };
  }

  @Post()
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  async createWallet(@Request() req: any) {
    const playerId: string = req.user.sub;
    const existing = await this.walletRepository.findByPlayerId(playerId);
    if (existing) throw new ConflictException("Wallet already exists");

    const wallet = Wallet.create(new WalletId(uuidv4()), new PlayerId(playerId));
    await this.walletRepository.save(wallet);

    return {
      walletId: wallet.id.value,
      playerId: wallet.playerId.value,
      balanceCents: wallet.balance.cents.toString(),
    };
  }

  @Get("me")
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  async getMyWallet(@Request() req: any) {
    const playerId: string = req.user.sub;
    const wallet = await this.walletRepository.findByPlayerId(playerId);
    if (!wallet) throw new NotFoundException("Wallet not found");

    return {
      walletId: wallet.id.value,
      playerId: wallet.playerId.value,
      balanceCents: wallet.balance.cents.toString(),
      balance: wallet.balance.toString(),
    };
  }
}
