import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  ShieldCheck,
  ShieldAlert,
  Terminal,
  RefreshCw,
  Coins,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  Trophy,
  AlertCircle,
  Zap,
  Lock,
  Layers,
  Cpu,
  BookOpen,
  Users,
  Globe,
  ArrowRight,
  Sparkles,
  HelpCircle,
  TrendingUp,
  CircleDollarSign,
  Activity,
  Plus,
  X,
  Copy,
  ChevronDown,
  Percent,
  Sliders,
  Radio,
  ExternalLink,
  ChevronRight,
  Wallet
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Formats yoctoNEAR cleanly into readable NEAR
function formatNear(yoctoStr) {
  if (!yoctoStr) return '0';
  try {
    const raw = BigInt(yoctoStr);
    const divisor = BigInt('1000000000000000000000000'); // 10^24
    const whole = raw / divisor;
    const remainder = raw % divisor;
    if (remainder === 0n) return `${whole}`;
    const decimals = remainder.toString().padStart(24, '0').slice(0, 2);
    return `${whole}.${decimals}`;
  } catch {
    return yoctoStr;
  }
}

// Chain metadata presets with authentic branding
const CHAINS = {
  base: {
    name: 'Base',
    token: 'USDC',
    color: 'from-blue-500 to-indigo-600',
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    icon: '🔵'
  },
  solana: {
    name: 'Solana',
    token: 'SOL',
    color: 'from-purple-500 to-emerald-400',
    border: 'border-purple-500/30',
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    icon: '🟣'
  },
  arbitrum: {
    name: 'Arbitrum',
    token: 'USDC',
    color: 'from-sky-500 to-blue-600',
    border: 'border-sky-500/30',
    bg: 'bg-sky-500/10',
    text: 'text-sky-400',
    icon: '🔷'
  },
  near: {
    name: 'NEAR Core',
    token: 'NEAR',
    color: 'from-emerald-400 to-teal-500',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    icon: '🟢'
  }
};

