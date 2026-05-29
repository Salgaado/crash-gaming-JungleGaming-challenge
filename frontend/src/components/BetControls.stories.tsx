import type { Meta, StoryObj } from "@storybook/react";
import { BetControls } from "./BetControls";
import { useGameStore } from "@/stores/gameStore";

const meta: Meta<typeof BetControls> = {
  title: "Game/BetControls",
  component: BetControls,
};
export default meta;
type Story = StoryObj<typeof BetControls>;

const BASE = {
  roundId: "round-1",
  roundIndex: 1,
  serverSeedHash: "a4f2c1d9e8b7",
  multiplierScaled: 100n,
  elapsedMs: 0,
  startedAt: null,
  bets: [],
  lastCrashPoints: [],
};

export const BettingPhase: Story = {
  args: { balanceCents: "100000" },
  beforeEach: () => {
    useGameStore.setState({
      round: {
        ...BASE,
        status: "BETTING_OPEN",
        bettingClosesAt: new Date(Date.now() + 8000).toISOString(),
      },
      myBetId: null,
    });
  },
};

export const BettingPhaseInsufficientBalance: Story = {
  args: { balanceCents: "50" },
  beforeEach: () => {
    useGameStore.setState({
      round: {
        ...BASE,
        status: "BETTING_OPEN",
        bettingClosesAt: new Date(Date.now() + 5000).toISOString(),
      },
      myBetId: null,
    });
  },
};

export const RunningWithActiveBet: Story = {
  args: { balanceCents: "90000" },
  beforeEach: () => {
    useGameStore.setState({
      round: {
        ...BASE,
        status: "RUNNING",
        bettingClosesAt: null,
        startedAt: new Date(Date.now() - 3000).toISOString(),
        multiplierScaled: 218n,
        elapsedMs: 3000,
      },
      myBetId: "bet-active-123",
    });
  },
};

export const RunningNoBet: Story = {
  args: { balanceCents: "100000" },
  beforeEach: () => {
    useGameStore.setState({
      round: {
        ...BASE,
        status: "RUNNING",
        bettingClosesAt: null,
        startedAt: new Date(Date.now() - 5000).toISOString(),
        multiplierScaled: 285n,
        elapsedMs: 5000,
      },
      myBetId: null,
    });
  },
};

export const CrashedPhase: Story = {
  args: { balanceCents: "100000" },
  beforeEach: () => {
    useGameStore.setState({
      round: {
        ...BASE,
        status: "CRASHED",
        bettingClosesAt: null,
        multiplierScaled: 313n,
        elapsedMs: 6000,
      },
      myBetId: null,
    });
  },
};

export const WaitingPhase: Story = {
  args: { balanceCents: "100000" },
  beforeEach: () => {
    useGameStore.setState({
      round: { ...BASE, status: "WAITING" },
      myBetId: null,
    });
  },
};
