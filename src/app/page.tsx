"use client";

import { Button } from "@/components/ui/button";
import PredictionMarkets from "../components/posts";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useBalance,
  useWaitForTransactionReceipt,
  useSendTransaction,
  useConnections,
} from "wagmi";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState, useCallback, useEffect, useMemo } from "react";
import { parseUnits, isAddress, encodeFunctionData } from "viem";
import { toast } from "sonner";
import { USDC, erc20Abi } from "@/lib/usdc";
import { useFaucet } from "@/hooks/useFaucet";
import { useFaucetEligibility } from "@/hooks/useFaucetEligibility";
import { Sparkles, Wallet, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const heroStats = [
  {
    label: "Total Volume",
    value: "$22.7M",
    description: "Staked across featured markets",
  },
  {
    label: "Winning Rate",
    value: "63%",
    description: "Average edge of top bettors",
  },
  {
    label: "Resolved Payouts",
    value: "$9.4M",
    description: "Settled via USDC onchain",
  },
];

function App() {
  const account = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const connections = useConnections();
  const [subAccount, universalAccount] = useMemo(() => {
    const accounts = connections.flatMap((connection) => connection.accounts);
    return [
      accounts[0] as `0x${string}` | undefined,
      accounts[1] as `0x${string}` | undefined,
    ];
  }, [connections]);

  // Get universal account balance
  const { data: universalBalance } = useBalance({
    address: universalAccount,
    token: USDC.address,
    query: {
      refetchInterval: 1000,
      enabled: !!universalAccount,
    },
  });

  // Check faucet eligibility based on balance
  const faucetEligibility = useFaucetEligibility(universalBalance?.value);

  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [transferAddress, setTransferAddress] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [toastId, setToastId] = useState<string | number | null>(null);

  const faucetMutation = useFaucet();

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

  const handleTransfer = useCallback(async () => {
    if (!transferAmount || !isAddress(transferAddress)) {
      toast.error("Invalid input", {
        description: "Please enter a valid address and amount",
      });
      return;
    }

    try {
      const data = encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [
          transferAddress as `0x${string}`,
          parseUnits(transferAmount, USDC.decimals),
        ],
      });

      sendTransaction({
        to: USDC.address,
        data,
        value: 0n,
      });

      const toastId_ = toast.loading("Sending USDC...", {
        description: `Transferring ${transferAmount} USDC to ${transferAddress}`,
      });

      setToastId(toastId_);
      setIsTransferDialogOpen(false);
      setTransferAmount("");
      setTransferAddress("");
    } catch (_error) {
      toast.error("Transaction failed", {
        description: "Please try again",
      });
    }
  }, [transferAmount, transferAddress, sendTransaction]);

  useEffect(() => {
    if (isConfirmed && toastId !== null) {
      toast.dismiss(toastId);
      toast.success("Transfer confirmed!", {
        description: `USDC sent successfully onchain.`,
      });

      setToastId(null);
      resetTransaction();
    }
  }, [isConfirmed, toastId, resetTransaction]);

  const handleFundAccount = useCallback(async () => {
    if (!universalAccount) {
      toast.error("No universal account found", {
        description: "Please make sure your wallet is properly connected",
      });
      return;
    }

    if (!faucetEligibility.isEligible) {
      toast.error("Not eligible for faucet", {
        description: faucetEligibility.reason,
      });
      return;
    }

    const fundingToastId = toast.loading("Requesting USDC from faucet...", {
      description: "This may take a few moments",
    });

    faucetMutation.mutate(
      { address: universalAccount },
      {
        onSuccess: (data) => {
          toast.dismiss(fundingToastId);
          toast.success("Account funded successfully!", {
            description: (
              <div className="flex flex-col gap-1">
                <span>USDC has been sent to your wallet</span>
                <a
                  href={data.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs underline hover:opacity-80"
                >
                  View transaction
                </a>
              </div>
            ),
            duration: 5000,
          });
        },
        onError: (error) => {
          toast.dismiss(fundingToastId);
          const errorMessage =
            error instanceof Error ? error.message : "Please try again later";
          toast.error("Failed to fund account", {
            description: errorMessage,
          });
        },
      }
    );
  }, [universalAccount, faucetMutation, faucetEligibility]);

  const universalDisplay = useMemo(() => {
    if (!universalAccount) return null;
    return `${universalAccount.slice(0, 6)}...${universalAccount.slice(-4)}`;
  }, [universalAccount]);

  const subAccountDisplay = useMemo(() => {
    if (typeof subAccount !== "string") return null;
    return `${subAccount.slice(0, 6)}...${subAccount.slice(-4)}`;
  }, [subAccount]);

  const handleCopy = useCallback(
    (value?: string) => {
      if (!value) return;
      navigator.clipboard.writeText(value);
      toast.success("Copied to clipboard");
    },
    []
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-500/30 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-80px] h-[420px] w-[420px] rounded-full bg-indigo-500/30 blur-3xl" />
        <div className="absolute left-[-100px] top-1/3 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
              <Sparkles className="h-6 w-6 text-emerald-300" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold tracking-tight">Betfun</p>
              <p className="text-sm text-white/60">
                Crypto-native prediction markets in USDC
              </p>
            </div>
          </div>

          {account.status === "connected" ? (
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleFundAccount}
                disabled={
                  faucetMutation.isPending || !faucetEligibility.isEligible
                }
                className="bg-white/10 text-white hover:bg-white/20"
                title={
                  !faucetEligibility.isEligible
                    ? faucetEligibility.reason
                    : undefined
                }
              >
                {faucetMutation.isPending ? "Funding..." : "Fund Universal"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsTransferDialogOpen(true)}
                className="border-white/20 bg-white/5 text-white hover:bg-white/10"
              >
                Transfer USDC
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => disconnect()}
                className="text-white/70 hover:text-white"
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {connectors.slice(0, 1).map((connector) => (
                <Button
                  key={connector.uid}
                  size="sm"
                  onClick={() => connect({ connector })}
                  className="bg-emerald-500 text-white hover:bg-emerald-400"
                >
                  <Wallet className="mr-2 h-4 w-4" />
                  {connector.name}
                </Button>
              ))}
            </div>
          )}
        </header>

        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 px-4 pb-24">
          <section className="grid gap-12 pt-8 md:grid-cols-[1.15fr_0.85fr] md:pt-16">
            <div className="space-y-8">
              <div className="space-y-5">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-white/70">
                  Live on Base Sepolia
                </span>
                <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white md:text-6xl">
                  Back your conviction on the next crypto catalysts.
                </h1>
                <p className="max-w-xl text-lg text-white/70">
                  Bet on Bitcoin milestones, ETF approvals, L2 adoption, and
                  onchain growth. Wagers settle instantly in USDC—no waiting,
                  just pure signal.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    className="h-12 rounded-full bg-emerald-500 px-6 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-400"
                    onClick={() => {
                      if (account.status !== "connected") {
                        const connector = connectors[0];
                        if (connector) connect({ connector });
                      } else {
                        const marketsAnchor =
                          document.getElementById("markets-section");
                        marketsAnchor?.scrollIntoView({
                          behavior: "smooth",
                        });
                      }
                    }}
                  >
                    Start Betting
                    <ArrowUpRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {heroStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur"
                  >
                    <p className="text-xs uppercase tracking-widest text-white/50">
                      {stat.label}
                    </p>
                    <p className="mt-3 text-2xl font-semibold text-white">
                      {stat.value}
                    </p>
                    <p className="mt-1 text-xs text-white/60">
                      {stat.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white/80">
                    Universal Account
                  </p>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
                    Smart wallet
                  </span>
                </div>
                <p className="mt-3 text-3xl font-semibold">
                  {universalBalance
                    ? `${Number(universalBalance.formatted).toFixed(2)} ${universalBalance.symbol}`
                    : "--"}
                </p>
                <p className="mt-2 text-sm text-white/60">
                  {universalDisplay ?? "Connect your wallet to provision."}
                </p>

                <div className="mt-4 grid gap-2">
                  <Button
                    variant="outline"
                    className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10"
                    onClick={() => handleCopy(universalAccount)}
                    disabled={!universalAccount}
                  >
                    Copy Universal Address
                  </Button>
                  {subAccount ? (
                    <Button
                      variant="ghost"
                      className="w-full text-white/70 hover:text-white"
                      onClick={() => handleCopy(subAccount)}
                    >
                      Secondary: {subAccountDisplay}
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                <p className="text-sm font-semibold text-white/80">
                  Base Sepolia Faucet
                </p>
                <p className="mt-1 text-xs text-white/60">
                  Need ammo? Request 25 testnet USDC to seed your strategy.
                </p>
                <Button
                  className={cn(
                    "mt-4 w-full rounded-full font-semibold",
                    faucetMutation.isPending
                      ? "bg-white/20 text-white/70"
                      : "bg-emerald-500 text-white hover:bg-emerald-400"
                  )}
                  onClick={handleFundAccount}
                  disabled={
                    faucetMutation.isPending || !faucetEligibility.isEligible
                  }
                >
                  {faucetMutation.isPending
                    ? "Requesting..."
                    : faucetEligibility.isEligible
                      ? "Get Testnet USDC"
                      : "Balance In Range"}
                </Button>
                {!faucetEligibility.isEligible ? (
                  <p className="mt-2 text-xs text-emerald-200/70">
                    {faucetEligibility.reason}
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          <section id="markets-section" className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-3xl font-semibold text-white">
                Featured Crypto Markets
              </h2>
              <p className="max-w-2xl text-sm text-white/70">
                Explore curated questions that track the most relevant catalysts
                in crypto. Stake USDC on your outlook and signal conviction to
                the community.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <PredictionMarkets />
            </div>
          </section>
        </div>
      </div>

      <Dialog
        open={isTransferDialogOpen}
        onOpenChange={(open) => setIsTransferDialogOpen(open)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer USDC</DialogTitle>
            <DialogDescription>
              Move USDC from your universal account to any address.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">
                Universal balance
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {universalBalance
                  ? `${universalBalance.formatted} ${universalBalance.symbol}`
                  : "--"}
              </p>
            </div>
            <Input
              placeholder="Recipient Address (0x...)"
              value={transferAddress}
              onChange={(event) => setTransferAddress(event.target.value)}
            />
            <Input
              type="number"
              placeholder="Amount in USDC"
              step="0.01"
              min="0"
              value={transferAmount}
              onChange={(event) => setTransferAmount(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={handleTransfer}
              disabled={
                !transferAmount ||
                !transferAddress ||
                isConfirming ||
                isTransactionPending
              }
            >
              {isTransactionPending || isConfirming
                ? "Submitting..."
                : "Send USDC"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

export default App;