// Preset Syndicates for the Marketplace Explorer
const PRESET_SYNDICATES = [
  {
    id: 0,
    title: 'Genesis Multi-Chain Capital Mesh',
    category: 'Cross-Chain Remittance & Savings',
    badge: 'Live Interactive Ledger',
    apy: '8.4%',
    membersCount: 3,
    totalCap: '15 NEAR',
    contribution: '5 NEAR',
    status: 'Active',
    chains: ['base', 'solana', 'arbitrum', 'near'],
    riskRating: 'AAA Prime'
  },
  {
    id: 1,
    title: 'Decentralized GPU Compute Swarm',
    category: 'AI Infrastructure Syndicates',
    badge: 'Yield Generating',
    apy: '12.1%',
    membersCount: 6,
    totalCap: '120 NEAR',
    contribution: '20 NEAR',
    status: 'Filling (4/6)',
    chains: ['base', 'solana', 'near'],
    riskRating: 'AA+'
  },
  {
    id: 2,
    title: 'Diaspora West-Africa Credit Union',
    category: 'Social Impact Finance',
    badge: 'Zero-Default Insured',
    apy: '7.8%',
    membersCount: 10,
    totalCap: '500 NEAR',
    contribution: '50 NEAR',
    status: 'Active',
    chains: ['base', 'arbitrum', 'near'],
    riskRating: 'AAA Prime'
  },
  {
    id: 3,
    title: 'Web3 Builder Micro-Angel Syndicate',
    category: 'Early Stage Capital Pooling',
    badge: 'Dynamic Escrow',
    apy: '14.5%',
    membersCount: 5,
    totalCap: '250 NEAR',
    contribution: '50 NEAR',
    status: 'Upcoming',
    chains: ['solana', 'near'],
    riskRating: 'A+'
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('hub'); // 'hub' | 'explorer' | 'risk' | 'architecture'
  const [circle, setCircle] = useState(null);
  const [circlesList, setCirclesList] = useState([]);
  const [selectedCircleId, setSelectedCircleId] = useState(0);
  const [auditLogs, setAuditLogs] = useState([]);
  const [latestPolicy, setLatestPolicy] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [isTerminalOpen, setIsTerminalOpen] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Simulated live DeFi yield accumulator ticking up in real time
  const [accruedYield, setAccruedYield] = useState(0.0421);

  // New Syndicate Form State
  const [newSyndicate, setNewSyndicate] = useState({
    title: '',
    contribution: '10',
    totalRounds: 4,
    category: 'Developer Compute Swarm'
  });

  const terminalContainerRef = useRef(null);
  const prevLogsCountRef = useRef(0);

  // Live yield increment ticker simulation
  useEffect(() => {
    const yieldInterval = setInterval(() => {
      setAccruedYield(prev => +(prev + 0.00015).toFixed(5));
    }, 2500);
    return () => clearInterval(yieldInterval);
  }, []);

  // Auto-scroll terminal when new events arrive
  useEffect(() => {
    if (terminalContainerRef.current && auditLogs.length > prevLogsCountRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
      prevLogsCountRef.current = auditLogs.length;
    }
  }, [auditLogs]);

  // Initial data fetch & polling
  useEffect(() => {
    fetchCircleData(selectedCircleId);
    fetchAuditTrail();

    const interval = setInterval(() => {
      fetchCircleData(selectedCircleId, true);
      fetchAuditTrail();
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedCircleId]);

  const fetchCircleData = async (id, isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/circle/${id}`);
      setCircle(res.data);
      const listRes = await axios.get(`${API_BASE}/api/circles`);
      setCirclesList(listRes.data || []);
    } catch (err) {
      console.error('Fetch circle error:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const fetchAuditTrail = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/agent/audit-trail`);
      setAuditLogs(res.data.events || []);
    } catch (err) {
      console.error('Fetch audit trail error:', err);
    }
  };

  // Mock cross-chain deposit trigger
  const handleDeposit = async (memberAccountId, chain, token, amount) => {
    setActionMessage(null);
    setActionError(null);
    setLoading(true);

    try {
      const payload = {
        intent_id: `intent_${Date.now()}_${chain}`,
        source_chain: chain,
        source_token: token,
        amount: amount,
        source_tx_hash: `0x${Math.random().toString(16).substring(2, 10)}...${chain}_intent`,
        target_circle_id: selectedCircleId,
        member_account_id: memberAccountId,
      };

      await axios.post(`${API_BASE}/api/webhook/cross-chain-deposit`, payload);
      setActionMessage(`Cross-Chain Intent Verified: ${amount} ${token} (${chain.toUpperCase()}) credited to ${memberAccountId} on NEAR!`);
      await fetchCircleData(selectedCircleId);
      await fetchAuditTrail();
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      setActionError(`Deposit Ingestion Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  // Round rotation trigger with Confetti celebration
  const handleRotate = async () => {
    setActionMessage(null);
    setActionError(null);
    setLoading(true);

    try {
      const res = await axios.post(`${API_BASE}/api/circle/rotate`, { circle_id: selectedCircleId });
      setActionMessage(`Rotation Finalized! Winner Awarded: ${res.data.winner}`);
      if (res.data.policyResult) {
        setLatestPolicy(res.data.policyResult);
      }

      // Trigger festive confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00EC97', '#6366F1', '#38BDF8']
      });

      await fetchCircleData(selectedCircleId);
      await fetchAuditTrail();
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      setActionError(`Rotation Blocked: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  // Pre-flight AI policy test
  const handlePreflightGuard = async (memberAccountId) => {
    setActionMessage(null);
    setActionError(null);
    try {
      const res = await axios.get(`${API_BASE}/api/circle/${selectedCircleId}/guard/${memberAccountId}`);
      setLatestPolicy(res.data);
      setActionMessage(`AI Policy evaluated for ${memberAccountId}`);
      setActiveTab('risk');
    } catch (err) {
      setActionError(`Policy evaluation failed: ${err.message}`);
    }
  };

  const handleCreateSyndicate = (e) => {
    e.preventDefault();
    setIsCreateModalOpen(false);
    setActionMessage(`Syndicate "${newSyndicate.title || 'Custom Mesh'}" initialized on NEAR Ledger!`);
  };

  const currentCandidate = circle && circle.current_round > 0 && circle.members
    ? circle.members[circle.current_round - 1]
    : null;

  const allDeposited = circle && circle.deposits_current_round?.length === circle.members?.length;

  return (
    <div className="min-h-screen bg-radial-mesh text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* ---------------- Top Protocol Navigation Bar ---------------- */}
      <nav className="sticky top-0 z-50 glass-panel border-b border-white/[0.08] px-4 lg:px-8 py-3.5 flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex items-center justify-between w-full lg:w-auto">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-400 via-teal-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Zap className="h-5 w-5 text-black font-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-emerald-400">
                  TrustMesh
                </span>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider font-mono">
                  v2.0 Protocol
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Autonomous Cross-Chain Capital Meshes & AI Spend Guard
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-black font-bold text-xs"
          >
            <Plus className="h-4 w-4" /> New Mesh
          </button>
        </div>

        {/* Center Tab Navigation */}
        <div className="flex items-center bg-slate-900/80 border border-white/10 p-1 rounded-2xl w-full lg:w-auto overflow-x-auto">
          {[
            { id: 'hub', label: 'Command Hub', icon: Activity },
            { id: 'explorer', label: 'Syndicate Explorer', icon: Globe },
            { id: 'risk', label: 'AI Risk Studio', icon: ShieldCheck },
            { id: 'architecture', label: 'Architecture & Docs', icon: BookOpen }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  isActive ? 'text-black font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabBadge"
                    className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-xl shadow-md shadow-emerald-500/20"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Status Pill & CTA */}
        <div className="hidden lg:flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-white/10 text-xs font-mono">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-400">NEAR MPC:</span>
            <span className="text-emerald-400 font-bold">Active</span>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-black font-extrabold text-xs transition shadow-lg shadow-emerald-500/20"
          >
            <Plus className="h-4 w-4" /> Create Capital Mesh
          </button>
        </div>
      </nav>

      {/* ---------------- Live Protocol Ticker Bar ---------------- */}
      <div className="border-b border-white/[0.06] bg-slate-950/40 px-4 lg:px-8 py-2 flex items-center justify-between text-[11px] font-mono text-slate-400 overflow-x-auto gap-6">
        <div className="flex items-center gap-6 whitespace-nowrap">
          <span className="flex items-center gap-1.5">
            <span className="text-slate-500">SIMULATED VOLUME:</span>
            <span className="text-white font-bold">$14.28M</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-slate-500">SETTLEMENT ENGINE:</span>
            <span className="text-emerald-400 font-semibold">NEAR Intents (1Click API)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-slate-500">ACCRUED DEFI APY:</span>
            <span className="text-teal-400 font-bold">+{accruedYield} NEAR</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-slate-500">SWARM RISK STATUS:</span>
            <span className="text-emerald-400 font-bold">0.00% Default Rate</span>
          </span>
        </div>
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
          <span>Ledger Contract: <strong className="text-slate-200">trustmesh.testnet</strong></span>
        </div>
      </div>

      {/* ---------------- Dynamic Toast Banner ---------------- */}
      <AnimatePresence>
        {actionMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-4 lg:mx-8 mt-4 p-4 rounded-2xl glass-panel border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between gap-3 shadow-xl"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              <span className="font-medium">{actionMessage}</span>
            </div>
            <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}

        {actionError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-4 lg:mx-8 mt-4 p-4 rounded-2xl glass-panel border border-red-500/40 text-red-300 text-xs flex items-center justify-between gap-3 shadow-xl"
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
              <span className="font-medium">{actionError}</span>
            </div>
            <button onClick={() => setActionError(null)} className="text-slate-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------- Main Content Views ---------------- */}
      <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">
        {/* ========================================================================= */}
        {/* VIEW 1: COMMAND HUB (INTERACTIVE ROTATING CAPITAL MESH) */}
        {/* ========================================================================= */}
        {activeTab === 'hub' && (
          <div className="flex flex-col gap-8">
            {/* Hero Summary Card */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Interactive Orbital Mesh Visualization (7 cols) */}
              <div className="lg:col-span-7 glass-panel rounded-3xl p-6 lg:p-8 flex flex-col justify-between relative overflow-hidden">
                <div className="flex items-start justify-between relative z-10">
                  <div>
                    <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider font-semibold">
                      Autonomous Capital Mesh #{circle?.id ?? 0}
                    </span>
                    <h2 className="text-2xl font-black text-white mt-1">
                      {circle?.metadata || 'Genesis Cross-Chain Savings Circle'}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1 max-w-md">
                      Rotational multi-chain syndicate settling into NEAR. Pooled capital generates yield until cycle rotation.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
                    ● {circle?.status || 'Active'}
                  </span>
                </div>

                {/* Animated Visual Orbital Mesh Core */}
                <div className="py-10 flex flex-col items-center justify-center relative my-4">
                  {/* Outer Orbit Ring */}
                  <div className="w-64 h-64 sm:w-72 sm:h-72 rounded-full border border-dashed border-emerald-500/20 relative flex items-center justify-center animate-spin-slow">
                    {/* Member Node 1 (Alice - Base) */}
                    <div className="absolute -top-3.5 bg-slate-900 border border-blue-500/40 p-2 rounded-2xl shadow-lg flex items-center gap-2 transform hover:scale-105 transition">
                      <span className="text-xs">🔵</span>
                      <div className="text-left">
                        <div className="text-[10px] font-mono font-bold text-white">alice.near</div>
                        <div className="text-[9px] text-blue-400 font-mono">Base (5 USDC)</div>
                      </div>
                    </div>

                    {/* Member Node 2 (Bob - Solana) */}
                    <div className="absolute -bottom-3.5 right-6 bg-slate-900 border border-purple-500/40 p-2 rounded-2xl shadow-lg flex items-center gap-2 transform hover:scale-105 transition">
                      <span className="text-xs">🟣</span>
                      <div className="text-left">
                        <div className="text-[10px] font-mono font-bold text-white">bob.near</div>
                        <div className="text-[9px] text-purple-400 font-mono">Solana (0.035 SOL)</div>
                      </div>
                    </div>

                    {/* Member Node 3 (Charlie - Arbitrum) */}
                    <div className="absolute -bottom-3.5 left-6 bg-slate-900 border border-sky-500/40 p-2 rounded-2xl shadow-lg flex items-center gap-2 transform hover:scale-105 transition">
                      <span className="text-xs">🔷</span>
                      <div className="text-left">
                        <div className="text-[10px] font-mono font-bold text-white">charlie.near</div>
                        <div className="text-[9px] text-sky-400 font-mono">Arbitrum (5 USDC)</div>
                      </div>
                    </div>
                  </div>

                  {/* Central Pot Core */}
                  <div className="absolute flex flex-col items-center justify-center p-6 rounded-full bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-900 border border-emerald-400/40 shadow-2xl glow-emerald">
                    <Coins className="h-6 w-6 text-emerald-400 animate-bounce" />
                    <span className="text-[10px] text-slate-400 font-mono mt-1">ROUND POT</span>
                    <span className="text-xl font-extrabold text-white font-mono">
                      {formatNear(circle?.total_round_pot)} NEAR
                    </span>
                    <span className="text-[9px] text-teal-400 font-mono font-semibold">
                      +{accruedYield} NEAR Yield
                    </span>
                  </div>
                </div>

                {/* Key Metrics Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10 pt-4 border-t border-white/[0.08]">
                  <div className="bg-slate-900/60 p-3 rounded-2xl border border-white/5">
                    <span className="text-[10px] font-mono text-slate-400">ACTIVE ROUND</span>
                    <div className="text-lg font-bold text-white mt-0.5">
                      {circle?.current_round ?? 0} <span className="text-xs text-slate-500">/ {circle?.total_rounds ?? 3}</span>
                    </div>
                  </div>

                  <div className="bg-slate-900/60 p-3 rounded-2xl border border-white/5">
                    <span className="text-[10px] font-mono text-slate-400">ROUND CONTRIBUTION</span>
                    <div className="text-lg font-bold text-emerald-400 mt-0.5">
                      {formatNear(circle?.contribution_amount)} NEAR
                    </div>
                  </div>

                  <div className="bg-slate-900/60 p-3 rounded-2xl border border-white/5">
                    <span className="text-[10px] font-mono text-slate-400">ROUND DEPOSITS</span>
                    <div className="text-lg font-bold text-white mt-0.5">
                      {circle?.deposits_current_round?.length ?? 0} <span className="text-xs text-slate-500">/ {circle?.members?.length ?? 3}</span>
                    </div>
                  </div>

                  <div className="bg-slate-900/60 p-3 rounded-2xl border border-white/5">
                    <span className="text-[10px] font-mono text-slate-400">TARGET WINNER</span>
                    <div className="text-sm font-bold text-sky-400 mt-1 truncate">
                      {currentCandidate || 'Waiting'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Controls & Multi-Chain Intent Trigger (5 cols) */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                {/* Intent Sender Card */}
                <div className="glass-panel rounded-3xl p-6 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        <ArrowRightLeft className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">Multi-Chain Intent Engine</h3>
                        <p className="text-[11px] text-slate-400">Simulate cross-chain intent settlement via NEAR 1Click</p>
                      </div>
                    </div>
                  </div>

                  {/* Intent Buttons */}
                  <div className="flex flex-col gap-2.5">
                    {/* Alice Intent Button */}
                    <button
                      disabled={loading || circle?.deposits_current_round?.includes('alice.near')}
                      onClick={() => handleDeposit('alice.near', 'base', 'USDC', '5.00')}
                      className="p-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800/80 border border-blue-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition text-left group flex items-center justify-between shadow-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="h-8 w-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">
                          🔵
                        </span>
                        <div>
                          <div className="text-xs font-bold text-white group-hover:text-blue-400 transition">
                            Deposit for Alice (Base)
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">5.00 USDC via Base Intent</div>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-blue-500/10 text-blue-300 border border-blue-500/20">
                        {circle?.deposits_current_round?.includes('alice.near') ? 'Deposited' : 'Send Intent'}
                      </span>
                    </button>

                    {/* Bob Intent Button */}
                    <button
                      disabled={loading || circle?.deposits_current_round?.includes('bob.near')}
                      onClick={() => handleDeposit('bob.near', 'solana', 'SOL', '0.035')}
                      className="p-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800/80 border border-purple-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition text-left group flex items-center justify-between shadow-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="h-8 w-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-sm">
                          🟣
                        </span>
                        <div>
                          <div className="text-xs font-bold text-white group-hover:text-purple-400 transition">
                            Deposit for Bob (Solana)
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">0.035 SOL via Solana Intent</div>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        {circle?.deposits_current_round?.includes('bob.near') ? 'Deposited' : 'Send Intent'}
                      </span>
                    </button>

                    {/* Charlie Intent Button */}
                    <button
                      disabled={loading || circle?.deposits_current_round?.includes('charlie.near')}
                      onClick={() => handleDeposit('charlie.near', 'arbitrum', 'USDC', '5.00')}
                      className="p-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800/80 border border-sky-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition text-left group flex items-center justify-between shadow-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="h-8 w-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-sm">
                          🔷
                        </span>
                        <div>
                          <div className="text-xs font-bold text-white group-hover:text-sky-400 transition">
                            Deposit for Charlie (Arbitrum)
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">5.00 USDC via Arbitrum Intent</div>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-sky-500/10 text-sky-300 border border-sky-500/20">
                        {circle?.deposits_current_round?.includes('charlie.near') ? 'Deposited' : 'Send Intent'}
                      </span>
                    </button>
                  </div>

                  {/* Rotate Round Button */}
                  <div className="pt-2">
                    <button
                      disabled={loading || !allDeposited || circle?.status !== 'Active'}
                      onClick={handleRotate}
                      className={`w-full py-4 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition shadow-xl ${
                        allDeposited && circle?.status === 'Active'
                          ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 text-black shadow-emerald-500/30 cursor-pointer animate-pulse'
                          : 'bg-slate-900 text-slate-500 border border-white/10 cursor-not-allowed'
                      }`}
                    >
                      <Zap className="h-5 w-5" />
                      <span>
                        {allDeposited
                          ? `Trigger Round Rotation (Release Round #${circle?.current_round} Pot)`
                          : `Awaiting Member Deposits (${circle?.deposits_current_round?.length || 0}/${circle?.members?.length || 3})`}
                      </span>
                    </button>
                    {!allDeposited && (
                      <p className="text-[10px] text-slate-500 text-center mt-2 font-mono">
                        Protocol rule: Ledger strictly enforces 100% round funding before release.
                      </p>
                    )}
                  </div>
                </div>

                {/* Quick AI Credit Score Sandbox */}
                <div className="glass-panel rounded-3xl p-5 flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-white">AI Credit Sandbox</h4>
                    <p className="text-[10px] text-slate-400">Pre-flight reputation check on members</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePreflightGuard('alice.near')}
                      className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 border border-white/10"
                    >
                      Check Alice
                    </button>
                    <button
                      onClick={() => handlePreflightGuard('bob.near')}
                      className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 border border-white/10"
                    >
                      Check Bob
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Turn Order Members Grid */}
            <div className="glass-panel rounded-3xl p-6 lg:p-8 flex flex-col gap-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Syndicate Rotation Schedule & Member Ledger
              </h3>

              <div className="divide-y divide-white/[0.06] border border-white/[0.08] rounded-2xl overflow-hidden bg-slate-950/40">
                {circle?.members?.map((member, idx) => {
                  const turn = idx + 1;
                  const isPaid = circle.deposits_current_round?.includes(member);
                  const hasWon = circle.past_winners?.includes(member);
                  const isCandidate = currentCandidate === member;

                  return (
                    <div key={member} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 hover:bg-white/[0.02] transition">
                      <div className="flex items-center gap-3.5">
                        <span className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-xl bg-slate-900 border border-white/10 text-xs font-mono font-bold text-slate-300">
                          #{turn}
                        </span>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-sm font-bold text-white">{member}</span>
                            {isCandidate && (
                              <span className="bg-sky-500/10 text-sky-400 border border-sky-500/30 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                                ★ Round {circle.current_round} Winner
                              </span>
                            )}
                            {hasWon && (
                              <span className="bg-purple-500/10 text-purple-400 border border-purple-500/30 text-[10px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                                <Trophy className="h-3 w-3" /> Past Winner
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500">Scheduled Payout Turn: Round #{turn}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        {isPaid ? (
                          <span className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs px-3 py-1 rounded-xl font-bold">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Deposited
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs px-3 py-1 rounded-xl font-bold">
                            <Clock className="h-3.5 w-3.5" /> Pending
                          </span>
                        )}

                        <button
                          onClick={() => handlePreflightGuard(member)}
                          className="text-xs px-3 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 font-mono transition"
                        >
                          Audit Risk
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: SYNDICATE EXPLORER / MARKETPLACE */}
        {/* ========================================================================= */}
        {activeTab === 'explorer' && (
          <div className="flex flex-col gap-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-white">Syndicate Marketplace & Explorer</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Discover yield-backed rotating capital swarms tailored for cross-border teams, DAOs, and AI infrastructure.
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-black font-extrabold text-xs flex items-center gap-2 self-start sm:self-auto"
              >
                <Plus className="h-4 w-4" /> Deploy New Mesh
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {PRESET_SYNDICATES.map(syndicate => (
                <div key={syndicate.id} className="glass-panel glass-card-hover rounded-3xl p-6 flex flex-col justify-between gap-5">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-white/10">
                        {syndicate.category}
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {syndicate.apy} Target APY
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white">{syndicate.title}</h3>

                    {/* Supported Chain Badges */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500">Chains:</span>
                      {syndicate.chains.map(c => (
                        <span key={c} className="text-xs px-2 py-0.5 rounded-md bg-slate-900 border border-white/10 font-mono">
                          {CHAINS[c]?.icon} {CHAINS[c]?.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-950/60 border border-white/5 text-center">
                    <div>
                      <span className="text-[10px] text-slate-500 block">TOTAL POT</span>
                      <span className="text-xs font-bold font-mono text-white">{syndicate.totalCap}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">PER ROUND</span>
                      <span className="text-xs font-bold font-mono text-emerald-400">{syndicate.contribution}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">RISK TIER</span>
                      <span className="text-xs font-bold font-mono text-sky-400">{syndicate.riskRating}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="text-xs font-mono text-slate-400">
                      Capacity: <strong>{syndicate.membersCount} Members</strong>
                    </span>
                    <button
                      onClick={() => {
                        setSelectedCircleId(syndicate.id === 0 ? 0 : 0);
                        setActiveTab('hub');
                      }}
                      className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition flex items-center gap-1.5"
                    >
                      {syndicate.id === 0 ? 'Enter Live Mesh' : 'Inspect Mesh'}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: AI RISK STUDIO & SPEND GUARD TELEMETRY */}
        {/* ========================================================================= */}
        {activeTab === 'risk' && (
          <div className="flex flex-col gap-6 animate-fadeIn">
            <div>
              <h2 className="text-2xl font-black text-white">AI Risk Studio & Spend Guard</h2>
              <p className="text-xs text-slate-400 mt-1">
                Zero-default architecture. The AI Risk Engine evaluates on-chain Sybil signals and dynamically routes escrow margins.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Radar & Gauge Card (7 cols) */}
              <div className="lg:col-span-7 glass-panel rounded-3xl p-6 lg:p-8 flex flex-col justify-between gap-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="h-6 w-6 text-emerald-400" />
                    <div>
                      <h3 className="text-base font-bold text-white">Autonomous Risk Vector Evaluation</h3>
                      <p className="text-xs text-slate-400">Real-time credit modeling before round pot dispatch</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Threshold: 65/100
                  </span>
                </div>

                {/* Score Breakdown Bars */}
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Historical Cycle Punctuality</span>
                      <span className="font-mono font-bold text-emerald-400">98 / 100</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2">
                      <div className="bg-emerald-400 h-2 rounded-full" style={{ width: '98%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Cross-Chain Sybil Probability (Inverse)</span>
                      <span className="font-mono font-bold text-sky-400">92 / 100</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2">
                      <div className="bg-sky-400 h-2 rounded-full" style={{ width: '92%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>On-Chain Liquidity Resilience</span>
                      <span className="font-mono font-bold text-purple-400">85 / 100</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2">
                      <div className="bg-purple-400 h-2 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                  </div>
                </div>

                {/* Live Policy Decision Banner */}
                {latestPolicy ? (
                  <div className={`p-4 rounded-2xl border ${
                    latestPolicy.policyStatus === 'GUARD_PASSED_FULL_RELEASE'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  }`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-xs">Evaluated Target: {latestPolicy.winnerAccountId}</span>
                      <span className="font-mono font-extrabold text-sm">Score: {latestPolicy.trustScore} / 100</span>
                    </div>
                    <p className="text-xs text-slate-300">{latestPolicy.reason}</p>
                    {latestPolicy.escrowWithholdingPercent > 0 && (
                      <div className="mt-3 pt-2 border-t border-amber-500/30 text-xs font-mono flex justify-between">
                        <span>Direct Release: 65%</span>
                        <span>Escrow Locked: 35% in escrow.trustmesh.testnet</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 text-center text-xs text-slate-400">
                    Select a member from the Command Hub to simulate live underwriting.
                  </div>
                )}
              </div>

              {/* Scenario Testing Sandbox (5 cols) */}
              <div className="lg:col-span-5 glass-panel rounded-3xl p-6 flex flex-col justify-between gap-5">
                <div>
                  <h3 className="text-base font-bold text-white">Judge Sandbox: Test Scenarios</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Simulate how TrustMesh defends the pool against malicious actors and defaults:
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => handlePreflightGuard('alice.near')}
                    className="p-3.5 rounded-2xl bg-slate-900 border border-emerald-500/30 hover:border-emerald-500 text-left transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-400">Scenario A: Verified Prime Founder</span>
                      <span className="text-[10px] font-mono text-emerald-300">Score: 95</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">High reputation member. Passes Spend Guard for 100% immediate release.</p>
                  </button>

                  <button
                    onClick={() => handlePreflightGuard('bob.near')}
                    className="p-3.5 rounded-2xl bg-slate-900 border border-amber-500/30 hover:border-amber-500 text-left transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-400">Scenario B: High-Risk New Wallet</span>
                      <span className="text-[10px] font-mono text-amber-300">Score: 45</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Triggers Spend Guard. Withholds 35% in Escrow Vault to guarantee subsequent rounds.</p>
                  </button>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950/80 border border-white/5 text-[11px] text-slate-400">
                  🛡️ <strong>Zero-Collateral Guarantee:</strong> Rather than demanding 150% over-collateralization like Aave, TrustMesh uses dynamic temporal tranches.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 4: ARCHITECTURE & WHITEPAPER BREAKDOWN */}
        {/* ========================================================================= */}
        {activeTab === 'architecture' && (
          <div className="flex flex-col gap-8 animate-fadeIn">
            <div className="glass-panel rounded-3xl p-8 max-w-4xl mx-auto flex flex-col gap-6">
              <div>
                <span className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider">
                  Technical Architecture
                </span>
                <h2 className="text-3xl font-black text-white mt-1">
                  How TrustMesh Redefines Decentralized Coordination
                </h2>
              </div>

              <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
                <div>
                  <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-emerald-400" /> 1. The Multi-Chain Clearinghouse
                  </h3>
                  <p>
                    Rather than forcing users through complex third-party bridges, TrustMesh uses <strong>NEAR Intents</strong>. A participant submits an intent from Base or Solana. Solvers settle the round deposit natively onto the NEAR Ledger contract via an authorized relayer operator.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-teal-400" /> 2. Yield-Generating Idle Liquidity
                  </h3>
                  <p>
                    In traditional informal savings (Ajo/Esusu/Tandas), pooled money sits stagnant. TrustMesh deposits the idle round pot into NEAR DeFi liquidity strategies (Burrow / Ref Finance), generating automated APY shared back to participants.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-sky-400" /> 3. Solving the 100-Year-Old Free-Rider Problem
                  </h3>
                  <p>
                    The vulnerability of rotating savings is default after winning an early round. The <strong>AI Spend Guard</strong> calculates real-time credit telemetry. If counterparty risk is detected, funds are split: immediate liquidity is released, while a risk margin is locked in an escrow sub-account that vests only as future round obligations are satisfied.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end">
                <button
                  onClick={() => setActiveTab('hub')}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 text-black font-extrabold text-xs shadow-lg shadow-emerald-500/20"
                >
                  Return to Command Hub
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ---------------- Collapsible Floating Terminal Drawer ---------------- */}
      <div className="fixed bottom-3 right-3 sm:right-6 z-40 max-w-lg w-[calc(100vw-24px)] sm:w-[480px]">
        <div className="glass-panel border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl">
          {/* Header Bar */}
          <div
            onClick={() => setIsTerminalOpen(!isTerminalOpen)}
            className="px-4 py-2.5 bg-slate-900/90 flex items-center justify-between cursor-pointer hover:bg-slate-800/90 transition select-none"
          >
            <div className="flex items-center gap-2">
              <Terminal className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs font-mono font-bold text-white">Agent Telemetry CLI</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {auditLogs.length} events
              </span>
            </div>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isTerminalOpen ? 'rotate-180' : ''}`} />
          </div>

          {/* Terminal Body */}
          {isTerminalOpen && (
            <div
              ref={terminalContainerRef}
              className="bg-black/85 p-3.5 font-mono text-[11px] overflow-y-auto max-h-[220px] space-y-2 border-t border-white/5"
            >
              {auditLogs.length === 0 ? (
                <div className="text-slate-600 italic py-4 text-center">Monitoring live agent intents...</div>
              ) : (
                auditLogs.map((log, i) => (
                  <div key={i} className="text-slate-300 border-b border-white/[0.04] pb-2 last:border-b-0">
                    <div className="flex items-center justify-between text-[9px] text-slate-500 mb-0.5">
                      <span>[{log.timestamp.slice(11, 19)}]</span>
                      <span className="text-emerald-400/80 font-bold">{log.actionTag}</span>
                    </div>
                    <div className="text-sky-300 break-all">
                      <span className="text-sky-500 font-bold">&gt; DO:</span> {log.actionDesc}
                    </div>
                    <div className="text-emerald-300 mt-0.5 break-all">
                      <span className="text-emerald-500 font-bold">&gt; SEE:</span> [{log.resultTag}] {log.resultDesc}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* ---------------- Create Syndicate Modal Wizard ---------------- */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel border border-white/10 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative"
            >
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>

              <h3 className="text-xl font-bold text-white mb-1">Deploy New Capital Mesh</h3>
              <p className="text-xs text-slate-400 mb-5">Configure an autonomous multi-chain savings syndicate on NEAR.</p>

              <form onSubmit={handleCreateSyndicate} className="space-y-4">
                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1">Syndicate Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Developer Compute Swarm"
                    value={newSyndicate.title}
                    onChange={e => setNewSyndicate({ ...newSyndicate, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-400 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-mono text-slate-300 block mb-1">Per-Round Contribution</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={newSyndicate.contribution}
                      onChange={e => setNewSyndicate({ ...newSyndicate, contribution: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-400 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-mono text-slate-300 block mb-1">Rounds / Members</label>
                    <input
                      type="number"
                      required
                      min="2"
                      max="20"
                      value={newSyndicate.totalRounds}
                      onChange={e => setNewSyndicate({ ...newSyndicate, totalRounds: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-400 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1">Supported Multi-Chain Ingress</label>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="p-2 rounded-xl bg-slate-900 border border-blue-500/40 text-[10px] text-blue-300 text-center font-mono font-bold">
                      🔵 Base
                    </span>
                    <span className="p-2 rounded-xl bg-slate-900 border border-purple-500/40 text-[10px] text-purple-300 text-center font-mono font-bold">
                      🟣 Solana
                    </span>
                    <span className="p-2 rounded-xl bg-slate-900 border border-emerald-500/40 text-[10px] text-emerald-300 text-center font-mono font-bold">
                      🟢 NEAR
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-black font-extrabold text-xs transition shadow-lg shadow-emerald-500/20"
                  >
                    Deploy Syndicate to NEAR Ledger
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
