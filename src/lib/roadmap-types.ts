export type Level = {
  title: string;
  skill: string;
  tagline: string;
  difficulty: "Easy" | "Medium" | "Hard" | "Boss";
  xp: number;
  estimatedTime: string;
  whyItMatters: string;
  steps: { title: string; detail: string }[];
  resources: { name: string; type: string; url: string }[];
  projects: { title: string; description: string; features: string[] }[];
  interviewQuestions: { question: string; type: string; hint: string }[];
};

export type Roadmap = {
  role: string;
  company: string;
  summary: string;
  keywords: string[];
  companyNeeds: string[];
  requiredSkills: string[];
  levels: Level[];
};
