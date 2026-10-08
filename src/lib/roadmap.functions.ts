import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Roadmap } from "./roadmap-types";

const MODEL = "gemini-3.8-flash";

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
    "whyItMatters": string (why this company/role needs it),
    "steps": [{ "title": string, "detail": string (detailed how-to-master instructions) }]  (5-7 steps),
    "resources": [{ "name": string, "type": "Course"|"Docs"|"Video"|"Book"|"Practice", "url": string }] (3-5 real, well-known, free where possible),
    "projects": [{ "title": string, "description": string, "features": string[] }] (2 real-world projects relevant to the company),
    "interviewQuestions": [{ "question": string, "type": "Technical"|"Behavioral"|"Coding", "hint": string }] (5 questions)
  }]
}

Dream job description:
"""${dream}"""`;

async function callGemini(apiKey: string, prompt: string) {
  let lastErr = "";
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      },
    );
    if (res.ok) {
      const json = await res.json();
      const text: string =
        json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
      return text;
    }
    const body = await res.text();
    lastErr = `${res.status}: ${body.slice(0, 300)}`;
    console.error("Gemini error", lastErr);
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 1500 * 2 ** attempt + Math.random() * 500));
      continue;
    }
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
    const text = await callGemini(apiKey, PROMPT(data.dream));
    const cleaned = text.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
    try {
      const parsed = JSON.parse(cleaned) as Roadmap;
      if (!Array.isArray(parsed.levels) || parsed.levels.length === 0) throw new Error("empty");
      return parsed;
    } catch {
      throw new Error("The AI returned an unreadable roadmap. Please try again.");
    }
  });
