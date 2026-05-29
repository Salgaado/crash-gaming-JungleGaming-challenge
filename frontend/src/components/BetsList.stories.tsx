import type { Meta, StoryObj } from "@storybook/react";
import { BetsList } from "./BetsList";
import { useGameStore } from "@/stores/gameStore";

const meta: Meta<typeof BetsList> = {
  title: "Game/BetsList",
  component: BetsList,
};
export default meta;
type Story = StoryObj<typeof BetsList>;

const MY_ID = "mock-player-id-0000";

const BETS = [
  { betId: "b1", playerId: MY_ID,          amountCents: "1000",  status: "PENDING",       cashoutMultiplier: null,     payoutCents: null },
  { betId: "b2", playerId: "other-abc123",  amountCents: "5000",  status: "CASHED_OUT",    cashoutMultiplier: "2.45x",  payoutCents: "12250" },
  { betId: "b3", playerId: "player-xyz789", amountCents: "25000", status: "LOST",          cashoutMultiplier: null,     payoutCents: null },
  { betId: "b4", playerId: "player-qwe456", amountCents: "500",   status: "PENDING_DEBIT", cashoutMultiplier: null,     payoutCents: null },
];

export const Empty: Story = {
  beforeEach: () => {
    useGameStore.setState({
      round: { ...useGameStore.getState().round, bets: [], status: "BETTING_OPEN" },
    });
  },
};

export const RunningWithBets: Story = {
  beforeEach: () => {
    useGameStore.setState({
      round: { ...useGameStore.getState().round, bets: BETS, status: "RUNNING" },
    });
  },
};

export const AllStatuses: Story = {
  beforeEach: () => {
    useGameStore.setState({
      round: {
        ...useGameStore.getState().round,
        status: "RUNNING",
        bets: [
          { betId: "s1", playerId: MY_ID,          amountCents: "1000",  status: "PENDING",       cashoutMultiplier: null,    payoutCents: null },
          { betId: "s2", playerId: "other-1",       amountCents: "2000",  status: "CASHED_OUT",    cashoutMultiplier: "3.20x", payoutCents: "6400" },
          { betId: "s3", playerId: "other-2",       amountCents: "10000", status: "LOST",          cashoutMultiplier: null,    payoutCents: null },
          { betId: "s4", playerId: "other-3",       amountCents: "500",   status: "PENDING_DEBIT", cashoutMultiplier: null,    payoutCents: null },
          { betId: "s5", playerId: "other-4",       amountCents: "750",   status: "REJECTED",      cashoutMultiplier: null,    payoutCents: null },
        ],
      },
    });
  },
};

export const AfterCrash: Story = {
  beforeEach: () => {
    useGameStore.setState({
      round: {
        ...useGameStore.getState().round,
        status: "CRASHED",
        bets: [
          { betId: "c1", playerId: MY_ID,   amountCents: "1000", status: "LOST",       cashoutMultiplier: null,    payoutCents: null },
          { betId: "c2", playerId: "other1", amountCents: "2000", status: "CASHED_OUT", cashoutMultiplier: "1.85x", payoutCents: "3700" },
        ],
      },
    });
  },
};
