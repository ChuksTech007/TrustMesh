import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Terminal,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Wallet,
  Cpu,
  Activity,
  RefreshCw,
  Coins,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  Zap,
  TrendingUp,
  Percent,
  Search,
  ExternalLink,
  ChevronRight,
  X,
  Play,
  Pause,
  Sliders,
  Layers,
  ArrowUpRight,
  Database,
  Lock,
  Key
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Initial multi-chain ledger nodes for the TrustMesh v2 autonomous pool
const INITIAL_LEDGER_NODES = [
  {
    id: 'node-01',
    address: 'alice.near',
    originChain: 'Base',
    chainBadge: '🔵 Base',
    token: 'USDC',
    commitment: '500.00 USDC',
    rawAmount: 500,
    usdValue: '$500.00',
    strategy: 'Burrow Supply (8.4% APY)',
    creditScore: 98,
    tier: 'Prime',
    tierBadge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    status: 'ACTIVE_YIELD',
    escrowLocked: '0.00 USDC',
    directRelease: '500.00 USDC',
    mpcDerivation: "m/44'/397'/0'/0/1",
    sybilResistance: 99.4,
    repaymentVelocity: 100,
    volumeDepth: '$48,200',
    yieldEarned: '+$14.20'
  },
  {
    id: 'node-02',
    address: 'bob.sol',
    originChain: 'Solana',
    chainBadge: '🟣 Solana',
    token: 'SOL',
    commitment: '14.50 SOL',
    rawAmount: 14.5,
    usdValue: '$2,175.00',
    strategy: 'Kamino Restake Swarm (12.1% APY)',
    creditScore: 45,
    tier: 'Escrow Required',
    tierBadge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    status: 'ESCROW_BUFFERED',
    escrowLocked: '5.08 SOL ($761.25)',
    directRelease: '9.42 SOL ($1,413.75)',
    mpcDerivation: "m/44'/501'/0'/0/2",
    sybilResistance: 62.1,
    repaymentVelocity: 84,
    volumeDepth: '$3,800',
    yieldEarned: '+$8.40'
  },
  {
    id: 'node-03',
    address: '0x71c...99a2',
    originChain: 'Ethereum',
    chainBadge: '🔷 Ethereum',
    token: 'stETH',
    commitment: '0.85 stETH',
    rawAmount: 0.85,
    usdValue: '$2,720.00',
    strategy: 'Lido Core Restake (5.6% APY)',
    creditScore: 92,
    tier: 'Verified',
    tierBadge: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    status: 'ACTIVE_YIELD',
    escrowLocked: '0.00 stETH',
    directRelease: '0.85 stETH',
    mpcDerivation: "m/44'/60'/0'/0/3",
    sybilResistance: 96.8,
    repaymentVelocity: 99,
    volumeDepth: '$124,500',
    yieldEarned: '+$31.50'
  },
  {
    id: 'node-04',
    address: 'charlie.near',
    originChain: 'Arbitrum',
    chainBadge: '⚡ Arbitrum',
    token: 'USDC',
    commitment: '500.00 USDC',
    rawAmount: 500,
    usdValue: '$500.00',
    strategy: 'Ref Finance LP (11.2% APY)',
    creditScore: 91,
    tier: 'Verified',
    tierBadge: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    status: 'ACTIVE_YIELD',
    escrowLocked: '0.00 USDC',
    directRelease: '500.00 USDC',
    mpcDerivation: "m/44'/397'/0'/0/4",
    sybilResistance: 94.2,
    repaymentVelocity: 97,
    volumeDepth: '$18,900',
    yieldEarned: '+$11.80'
  },
  {
    id: 'node-05',
    address: 'vitalik.eth',
    originChain: 'Base',
    chainBadge: '🔵 Base',
    token: 'cbBTC',
    commitment: '0.12 cbBTC',
    rawAmount: 0.12,
    usdValue: '$8,160.00',
    strategy: 'Aerodrome Slipstream (16.4% APY)',
    creditScore: 99,
    tier: 'Prime',
    tierBadge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    status: 'ACTIVE_YIELD',
    escrowLocked: '0.00 cbBTC',
    directRelease: '0.12 cbBTC',
    mpcDerivation: "m/44'/60'/0'/0/5",
    sybilResistance: 99.9,
    repaymentVelocity: 100,
    volumeDepth: '$890,000',
    yieldEarned: '+$64.10'
  }
];

