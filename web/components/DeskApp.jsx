"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Loader2 } from "lucide-react";
import Mark, { ChainMark } from "./Mark";
import { usd } from "@/lib/format";

const STEPS = ["quoted", "funded", "delivered", "cleared"];

const STATUS_LABEL = {
  quoted: "Quoted",
  funded: "Funded",
  delivered: "In the window",
  cleared: "Cleared",
  disputed: "Disputed",
};

export default function DeskApp() {
  const reduce = useReducedMotion();
  const [desk, setDesk] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [pending, setPending] = useState(null);
  const [error, setError] = useState("");
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState("");

  async function load() {
    const res = await fetch("/api/desk", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "The desk could not be read.");
    setDesk(data);
    setError("");
  }

  useEffect(() => {
    let cancelled = false;
    async function start() {
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

  async function run(action) {
    if (!job || pending) return;
    setPending(action);
    setError("");
    try {
      const res = await fetch("/api/desk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: job.onChainId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "The contract refused that.");
      setDesk(data);
    } catch (err) {
      setError(err.message);
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
          <div className="text-xs text-white/55">
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
                    onClick={() => setActiveId(item.id)}
                    className={`w-full rounded-sm border px-3 py-3 text-left ${
                      on ? "border-white/30 bg-white/5" : "border-transparent hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm">{item.title}</span>
                      <span className="font-serif text-sm text-white/70">{usd(item.amountUsd)}</span>
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
                      <p className="font-serif text-6xl tracking-tight">{usd(job.amountUsd)}</p>
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
                    <span>{usd(job.quote.release)} would release</span>
                    <span>{usd(job.quote.bond)} bonded · {job.windowHours}h window</span>
                  </div>
                  <Trail status={job.status} />
                  {job.status === "cleared" && (
                    <p className="mt-6 text-sm text-moss">
                      Record is {job.maker.score}. quote_retainage_bps on the next fee of this size is {job.nextQuote.pct}%.
                    </p>
                  )}
                  <div className="mt-6 flex flex-wrap gap-2">
                    <Actions job={job} pending={pending} onRun={run} onQuote={() => requestQuote(job.quote.release || job.amountUsd)} />
                  </div>
                  <WaitNote pending={pending} />
                  {error && <p className="mt-3 text-sm text-copper">{error}</p>}
                  <QuoteCard quote={quote} error={quoteError} />
                  {desk.lastReceipt?.url && (
                    <p className="mt-4 text-sm">
                      <a className="underline decoration-line underline-offset-4" href={desk.lastReceipt.url}>
                        {desk.lastReceipt.method} · {desk.lastReceipt.hash}
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
      : "Sending this action to NEAR testnet. The receipt appears when the network accepts it.";
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
  const map = {
    quoted: [
      { id: "fund", label: "Record the mandate funded" },
      { id: "quote", label: `Price the ${usd(job.quote.release)} release` },
    ],
    funded: [
      { id: "deliver", label: "Maker delivered" },
      { id: "quote", label: `Price the ${usd(job.quote.release)} release` },
    ],
    delivered: [
      { id: "accept", label: "Client accepts" },
      { id: "expire", label: "Let the window pass", tone: "ghost" },
      { id: "dispute", label: "Dispute", tone: "danger" },
    ],
    cleared: [{ id: "open_next", label: "Open the next mandate at this record" }],
    disputed: [],
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
