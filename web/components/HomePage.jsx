"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import Mark from "./Mark";
import { bondPercent, splitAmount } from "@/lib/policy";
import { usd } from "@/lib/format";

const fade = {
  hidden: { opacity: 0, y: 18 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: 0.08 * i, ease: [0.22, 1, 0.36, 1] },
  }),
};

const PRESETS = [
  { score: 54, name: "Kofi, first foreign client" },
  { score: 71, name: "Kofi, after one clear" },
  { score: 94, name: "Ama, twenty-two clears" },
];

export default function HomePage() {
  const reduce = useReducedMotion();
  const [score, setScore] = useState(54);
  const quote = useMemo(() => splitAmount(4800, score), [score]);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Link href="/" className="flex items-center gap-2.5">
            <Mark className="h-7 w-7" />
            <span className="text-[15px] font-medium tracking-tight">TrustMesh</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm text-ink-soft">
            <a href="#curve" className="hidden sm:inline hover:text-ink">The curve</a>
            <a href="#settle" className="hidden sm:inline hover:text-ink">How it settles</a>
            <Link
              href="/desk"
              className="inline-flex items-center gap-1 rounded-full bg-ink px-3.5 py-1.5 text-sm text-paper"
            >
              Open the desk
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-end gap-10 px-5 pb-16 pt-12 md:grid-cols-12 md:pt-16">
          <div className="md:col-span-7">
            <motion.p
              variants={fade}
              initial={reduce ? "show" : "hidden"}
              animate="show"
              custom={0}
              className="text-[11px] font-medium uppercase tracking-[0.22em] text-copper"
            >
              Surety for work that crosses chains
            </motion.p>
            <motion.h1
              variants={fade}
              initial={reduce ? "show" : "hidden"}
              animate="show"
              custom={1}
              className="mt-4 font-serif text-[3.3rem] font-normal leading-[0.92] tracking-tight sm:text-7xl"
            >
              A stranger
              <br />
              can take the job.
              <span className="mt-2 block font-serif italic text-ink-soft">
                You keep a bond until it clears.
              </span>
            </motion.h1>
            <motion.p
              variants={fade}
              initial={reduce ? "show" : "hidden"}
              animate="show"
              custom={2}
              className="mt-8 max-w-xl text-lg leading-relaxed text-ink-soft"
            >
              TrustMesh prices a retainage from the payee&apos;s record and stores the
              mandate on a NEAR testnet contract. A new job locks faucet NEAR. Delivery
              sends the unbonded slice to the maker in NEAR. The Intents line is a dry
              USDC price, Base in and Solana out, and it does not move USDC. When the
              window goes quiet, a key that can call only expire_mandate pays the bond.
            </motion.p>
            <motion.div
              variants={fade}
              initial={reduce ? "show" : "hidden"}
              animate="show"
              custom={3}
              className="mt-8 flex flex-wrap items-center gap-4"
            >
              <Link
                href="/desk"
                className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm text-paper"
              >
                Open the desk
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <a href="#curve" className="text-sm text-ink-soft underline decoration-line underline-offset-4">
                Price a bond yourself
              </a>
            </motion.div>
          </div>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="relative md:col-span-5"
          >
            <img
              src="/still/seal-desk.jpg"
              alt="A wax seal on a cotton-paper docket"
              className="aspect-[4/5] w-full rounded-sm object-cover"
            />
            <motion.aside
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.6 }}
              className="absolute -left-3 bottom-6 w-[88%] rounded-sm border border-line bg-paper p-4 shadow-docket sm:-left-10"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-ink-soft">New mandate</p>
                <p className="font-serif text-xl">2 NEAR</p>
              </div>
              <p className="mt-2 text-sm">Faucet retainage · record 54</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-paper-2">
                <motion.div
                  className="h-full bg-copper"
                  initial={{ width: 0 }}
                  animate={{ width: "30%" }}
                  transition={{ duration: 1, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-ink-soft">
                <span>1.4 NEAR leaves on delivery</span>
                <span>0.6 NEAR bonded 48h</span>
              </div>
            </motion.aside>
          </motion.div>
        </section>

        <section className="bg-ink text-paper">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:grid-cols-3">
            {[
              ["$1.5T", "Earned in a year by US skilled freelancers. Cross-border jobs in that pile still clear on wires."],
              ["10–30%", "What a thin record actually costs, priced in public."],
              ["48h", "The window. Silence releases the bond. It cannot keep it."],
            ].map(([n, line]) => (
              <div key={n}>
                <p className="font-serif text-4xl tracking-tight">{n}</p>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-paper/70">{line}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-20 md:grid-cols-2">
          <img
            src="/still/studio.jpg"
            alt="Hands arranging blank storyboard frames in a studio"
            className="aspect-[3/2] w-full rounded-sm object-cover"
          />
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-copper">The client&apos;s side</p>
            <h2 className="mt-3 font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
              The deposit went out. The files never came.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-ink-soft">
              A studio in Berlin cannot sue a stranger in Accra over an eight-second
              sequence, and will not wire the full fee on a handshake. Escrow only
              moves the problem: someone still has to be the referee, and someone
              still sits on the money.
            </p>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-8 md:grid-cols-2">
          <div className="order-2 md:order-1">
            <p className="text-[11px] uppercase tracking-[0.2em] text-copper">The maker&apos;s side</p>
            <h2 className="mt-3 font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
              The files went out. The client went quiet.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-ink-soft">
              Holdback is how film and construction already live with that silence.
              A slice stays bonded. If the client accepts, it releases. If the client
              disappears, it releases anyway. Ghosting is no longer a way to keep
              the fee.
            </p>
          </div>
          <img
            src="/still/maker.jpg"
            alt="A motion designer at a desk in the evening"
            className="order-1 aspect-[3/2] w-full rounded-sm object-cover md:order-2"
          />
        </section>

        <section id="curve" className="mx-auto max-w-6xl px-5 py-20">
          <div className="rounded-sm border border-line bg-[#f7f4ec] p-6 sm:p-10">
            <div className="grid gap-10 md:grid-cols-12">
              <div className="md:col-span-5">
                <p className="text-[11px] uppercase tracking-[0.2em] text-copper">The curve</p>
                <h2 className="mt-3 font-serif text-4xl leading-tight tracking-tight">
                  Drag a record. The bond reprices. Nothing else moves.
                </h2>
                <p className="mt-4 text-ink-soft leading-relaxed">
                  This is not a model. Ninety and above, nothing is held. Seventy to
                  eighty-nine, ten percent. Below seventy, thirty percent. The same
                  function is <span className="text-ink">quote_retainage_bps</span> on
                  the NEAR contract. The dollars here are the illustration. The contract
                  pays the same percents in faucet NEAR. The key that expires a window
                  cannot change the curve.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {PRESETS.map((p) => (
                    <button
                      key={p.score}
                      type="button"
                      onClick={() => setScore(p.score)}
                      className={`rounded-full border px-3 py-1.5 text-left text-xs ${
                        score === p.score
                          ? "border-ink bg-ink text-paper"
                          : "border-line text-ink-soft hover:border-ink"
                      }`}
                    >
                      {p.score} · {p.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="md:col-span-7">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-ink-soft">Record</p>
                    <p className="font-serif text-7xl leading-none tracking-tight">{score}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-ink-soft">Bond on $4,800</p>
                    <p className="font-serif text-7xl leading-none tracking-tight text-copper">
                      {quote.pct}%
                    </p>
                  </div>
                </div>
                <input
                  className="mt-8"
                  type="range"
                  min={40}
                  max={99}
                  value={score}
                  aria-label="Reputation score"
                  onChange={(e) => setScore(Number(e.target.value))}
                />
                <div className="mt-6 h-3 overflow-hidden rounded-full bg-paper-2">
                  <motion.div
                    className="h-full bg-ink"
                    animate={{ width: `${100 - quote.pct}%` }}
                    transition={{ type: "spring", stiffness: 120, damping: 20 }}
                  />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-ink-soft">Unbonded slice</p>
                    <p className="mt-1 font-serif text-3xl">{usd(quote.release)}</p>
                  </div>
                  <div>
                    <p className="text-ink-soft">Stays bonded</p>
                    <p className="mt-1 font-serif text-3xl">{usd(quote.bond)}</p>
                  </div>
                </div>
                <p className="mt-6 text-sm text-ink-soft">
                  Tier: {bondPercent(score) === 0 ? "Prime" : bondPercent(score) === 10 ? "Proven" : "Thin record"}.
                  One clean job moves 54 to 71, and the next bond falls from 30 percent to 10.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="settle" className="mx-auto max-w-3xl px-5 pb-20">
          <p className="text-[11px] uppercase tracking-[0.2em] text-copper">How a job settles</p>
          <h2 className="mt-3 font-serif text-4xl tracking-tight">Six moves. The fee is testnet NEAR.</h2>
          <ol className="mt-10">
            {[
              ["01", "Quote", "The desk reads the payee's record and prints the bond before anyone sends a coin."],
              ["02", "Price", "The desk asks NEAR Intents for a dry quote from Base USDC to Solana USDC. The response carries a correlation id. It does not move funds."],
              ["03", "Deliver", "The maker marks the work in. The acceptance window starts. People set how long it is."],
              ["04", "Split", "On delivery, the contract sends the unbonded slice to the maker in testnet NEAR. The bond stays until accept, or until the policy key expires the window."],
              ["05", "Window", "The client key accepts or disputes. Silence is signed by the function-call key, whose method list is expire_mandate and nothing else."],
              ["06", "Record", "A clear job writes the new score. The next bond is cheaper. A dispute freezes this one and prices the next higher."],
            ].map(([n, title, body], i) => (
              <motion.li
                key={n}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.04, duration: 0.45 }}
                className="grid grid-cols-[auto_1fr] gap-5 border-t border-line py-5"
              >
                <span className="font-serif text-2xl text-copper">{n}</span>
                <div>
                  <h3 className="text-lg font-medium">{title}</h3>
                  <p className="mt-1 text-ink-soft leading-relaxed">{body}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </section>

        <section className="relative mx-auto mb-20 max-w-6xl px-5">
          <img
            src="/still/maker.jpg"
            alt=""
            className="h-[420px] w-full rounded-sm object-cover object-[center_30%]"
          />
          <div className="relative mx-auto -mt-24 max-w-xl rounded-sm bg-paper p-8 shadow-docket sm:ml-10">
            <img
              src="/still/seal-macro.jpg"
              alt=""
              className="mb-5 h-16 w-16 rounded-full object-cover"
            />
            <p className="font-serif text-3xl leading-snug tracking-tight">
              The key that releases a quiet window cannot spend, and cannot reprice.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-ink-soft">
              That key is a NEAR function-call access key. The desk reads its
              method list from testnet. If the list is anything other than
              expire_mandate, the desk says so.
            </p>
            <Link
              href="/desk"
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium"
            >
              Open the live desk
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-sm text-ink-soft sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-ink">
            <Mark className="h-5 w-5" />
            TrustMesh
          </div>
          <p>Real-world money · Agent security · Agent economy. Built on NEAR.</p>
        </div>
      </footer>
    </div>
  );
}
