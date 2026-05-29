import type { Meta, StoryObj } from "@storybook/react";
import { BetHistory } from "./BetHistory";

const meta: Meta<typeof BetHistory> = {
  title: "Game/BetHistory",
  component: BetHistory,
};
export default meta;
type Story = StoryObj<typeof BetHistory>;

const BETS = [
  {
    betId: "b1",
    roundId: "r42",
    roundIndex: 42,
    amountCents: "1000",
    status: "CASHED_OUT",
    cashoutMultiplier: "2.14x",
    payoutCents: "2140",
    crashPoint: "5.22x",
    createdAt: new Date(Date.now() - 300000).toISOString(),
  },
  {
    betId: "b2",
    roundId: "r43",
    roundIndex: 43,
    amountCents: "5000",
    status: "LOST",
    cashoutMultiplier: null,
    payoutCents: null,
    crashPoint: "1.12x",
    createdAt: new Date(Date.now() - 180000).toISOString(),
  },
  {
    betId: "b3",
    roundId: "r44",
    roundIndex: 44,
    amountCents: "2500",
    status: "CASHED_OUT",
    cashoutMultiplier: "8.00x",
    payoutCents: "20000",
    crashPoint: "12.34x",
    createdAt: new Date(Date.now() - 90000).toISOString(),
  },
  {
    betId: "b4",
    roundId: "r45",
    roundIndex: 45,
    amountCents: "10000",
    status: "CASHED_OUT",
    cashoutMultiplier: "1.50x",
    payoutCents: "15000",
    crashPoint: "3.80x",
    createdAt: new Date(Date.now() - 45000).toISOString(),
  },
  {
    betId: "b5",
    roundId: "r46",
    roundIndex: 46,
    amountCents: "1000",
    status: "PENDING",
    cashoutMultiplier: null,
    payoutCents: null,
    crashPoint: "—",
    createdAt: new Date().toISOString(),
  },
];

export const WithHistory: Story = {
  parameters: {
    mockQueries: [{ key: ["bet-history"], data: BETS }],
  },
};

export const Empty: Story = {
  parameters: {
    mockQueries: [{ key: ["bet-history"], data: [] }],
  },
};

export const BigWin: Story = {
  parameters: {
    mockQueries: [
      {
        key: ["bet-history"],
        data: [
          {
            betId: "big1",
            roundId: "r99",
            roundIndex: 99,
            amountCents: "100000",
            status: "CASHED_OUT",
            cashoutMultiplier: "25.00x",
            payoutCents: "2500000",
            crashPoint: "31.40x",
            createdAt: new Date(Date.now() - 10000).toISOString(),
          },
        ],
      },
    ],
  },
};
