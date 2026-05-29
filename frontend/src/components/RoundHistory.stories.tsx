import type { Meta, StoryObj } from "@storybook/react";
import { RoundHistory } from "./RoundHistory";
import { useGameStore } from "@/stores/gameStore";

const meta: Meta<typeof RoundHistory> = {
  title: "Game/RoundHistory",
  component: RoundHistory,
};
export default meta;
type Story = StoryObj<typeof RoundHistory>;

const HISTORY = [
  { roundId: "r-1",  roundIndex: 1,  crashPoint: "1.00x",  crashPointScaled: "100"  },
  { roundId: "r-2",  roundIndex: 2,  crashPoint: "1.12x",  crashPointScaled: "112"  },
  { roundId: "r-3",  roundIndex: 3,  crashPoint: "1.43x",  crashPointScaled: "143"  },
  { roundId: "r-4",  roundIndex: 4,  crashPoint: "1.85x",  crashPointScaled: "185"  },
  { roundId: "r-5",  roundIndex: 5,  crashPoint: "2.10x",  crashPointScaled: "210"  },
  { roundId: "r-6",  roundIndex: 6,  crashPoint: "2.89x",  crashPointScaled: "289"  },
  { roundId: "r-7",  roundIndex: 7,  crashPoint: "3.41x",  crashPointScaled: "341"  },
  { roundId: "r-8",  roundIndex: 8,  crashPoint: "5.02x",  crashPointScaled: "502"  },
  { roundId: "r-9",  roundIndex: 9,  crashPoint: "8.77x",  crashPointScaled: "877"  },
  { roundId: "r-10", roundIndex: 10, crashPoint: "12.50x", crashPointScaled: "1250" },
];

export const Empty: Story = {
  beforeEach: () => {
    useGameStore.setState({ round: { ...useGameStore.getState().round, roundIndex: 1 } });
  },
  parameters: {
    mockQueries: [{ key: ["round-history", 1], data: [] }],
  },
};

export const WithHistory: Story = {
  beforeEach: () => {
    useGameStore.setState({ round: { ...useGameStore.getState().round, roundIndex: 10 } });
  },
  parameters: {
    mockQueries: [{ key: ["round-history", 10], data: HISTORY }],
  },
};

export const MostlyCrashes: Story = {
  beforeEach: () => {
    useGameStore.setState({ round: { ...useGameStore.getState().round, roundIndex: 6 } });
  },
  parameters: {
    mockQueries: [
      {
        key: ["round-history", 6],
        data: [
          { roundId: "r-a", roundIndex: 1, crashPoint: "1.00x", crashPointScaled: "100" },
          { roundId: "r-b", roundIndex: 2, crashPoint: "1.02x", crashPointScaled: "102" },
          { roundId: "r-c", roundIndex: 3, crashPoint: "1.00x", crashPointScaled: "100" },
          { roundId: "r-d", roundIndex: 4, crashPoint: "1.11x", crashPointScaled: "111" },
          { roundId: "r-e", roundIndex: 5, crashPoint: "1.34x", crashPointScaled: "134" },
          { roundId: "r-f", roundIndex: 6, crashPoint: "15.00x", crashPointScaled: "1500" },
        ],
      },
    ],
  },
};
