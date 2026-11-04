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
  ExternalLink,
  ChevronRight,
  Zap,
  Lock,
  Layers,
  CircleDollarSign,
  TrendingUp,
  Cpu
} from 'lucide-react';

const API_BASE = 'http://localhost:3001';

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
  const [health, setHealth] = useState(null);
  const [circle, setCircle] = useState(null);
  const [circlesList, setCirclesList] = useState([]);
  const [selectedCircleId, setSelectedCircleId] = useState(0);
  const [auditLogs, setAuditLogs] = useState([]);
  const [latestPolicy, setLatestPolicy] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customDeposit, setCustomDeposit] = useState({
    member: 'alice.near',
    chain: 'base',
    token: 'USDC',
    amount: '5.00',
  });

  const terminalEndRef = useRef(null);

  // Auto-scroll terminal when new logs arrive
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
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

      const res = await axios.post(`${API_BASE}/api/webhook/cross-chain-deposit`, payload);
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

  // Calculate current candidate for next pot
  const currentCandidate = circle && circle.current_round > 0 && circle.members
    ? circle.members[circle.current_round - 1]
    : null;

  const allDeposited = circle && circle.deposits_current_round?.length === circle.members?.length;

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 p-4 md:p-8 flex flex-col gap-6">
      {/* ---------------- Header ---------------- */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Coins className="h-7 w-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white">TrustMesh</h1>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-2.5 py-0.5 rounded-full font-medium">
                Agentic Ajo Ledger
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-0.5">
              Cross-Chain Rotating Savings Circle & AI Spend Guard Platform on NEAR Protocol
            </p>
          </div>
        </div>

        {/* Network & Status Pills */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/80 border border-gray-700/60 text-xs font-mono">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-gray-400">Network:</span>
            <span className="text-white font-semibold">{health?.nearNetwork || 'NEAR Testnet'}</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/80 border border-gray-700/60 text-xs font-mono">
            <Cpu className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-gray-400">Agent Status:</span>
            <span className={health?.status === 'healthy' ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
              {health?.status === 'healthy' ? 'Connected' : 'Offline'}
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/80 border border-gray-700/60 text-xs font-mono">
            <span className="text-gray-400">Contract:</span>
            <span className="text-sky-400 font-medium">{health?.contractId || 'trustmesh.testnet'}</span>
          </div>

          <button
            onClick={() => {
              fetchCircleData(selectedCircleId);
              fetchAuditTrail();
            }}
            disabled={loading}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 transition-all hover:text-white"
            title="Refresh State"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
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

      {/* ---------------- Main Content Grid ---------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Circle Details & Action Controls (7 cols) */}
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-gray-800/40 border border-gray-800 rounded-xl p-3.5">
                <span className="text-xs text-gray-400">Current Round</span>
                <div className="text-xl font-bold text-white mt-1">
                  {circle?.current_round ?? 0} <span className="text-xs text-gray-500 font-normal">/ {circle?.total_rounds ?? 3}</span>
                </div>
              </div>

              <div className="bg-gray-800/40 border border-gray-800 rounded-xl p-3.5">
                <span className="text-xs text-gray-400">Contribution</span>
                <div className="text-xl font-bold text-emerald-400 mt-1">
                  {formatNear(circle?.contribution_amount)} <span className="text-xs font-normal">NEAR</span>
                </div>
              </div>

              <div className="bg-gray-800/40 border border-gray-800 rounded-xl p-3.5">
                <span className="text-xs text-gray-400">Total Round Pot</span>
                <div className="text-xl font-bold text-sky-400 mt-1">
                  {formatNear(circle?.total_round_pot)} <span className="text-xs font-normal">NEAR</span>
                </div>
              </div>

              <div className="bg-gray-800/40 border border-gray-800 rounded-xl p-3.5">
                <span className="text-xs text-gray-400">Round Deposits</span>
                <div className="text-xl font-bold text-white mt-1">
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
                    <div key={member} className="flex items-center justify-between p-3.5 hover:bg-gray-800/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center h-6 w-6 rounded-full bg-gray-800 text-xs font-mono font-semibold text-gray-300">
                          {turn}
                        </span>
                        <div>
                          <div className="font-mono text-sm font-semibold text-white flex items-center gap-2">
                            {member}
                            {isCandidate && (
                              <span className="bg-sky-500/10 text-sky-400 border border-sky-500/30 text-[10px] px-2 py-0.5 rounded-full font-sans font-semibold">
                                ★ Round {circle.current_round} Winner Candidate
                              </span>
                            )}
                            {hasWon && (
                              <span className="bg-purple-500/10 text-purple-400 border border-purple-500/30 text-[10px] px-2 py-0.5 rounded-full font-sans font-medium flex items-center gap-1">
                                <Trophy className="h-3 w-3" /> Past Winner
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">Scheduled for Round #{turn}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isPaid ? (
                          <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-1 rounded-md font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Paid
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs px-2.5 py-1 rounded-md font-medium">
                            <Clock className="h-3.5 w-3.5" /> Pending
                          </span>
                        )}

                        <button
                          onClick={() => handlePreflightGuard(member)}
                          className="text-[11px] px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-700 transition"
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
                className={`w-full py-3.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-lg ${
                  allDeposited && circle?.status === 'Active'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black shadow-emerald-500/25 cursor-pointer'
                    : 'bg-gray-800 text-gray-500 border border-gray-700/60 cursor-not-allowed'
                }`}
              >
                <Zap className="h-5 w-5" />
                <span>
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

        {/* Right Column: AI Policy Guard & Terminal Audit Trail (5 cols) */}
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
                    <span className="text-xs text-gray-400">Evaluated Winner Candidate</span>
                    <div className="font-mono text-sm font-bold text-white">{latestPolicy.winnerAccountId}</div>
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
            <div className="flex-1 bg-black/60 rounded-xl p-3.5 font-mono text-xs overflow-y-auto max-h-[340px] space-y-3 border border-gray-900">
              {auditLogs.length === 0 ? (
                <div className="text-gray-600 italic py-8 text-center">Waiting for incoming agent activities...</div>
              ) : (
                auditLogs.map((log, i) => (
                  <div key={i} className="text-gray-300 border-b border-gray-900/80 pb-2.5 last:border-b-0">
                    <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                      <span>[{log.timestamp.slice(11, 19)}]</span>
                      <span className="text-emerald-400/80 font-semibold">{log.actionTag}</span>
                    </div>

                    <div className="flex items-start gap-1.5 text-sky-300">
                      <span className="text-sky-500 font-bold select-none">&gt; DO:</span>
                      <span>{log.actionDesc}</span>
                    </div>

                    <div className="flex items-start gap-1.5 text-emerald-300 mt-0.5">
                      <span className="text-emerald-500 font-bold select-none">&gt; SEE:</span>
                      <span className="text-emerald-400 font-medium">[{log.resultTag}] {log.resultDesc}</span>
                    </div>
                  </div>
                ))
              )}
              <div ref={terminalEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

