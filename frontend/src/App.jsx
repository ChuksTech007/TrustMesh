import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
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
  ExternalLink
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Helper to convert yoctoNEAR to human-readable NEAR
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

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'guide'
  const [health, setHealth] = useState(null);
  const [circle, setCircle] = useState(null);
  const [circlesList, setCirclesList] = useState([]);
  const [selectedCircleId, setSelectedCircleId] = useState(0);
  const [auditLogs, setAuditLogs] = useState([]);
  const [latestPolicy, setLatestPolicy] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);
  const [actionError, setActionError] = useState(null);

  const terminalContainerRef = useRef(null);
  const prevLogsCountRef = useRef(0);

  // Auto-scroll inside terminal container only when new logs actually arrive
  useEffect(() => {
    if (terminalContainerRef.current && auditLogs.length > prevLogsCountRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
      prevLogsCountRef.current = auditLogs.length;
    }
  }, [auditLogs]);

  // Initial fetch and 3-second auto-polling loop
  useEffect(() => {
    fetchHealth();
    fetchCircleData(selectedCircleId);
    fetchAuditTrail();

    const interval = setInterval(() => {
      fetchCircleData(selectedCircleId, true);
      fetchAuditTrail();
      fetchHealth();
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedCircleId]);

  const fetchHealth = async () => {
    try {
      const res = await axios.get(`${API_BASE}/health`);
      setHealth(res.data);
    } catch {
      setHealth({ status: 'offline' });
    }
  };

  const fetchCircleData = async (id, isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/circle/${id}`);
      setCircle(res.data);

      const listRes = await axios.get(`${API_BASE}/api/circles`);
      setCirclesList(listRes.data || []);
    } catch (err) {
      console.error('Failed to fetch circle:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const fetchAuditTrail = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/agent/audit-trail`);
      setAuditLogs(res.data.events || []);
    } catch (err) {
      console.error('Failed to fetch audit trail:', err);
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
        source_tx_hash: `0x${Math.random().toString(16).substring(2, 10)}...${chain}_tx`,
        target_circle_id: selectedCircleId,
        member_account_id: memberAccountId,
      };

      await axios.post(`${API_BASE}/api/webhook/cross-chain-deposit`, payload);
      setActionMessage(`Deposit confirmed on NEAR ledger for ${memberAccountId}! (${amount} ${token} on ${chain.toUpperCase()})`);
      await fetchCircleData(selectedCircleId);
      await fetchAuditTrail();
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      setActionError(`Deposit Failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  // Round rotation trigger
  const handleRotate = async () => {
    setActionMessage(null);
    setActionError(null);
    setLoading(true);

    try {
      const res = await axios.post(`${API_BASE}/api/circle/rotate`, { circle_id: selectedCircleId });
      setActionMessage(`Round Rotated Successfully! Winner awarded: ${res.data.winner}`);
      if (res.data.policyResult) {
        setLatestPolicy(res.data.policyResult);
      }
      await fetchCircleData(selectedCircleId);
      await fetchAuditTrail();
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      setActionError(`Rotation Failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  // Pre-flight policy evaluation
  const handlePreflightGuard = async (memberAccountId) => {
    setActionMessage(null);
    setActionError(null);
    try {
      const res = await axios.get(`${API_BASE}/api/circle/${selectedCircleId}/guard/${memberAccountId}`);
      setLatestPolicy(res.data);
      setActionMessage(`Policy pre-flight evaluated for ${memberAccountId}`);
    } catch (err) {
      setActionError(`Policy check failed: ${err.message}`);
    }
  };

  const currentCandidate = circle && circle.current_round > 0 && circle.members
    ? circle.members[circle.current_round - 1]
    : null;

  const allDeposited = circle && circle.deposits_current_round?.length === circle.members?.length;

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 p-3 sm:p-6 md:p-8 flex flex-col gap-4 sm:gap-6 w-full max-w-7xl mx-auto overflow-x-hidden">
      {/* ---------------- Header ---------------- */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-[#111827] border border-gray-800 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 flex-shrink-0">
            <Coins className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">TrustMesh</h1>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 rounded-full font-medium whitespace-nowrap">
                Agentic Ajo Ledger
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5 line-clamp-2 sm:line-clamp-none">
              Cross-Chain Rotating Savings Circle & AI Spend Guard Platform on NEAR Protocol
            </p>
          </div>
        </div>

        {/* Tab Switcher & Network Status Pills */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
          {/* Main Navigation Switcher */}
          <div className="flex items-center bg-gray-900/90 border border-gray-800 p-1 rounded-xl w-full sm:w-auto justify-center">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'dashboard'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-md shadow-emerald-500/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Live Ledger</span>
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'guide'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-md shadow-emerald-500/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>How It Works & Guide</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-800/80 border border-gray-700/60 text-[11px] font-mono">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-gray-400">Network:</span>
              <span className="text-white font-semibold">{health?.nearNetwork || 'testnet'}</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-800/80 border border-gray-700/60 text-[11px] font-mono">
              <Cpu className="h-3 w-3 text-indigo-400" />
              <span className="text-gray-400">Agent:</span>
              <span className={health?.status === 'healthy' ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                {health?.status === 'healthy' ? 'Connected' : 'Offline'}
              </span>
            </div>

            <button
              onClick={() => {
                fetchCircleData(selectedCircleId);
                fetchAuditTrail();
              }}
              disabled={loading}
              className="p-1.5 sm:p-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 transition-all hover:text-white"
              title="Refresh State"
            >
              <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* ---------------- Notifications & Alerts ---------------- */}
      {actionMessage && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
            <span>{actionMessage}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-emerald-400 hover:text-emerald-200 text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      {actionError && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-200 text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      {/* ---------------- VIEW 1: HOW IT WORKS & OPERATOR GUIDE ---------------- */}
      {activeTab === 'guide' && (
        <div className="flex flex-col gap-8 animate-fadeIn">
          {/* Hero Banner */}
          <div className="relative overflow-hidden bg-gradient-to-r from-emerald-950/40 via-indigo-950/40 to-slate-900 border border-emerald-500/20 rounded-3xl p-8 md:p-10 shadow-2xl">
            <div className="max-w-3xl flex flex-col gap-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold w-fit">
                <Sparkles className="h-3.5 w-3.5" />
                <span>The Grassroots Social Finance Revolution</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
                What is an Ajo / Esusu, and how does TrustMesh solve its biggest flaws?
              </h2>
              <p className="text-gray-300 text-base leading-relaxed">
                Over <strong className="text-white">1 billion people</strong> across Africa (Ajo/Esusu), Latin America (Tandas), and Asia (Chit Funds) rely on community rotating savings clubs. Friends pool money together to receive lump sums without predatory bank loans.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-bold text-sm hover:from-emerald-400 hover:to-teal-400 transition shadow-lg shadow-emerald-500/25"
                >
                  <span>Launch Live Interactive Dashboard</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* How Traditional Ajo Works */}
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 md:p-8 shadow-xl flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">How Rotating Savings Circles Work (The Mental Model)</h3>
                <p className="text-xs text-gray-400">Imagine 3 friends: Alice, Bob, and Charlie agree to save 5 NEAR each round (15 NEAR Pot):</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-800/40 border border-gray-700/60 rounded-xl p-5 flex flex-col gap-2 relative">
                <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">Round 1</span>
                <h4 className="text-lg font-bold text-white">Alice Takes the Pot</h4>
                <p className="text-xs text-gray-400">Alice, Bob, and Charlie each deposit 5 NEAR. Alice collects the lump sum of 15 NEAR.</p>
                <div className="mt-2 text-xs font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 p-2 rounded">
                  Winner: alice.near (15 NEAR)
                </div>
              </div>

              <div className="bg-gray-800/40 border border-gray-700/60 rounded-xl p-5 flex flex-col gap-2 relative">
                <span className="text-xs font-mono font-bold text-sky-400 uppercase tracking-wider">Round 2</span>
                <h4 className="text-lg font-bold text-white">Bob Takes the Pot</h4>
                <p className="text-xs text-gray-400">Everyone deposits 5 NEAR again. Bob collects the lump sum of 15 NEAR.</p>
                <div className="mt-2 text-xs font-mono bg-sky-500/10 border border-sky-500/20 text-sky-300 p-2 rounded">
                  Winner: bob.near (15 NEAR)
                </div>
              </div>

              <div className="bg-gray-800/40 border border-gray-700/60 rounded-xl p-5 flex flex-col gap-2 relative">
                <span className="text-xs font-mono font-bold text-purple-400 uppercase tracking-wider">Round 3</span>
                <h4 className="text-lg font-bold text-white">Charlie Takes the Pot</h4>
                <p className="text-xs text-gray-400">Everyone deposits 5 NEAR again. Charlie collects the lump sum of 15 NEAR. Circle completes!</p>
                <div className="mt-2 text-xs font-mono bg-purple-500/10 border border-purple-500/20 text-purple-300 p-2 rounded">
                  Winner: charlie.near (15 NEAR)
                </div>
              </div>
            </div>
          </div>

          {/* The 2 Breakthroughs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Globe className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-white">1. Cross-Chain Freedom (NEAR Intents)</h3>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">
                In traditional circles, international members cannot save together due to cross-border banking fees and fragmented crypto chains.
              </p>
              <div className="p-3 bg-black/30 rounded-xl border border-gray-800 text-xs font-mono text-gray-300 flex flex-col gap-1.5">
                <div className="text-emerald-400 font-semibold">• Alice pays USDC on Base</div>
                <div className="text-purple-400 font-semibold">• Bob pays SOL on Solana</div>
                <div className="text-sky-400 font-semibold">• Charlie pays USDC on Arbitrum</div>
              </div>
              <p className="text-xs text-gray-400">
                NEAR acts as the universal clearinghouse. Users never have to manually bridge tokens; our intent monitor verifies proofs and credits the circle natively on NEAR.
              </p>
            </div>

            <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-white">2. AI Spend Guard (Solving Default Risk)</h3>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">
                The centuries-old flaw of Ajo is the <strong>"Free-Rider Problem"</strong>: what if Bob wins the pot in Round 2, takes the 15 NEAR, and vanishes before paying in Round 3?
              </p>
              <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-xs text-amber-300 flex flex-col gap-1">
                <span className="font-bold">Autonomous Policy Enforcement:</span>
                <span>• Trust Score &ge; 65 $\rightarrow$ 100% direct release.</span>
                <span>• Trust Score &lt; 65 $\rightarrow$ 35% withheld in Escrow Vault (<code className="text-white">escrow.trustmesh.testnet</code>) until subsequent round obligations are met!</span>
              </div>
              <p className="text-xs text-gray-400">
                Zero over-collateralization needed. Community trust is guarded autonomously by agent policy intelligence.
              </p>
            </div>
          </div>

          {/* Step-by-Step Operator Instructions */}
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 md:p-8 shadow-xl flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400">
                <HelpCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">How to Test the Live Dashboard (Step-by-Step)</h3>
                <p className="text-xs text-gray-400">Follow these 4 steps in the Live Ledger to witness the full lifecycle:</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-800/30 border border-gray-800 p-4 rounded-xl flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">1</span>
                  <span className="text-sm font-bold text-white">Check Scores</span>
                </div>
                <p className="text-xs text-gray-400">Click <strong>"Check Score"</strong> next to Alice (Score: 95, Approved) vs Bob (Score: 45, Escrow Protected).</p>
              </div>

              <div className="bg-gray-800/30 border border-gray-800 p-4 rounded-xl flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">2</span>
                  <span className="text-sm font-bold text-white">Deposit Assets</span>
                </div>
                <p className="text-xs text-gray-400">Click the 3 deposit buttons: <strong>Alice (Base)</strong>, <strong>Bob (Solana)</strong>, and <strong>Charlie (Arbitrum)</strong>.</p>
              </div>

              <div className="bg-gray-800/30 border border-gray-800 p-4 rounded-xl flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">3</span>
                  <span className="text-sm font-bold text-white">Rotate Round #1</span>
                </div>
                <p className="text-xs text-gray-400">Once 3/3 deposits are in, click <strong>"Trigger Round Rotation"</strong>. Alice wins the pot and Round 2 begins!</p>
              </div>

              <div className="bg-gray-800/30 border border-gray-800 p-4 rounded-xl flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">4</span>
                  <span className="text-sm font-bold text-white">Watch Escrow</span>
                </div>
                <p className="text-xs text-gray-400">Deposit again for Round 2, rotate for Bob $\rightarrow$ watch the AI Guard automatically withhold 35% in escrow!</p>
              </div>
            </div>

            <div className="pt-2 text-center">
              <button
                onClick={() => setActiveTab('dashboard')}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-bold text-sm hover:from-emerald-400 hover:to-teal-400 transition shadow-lg shadow-emerald-500/25"
              >
                Go to Live Ledger Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- VIEW 2: LIVE LEDGER DASHBOARD ---------------- */}
      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          {/* Left Column: Circle Details & Action Controls */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Circle Overview Card */}
            <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl flex flex-col gap-5">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Circle #{circle?.id ?? 0} Overview</h2>
                    <p className="text-xs text-gray-400">{circle?.metadata || 'Standard Multi-Chain Rotating Savings'}</p>
                  </div>
                </div>

                {circle && (
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-semibold border ${
                      circle.status === 'Active'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : circle.status === 'Completed'
                        ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    ● {circle.status}
                  </span>
                )}
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <div className="bg-gray-800/40 border border-gray-800 rounded-xl p-2.5 sm:p-3.5">
                  <span className="text-[11px] sm:text-xs text-gray-400">Current Round</span>
                  <div className="text-base sm:text-xl font-bold text-white mt-0.5 sm:mt-1">
                    {circle?.current_round ?? 0} <span className="text-xs text-gray-500 font-normal">/ {circle?.total_rounds ?? 3}</span>
                  </div>
                </div>

                <div className="bg-gray-800/40 border border-gray-800 rounded-xl p-2.5 sm:p-3.5">
                  <span className="text-[11px] sm:text-xs text-gray-400">Contribution</span>
                  <div className="text-base sm:text-xl font-bold text-emerald-400 mt-0.5 sm:mt-1 truncate">
                    {formatNear(circle?.contribution_amount)} <span className="text-xs font-normal">NEAR</span>
                  </div>
                </div>

                <div className="bg-gray-800/40 border border-gray-800 rounded-xl p-2.5 sm:p-3.5">
                  <span className="text-[11px] sm:text-xs text-gray-400">Total Round Pot</span>
                  <div className="text-base sm:text-xl font-bold text-sky-400 mt-0.5 sm:mt-1 truncate">
                    {formatNear(circle?.total_round_pot)} <span className="text-xs font-normal">NEAR</span>
                  </div>
                </div>

                <div className="bg-gray-800/40 border border-gray-800 rounded-xl p-2.5 sm:p-3.5">
                  <span className="text-[11px] sm:text-xs text-gray-400">Round Deposits</span>
                  <div className="text-base sm:text-xl font-bold text-white mt-0.5 sm:mt-1">
                    {circle?.deposits_current_round?.length ?? 0} <span className="text-xs text-gray-500 font-normal">/ {circle?.members?.length ?? 3}</span>
                  </div>
                </div>
              </div>

              {/* Round Progress Bar */}
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                  <span>Current Round Deposit Completion</span>
                  <span className="font-semibold text-white">
                    {circle?.members?.length
                      ? Math.round(((circle.deposits_current_round?.length || 0) / circle.members.length) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-sky-500 h-2.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        circle?.members?.length
                          ? ((circle.deposits_current_round?.length || 0) / circle.members.length) * 100
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Registered Members Table */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2.5">
                  Circle Members & Turn Order
                </h3>
                <div className="divide-y divide-gray-800 border border-gray-800 rounded-xl overflow-hidden bg-gray-900/50">
                  {circle?.members?.map((member, idx) => {
                    const turn = idx + 1;
                    const isPaid = circle.deposits_current_round?.includes(member);
                    const hasWon = circle.past_winners?.includes(member);
                    const isCandidate = currentCandidate === member;

                    return (
                      <div key={member} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-3.5 gap-2.5 sm:gap-3 hover:bg-gray-800/30 transition-colors">
                        <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                          <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-gray-800 text-xs font-mono font-semibold text-gray-300 mt-0.5 sm:mt-0">
                            {turn}
                          </span>
                          <div className="flex flex-col gap-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-mono text-sm font-semibold text-white break-all sm:break-normal">{member}</span>
                              {isCandidate && (
                                <span className="bg-sky-500/10 text-sky-400 border border-sky-500/30 text-[10px] px-2 py-0.5 rounded-full font-sans font-semibold whitespace-nowrap">
                                  ★ Round {circle.current_round} Candidate
                                </span>
                              )}
                              {hasWon && (
                                <span className="bg-purple-500/10 text-purple-400 border border-purple-500/30 text-[10px] px-2 py-0.5 rounded-full font-sans font-medium flex items-center gap-1 whitespace-nowrap">
                                  <Trophy className="h-3 w-3" /> Past Winner
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-gray-500">Scheduled for Round #{turn}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto pl-8 sm:pl-0 flex-shrink-0">
                          {isPaid ? (
                            <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-1 rounded-md font-medium whitespace-nowrap">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Paid
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs px-2.5 py-1 rounded-md font-medium whitespace-nowrap">
                              <Clock className="h-3.5 w-3.5" /> Pending
                            </span>
                          )}

                          <button
                            onClick={() => handlePreflightGuard(member)}
                            className="text-[11px] px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-700 transition whitespace-nowrap active:scale-95"
                            title="Run AI Policy Check on this member"
                          >
                            Check Score
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Action Controls Panel */}
            <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <ArrowRightLeft className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Mock Action Controls Panel</h2>
                    <p className="text-xs text-gray-400">Simulate cross-chain intent webhooks & execute round progression</p>
                  </div>
                </div>
              </div>

              {/* Quick Deposit Buttons */}
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-2">
                  Simulate Cross-Chain Intent Deposits
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    disabled={loading || circle?.deposits_current_round?.includes('alice.near')}
                    onClick={() => handleDeposit('alice.near', 'base', 'USDC', '5.00')}
                    className="flex flex-col items-start p-3 rounded-xl bg-gray-800/80 hover:bg-gray-700/80 border border-gray-700/80 disabled:opacity-40 disabled:cursor-not-allowed transition text-left group"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold text-white group-hover:text-emerald-400 transition">Alice</span>
                      <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded font-mono">Base</span>
                    </div>
                    <span className="text-xs text-gray-400 mt-1 font-mono">5.00 USDC</span>
                  </button>

                  <button
                    disabled={loading || circle?.deposits_current_round?.includes('bob.near')}
                    onClick={() => handleDeposit('bob.near', 'solana', 'SOL', '0.035')}
                    className="flex flex-col items-start p-3 rounded-xl bg-gray-800/80 hover:bg-gray-700/80 border border-gray-700/80 disabled:opacity-40 disabled:cursor-not-allowed transition text-left group"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold text-white group-hover:text-emerald-400 transition">Bob</span>
                      <span className="text-[10px] bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded font-mono">Solana</span>
                    </div>
                    <span className="text-xs text-gray-400 mt-1 font-mono">0.035 SOL</span>
                  </button>

                  <button
                    disabled={loading || circle?.deposits_current_round?.includes('charlie.near')}
                    onClick={() => handleDeposit('charlie.near', 'arbitrum', 'USDC', '5.00')}
                    className="flex flex-col items-start p-3 rounded-xl bg-gray-800/80 hover:bg-gray-700/80 border border-gray-700/80 disabled:opacity-40 disabled:cursor-not-allowed transition text-left group"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold text-white group-hover:text-emerald-400 transition">Charlie</span>
                      <span className="text-[10px] bg-sky-500/10 text-sky-400 px-1.5 py-0.5 rounded font-mono">Arbitrum</span>
                    </div>
                    <span className="text-xs text-gray-400 mt-1 font-mono">5.00 USDC</span>
                  </button>
                </div>
              </div>

              {/* Rotate Button */}
              <div className="pt-2 border-t border-gray-800">
                <button
                  disabled={loading || !allDeposited || circle?.status !== 'Active'}
                  onClick={handleRotate}
                  className={`w-full py-3 sm:py-3.5 px-3 sm:px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-lg text-xs sm:text-sm ${
                    allDeposited && circle?.status === 'Active'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black shadow-emerald-500/25 cursor-pointer'
                      : 'bg-gray-800 text-gray-500 border border-gray-700/60 cursor-not-allowed'
                  }`}
                >
                  <Zap className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  <span className="text-center">
                    {allDeposited
                      ? `Trigger Round Rotation (Award Round #${circle?.current_round})`
                      : `Cannot Rotate: Waiting for Deposits (${circle?.deposits_current_round?.length || 0}/${circle?.members?.length || 3})`}
                  </span>
                </button>
                {!allDeposited && (
                  <p className="text-[11px] text-gray-500 text-center mt-2">
                    All circle members must complete verified multi-chain deposits before the contract ledger permits rotation.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: AI Policy Guard & Terminal Audit Trail */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* AI Security Guard Log Panel */}
            <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">AI Security Guard</h2>
                    <p className="text-xs text-gray-400">TrustMesh Policy & Sybil Risk Engine</p>
                  </div>
                </div>
                <span className="text-[10px] bg-sky-500/10 text-sky-400 px-2.5 py-1 rounded-full border border-sky-500/30 font-mono">
                  Threshold: 65/100
                </span>
              </div>

              {latestPolicy ? (
                <div
                  className={`p-4 rounded-xl border flex flex-col gap-3 transition-all ${
                    latestPolicy.policyStatus === 'GUARD_PASSED_FULL_RELEASE'
                      ? 'bg-emerald-500/5 border-emerald-500/30'
                      : 'bg-amber-500/5 border-amber-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[11px] sm:text-xs text-gray-400">Evaluated Winner Candidate</span>
                      <div className="font-mono text-sm font-bold text-white break-all sm:break-normal">{latestPolicy.winnerAccountId}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-400">Trust Score</span>
                      <div
                        className={`text-lg font-bold font-mono ${
                          latestPolicy.trustScore >= 65 ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {latestPolicy.trustScore} / 100
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {latestPolicy.policyStatus === 'GUARD_PASSED_FULL_RELEASE' ? (
                      <ShieldCheck className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <ShieldAlert className="h-4 w-4 text-amber-400 flex-shrink-0" />
                    )}
                    <span
                      className={`text-xs font-semibold ${
                        latestPolicy.policyStatus === 'GUARD_PASSED_FULL_RELEASE' ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {latestPolicy.policyStatus === 'GUARD_PASSED_FULL_RELEASE'
                        ? 'Approved: Full Direct Payout Release'
                        : 'Protection Enforced: Escrow Sub-Account Routing'}
                    </span>
                  </div>

                  <p className="text-xs text-gray-300 leading-relaxed bg-black/20 p-2.5 rounded-lg border border-gray-800">
                    {latestPolicy.reason}
                  </p>

                  {latestPolicy.escrowWithholdingPercent > 0 && (
                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-800">
                      <div className="bg-gray-800/40 p-2 rounded">
                        <span className="text-gray-400 block text-[10px]">Direct Payout (65%)</span>
                        <span className="text-white font-mono font-semibold">
                          {formatNear(latestPolicy.directPayoutAmount)} NEAR
                        </span>
                      </div>
                      <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded">
                        <span className="text-amber-400 block text-[10px]">Withheld in Escrow (35%)</span>
                        <span className="text-amber-300 font-mono font-semibold">
                          {formatNear(latestPolicy.escrowWithheldAmount)} NEAR
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 rounded-xl border border-gray-800 bg-gray-900/30 text-center">
                  <Lock className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">
                    The AI Security Guard evaluates reputation metrics prior to payout release.
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Click <span className="text-gray-300 font-mono font-medium">"Check Score"</span> on any member above or rotate a round to view live risk analysis.
                  </p>
                </div>
              )}
            </div>

            {/* Terminal Audit Trail Viewer */}
            <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl flex flex-col gap-3 flex-1 min-h-[380px]">
              <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 mr-2">
                    <div className="h-3 w-3 rounded-full bg-red-500/80"></div>
                    <div className="h-3 w-3 rounded-full bg-yellow-500/80"></div>
                    <div className="h-3 w-3 rounded-full bg-green-500/80"></div>
                  </div>
                  <Terminal className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-xs font-bold text-white tracking-wide uppercase font-mono">Agent Audit Trail</h3>
                </div>
                <span className="text-[10px] text-gray-500 font-mono">{auditLogs.length} events logged</span>
              </div>

              {/* Scrollable Dark Terminal Box */}
              <div ref={terminalContainerRef} className="flex-1 bg-black/60 rounded-xl p-3.5 font-mono text-xs overflow-y-auto max-h-[340px] space-y-3 border border-gray-900">
                {auditLogs.length === 0 ? (
                  <div className="text-gray-600 italic py-8 text-center">Waiting for incoming agent activities...</div>
                ) : (
                  auditLogs.map((log, i) => (
                    <div key={i} className="text-gray-300 border-b border-gray-900/80 pb-2.5 last:border-b-0">
                      <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                        <span>[{log.timestamp.slice(11, 19)}]</span>
                        <span className="text-emerald-400/80 font-semibold">{log.actionTag}</span>
                      </div>

                      <div className="flex items-start gap-1.5 text-sky-300 break-all sm:break-words">
                        <span className="text-sky-500 font-bold select-none flex-shrink-0">&gt; DO:</span>
                        <span>{log.actionDesc}</span>
                      </div>

                      <div className="flex items-start gap-1.5 text-emerald-300 mt-0.5 break-all sm:break-words">
                        <span className="text-emerald-500 font-bold select-none flex-shrink-0">&gt; SEE:</span>
                        <span className="text-emerald-400 font-medium">[{log.resultTag}] {log.resultDesc}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
