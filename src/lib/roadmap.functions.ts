import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Level, Roadmap } from "./roadmap-types";

const GEMINI_MODELS = ["gemini-3.8-flash", "gemini-flash-latest"];
const GATEWAY_MODEL = "google/gemini-3-flash-preview";

type Outline = Omit<Roadmap, "levels"> & {
  levels: Pick<Level, "title" | "skill" | "tagline" | "difficulty" | "xp" | "estimatedTime">[];
};

const OUTLINE_PROMPT = (dream: string) => `You are an expert career coach.
A student describes their dream job. Reverse engineer the path to get there.
Extract role, company (or "Any"), keywords, company needs, required hard & soft skills.
Plan a GAME-STYLE roadmap of 6-9 sequential levels from absolute beginner to job-ready for that exact role & company. Each level = one core skill area.

Return ONLY JSON:
{ "role": string, "company": string, "summary": string (2 sentences),
  "keywords": string[], "companyNeeds": string[], "requiredSkills": string[],
  "levels": [{ "title": string, "skill": string, "tagline": string (short, fun, game-like),
    "difficulty": "Easy"|"Medium"|"Hard"|"Boss", "xp": number (100-1000), "estimatedTime": string }] }

Dream job: """${dream}"""`;

const LEVEL_PROMPT = (o: { role: string; company: string; skill: string; title: string; index: number; total: number }) =>
  `You are an expert career coach and technical interviewer.
Write level ${o.index + 1} of ${o.total} of a learning roadmap for a student targeting "${o.role}" at "${o.company}".
Level title: "${o.title}". Skill: "${o.skill}".

Return ONLY JSON:
{
  "whyItMatters": string (why this company/role needs it, 2-3 sentences),
  "overview": string (VERY detailed 150-250 words: what it is, how it works, all core functionality and features, how it's used day-to-day in this exact role),
  "subtopics": [{ "name": string, "explanation": string (3-5 sentences: what it does, key functions/APIs/concepts, tiny example) }] (6-10 covering ALL functionality),
  "steps": [{ "title": string, "detail": string (4-6 sentences with concrete actions, exercises and what "done" looks like) }] (5-7),
  "commonMistakes": string[] (4-5),
  "masteryChecklist": string[] (5-7 "I can..." statements),
  "resources": [{ "name": string, "type": "Course"|"Docs"|"Video"|"Book"|"Practice", "url": string }] (3-5 real, well-known, free where possible),
  "projects": [{ "title": string, "description": string, "features": string[] }] (2 real-world projects relevant to the company),
  "interviewQuestions": [{ "question": string, "type": "Technical"|"Behavioral"|"Coding", "hint": string }] (5)
}`;

function parseJson<T>(text: string): T | null {
  const s = text.indexOf("{");
  const e = text.lastIndexOf("}");
  if (s < 0 || e <= s) return null;
  try { return JSON.parse(text.slice(s, e + 1)) as T; } catch { return null; }
}

async function timedFetch(url: string, init: RequestInit, ms = 90000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try { return await fetch(url, { ...init, signal: c.signal }); } finally { clearTimeout(t); }
}

async function tryGemini(prompt: string): Promise<string | null> {
  const key = process.env["GEMINI_API_KEY"];
  if (!key) return null;
  for (const m of GEMINI_MODELS) {
    try {
      const res = await timedFetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", maxOutputTokens: 16384, thinkingConfig: { thinkingBudget: 0 } },
        }),
      });
      if (res.status === 401 || res.status === 403) return null; // key invalid -> use built-in AI
      if (!res.ok) { console.error("Gemini", m, res.status); continue; }
      const j = await res.json();
      return j?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? null;
    } catch (e) { console.error("Gemini fail", m, e); }
  }
  return null;
}

async function tryGateway(prompt: string): Promise<string | null> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return null;
  const res = await timedFetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: GATEWAY_MODEL, messages: [{ role: "user", content: prompt }], response_format: { type: "json_object" } }),
  });
  if (!res.ok) {
    console.error("Gateway", res.status, (await res.text()).slice(0, 200));
    if (res.status === 429) throw new Error("The AI is very busy right now. Please try again in a minute.");
    if (res.status === 402) throw new Error("AI credits have run out. Please add credits and try again.");
    return null;
  }
  const j = await res.json();
  return j?.choices?.[0]?.message?.content ?? null;
}

async function callAI<T>(prompt: string, valid: (v: T) => boolean): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const text = (await tryGemini(prompt)) ?? (await tryGateway(prompt));
    const parsed = text ? parseJson<T>(text) : null;
    if (parsed && valid(parsed)) return parsed;
    await new Promise((r) => setTimeout(r, 800));
  }
  throw new Error("The AI could not create your roadmap. Please try again.");
}

export const generateOutline = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ dream: z.string().trim().min(10).max(4000) }).parse(d))
  .handler(async ({ data }): Promise<Outline> =>
    callAI<Outline>(OUTLINE_PROMPT(data.dream), (o) => Array.isArray(o.levels) && o.levels.length >= 4),
  );

export const generateLevel = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      role: z.string().max(300), company: z.string().max(300), skill: z.string().max(300),
      title: z.string().max(300), index: z.number().int().min(0).max(20), total: z.number().int().min(1).max(20),
    }).parse(d),
  )
  .handler(async ({ data }) =>
    callAI<Omit<Level, "title" | "skill" | "tagline" | "difficulty" | "xp" | "estimatedTime">>(
      LEVEL_PROMPT(data),
      (l) => Array.isArray(l.steps) && l.steps.length > 0 && typeof l.overview === "string",
    ),
  );