// Initial AI Agent Audit Logs for yield rebalancing stream
const INITIAL_AUDIT_LOGS = [
  {
    id: 1,
    timestamp: '06:30:12',
    category: 'CHAIN_ABSTRACTION',
    tagColor: 'text-violet-400',
    operation: 'NEAR_MPC_SIGNATURE',
    details: "Derived Ed25519 signer on Solana for intent #9921 without cross-chain bridge."
  },
  {
    id: 2,
    timestamp: '06:31:45',
    category: 'YIELD_REBALANCE',
    tagColor: 'text-emerald-400',
    operation: 'BURROW_FINANCE_DEPLOY',
    details: "Allocated 250 NEAR to Burrow Protocol. Floating interest rate locked at +8.42% APY."
  },
  {
    id: 3,
    timestamp: '06:33:02',
    category: 'AI_POLICY_ENGINE',
    tagColor: 'text-amber-400',
    operation: 'SPEND_GUARD_ENFORCE',
    details: "Credit vector evaluation for bob.sol: Score 45/100. Enforced 35% escrow lock to protect pool."
  },
  {
    id: 4,
    timestamp: '06:34:20',
    category: 'SOLVER_SETTLEMENT',
    tagColor: 'text-sky-400',
    operation: '1CLICK_INTENT_FINALIZED',
    details: "Settled 500 USDC deposit originating from Base chain into NEAR ledger in 850ms."
  },
  {
    id: 5,
    timestamp: '06:35:08',
    category: 'SWARM_ARBITRAGE',
    tagColor: 'text-emerald-400',
    operation: 'HARVEST_ACCRUED_YIELD',
    details: "Harvested $142.10 yield from LiNEAR liquid restaking strategy buffer."
  }
];

