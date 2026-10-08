import { useState } from "react";
import { Check, Lock, Star, Trophy, X, ExternalLink, Hammer, MessageCircleQuestion, ListChecks, Sparkles, RotateCcw } from "lucide-react";
import type { Level, Roadmap } from "@/lib/roadmap-types";

type Props = { roadmap: Roadmap; done: number[]; onToggle: (i: number) => void; onReset: () => void };

export function RoadmapView({ roadmap, done, onToggle, onReset }: Props) {
  const [open, setOpen] = useState<number | null>(null);
  const totalXp = roadmap.levels.reduce((a, l) => a + (l.xp || 0), 0);
  const earned = done.reduce((a, i) => a + (roadmap.levels[i]?.xp || 0), 0);
  const pct = totalXp ? Math.round((earned / totalXp) * 100) : 0;
  const current = roadmap.levels.findIndex((_, i) => !done.includes(i));

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24">
      {/* Header card */}
      <div className="glass rounded-3xl p-6 md:p-8 animate-pop">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-widest text-muted-foreground">Your quest</p>
            <h2 className="font-display text-3xl font-extrabold md:text-4xl">
              {roadmap.role} <span className="text-gradient-title">@ {roadmap.company}</span>
            </h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">{roadmap.summary}</p>
          </div>
          <button onClick={onReset} className="flex items-center gap-2 rounded-full glass px-4 py-2 text-sm hover:bg-muted">
            <RotateCcw className="h-4 w-4" /> New quest
          </button>
        </div>

        <div className="mt-6">
          <div className="flex justify-between text-sm font-semibold">
            <span className="flex items-center gap-1"><Star className="h-4 w-4 text-gold" /> {earned} / {totalXp} XP</span>
            <span>{done.length}/{roadmap.levels.length} levels · {pct}%</span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-gradient-to-r from-accent to-primary transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Chips title="Keywords found" items={roadmap.keywords} />
          <Chips title="What the company needs" items={roadmap.companyNeeds} />
          <Chips title="Skills required" items={roadmap.requiredSkills} />
        </div>
      </div>

      {/* Level path */}
      <div className="relative mt-12">
        <div className="absolute left-1/2 top-0 hidden h-full w-1 -translate-x-1/2 rounded bg-border md:block" />
        <ol className="space-y-8">
          {roadmap.levels.map((lvl, i) => {
            const isDone = done.includes(i);
            const isCurrent = i === current;
            const locked = !isDone && !isCurrent && i > current && current !== -1;
            return (
              <li key={i} className={`relative flex md:w-1/2 ${i % 2 ? "md:ml-auto md:pl-10" : "md:pr-10"} animate-pop`} style={{ animationDelay: `${i * 70}ms` }}>
                <button
                  onClick={() => setOpen(i)}
                  className={`group w-full rounded-3xl p-5 text-left transition hover:-translate-y-1 glass ${isCurrent ? "ring-2 ring-primary shadow-[0_0_40px_-5px] shadow-primary/60" : ""} ${locked ? "opacity-60" : ""}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl font-display text-xl font-extrabold ${isDone ? "bg-success text-accent-foreground" : isCurrent ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      {isDone ? <Check /> : locked ? <Lock className="h-5 w-5" /> : i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full bg-muted px-2 py-0.5">Level {i + 1}</span>
                        <span className={`rounded-full px-2 py-0.5 ${lvl.difficulty === "Boss" ? "bg-destructive text-destructive-foreground" : "bg-secondary text-secondary-foreground"}`}>{lvl.difficulty}</span>
                        <span className="text-gold">+{lvl.xp} XP</span>
                        <span className="text-muted-foreground">{lvl.estimatedTime}</span>
                      </div>
                      <h3 className="mt-1 font-display text-lg font-bold">{lvl.title}</h3>
                      <p className="text-sm text-muted-foreground">{lvl.tagline}</p>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
          <li className="flex justify-center">
            <div className={`flex items-center gap-3 rounded-full px-6 py-3 font-display font-bold glass ${current === -1 ? "text-gold" : ""}`}>
              <Trophy className="h-5 w-5" /> {current === -1 ? "Quest complete — you're job ready!" : "Final reward: Job ready"}
            </div>
          </li>
        </ol>
      </div>

      {open !== null && roadmap.levels[open] && (
        <LevelModal
          level={roadmap.levels[open]!}
          index={open}
          done={done.includes(open)}
          onToggle={() => onToggle(open)}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}

function Chips({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {(items || []).slice(0, 10).map((k) => (
          <span key={k} className="rounded-full bg-muted px-2.5 py-1 text-xs">{k}</span>
        ))}
      </div>
    </div>
  );
}

const TABS = [
  { id: "learn", label: "Learn", icon: ListChecks },
  { id: "build", label: "Build", icon: Hammer },
  { id: "practice", label: "Interview", icon: MessageCircleQuestion },
] as const;

function LevelModal({ level, index, done, onToggle, onClose }: { level: Level; index: number; done: boolean; onToggle: () => void; onClose: () => void }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("learn");
  const [revealed, setRevealed] = useState<number[]>([]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 p-0 backdrop-blur-sm md:items-center md:p-6" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-popover p-6 md:rounded-3xl animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-gold">Level {index + 1} · +{level.xp} XP · {level.estimatedTime}</p>
            <h3 className="font-display text-2xl font-extrabold">{level.title}</h3>
            <p className="mt-1 text-muted-foreground">{level.whyItMatters}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 hover:bg-muted"><X /></button>
        </div>

        <div className="mt-5 flex gap-2">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${tab === t.id ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-3">
          {tab === "learn" && (
            <>
              {level.steps?.map((s, i) => (
                <div key={i} className="rounded-2xl bg-muted p-4">
                  <p className="font-display font-bold">{i + 1}. {s.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{s.detail}</p>
                </div>
              ))}
              <p className="pt-2 text-sm font-semibold">Resources</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {level.resources?.map((r, i) => (
                  <a key={i} href={r.url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-2xl border border-border p-3 text-sm hover:bg-muted">
                    <span><span className="text-xs text-accent">{r.type}</span><br />{r.name}</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </>
          )}
          {tab === "build" &&
            level.projects?.map((p, i) => (
              <div key={i} className="rounded-2xl bg-muted p-4">
                <p className="font-display text-lg font-bold">🛠 {p.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {p.features?.map((f) => <li key={f}>{f}</li>)}
                </ul>
              </div>
            ))}
          {tab === "practice" &&
            level.interviewQuestions?.map((q, i) => (
              <div key={i} className="rounded-2xl bg-muted p-4">
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{q.type}</span>
                <p className="mt-2 font-semibold">{q.question}</p>
                {revealed.includes(i) ? (
                  <p className="mt-2 text-sm text-muted-foreground">💡 {q.hint}</p>
                ) : (
                  <button onClick={() => setRevealed([...revealed, i])} className="mt-2 text-sm text-accent underline">Show hint</button>
                )}
              </div>
            ))}
        </div>

        <button onClick={() => { onToggle(); if (!done) onClose(); }} className={`mt-6 flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-display text-lg font-bold transition ${done ? "bg-muted" : "bg-primary text-primary-foreground hover:opacity-90"}`}>
          {done ? "Mark as not done" : <><Sparkles className="h-5 w-5" /> Complete level · +{level.xp} XP</>}
        </button>
      </div>
    </div>
  );
}
