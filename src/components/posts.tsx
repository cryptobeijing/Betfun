import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { USDC, erc20Abi } from "@/lib/usdc";
import {
  ArrowUpRight,
  CheckCircle2,
  Flame,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { encodeFunctionData, formatUnits, parseUnits } from "viem";
import {
  useAccount,
  useBalance,
  useSendTransaction,
  useWaitForTransactionReceipt,
} from "wagmi";

type BetSide = "yes" | "no";

const YES_ADDRESS = "0x3b324062dF51713EAD1f74474916d6Be2824e09F";
const NO_ADDRESS = "0xCa139b8b46C415D85BefdFB7Ba1DFB4b9ea55058";

interface Market {
  id: string;
  title: string;
  description: string;
  category: string;
  closesOn: string;
  odds: {
    yes: number;
    no: number;
  };
  volume: string;
  sentiment: "Bullish" | "Bearish" | "Neutral";
  highlight?: string;
}

const markets: Market[] = [
  {
    id: "btc-150k-2025",
    title: "Bitcoin to close above $150K before 2026?",
    description:
      "Post-halving supply squeeze meets spot ETF demand from the US and Asia. Does the melt-up finish 2025 above $150K?",
    category: "Bitcoin • Macro",
    closesOn: "Dec 31, 2025",
    odds: { yes: 58, no: 42 },
    volume: "$5.6M",
    sentiment: "Bullish",
    highlight: "Trending",
  },
  {
    id: "eth-pectra-finality",
    title: "Ethereum post-Pectra finality below 5 seconds by Q2 2026?",
    description:
      "Client teams expect Pectra plus PeerDAS to slash finality times. Can the upgrade ship fast enough to beat the 5s mark?",
    category: "Ethereum • Roadmap",
    closesOn: "Jun 30, 2026",
    odds: { yes: 46, no: 54 },
    volume: "$3.9M",
    sentiment: "Neutral",
    highlight: "New",
  },
  {
    id: "sol-dau-2026",
    title: "Solana daily active wallets hit 5M average by Q1 2026?",
    description:
      "Firedancer and token extensions push consumer apps on Solana. Will sustained DAU break the 5M barrier?",
    category: "Solana • Scaling",
    closesOn: "Mar 31, 2026",
    odds: { yes: 52, no: 48 },
    volume: "$2.8M",
    sentiment: "Bullish",
  },
  {
    id: "base-50m-mau",
    title: "Base monthly active wallets surpass 50M by Q4 2025?",
    description:
      "Coinbase’s L2 continues to add consumer apps. Does Base lock in 50M active wallets before year-end 2025?",
    category: "L2 • Adoption",
    closesOn: "Nov 30, 2025",
    odds: { yes: 49, no: 51 },
    volume: "$2.2M",
    sentiment: "Neutral",
  },
  {
    id: "defi-400b-2026",
    title: "DeFi total value locked to hit $400B by mid-2026?",
    description:
      "Tokenized treasuries and real-world assets are surging. Can DeFi TVL double again and clear $400B by mid-2026?",
    category: "DeFi • Macro",
    closesOn: "Jun 30, 2026",
    odds: { yes: 55, no: 45 },
    volume: "$3.4M",
    sentiment: "Bullish",
  },
  {
    id: "stablecoin-500b-2026",
    title: "Stablecoin float surpasses $500B before 2027?",
    description:
      "USD+CNH stablecoin rails are onboarding fintechs worldwide. Will supply crack the $500B milestone before 2027?",
    category: "Stablecoins • Macro",
    closesOn: "Sep 30, 2026",
    odds: { yes: 60, no: 40 },
    volume: "$3.1M",
    sentiment: "Bullish",
  },
  {
    id: "spot-eth-hk",
    title: "Hong Kong approves a spot ETH ETF before 2026?",
    description:
      "After the BTC greenlight, Hong Kong regulators review ETH filings with staking disclosures. Does approval land in 2025?",
    category: "APAC • Regulation",
    closesOn: "Dec 15, 2025",
    odds: { yes: 63, no: 37 },
    volume: "$2.0M",
    sentiment: "Bullish",
  },
  {
    id: "layerzero-fdv-2026",
    title: "LayerZero governance token launches above $25B FDV?",
    description:
      "Interop volumes keep climbing as messaging rivals launch tokens. Does LayerZero debut with a $25B+ valuation?",
    category: "Airdrops • Valuation",
    closesOn: "Jan 31, 2026",
    odds: { yes: 50, no: 50 },
    volume: "$1.7M",
    sentiment: "Neutral",
  },
  {
    id: "btc-dominance-2026",
    title: "Bitcoin dominance holds above 60% through 2026?",
    description:
      "Memecoins bite into BTC share, but ETF flows stay sticky. Will BTC dominance remain north of 60% for the next two years?",
    category: "Market Structure",
    closesOn: "Dec 31, 2026",
    odds: { yes: 57, no: 43 },
    volume: "$3.3M",
    sentiment: "Bullish",
  },
  {
    id: "restaking-20m-2026",
    title: "EigenLayer restaked ETH tops 20M by mid-2026?",
    description:
      "New Actively Validated Services launch monthly. Does restaked ETH double again and break 20M by mid-2026?",
    category: "Ethereum • Restaking",
    closesOn: "Jul 31, 2026",
    odds: { yes: 54, no: 46 },
    volume: "$2.5M",
    sentiment: "Neutral",
  },
];

interface PredictionMarketsProps {
  onBetSuccess?: () => void;
}

export default function PredictionMarkets({
  onBetSuccess,
}: PredictionMarketsProps) {
  const {
    sendTransaction,
    data: hash,
    isPending: isTransactionPending,
    reset: resetTransaction,
  } = useSendTransaction();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  const account = useAccount();
  const { data: balance } = useBalance({
    address: account.address,
    token: USDC.address,
  });

  const [toastId, setToastId] = useState<string | number | null>(null);
  const [activeCustomMarket, setActiveCustomMarket] = useState<string | null>(
    null
  );
  const [customBetAmount, setCustomBetAmount] = useState("");
  const [customBetSide, setCustomBetSide] = useState<BetSide>("yes");
  const [pendingBet, setPendingBet] = useState<{
    marketId: string;
    side: BetSide;
    amount: string;
  } | null>(null);

  const isBetting = isTransactionPending || isConfirming;

  const handleBet = useCallback(
    (market: Market, side: BetSide, amount: string) => {
      const sanitizedAmount = amount.trim();
      const numericAmount = Number(sanitizedAmount);

      if (!sanitizedAmount || Number.isNaN(numericAmount) || numericAmount <= 0) {
        toast.error("Invalid bet amount", {
          description: "Enter a positive USDC amount to place a bet.",
        });
        return;
      }

      try {
        const recipient = side === "yes" ? YES_ADDRESS : NO_ADDRESS;
        const data = encodeFunctionData({
          abi: erc20Abi,
          functionName: "transfer",
          args: [recipient as `0x${string}`, parseUnits(sanitizedAmount, USDC.decimals)],
        });

        setPendingBet({
          marketId: market.id,
          side,
          amount: sanitizedAmount,
        });

        sendTransaction({
          to: USDC.address,
          data,
          value: 0n,
        });

        const toastId_ = toast.loading("Placing your bet...", {
          description: `${sanitizedAmount} USDC on ${side === "yes" ? "YES" : "NO"} · ${market.title}`,
        });

        setToastId(toastId_);
        setActiveCustomMarket(null);
        setCustomBetAmount("");
      } catch (_error) {
        toast.error("Unable to place bet", {
          description: "Your wallet rejected the transaction. Try again.",
        });
      }
    },
    [sendTransaction]
  );

  const handleQuickBet = useCallback(
    (market: Market, side: BetSide) => {
      if (isBetting) return;
      handleBet(market, side, "0.10");
    },
    [handleBet, isBetting]
  );

  const handlePercentageClick = useCallback(
    (percentage: number) => {
      if (!balance?.value) return;
      const amount =
        Number(formatUnits(balance.value, USDC.decimals)) * percentage;
      setCustomBetAmount(amount.toFixed(2));
    },
    [balance]
  );

  useEffect(() => {
    if (isConfirmed && toastId !== null && pendingBet) {
      toast.dismiss(toastId);
      toast.success("Bet placed!", {
        description: `${pendingBet.amount} USDC on ${pendingBet.side.toUpperCase()} confirmed.`,
      });

      setToastId(null);
      setPendingBet(null);
      resetTransaction();
      onBetSuccess?.();
    }
  }, [
    isConfirmed,
    toastId,
    resetTransaction,
    onBetSuccess,
    pendingBet,
  ]);

  const customDialogMarket = useMemo(
    () => markets.find((market) => market.id === activeCustomMarket),
    [activeCustomMarket]
  );

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
        {markets.map((market) => {
          const isMarketPending = pendingBet?.marketId === market.id && isBetting;

          return (
            <div
              key={market.id}
              className="relative overflow-hidden rounded-3xl border border-border bg-card/80 backdrop-blur-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 pointer-events-none" />
              <div className="relative flex flex-col gap-6 p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-primary">
                    <Sparkles className="h-4 w-4" />
                    <span>{market.category}</span>
                  </div>
                  {market.highlight ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      <Flame className="h-3 w-3" />
                      {market.highlight}
                    </span>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <h2 className="text-2xl font-semibold leading-tight">
                    {market.title}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {market.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 rounded-2xl bg-muted/40 p-4 text-sm">
                  <div className="space-y-1">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      Closes
                    </span>
                    <p className="font-medium">{market.closesOn}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      Market Volume
                    </span>
                    <p className="font-medium">{market.volume}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      Odds YES
                    </span>
                    <p className="font-medium">{market.odds.yes}%</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      Odds NO
                    </span>
                    <p className="font-medium">{market.odds.no}%</p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/60 p-4 text-sm">
                  <div className="flex items-center gap-3">
                    <TrendingBadge sentiment={market.sentiment} />
                    <span className="text-muted-foreground">
                      Express your conviction with USDC bets.
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-xs text-primary"
                    onClick={() => {
                      setActiveCustomMarket(market.id);
                      setCustomBetSide("yes");
                    }}
                    disabled={!account.address || isBetting}
                  >
                    Custom Bet
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Button
                    size="lg"
                    className="h-12 gap-2 rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600 disabled:cursor-not-allowed"
                    onClick={() => handleQuickBet(market, "yes")}
                    disabled={!account.address || isBetting}
                    title={
                      !account.address
                        ? "Connect a wallet to bet."
                        : isMarketPending
                          ? "Transaction in progress..."
                          : undefined
                    }
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    Bet YES · 0.10 USDC
                  </Button>
                  <Button
                    size="lg"
                    className="h-12 gap-2 rounded-2xl bg-rose-500 text-white shadow-lg shadow-rose-500/20 transition hover:bg-rose-600 disabled:cursor-not-allowed"
                    onClick={() => handleQuickBet(market, "no")}
                    disabled={!account.address || isBetting}
                    title={
                      !account.address
                        ? "Connect a wallet to bet."
                        : isMarketPending
                          ? "Transaction in progress..."
                          : undefined
                    }
                  >
                    <XCircle className="h-5 w-5" />
                    Bet NO · 0.10 USDC
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog
        open={!!activeCustomMarket}
        onOpenChange={(open) => {
          if (!open) {
            setActiveCustomMarket(null);
            setCustomBetAmount("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Custom Bet (USDC)</DialogTitle>
            <DialogDescription>
              Choose a side and enter the amount you want to stake.
            </DialogDescription>
          </DialogHeader>

          {customDialogMarket ? (
            <div className="space-y-4">
              <div className="rounded-2xl bg-muted/60 p-4">
                <p className="text-sm font-medium">{customDialogMarket.title}</p>
                <p className="text-xs text-muted-foreground">
                  Market closes {customDialogMarket.closesOn}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={customBetSide === "yes" ? "default" : "outline"}
                  className="h-10 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                  onClick={() => setCustomBetSide("yes")}
                  disabled={isBetting}
                >
                  YES
                </Button>
                <Button
                  variant={customBetSide === "no" ? "default" : "outline"}
                  className="h-10 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20"
                  onClick={() => setCustomBetSide("no")}
                  disabled={isBetting}
                >
                  NO
                </Button>
              </div>

              <div className="rounded-2xl bg-muted/40 p-4 text-sm">
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                  <span>Your balance</span>
                  <a
                    href="https://faucet.circle.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:opacity-80"
                  >
                    Get USDC
                  </a>
                </div>
                <p className="mt-2 text-xl font-semibold">
                  {balance
                    ? `${Number(formatUnits(balance.value, USDC.decimals)).toFixed(2)} USDC`
                    : "Loading..."}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {[0.1, 0.25, 0.5, 1].map((percentage) => (
                  <Button
                    key={percentage}
                    variant="outline"
                    size="sm"
                    onClick={() => handlePercentageClick(percentage)}
                    disabled={!balance || isBetting}
                    className="rounded-full"
                  >
                    {Math.round(percentage * 100)}%
                  </Button>
                ))}
              </div>

              <Input
                type="number"
                placeholder="Amount in USDC"
                step="0.01"
                min="0"
                value={customBetAmount}
                onChange={(event) => setCustomBetAmount(event.target.value)}
                disabled={isBetting}
              />
            </div>
          ) : null}

          <DialogFooter>
            <Button
              onClick={() => {
                if (customDialogMarket) {
                  handleBet(customDialogMarket, customBetSide, customBetAmount);
                }
              }}
              disabled={
                !customDialogMarket ||
                !customBetAmount ||
                isBetting ||
                !account.address
              }
            >
              {isBetting ? "Placing Bet..." : "Place Bet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TrendingBadge({ sentiment }: { sentiment: Market["sentiment"] }) {
  if (sentiment === "Bullish") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-600">
        <ArrowUpRight className="h-3.5 w-3.5" />
        Bullish flow
      </span>
    );
  }

  if (sentiment === "Bearish") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-3 py-1 text-xs font-medium text-rose-600">
        <ArrowUpRight className="h-3.5 w-3.5 rotate-180" />
        Bearish flow
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/15 px-3 py-1 text-xs font-medium text-slate-600">
      <Sparkles className="h-3.5 w-3.5" />
      Mixed sentiment
    </span>
  );
}
