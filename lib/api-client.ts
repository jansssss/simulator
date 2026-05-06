/**
 * Bio-R&D Orchestration API Client
 * Pre-structured for GPT / Claude API integration
 */

export type AIProvider = "claude" | "openai";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

// ─── 실제 백엔드 API 호출 ────────────────────────────────────────────────────

export async function checkBackendHealth(): Promise<{
  status: string;
  vina_installed: boolean;
  downloaded_pdbs: string[];
} | null> {
  try {
    const res = await fetch(`${BACKEND}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}

export async function analyzeMolecule(smiles: string) {
  const [props, admet, lipinski] = await Promise.all([
    fetch(`${BACKEND}/molecules/properties`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ smiles }),
    }).then((r) => r.json()),
    fetch(`${BACKEND}/molecules/admet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ smiles }),
    }).then((r) => r.json()),
    fetch(`${BACKEND}/molecules/lipinski`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ smiles }),
    }).then((r) => r.json()),
  ]);
  return { properties: props, admet, lipinski };
}

export async function getMoleculeImage(smiles: string): Promise<string | null> {
  try {
    const res = await fetch(`${BACKEND}/molecules/structure-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ smiles }),
    });
    const data = await res.json();
    return data.svg_base64 ?? null;
  } catch {
    return null;
  }
}

export async function batchAnalyzeMolecules(substances: object[]) {
  const res = await fetch(`${BACKEND}/molecules/batch-analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ substances }),
  });
  return res.json();
}

export async function getTargetsForEfficacy(efficacy: string) {
  const res = await fetch(`${BACKEND}/docking/targets/${encodeURIComponent(efficacy)}`);
  return res.json();
}

export async function downloadPDB(pdbId: string) {
  const res = await fetch(`${BACKEND}/docking/download-pdb`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pdb_id: pdbId }),
  });
  return res.json();
}

export async function startBatchDocking(payload: {
  substances: { id: string; name: string; smiles: string }[];
  pdb_id: string;
  binding_site?: object;
  exhaustiveness?: number;
}) {
  const res = await fetch(`${BACKEND}/docking/run-batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function getDockingJobStatus(jobId: string) {
  const res = await fetch(`${BACKEND}/docking/job/${jobId}`);
  return res.json();
}

export interface SimulationConfig {
  dataSources: {
    terrestrial: boolean;
    marine: boolean;
    regulatoryDB: boolean;
  };
  targetEfficacy: string;
  priorities: {
    bioactivity: number;
    stability: number;
    synergy: number;
    toxicity: number;
  };
  constraints: string[];
  maxIterations: number;
}

export interface MolecularCandidate {
  id: string;
  composition: string;
  source: "terrestrial" | "marine" | "hybrid";
  score: number;
  patentability: "High" | "Medium" | "Low";
  efficacyProfile: {
    antiInflammatory: number;
    antioxidant: number;
    antimicrobial: number;
    antitumor: number;
    neuroprotection: number;
    immunoModulation: number;
  };
  dockingScore: number;
  admet: {
    absorption: number;
    distribution: number;
    metabolism: number;
    excretion: number;
    toxicity: number;
  };
}

export interface SimulationResult {
  iterationsCompleted: number;
  topCandidates: MolecularCandidate[];
  novelStructuresDiscovered: number;
  avgDockingScore: number;
  timestamp: string;
}

export interface FeedbackPayload {
  candidateId: string;
  experimentalResults: {
    observedEfficacy: number;
    sideEffects: string;
    stabilityInVivo: number;
    notes: string;
  };
  researcherName: string;
  phDDomain: string;
}

// ─── Provider abstraction ───────────────────────────────────────────────────

async function callClaude(prompt: string, systemPrompt: string): Promise<string> {
  // TODO: wire up @anthropic-ai/sdk
  // import Anthropic from "@anthropic-ai/sdk";
  // const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  // const message = await client.messages.create({
  //   model: "claude-sonnet-4-6",
  //   max_tokens: 4096,
  //   system: systemPrompt,
  //   messages: [{ role: "user", content: prompt }],
  // });
  // return message.content[0].type === "text" ? message.content[0].text : "";
  throw new Error("Claude API not yet configured. Set ANTHROPIC_API_KEY.");
}

async function callOpenAI(prompt: string, systemPrompt: string): Promise<string> {
  // TODO: wire up openai SDK
  // import OpenAI from "openai";
  // const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  // const response = await client.chat.completions.create({
  //   model: "gpt-4o",
  //   messages: [
  //     { role: "system", content: systemPrompt },
  //     { role: "user", content: prompt },
  //   ],
  // });
  // return response.choices[0].message.content ?? "";
  throw new Error("OpenAI API not yet configured. Set OPENAI_API_KEY.");
}

// ─── Public API surface ─────────────────────────────────────────────────────

export async function runAISimulation(
  config: SimulationConfig,
  provider: AIProvider = "claude"
): Promise<SimulationResult> {
  const systemPrompt = `You are a computational biochemist AI specialized in natural product discovery.
Analyze molecular structures from both terrestrial and marine sources, perform virtual docking,
and predict novel bioactive compounds. Return structured JSON results.`;

  const prompt = `Run a molecular simulation with the following configuration:
${JSON.stringify(config, null, 2)}

Return top 10 candidate molecules with efficacy scores, docking scores, and ADMET profiles.`;

  const raw =
    provider === "claude"
      ? await callClaude(prompt, systemPrompt)
      : await callOpenAI(prompt, systemPrompt);

  return JSON.parse(raw) as SimulationResult;
}

export async function submitPhDFeedback(
  feedback: FeedbackPayload,
  provider: AIProvider = "claude"
): Promise<{ reinforcementApplied: boolean; updatedScore: number }> {
  const systemPrompt = `You are a reinforcement learning engine for bio-compound discovery.
Incorporate experimental feedback to update candidate scoring models.`;

  const prompt = `Process this experimental feedback and update the model:
${JSON.stringify(feedback, null, 2)}`;

  const raw =
    provider === "claude"
      ? await callClaude(prompt, systemPrompt)
      : await callOpenAI(prompt, systemPrompt);

  return JSON.parse(raw);
}

export async function generateMolecularInsight(
  candidate: MolecularCandidate,
  provider: AIProvider = "claude"
): Promise<string> {
  const systemPrompt = `You are an expert in natural product pharmacology.
Provide concise mechanistic insights about molecular candidates.`;

  const prompt = `Provide a brief pharmacological insight for this candidate:
${JSON.stringify(candidate, null, 2)}`;

  return provider === "claude"
    ? await callClaude(prompt, systemPrompt)
    : await callOpenAI(prompt, systemPrompt);
}
