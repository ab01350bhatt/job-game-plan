import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Roadmap } from "./roadmap-types";

const MODELS = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];

const PROMPT = (dream: string) => `You are an expert career coach and technical interviewer.
A student describes their dream job below. Reverse engineer the path to get there.

1. Extract: target role, target company (or "Any"), seniority, keywords, company needs, required hard & soft skills.
2. Build a GAME-STYLE roadmap of 6-9 sequential levels, from absolute beginner to job-ready for that exact role & company.
Each level teaches one core skill area in great detail.

Return ONLY JSON matching exactly:
{
  "role": string, "company": string, "summary": string (2 sentences),
  "keywords": string[], "companyNeeds": string[], "requiredSkills": string[],
  "levels": [{
    "title": string, "skill": string, "tagline": string (short, fun, game-like),
    "difficulty": "Easy"|"Medium"|"Hard"|"Boss", "xp": number (100-1000), "estimatedTime": string,
    "whyItMatters": string (why this company/role needs it, 2-3 sentences),
    "overview": string (a VERY detailed 150-250 word explanation of the skill: what it is, how it works, all its core functionality and features, and how it is used day-to-day in this exact role),
    "subtopics": [{ "name": string, "explanation": string (3-5 sentences covering what it does, key functions/APIs/concepts, and a tiny example) }] (6-10 subtopics covering ALL functionality of the skill),
    "steps": [{ "title": string, "detail": string (detailed 4-6 sentence how-to-master instructions with concrete actions, exercises and what "done" looks like) }]  (5-7 steps),
    "commonMistakes": string[] (4-5),
    "masteryChecklist": string[] (5-7 "I can..." statements proving mastery),
    "resources": [{ "name": string, "type": "Course"|"Docs"|"Video"|"Book"|"Practice", "url": string }] (3-5 real, well-known, free where possible),
    "projects": [{ "title": string, "description": string, "features": string[] }] (2 real-world projects relevant to the company),
    "interviewQuestions": [{ "question": string, "type": "Technical"|"Behavioral"|"Coding", "hint": string }] (5 questions)
  }]
}

Dream job description:
"""${dream}"""`;

function parseRoadmap(text: string): Roadmap | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const r = JSON.parse(text.slice(start, end + 1)) as Roadmap;
    return Array.isArray(r.levels) ? r : null;
  } catch {
    return null;
  }
}

async function callGemini(apiKey: string, prompt: string): Promise<Roadmap> {
  let lastErr = "";
  for (let attempt = 0; attempt < MODELS.length * 2; attempt++) {
    const MODEL = MODELS[attempt % MODELS.length];
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", maxOutputTokens: 65536 },
        }),
      },
    );
    if (res.ok) {
      const json = await res.json();
      const text: string =
        json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
      const parsed = parseRoadmap(text);
      if (parsed && parsed.levels.length >= 4) return parsed;
      lastErr = `bad output from ${MODEL}`;
      console.error("Gemini bad output", MODEL, json?.candidates?.[0]?.finishReason);
      continue;
    }
    const body = await res.text();
    lastErr = `${res.status}: ${body.slice(0, 300)}`;
    console.error("Gemini error", lastErr);
    if (res.status === 429 || res.status >= 500) {
      if (attempt >= MODELS.length - 1) await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1000));
      continue;
    }
    if (res.status === 404 || res.status === 400) continue;
    break;
  }
  throw new Error(
    lastErr.startsWith("503") || lastErr.startsWith("429")
      ? "The AI is very busy right now. Please try again in a minute."
      : "The AI could not create your roadmap. Please try again.",
  );
}

export const generateRoadmap = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ dream: z.string().trim().min(10).max(4000) }).parse(d),
  )
  .handler(async ({ data }): Promise<Roadmap> => {
    const apiKey = process.env["GEMINI_API_KEY"];
    if (!apiKey) throw new Error("Gemini API key is not configured.");
    return await callGemini(apiKey, PROMPT(data.dream));
  });
