import type { Meta, StoryObj } from "@storybook/react";
import { CrashChart } from "./CrashChart";
import { useGameStore } from "@/stores/gameStore";

const meta: Meta<typeof CrashChart> = {
  title: "Game/CrashChart",
  component: CrashChart,
};
export default meta;
type Story = StoryObj<typeof CrashChart>;

const BASE = {
  roundId: "r1",
  roundIndex: 1,
  bettingClosesAt: null,
  startedAt: null,
  bets: [],
  lastCrashPoints: [],
  elapsedMs: 0,
};

export const BettingPhase: Story = {
  beforeEach: () => {
    useGameStore.setState({
      round: {
        ...BASE,
        status: "BETTING_OPEN",
        serverSeedHash: "a4f2c1d9e8b7a6f5e4d3c2b1a0f9e8d7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1",
        multiplierScaled: 100n,
      },
    });
  },
};

export const RunningLow: Story = {
  beforeEach: () => {
    useGameStore.setState({
      round: {
        ...BASE,
        status: "RUNNING",
        serverSeedHash: null,
        multiplierScaled: 131n,
        elapsedMs: 3800,
        startedAt: new Date(Date.now() - 3800).toISOString(),
      },
    });
  },
};

export const RunningHigh: Story = {
  beforeEach: () => {
    useGameStore.setState({
      round: {
        ...BASE,
        status: "RUNNING",
        serverSeedHash: null,
        multiplierScaled: 502n,
        elapsedMs: 27000,
        startedAt: new Date(Date.now() - 27000).toISOString(),
      },
    });
  },
};

export const Crashed: Story = {
  beforeEach: () => {
    useGameStore.setState({
      round: {
        ...BASE,
        status: "CRASHED",
        serverSeedHash: null,
        multiplierScaled: 314n,
        elapsedMs: 19000,
        startedAt: new Date(Date.now() - 22000).toISOString(),
      },
    });
  },
};

export const EarlyCrash: Story = {
  beforeEach: () => {
    useGameStore.setState({
      round: {
        ...BASE,
        status: "CRASHED",
        serverSeedHash: null,
        multiplierScaled: 100n,
        elapsedMs: 200,
        startedAt: new Date(Date.now() - 3000).toISOString(),
      },
    });
  },
};