export default function App() {
  // Navigation & View State
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [chainFilter, setChainFilter] = useState('ALL');
  
  // Real-time Telemetry States
  const [dynamicApy, setDynamicApy] = useState(14.82);
  const [strategyPoolVolume, setStrategyPoolVolume] = useState(14842910.40);
  const [activeHealthLatency, setActiveHealthLatency] = useState(14);
  const [ledgerNodes, setLedgerNodes] = useState(INITIAL_LEDGER_NODES);
  
  // Terminal Stream States
  const [auditLogs, setAuditLogs] = useState(INITIAL_AUDIT_LOGS);
  const [isStreamPaused, setIsStreamPaused] = useState(false);
  const [isRebalancing, setIsRebalancing] = useState(false);
  
  const terminalEndRef = useRef(null);

  // Fluctuating live AI APY & Pool metrics loop
  useEffect(() => {
    const apyInterval = setInterval(() => {
      setDynamicApy(prev => {
        const delta = (Math.random() * 0.08 - 0.04);
        return +(prev + delta).toFixed(2);
      });
      setStrategyPoolVolume(prev => +(prev + (Math.random() * 45 - 15)).toFixed(2));
      setActiveHealthLatency(Math.floor(12 + Math.random() * 5));
    }, 2800);

    return () => clearInterval(apyInterval);
  }, []);

  // Periodic simulated agent yield rebalancing stream
  useEffect(() => {
    if (isStreamPaused) return;

    const streamInterval = setInterval(() => {
      const operations = [
        {
          category: 'YIELD_REBALANCE',
          tagColor: 'text-emerald-400',
          operation: 'REF_FINANCE_OPTIMIZE',
          details: `Rebalanced LP liquidity across NEAR/USDC pool. Dynamic slippage minimized to 0.02%.`
        },
        {
          category: 'AI_POLICY_ENGINE',
          tagColor: 'text-violet-400',
          operation: 'NEURAL_CREDIT_REFRESH',
          details: `Refreshed multi-chain Sybil vector for active nodes. Swarm confidence factor: 99.1%.`
        },
        {
          category: 'CHAIN_ABSTRACTION',
          tagColor: 'text-sky-400',
          operation: 'MPC_STATE_SYNC',
          details: `Synchronized NEAR Chain Signature state with Base and Solana settlement vaults.`
        },
        {
          category: 'SWARM_ARBITRAGE',
          tagColor: 'text-emerald-400',
          operation: 'BURROW_COMPOUND_TICK',
          details: `Auto-compounded accrued lending interest. Added +$4.80 to current strategy pot.`
        }
      ];

      const nextOp = operations[Math.floor(Math.random() * operations.length)];
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];

      setAuditLogs(prev => [
        ...prev.slice(-15),
        {
          id: Date.now(),
          timestamp: timeStr,
          ...nextOp
        }
      ]);
    }, 4500);

    return () => clearInterval(streamInterval);
  }, [isStreamPaused]);

  // Trigger manual on-demand rebalance
  const handleTriggerRebalance = () => {
    setIsRebalancing(true);
    const now = new Date().toTimeString().split(' ')[0];

    setTimeout(() => {
      setAuditLogs(prev => [
        ...prev,
        {
          id: Date.now(),
          timestamp: now,
          category: 'AI_AGENT_ACTION',
          tagColor: 'text-emerald-400',
          operation: 'MANUAL_REBALANCE_EXECUTED',
          details: `Triggered comprehensive multi-chain rebalance across 5 strategy nodes. Yield delta: +0.12%.`
        }
      ]);
      setDynamicApy(prev => +(prev + 0.12).toFixed(2));
      setIsRebalancing(false);
    }, 900);
  };

  // Filtered nodes based on search and chain filter
  const filteredNodes = ledgerNodes.filter(node => {
    const matchesSearch = node.address.toLowerCase().includes(searchFilter.toLowerCase()) ||
                          node.strategy.toLowerCase().includes(searchFilter.toLowerCase()) ||
                          node.token.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesChain = chainFilter === 'ALL' || node.originChain.toUpperCase() === chainFilter.toUpperCase();
    return matchesSearch && matchesChain;
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/20 selection:text-emerald-400 relative overflow-x-hidden">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[350px] bg-gradient-to-b from-emerald-500/10 via-violet-500/5 to-transparent blur-3xl opacity-70" />
        <div className="absolute top-[400px] -left-[200px] w-[500px] h-[500px] bg-violet-600/5 blur-[120px] rounded-full" />
      </div>

      {/* Main Container */}
      <div className="relative z-10 max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
        {/* ========================================================================= */}
        {/* TOP NAVIGATION & PROTOCOL STATUS HEADER */}
        {/* ========================================================================= */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-xl">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-emerald-500 to-violet-600 flex items-center justify-center shadow-lg shadow-emerald-500/10 border border-emerald-400/20">
              <Cpu className="h-6 w-6 text-zinc-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-zinc-100">TrustMesh v2</h1>
                <span className="text-[10px] font-mono uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Autonomous Capital Mesh
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono tracking-tight">
                NEAR Chain Abstraction • Multi-Chain Yield & Credit Swarm
              </p>
            </div>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs font-mono">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-zinc-400">MPC Signer:</span>
              <span className="text-zinc-200 font-semibold">Active (Testnet)</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs font-mono">
              <Activity className="h-3.5 w-3.5 text-violet-400" />
              <span className="text-zinc-400">Mesh Latency:</span>
              <span className="text-emerald-400 font-semibold">{activeHealthLatency}ms</span>
            </div>

            <button
              onClick={handleTriggerRebalance}
              disabled={isRebalancing}
              className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 font-bold text-xs transition duration-150 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRebalancing ? 'animate-spin' : ''}`} />
              <span>{isRebalancing ? 'Optimizing...' : 'Rebalance Yield'}</span>
            </button>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* MULTI-CHAIN STATISTICS RIBBON */}
        {/* ========================================================================= */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Pool Volume */}
          <div className="p-5 rounded-2xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-mono tracking-wider uppercase font-medium">Strategy Pool Volume</span>
              <Database className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black tracking-tight text-zinc-100 font-mono">
              ${strategyPoolVolume.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-zinc-400 border-t border-zinc-800/60 pt-2 font-mono">
              <span>NEAR: $6.4M</span>
              <span>SOL: $4.1M</span>
              <span>BASE: $2.8M</span>
            </div>
          </div>

          {/* Card 2: Dynamic AI APY */}
          <div className="p-5 rounded-2xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-mono tracking-wider uppercase font-medium">Dynamic AI APY</span>
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black tracking-tight text-emerald-400 font-mono">
                {dynamicApy}%
              </span>
              <span className="text-xs font-mono text-emerald-500/80 font-semibold flex items-center">
                <ArrowUpRight className="h-3 w-3 inline" /> Live Optimizing
              </span>
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-zinc-400 border-t border-zinc-800/60 pt-2 font-mono">
              <span>Burrow Supply</span>
              <span>•</span>
              <span>LiNEAR Restaking</span>
            </div>
          </div>

          {/* Card 3: Mesh Health & Telemetry */}
          <div className="p-5 rounded-2xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-mono tracking-wider uppercase font-medium">Mesh Node Health</span>
              <Activity className="h-4 w-4 text-violet-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black tracking-tight text-violet-400 font-mono">
                99.98%
              </span>
              <span className="text-xs font-mono text-zinc-400">1,420 Agents</span>
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-zinc-400 border-t border-zinc-800/60 pt-2 font-mono">
              <span>Zero Slashing</span>
              <span className="text-emerald-400 font-bold">STATE_HEALTHY</span>
            </div>
          </div>

          {/* Card 4: Escrow Protection Ratio */}
          <div className="p-5 rounded-2xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-mono tracking-wider uppercase font-medium">AI Spend Guard Reserve</span>
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black tracking-tight text-zinc-100 font-mono">
              $1,420,500
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-zinc-400 border-t border-zinc-800/60 pt-2 font-mono">
              <span>Default Coverage: 100%</span>
              <span className="text-violet-400">Threshold: 65/100</span>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* MAIN SPLIT VIEW: DYNAMIC LEDGER TABLE & AGENT TERMINAL MONITOR */}
        {/* ========================================================================= */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: Dynamic Ledger Table (8 Columns) */}
          <div className="lg:col-span-8 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-xl p-6 flex flex-col gap-5">
            {/* Table Header Bar with Search & Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold tracking-tight text-zinc-100 flex items-center gap-2">
                  <Coins className="h-4 w-4 text-emerald-400" />
                  Active Cross-Chain Strategy Nodes
                </h2>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">
                  Multi-chain capital commitments monitored via NEAR Chain Abstraction
                </p>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search node or token..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 w-44 sm:w-52"
                  />
                </div>

                {/* Chain Filter Dropdown */}
                <select
                  value={chainFilter}
                  onChange={(e) => setChainFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300 focus:outline-none focus:border-zinc-700 cursor-pointer"
                >
                  <option value="ALL">All Chains</option>
                  <option value="BASE">Base</option>
                  <option value="SOLANA">Solana</option>
                  <option value="ETHEREUM">Ethereum</option>
                  <option value="ARBITRUM">Arbitrum</option>
                </select>
              </div>
            </div>

            {/* Table Container */}
            <div className="overflow-x-auto rounded-xl border border-zinc-800/80 bg-zinc-950/60">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-800/80 bg-zinc-900/60 text-zinc-400 font-mono text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">Node Account</th>
                    <th className="py-3 px-4">Origin Chain</th>
                    <th className="py-3 px-4">Commitment</th>
                    <th className="py-3 px-4">Yield Strategy</th>
                    <th className="py-3 px-4">AI Score</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono">
                  {filteredNodes.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-zinc-500 italic">
                        No active strategy nodes matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredNodes.map((node) => (
                      <tr
                        key={node.id}
                        className="hover:bg-zinc-800/30 transition-colors group cursor-pointer"
                        onClick={() => setSelectedNode(node)}
                      >
                        {/* Address */}
                        <td className="py-3.5 px-4 font-semibold text-zinc-200 group-hover:text-emerald-400 transition-colors">
                          <div className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            <span>{node.address}</span>
                          </div>
                        </td>

                        {/* Origin Chain */}
                        <td className="py-3.5 px-4 text-zinc-400">
                          <span className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] font-sans font-medium text-zinc-300">
                            {node.chainBadge}
                          </span>
                        </td>

                        {/* Commitment */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-zinc-200">{node.commitment}</div>
                          <div className="text-[10px] text-zinc-500">{node.usdValue}</div>
                        </td>

                        {/* Strategy */}
                        <td className="py-3.5 px-4 text-zinc-300 font-sans text-xs">
                          {node.strategy}
                        </td>

                        {/* AI Score Badge */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${node.tierBadge}`}>
                            {node.creditScore >= 65 ? (
                              <ShieldCheck className="h-3 w-3" />
                            ) : (
                              <ShieldAlert className="h-3 w-3" />
                            )}
                            {node.creditScore}/100 • {node.tier}
                          </span>
                        </td>

                        {/* Action Inspect Button */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedNode(node);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-300 hover:text-white transition text-[11px] font-medium border border-zinc-700/60 inline-flex items-center gap-1"
                          >
                            <span>Inspect</span>
                            <ChevronRight className="h-3 w-3 text-zinc-400" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer Summary */}
            <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-400 font-mono pt-1">
              <span>Displaying {filteredNodes.length} active multi-chain strategy nodes</span>
              <div className="flex items-center gap-4 mt-2 sm:mt-0">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" /> Prime (&ge;65): Direct Release
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-400" /> High-Risk (&lt;65): Escrow Enforced
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT: Active Terminal Monitor (4 Columns) */}
          <div className="lg:col-span-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-xl p-5 flex flex-col gap-4">
            {/* Terminal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1.5 mr-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80 inline-block" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80 inline-block" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80 inline-block" />
                </div>
                <Terminal className="h-4 w-4 text-violet-400" />
                <h3 className="text-xs font-mono font-bold tracking-wider text-zinc-200 uppercase">
                  AGENT_AUDIT_STREAM
                </h3>
              </div>

              {/* Pause / Play Button */}
              <button
                onClick={() => setIsStreamPaused(!isStreamPaused)}
                className="p-1 rounded-md bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
                title={isStreamPaused ? "Resume Stream" : "Pause Stream"}
              >
                {isStreamPaused ? (
                  <Play className="h-3 w-3 text-emerald-400" />
                ) : (
                  <Pause className="h-3 w-3 text-amber-400" />
                )}
              </button>
            </div>

            {/* Scrolling Console Content */}
            <div className="bg-zinc-950 rounded-xl p-3 font-mono text-[11px] h-[480px] overflow-y-auto space-y-3 border border-zinc-800/60 leading-relaxed">
              {auditLogs.map((log) => (
                <div key={log.id} className="border-b border-zinc-900 pb-2.5 last:border-b-0">
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1">
                    <span>[{log.timestamp}]</span>
                    <span className={`font-semibold ${log.tagColor}`}>{log.operation}</span>
                  </div>
                  <div className="text-zinc-300">
                    <span className="text-violet-400 select-none mr-1.5 font-bold">&gt;</span>
                    {log.details}
                  </div>
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>

            {/* Stream Telemetry Footer */}
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-1">
              <span>BUFFER: 16 BLOCKS</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                AI AGENT POLLING LIVE
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* ========================================================================= */}
      {/* "INSPECT METRICS" SLIDE-OUT CONTEXT PANEL (DRAWER) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedNode && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedNode(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-pointer"
            />

            {/* Drawer Body */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative z-10 w-full max-w-md bg-zinc-900 border-l border-zinc-800 p-6 shadow-2xl flex flex-col justify-between overflow-y-auto h-full text-xs"
            >
              {/* Drawer Top Header */}
              <div className="flex flex-col gap-6">
                <div className="flex items-start justify-between pb-4 border-b border-zinc-800">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-zinc-400">Node Telemetry Matrix</span>
                    <h3 className="text-lg font-bold text-zinc-100 font-mono mt-0.5 flex items-center gap-2">
                      <span>{selectedNode.address}</span>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300 font-sans font-normal">
                        {selectedNode.chainBadge}
                      </span>
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* AI Credit & Risk Telemetry Gauge */}
                <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-zinc-400 uppercase font-semibold">AI Credit Evaluation</span>
                    <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs border ${selectedNode.tierBadge}`}>
                      {selectedNode.creditScore} / 100 • {selectedNode.tier}
                    </span>
                  </div>

                  <div className="space-y-2.5 font-mono text-xs pt-1">
                    <div>
                      <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                        <span>Sybil Resistance Probability</span>
                        <span className="text-emerald-400 font-bold">{selectedNode.sybilResistance}%</span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-1.5">
                        <div className="bg-emerald-400 h-1.5 rounded-full" style={{ width: `${selectedNode.sybilResistance}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                        <span>Repayment Velocity</span>
                        <span className="text-violet-400 font-bold">{selectedNode.repaymentVelocity}%</span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-1.5">
                        <div className="bg-violet-400 h-1.5 rounded-full" style={{ width: `${selectedNode.repaymentVelocity}%` }} />
                      </div>
                    </div>

                    <div className="flex justify-between text-[11px] text-zinc-400 pt-1 border-t border-zinc-800/60">
                      <span>Cross-Chain Volume Depth:</span>
                      <span className="text-zinc-200 font-bold">{selectedNode.volumeDepth}</span>
                    </div>
                  </div>
                </div>

                {/* Chain Abstraction Telemetry */}
                <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex flex-col gap-2.5 font-mono">
                  <div className="flex items-center gap-2 text-zinc-300 font-semibold text-xs pb-1 border-b border-zinc-800/60">
                    <Key className="h-3.5 w-3.5 text-violet-400" />
                    <span>NEAR MPC Chain Signatures</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Key Derivation Path:</span>
                    <span className="text-zinc-200">{selectedNode.mpcDerivation}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>MPC Signer Status:</span>
                    <span className="text-emerald-400 font-semibold">VERIFIED_NATIVE</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Settlement Proof:</span>
                    <span className="text-violet-400 font-semibold">NEAR 1CLICK_INTENT</span>
                  </div>
                </div>

                {/* Capital Allocation & Escrow Split */}
                <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex flex-col gap-2.5 font-mono">
                  <div className="flex items-center gap-2 text-zinc-300 font-semibold text-xs pb-1 border-b border-zinc-800/60">
                    <Shield className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Capital Allocation & Escrow Split</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Active Commitment:</span>
                    <span className="text-zinc-100 font-bold">{selectedNode.commitment}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Direct Wallet Release:</span>
                    <span className="text-emerald-400 font-bold">{selectedNode.directRelease}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Withheld in Escrow Vault:</span>
                    <span className={selectedNode.creditScore < 65 ? "text-amber-400 font-bold" : "text-zinc-500"}>
                      {selectedNode.escrowLocked}
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-400 pt-1 border-t border-zinc-800/60">
                    <span>Cumulative Yield Earned:</span>
                    <span className="text-emerald-400 font-bold">{selectedNode.yieldEarned}</span>
                  </div>
                </div>
              </div>

              {/* Drawer Bottom Actions */}
              <div className="pt-6 border-t border-zinc-800 flex flex-col gap-2.5 font-mono">
                <button
                  onClick={() => {
                    handleTriggerRebalance();
                    setSelectedNode(null);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Harvest & Rebalance Strategy</span>
                </button>

                <button
                  onClick={() => setSelectedNode(null)}
                  className="w-full py-2 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition text-xs"
                >
                  Close Telemetry Panel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
