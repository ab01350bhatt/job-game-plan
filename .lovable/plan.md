# Faster, reliable roadmap generation (same output)

## Goal
Fix the remaining errors and make roadmaps load much faster (target about 20–40s instead of 1–2 min). Every level keeps the same detail: overview, subtopics, steps, mistakes, mastery checklist, resources, projects, interview questions.

## What changes for the user
- Roadmaps arrive faster, and failures happen less often.
- The loading message shows progress, for example "Building level 3 of 8…", so the wait feels shorter.
- The roadmap screen looks and works exactly as it does now.

## Steps
1. Check the current error logs and preview, then fix anything broken: build errors, runtime errors, the "too busy" handling.
2. Split the single huge AI request into smaller ones:
   - Request 1 (quick): role, company, summary, keywords, company needs, skills, and a short outline of the levels (title, skill, difficulty, XP, time).
   - Then one request per level for its full detail. These run at the same time, not one after another.
3. Stop wasting time on models that don't exist: try the working model first, keep one or two backups, and turn off the AI's slow "thinking" mode.
4. Retry only the level that failed, not the whole roadmap. If a level still fails, the rest still show.
5. Test end to end with two example dream jobs. Check the timing and that every section in the Learn, Build and Interview tabs is filled.

## Technical details
- `roadmap.functions.ts`: add `generateOutline` and `generateLevel` server functions. Keep the same JSON shape (`Roadmap`, `Level` types unchanged). `generationConfig.thinkingConfig.thinkingBudget = 0`. Probe the available models once and trim `MODELS` to the ones that respond. Add per-call timeout (AbortController) and short backoff.
- `index.tsx`: call the outline first, then run `Promise.all` over the levels with a progress counter. Save to localStorage when done.
- `RoadmapView.tsx`: no visual changes.
