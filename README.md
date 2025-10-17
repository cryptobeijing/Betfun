# Betfun Prediction Markets

Betfun is a crypto-native prediction market surface. Stake USDC on curated narratives - Bitcoin blow-off tops, Ethereum roadmap milestones, Base adoption, stablecoin growth, and more - and route "YES" and "NO" flows directly to dedicated multisig addresses. The landing page introduces a cinematic hero, live market grid, and glassmorphism wallet sidebar so new bettors can connect, fund, and bet in seconds.

## Features

- **Curated crypto markets:** Ten high-signal questions with odds, sentiment tags, and quick-bet buttons routed to USDC receivers for YES and NO outcomes.
- **Universal account flow:** Wallet connect on Base Sepolia, faucet access, and transfer tooling built around Coinbase smart sub-accounts.
- **Custom betting experience:** Dialog for side selection, percentage shortcuts, and amount entry, backed by wagmi's `useSendTransaction`.
- **Modern UI polish:** Gradient hero, stat blocks, glass cards, and responsive layout designed for "prediction market" feel.
- **Realtime feedback:** Toast confirmations for faucet pulls, transfers, and bet placements using Sonner.

## Tech Stack

- **Next.js 14 + React 18** for the app router experience and client components.
- **Tailwind CSS 4** with custom gradients and glassmorphism tokens.
- **wagmi v2 + viem** powering wallet connection, Base Sepolia balance checks, and ERC-20 transfers.
- **Coinbase Sub-Accounts** (universal + smart wallet) wiring the multi-account flow that the faucet and transfers depend on.
- **Sonner toast notifications** for transaction lifecycle UX.
- **Radix UI primitives** (`Dialog`, `Button`, `Input`) wrapped with shadcn styling.

## Development

```bash
pnpm install
pnpm dev
```

The dev server starts on `http://localhost:3000`. If port 3000 is blocked, set a custom port via `PORT=3001 pnpm dev`.

## Environment

Ensure `.env.local` exposes any API keys required by hooks (e.g., Neynar keys for Farcaster if the faucet or account scaffolding is expanded). Base Sepolia USDC contract addresses are configured in `src/lib/usdc`.

## Faucet & Funding

- `Fund Universal` triggers `useFaucet` to request Base Sepolia USDC when eligibility rules allow (balance below threshold).
- `Transfer USDC` opens a dialog to move tokens from the universal account to any address.

Both flows provide toast feedback and rely on the Coinbase sub-account architecture.

## Betting Flow

1. Connect a wallet on Base Sepolia (Coinbase Wallet or compatible connectors).
2. Fund the universal account via faucet if needed.
3. Browse the Featured Markets grid and place quick bets (`0.10 USDC`) or open **Custom Bet**.
4. Transactions encode `ERC20.transfer` calls to:
   - `YES` bets -> `0x3b324062dF51713EAD1f74474916d6Be2824e09F`
   - `NO` bets -> `0xCa139b8b46C415D85BefdFB7Ba1DFB4b9ea55058`
5. Toasts confirm submission and settlement and refresh UI state.

## Deployment

This project ships as a standard Next.js app. Deploy to Vercel or any Node-capable host. Ensure environment variables and Base Sepolia RPC access are available in production, and update the faucet endpoint if migrating from testnet to mainnet.
