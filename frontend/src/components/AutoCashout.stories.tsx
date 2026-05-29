import type { Meta, StoryObj } from "@storybook/react";
import { AutoCashout } from "./AutoCashout";
import { useGameStore } from "@/stores/gameStore";

const meta: Meta<typeof AutoCashout> = {
  title: "Game/AutoCashout",
  component: AutoCashout,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "340px" }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof AutoCashout>;

const BASE = {
  roundId: "r1",
  roundIndex: 1,
  serverSeedHash: null,
  multiplierScaled: 100n,
  elapsedMs: 0,
  startedAt: null,
  bettingClosesAt: null,
  bets: [],
  lastCrashPoints: [],
};

export const Default: Story = {
  beforeEach: () => {
    useGameStore.setState({ round: { ...BASE, status: "BETTING_OPEN" }, myBetId: null });
  },
};

export const ActiveDuringRound: Story = {
  name: "Active (round running, bet placed)",
  beforeEach: () => {
    useGameStore.setState({
      round: {
        ...BASE,
        status: "RUNNING",
        multiplierScaled: 178n,
        elapsedMs: 2500,
        startedAt: new Date(Date.now() - 2500).toISOString(),
      },
      myBetId: "bet-active",
    });
  },
};

export const LockedAfterCrash: Story = {
  name: "Locked (round crashed)",
  beforeEach: () => {
    useGameStore.setState({
      round: { ...BASE, status: "CRASHED", multiplierScaled: 245n, elapsedMs: 8000 },
      myBetId: null,
    });
  },
};
