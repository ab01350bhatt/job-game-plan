import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ChevronRight, Loader2, Sparkle } from "lucide-react";
import { Backdrop } from "@/components/Backdrop";
import { RoadmapView } from "@/components/RoadmapView";
import { generateRoadmap } from "@/lib/roadmap.functions";
import type { Roadmap } from "@/lib/roadmap-types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Reverse Career Roadmapper — Your future deserves a plan" },
      { name: "description", content: "Describe your dream job and get an AI-built, game-style skill roadmap with projects and interview practice." },
      { property: "og:title", content: "Reverse Career Roadmapper" },
      { property: "og:description", content: "Tell us where you want to be. We'll reverse engineer the path to get you there." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const EXAMPLES = [
  "I want to be a Software Engineer at Google working on search infrastructure.",
  "Data Scientist at Netflix building recommendation systems.",
  "Frontend Developer at a fintech startup like Razorpay.",
];
const KEY = "rcr-state";

function Index() {
  const gen = useServerFn(generateRoadmap);
  const [dream, setDream] = useState("");
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [done, setDone] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || "null");
      if (s?.roadmap) { setRoadmap(s.roadmap); setDone(s.done || []); }
    } catch { /* ignore */ }
  }, []);

  const save = (r: Roadmap | null, d: number[]) => {
    if (r) localStorage.setItem(KEY, JSON.stringify({ roadmap: r, done: d }));
    else localStorage.removeItem(KEY);
  };

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (dream.trim().length < 10) { setError("Tell us a bit more about your dream job (at least a sentence)."); return; }
    setLoading(true); setError(null);
    try {
      const r = await gen({ data: { dream } });
      setRoadmap(r); setDone([]); save(r, []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally { setLoading(false); }
  }

  const toggle = (i: number) => {
    const d = done.includes(i) ? done.filter((x) => x !== i) : [...done, i];
    setDone(d); save(roadmap, d);
  };

  return (
    <main className="relative min-h-screen">
      <Backdrop />
      {roadmap ? (
        <div className="pt-10">
          <RoadmapView roadmap={roadmap} done={done} onToggle={toggle} onReset={() => { setRoadmap(null); setDone([]); save(null, []); }} />
        </div>
      ) : (
        <section className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-4 py-16 text-center">
          <h1 className="font-display text-5xl font-black uppercase leading-none tracking-tight md:text-8xl">
            <span className="text-gradient-title">Your future</span>
            <br />
            <span className="text-outline">deserves a plan</span>
          </h1>

          <form onSubmit={submit} className="search-pill mt-14 flex w-full items-end gap-3 rounded-3xl p-3 pl-5 text-left shadow-2xl">
            <Sparkle className="mb-3 h-7 w-7 shrink-0 fill-current" />
            <textarea
              value={dream}
              onChange={(e) => setDream(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) submit(); }}
              rows={dream.length > 70 ? 4 : 1}
              maxLength={4000}
              placeholder="What career do you want to build?"
              className="max-h-60 flex-1 resize-none bg-transparent py-3 text-lg outline-none placeholder:text-secondary-foreground/70"
              disabled={loading}
            />
            <button type="submit" disabled={loading} aria-label="Build my roadmap" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-primary p-2 transition hover:scale-105 disabled:opacity-70">
              <span className="flex h-full w-full items-center justify-center rounded-full bg-primary-foreground text-primary">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ChevronRight className="h-5 w-5" />}
              </span>
            </button>
          </form>

          {loading && <p className="mt-4 text-sm animate-pulse">Analysing the role, company needs and skills… building your levels (≈30s)</p>}
          {error && <p className="mt-4 rounded-full bg-destructive/20 px-4 py-2 text-sm">{error}</p>}

          {!loading && (
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {EXAMPLES.map((ex) => (
                <button key={ex} onClick={() => setDream(ex)} className="glass rounded-full px-4 py-2 text-xs hover:bg-muted">{ex}</button>
              ))}
            </div>
          )}

          <p className="mt-16 text-2xl font-light text-secondary-foreground md:text-3xl">
            Tell us where you want to be. We'll reverse engineer the path to get you there.
          </p>
        </section>
      )}
    </main>
  );
}
