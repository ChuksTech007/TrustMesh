"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Loader2 } from "lucide-react";
import Mark, { ChainMark } from "./Mark";
import { formatNear, usd } from "@/lib/format";
import { connectAccount, disconnectAccount, restoreAccount, signCall, TWO_NEAR } from "@/lib/near-wallet";

const STEPS = ["quoted", "funded", "delivered", "cleared"];

const STATUS_LABEL = {
  quoted: "Quoted",
  funded: "Funded",
  delivered: "In the window",
  cleared: "Cleared",
  disputed: "Disputed",
};

function txUrl(networkId, hash) {
  const host = networkId === "mainnet" ? "nearblocks.io" : "testnet.nearblocks.io";
  return `https://${host}/txns/${hash}`;
}

function feeLabel(job) {
  return job?.yocto ? formatNear(job.amountYocto) : usd(job?.amountUsd);
}

function partLabel(job, value) {
  return job?.yocto ? formatNear(value) : usd(value);
}

export default function DeskApp() {
  const reduce = useReducedMotion();
  const [desk, setDesk] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [pending, setPending] = useState(null);
  const [error, setError] = useState("");
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState("");
  const [account, setAccount] = useState("");
  const [receipt, setReceipt] = useState(null);

  async function load() {
    const res = await fetch("/api/desk", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "The desk could not be read.");
    setDesk(data);
    setError("");
    return data;
  }

  useEffect(() => {
    let cancelled = false;
    async function start() {
      restoreAccount().then((id) => {
        if (!cancelled && id) setAccount(id);
      });
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          await load();
          return;
        } catch (err) {
          if (cancelled) return;
          if (attempt === 2) setError(err.message || "The desk could not be read.");
          else await new Promise((resolve) => setTimeout(resolve, 700));
        }
      }
    }
    start();
    return () => {
      cancelled = true;
    };
  }, []);

  const jobs = desk?.jobs || [];
  const job = useMemo(
    () => jobs.find((item) => item.id === activeId) || jobs[0],
    [jobs, activeId]
  );

  function requireSigner(need) {
    if (!account) {
      throw new Error(`Connect ${need} in a testnet wallet. Meteor or Intear can import that account.`);
    }
    if (account !== need) {
      throw new Error(`Switch the wallet to ${need}. This wallet is ${account}.`);
    }
  }

  async function connect() {
    setError("");
    try {
      setAccount(await connectAccount());
    } catch (err) {
      setError(err.message || "The wallet did not connect.");
    }
  }

  async function disconnect() {
    setError("");
    try {
      await disconnectAccount();
    } catch (err) {
      setError(err.message || "The wallet did not disconnect.");
    }
    setAccount("");
  }

  async function run(action) {
    if (!desk?.configured || pending) return;
    if (action !== "open_job" && !job) return;
    setPending(action);
    setError("");
    try {
      if (action === "expire") {
        const res = await fetch("/api/desk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: job.onChainId, action }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "The contract refused that.");
        setDesk(data);
        setReceipt(data.lastReceipt || null);
        return;
      }

      let methodName;
      let args;
      let deposit = "0";
      if (action === "open_job") {
        if (!desk.makerId) throw new Error("Set NEAR_MAKER_ID so delivery has an account to sign.");
        if (!account) {
          throw new Error("Connect the client wallet. That account becomes the client on the new job.");
        }
        methodName = "open_mandate";
        args = {
          maker: desk.makerId,
          amount: TWO_NEAR,
          maker_score: 54,
          window_seconds: 48 * 60 * 60,
          metadata: JSON.stringify({
            title: "Faucet retainage",
            brief:
              "Two testnet NEAR from a faucet. Delivery pays 70 percent. The bond stays until accept or the policy key expires the window.",
            unit: "yocto",
            clientName: "Client wallet",
            makerName: "Maker wallet",
            clientPlace: "Testnet",
            makerPlace: "Testnet",
            clientChain: "NEAR",
            makerChain: "NEAR",
            clientAsset: "NEAR",
            makerAsset: "NEAR",
          }),
        };
      } else if (action === "open_next") {
        if (!job.yocto) throw new Error("This dollar record is history. Open a 2 NEAR job instead.");
        requireSigner(job.client.account);
        methodName = "open_mandate";
        args = {
          maker: job.maker.account,
          amount: job.amountYocto,
          maker_score: job.maker.score,
          window_seconds: job.windowSeconds,
          metadata: job.metadata,
        };
      } else if (action === "fund") {
        if (!job.yocto || !job.amountYocto) throw new Error("This mandate does not lock NEAR.");
        requireSigner(job.client.account);
        methodName = "fund_mandate";
        args = { mandate_id: job.onChainId };
        deposit = job.amountYocto;
      } else if (action === "deliver") {
        if (!job.yocto) throw new Error("This mandate does not lock NEAR.");
        requireSigner(job.maker.account);
        methodName = "deliver_mandate";
        args = { mandate_id: job.onChainId };
      } else if (action === "accept") {
        if (!job.yocto) throw new Error("This mandate does not lock NEAR.");
        requireSigner(job.client.account);
        methodName = "accept_mandate";
        args = { mandate_id: job.onChainId };
      } else if (action === "dispute") {
        if (!job.yocto) throw new Error("This mandate does not lock NEAR.");
        requireSigner(job.client.account);
        methodName = "dispute_mandate";
        args = { mandate_id: job.onChainId };
      } else {
        throw new Error("Unknown action.");
      }

      const hash = await signCall({
        contractId: desk.contractId,
        methodName,
        args,
        deposit,
      });
      setReceipt(
        hash
          ? { hash, method: methodName, url: txUrl(desk.networkId, hash) }
          : { hash: null, method: methodName, url: null }
      );
      const next = await load();
      if (action === "open_job" && next?.jobs?.length) {
        setActiveId(next.jobs[next.jobs.length - 1].id);
      }
    } catch (err) {
      setError(err.message || "The wallet did not send that.");
    } finally {
      setPending(null);
    }
  }

  async function requestQuote(amountUsd) {
    setPending("quote");
    setQuote(null);
    setQuoteError("");
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountUsd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Intents refused the quote.");
      setQuote(data.quote);
    } catch (err) {
      setQuoteError(err.message);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="desk-body min-h-screen">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Mark className="h-7 w-7" />
            <span className="text-sm font-medium">TrustMesh</span>
            <span className="text-sm text-white/45">Desk</span>
          </Link>
          <div className="flex items-center gap-4 text-xs text-white/55">
            {account ? (
              <span className="flex items-center gap-2">
                <span className="max-w-[12rem] truncate text-white/80">{account}</span>
                <button type="button" onClick={disconnect} className="underline decoration-white/20 underline-offset-4">
                  Disconnect
                </button>
              </span>
            ) : (
              <button type="button" onClick={connect} className="rounded-full border border-white/20 px-3 py-1.5 text-white/80">
                Connect testnet wallet
              </button>
            )}
            {desk?.configured ? (
              <a href={desk.contractUrl} className="underline decoration-white/20 underline-offset-4">
                {desk.contractId}
              </a>
            ) : (
              <span>Contract not configured</span>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-6 lg:grid-cols-[280px_1fr]">
        <aside>
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">Mandates</p>
          <ul className="mt-3 space-y-2">
            {jobs.map((item) => {
              const on = item.id === job?.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveId(item.id);
                      setReceipt(null);
                    }}
                    className={`w-full rounded-sm border px-3 py-3 text-left ${
                      on ? "border-white/30 bg-white/5" : "border-transparent hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm">{item.title}</span>
                      <span className="font-serif text-sm text-white/70">{feeLabel(item)}</span>
                    </div>
                    <p className="mt-1 text-xs text-white/45">
                      {item.maker.name} · bond {item.quote.pct}% · {STATUS_LABEL[item.status] || item.status}
                    </p>
                  </button>
                </li>
              );
            })}
            {desk && jobs.length === 0 && (
              <li className="text-sm text-white/40">No mandates on this contract yet.</li>
            )}
          </ul>
          {desk?.configured && (
            <div className="mt-6">
              <button
                type="button"
                disabled={!!pending || !desk.makerId}
                onClick={() => run("open_job")}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/25 px-3 py-2 text-sm text-white disabled:opacity-60"
              >
                {pending === "open_job" && <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />}
                {pending === "open_job" ? "Working…" : "Open a 2 NEAR job"}
              </button>
              <p className="mt-2 text-xs leading-relaxed text-white/45">
                {desk.makerId
                  ? `The connected wallet becomes the client and locks faucet NEAR. Delivery is signed by ${desk.makerId}.`
                  : "Set NEAR_MAKER_ID before opening a job."}
              </p>
            </div>
          )}
          <PolicyKey policyKey={desk?.policyKey} />
        </aside>

        <div>
          {!desk && !error && (
            <p className="flex items-center gap-2 text-sm text-white/70" role="status">
              <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
              Reading the contract on testnet.
            </p>
          )}
          {!desk && error && (
            <section className="mb-6 rounded-sm bg-[#f7f3ea] p-6 text-ink">
              <p className="text-[11px] uppercase tracking-[0.18em] text-copper">Read failed</p>
              <h1 className="mt-2 font-serif text-4xl tracking-tight">The desk could not read the contract.</h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-soft">{error}</p>
              <button
                type="button"
                onClick={() => {
                  setError("");
                  load().catch((err) => setError(err.message || "The desk could not be read."));
                }}
                className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2.5 text-sm text-paper"
              >
                Try again
              </button>
            </section>
          )}
          {desk && !desk.configured && (
            <Unconfigured reason={desk.reason || desk.error} pending={pending} onQuote={() => requestQuote(3360)} quote={quote} quoteError={quoteError} />
          )}
          <AnimatePresence mode="wait">
            {job && (
              <motion.article
                key={`${job.id}-${job.status}`}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="overflow-hidden rounded-sm bg-[#f7f3ea] text-ink shadow-docket"
              >
                <div className="border-b border-line px-6 py-5 sm:px-8">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-ink-soft">
                    Mandate {job.onChainId} · {desk.networkId}
                  </p>
                  <h1 className="mt-2 font-serif text-4xl leading-none tracking-tight sm:text-5xl">{job.title}</h1>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-soft">{job.brief}</p>
                </div>
                <div className="grid gap-px bg-line sm:grid-cols-2">
                  <Party label="Pays" party={job.client} />
                  <Party label="Is paid" party={job.maker} />
                </div>
                <div className="px-6 py-6 sm:px-8">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-ink-soft">Fee</p>
                      <p className="font-serif text-6xl tracking-tight">{feeLabel(job)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-ink-soft">Bond locked at open</p>
                      <p className="font-serif text-5xl tracking-tight text-copper">{job.quote.pct}%</p>
                    </div>
                  </div>
                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-paper-2">
                    <motion.div
                      className="h-full bg-ink"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(4, 100 - job.quote.pct)}%` }}
                      transition={{ type: "spring", stiffness: 90, damping: 18 }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-sm text-ink-soft">
                    <span>
                      {partLabel(job, job.quote.release)} {job.yocto ? "leaves on delivery" : "would release"}
                    </span>
                    <span>
                      {partLabel(job, job.quote.bond)} bonded · {job.windowHours}h window
                    </span>
                  </div>
                  {job.yocto && job.escrowYocto !== "0" && (
                    <p className="mt-3 text-sm text-ink">Held in the contract: {formatNear(job.escrowYocto)}</p>
                  )}
                  {!job.yocto && (
                    <p className="mt-3 text-sm text-ink-soft">
                      Dollar record. The contract holds no NEAR for this mandate.
                    </p>
                  )}
                  <Trail status={job.status} />
                  {job.status === "cleared" && (
                    <p className="mt-6 text-sm text-moss">
                      Record is {job.maker.score}. quote_retainage_bps on the next fee of this size is {job.nextQuote.pct}%.
                    </p>
                  )}
                  <div className="mt-6 flex flex-wrap gap-2">
                    <Actions
                      job={job}
                      pending={pending}
                      onRun={run}
                      onQuote={() => requestQuote(job.yocto ? 3360 : job.quote.release || job.amountUsd)}
                    />
                  </div>
                  <WaitNote pending={pending} />
                  {error && <p className="mt-3 text-sm text-copper">{error}</p>}
                  <QuoteCard quote={quote} error={quoteError} />
                  {(receipt?.url || desk.lastReceipt?.url) && (
                    <p className="mt-4 text-sm">
                      <a
                        className="underline decoration-line underline-offset-4"
                        href={(receipt || desk.lastReceipt).url}
                      >
                        {(receipt || desk.lastReceipt).method} · {(receipt || desk.lastReceipt).hash}
                      </a>
                    </p>
                  )}
                </div>
              </motion.article>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function Unconfigured({ reason, pending, onQuote, quote, quoteError }) {
  return (
    <section className="mb-6 rounded-sm bg-[#f7f3ea] p-6 text-ink">
      <p className="text-[11px] uppercase tracking-[0.18em] text-copper">Not on chain yet</p>
      <h1 className="mt-2 font-serif text-4xl tracking-tight">The contract is not configured.</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-soft">{reason}</p>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-soft">
        A dry Intents quote still runs. It prices a $3,360 release, which is the 70 percent that would leave a $4,800 fee bonded at 30 percent. No deposit address is requested.
      </p>
      <button
        type="button"
        disabled={!!pending}
        onClick={onQuote}
        className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2.5 text-sm text-paper disabled:opacity-60"
      >
        {pending === "quote" && <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />}
        {pending === "quote" ? "Asking Intents…" : "Price $3,360 Base USDC to Solana"}
        {pending === "quote" ? null : <ArrowUpRight className="h-4 w-4" />}
      </button>
      <WaitNote pending={pending} />
      <QuoteCard quote={quote} error={quoteError} />
    </section>
  );
}

function WaitNote({ pending }) {
  if (!pending) return null;
  const text =
    pending === "quote"
      ? "Asking NEAR Intents for a dry quote."
      : pending === "expire"
        ? "The policy key is sending expire_mandate. The receipt appears when testnet accepts it."
        : "Approve this in the testnet wallet. The receipt appears when the network accepts it.";
  return (
    <p className="mt-4 flex items-center gap-2 text-sm text-ink" role="status" aria-live="polite">
      <Loader2 className="h-4 w-4 shrink-0 motion-safe:animate-spin" aria-hidden="true" />
      {text}
    </p>
  );
}

function QuoteCard({ quote, error }) {
  if (error) return <p className="mt-3 text-sm text-copper">{error}</p>;
  if (!quote) return null;
  return (
    <div className="mt-4 border-t border-line pt-4 text-sm">
      <p className="text-[11px] uppercase tracking-[0.18em] text-ink-soft">
        NEAR Intents · dry {quote.dry ? "true" : "false"}
      </p>
      <p className="mt-2">
        In {quote.amountInFormatted ?? "—"} · out {quote.amountOutFormatted ?? "—"}
        {quote.timeEstimate != null ? ` · about ${quote.timeEstimate}s` : ""}
      </p>
      <p className="mt-1 break-all text-ink-soft">Correlation {quote.correlationId || "missing"}</p>
      <p className="mt-1 text-ink-soft">Dry price only. It does not move the NEAR the contract holds.</p>
      {quote.depositAddress && <p className="mt-1 text-copper">Unexpected deposit address: {quote.depositAddress}</p>}
    </div>
  );
}

function PolicyKey({ policyKey }) {
  if (!policyKey) return null;
  return (
    <div className="mt-8 text-xs leading-relaxed text-white/55">
      <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">Policy key</p>
      {policyKey.error && <p className="mt-2">{policyKey.error}</p>}
      {policyKey.publicKey && (
        <>
          <p className="mt-2 break-all">{policyKey.publicKey}</p>
          <p className="mt-2">
            {policyKey.fullAccess
              ? "This key is full access. It is not the limited key."
              : `Methods: ${(policyKey.methodNames || []).join(", ") || "none"}`}
          </p>
          {policyKey.explorerUrl && (
            <a className="mt-2 inline-block underline decoration-white/20 underline-offset-4" href={policyKey.explorerUrl}>
              {policyKey.accountId}
            </a>
          )}
        </>
      )}
    </div>
  );
}

function Party({ label, party }) {
  return (
    <div className="bg-[#f7f3ea] px-6 py-4 sm:px-8">
      <p className="text-[11px] uppercase tracking-[0.18em] text-ink-soft">{label}</p>
      <p className="mt-1 text-lg">{party.name}</p>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
        <ChainMark chain={party.chain} />
        {party.place} · {party.asset} on {party.chain}
      </p>
      <p className="mt-1 break-all text-xs text-ink-soft">
        {party.account}
        {party.score != null ? ` · record ${party.score}` : ""}
      </p>
    </div>
  );
}

function Trail({ status }) {
  const order = status === "disputed" ? ["quoted", "funded", "delivered", "disputed"] : STEPS;
  const here = order.indexOf(status);
  return (
    <ol className="mt-6 flex flex-wrap gap-x-4 gap-y-2">
      {order.map((step, index) => {
        const done = index <= here;
        return (
          <li key={step} className="flex items-center gap-2 text-xs uppercase tracking-[0.14em]">
            <span className={`h-1.5 w-1.5 rounded-full ${done ? "bg-copper" : "bg-line"}`} />
            <span className={done ? "text-ink" : "text-ink-soft"}>{STATUS_LABEL[step] || step}</span>
          </li>
        );
      })}
    </ol>
  );
}

function Actions({ job, pending, onRun, onQuote }) {
  const quoteAction = job.yocto
    ? { id: "quote", label: "Price a dry $3,360 USDC quote" }
    : { id: "quote", label: `Price the ${usd(job.quote.release)} release` };
  const map = {
    quoted: job.yocto
      ? [{ id: "fund", label: `Lock ${formatNear(job.amountYocto)}` }, quoteAction]
      : [quoteAction],
    funded: job.yocto
      ? [{ id: "deliver", label: "Maker delivered" }, quoteAction]
      : [quoteAction],
    delivered: job.yocto
      ? [
          { id: "accept", label: "Client accepts" },
          { id: "expire", label: "Let the window pass", tone: "ghost" },
          { id: "dispute", label: "Dispute", tone: "danger" },
        ]
      : [quoteAction],
    cleared: job.yocto
      ? [{ id: "open_next", label: "Open the next mandate at this record" }, quoteAction]
      : [quoteAction],
    disputed: job.yocto ? [] : [quoteAction],
  };
  return (map[job.status] || []).map((action) => (
    <button
      key={action.id}
      type="button"
      disabled={!!pending}
      onClick={() => (action.id === "quote" ? onQuote() : onRun(action.id))}
      className={buttonClass(action.tone)}
    >
      {(pending === action.id || (action.id === "quote" && pending === "quote")) && (
        <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
      )}
      {pending === action.id || (action.id === "quote" && pending === "quote") ? "Working…" : action.label}
    </button>
  ));
}

function buttonClass(tone) {
  const base = "inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm disabled:opacity-60";
  if (tone === "ghost") return `${base} border border-line text-ink`;
  if (tone === "danger") return `${base} text-copper underline decoration-copper/40 underline-offset-4`;
  return `${base} bg-ink text-paper`;
}
