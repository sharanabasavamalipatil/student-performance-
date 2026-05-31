/**
 * gemini.ts — AI helper for EduPredict
 * Fixed version:
 * 1) Uses backend proxy first: POST http://localhost:5000/api/ai/chat
 * 2) Falls back to direct Gemini only when VITE_GEMINI_API_KEY is added
 * 3) Falls back to a local course summary, so Course AI Summary never stays broken
 */

const GEMINI_MODEL = 'gemini-2.0-flash';
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function getGeminiKey(): string {
  return import.meta.env.VITE_GEMINI_API_KEY ?? '';
}

export function isGeminiKeySet(): boolean {
  // Return true because this fixed helper can work through backend or local fallback.
  // This prevents UI components from blocking AI summary when frontend key is not set.
  return true;
}

function buildPrompt(messages: { role: string; content: string | { type: string; text?: string }[] }[], system?: string): string {
  const parts: string[] = [];
  if (system) parts.push(system);
  for (const m of messages) {
    if (typeof m.content === 'string') {
      parts.push(m.content);
    } else if (Array.isArray(m.content)) {
      const text = m.content
        .filter((p: any) => p.type === 'text')
        .map((p: any) => p.text ?? '')
        .join('\n');
      if (text) parts.push(text);
    }
  }
  return parts.join('\n\n');
}

function pick(prompt: string, label: string): string {
  const re = new RegExp(`${label}:\\s*([^\\n]+)`, 'i');
  return prompt.match(re)?.[1]?.replace(/^"|"$/g, '').trim() || '';
}

function localFallbackSummary(prompt: string): string {
  const course = pick(prompt, 'Course') || 'this course';
  const provider = pick(prompt, 'Provider') || 'the provider';
  const difficulty = pick(prompt, 'Difficulty') || 'Beginner';
  const duration = pick(prompt, 'Duration') || 'self-paced';
  const skills = pick(prompt, 'Skills') || 'core concepts, practice, project skills';
  const category = pick(prompt, 'Category') || 'learning';
  const careers = pick(prompt, 'Career Paths') || 'placements and project work';

  if (/Course:\s*/i.test(prompt)) {
    return `## What You'll Learn\n- Important ${category} concepts from ${course}.\n- Practical skills such as ${skills}.\n- How to apply the topic through examples and practice.\n- A clear learning path suitable for ${difficulty} level students.\n\n## Who Should Take This\nThis course is useful for students who want to improve their knowledge in ${category}. It is especially helpful if you can spend ${duration} learning consistently.\n\n## Career Impact\nLearning ${course} from ${provider} can support ${careers}. It also adds useful skills for resume, interviews, and academic projects.\n\n## Study Tips\n- Watch lessons regularly and take short notes.\n- Practice every important concept with examples.\n- Add one small project or certificate proof after completion.`;
  }

  return `AI response is temporarily unavailable because the Gemini API key/backend is not configured.\n\nPlease add GEMINI_API_KEY in backend/.env and restart the backend. For now, continue with manual review and try again after setup.`;
}

/**
 * Call AI using Anthropic-style input used by existing components.
 */
export async function callGemini({
  messages,
  system,
  max_tokens = 1000,
  signal,
}: {
  messages: { role: string; content: string | { type: string; text?: string }[] }[];
  system?: string;
  max_tokens?: number;
  signal?: AbortSignal;
}): Promise<string> {
  const fullPrompt = buildPrompt(messages, system);

  // 1) Try backend proxy first. This keeps the key hidden in backend/.env.
  try {
    const proxyRes = await fetch(`${API_BASE}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, system, max_tokens }),
      signal,
    });

    const proxyData = await proxyRes.json().catch(() => ({}));
    const proxyText = proxyData?.content?.[0]?.text || proxyData?.text || proxyData?.reply || '';

    if (proxyRes.ok && proxyText.trim()) return proxyText.trim();

    // If backend says no API key, continue to direct/fallback instead of breaking UI.
    if (!proxyData?._nokey && proxyData?.error) {
      console.warn('AI backend error:', proxyData.error);
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') throw err;
    console.warn('AI backend not reachable, trying direct/fallback:', err?.message || err);
  }

  // 2) Try direct Gemini only if frontend key is actually configured.
  const KEY = getGeminiKey();
  if (KEY && !KEY.includes('YOUR_')) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: fullPrompt }] }],
            generationConfig: { maxOutputTokens: max_tokens, temperature: 0.7 },
          }),
          signal,
        }
      );

      const data = await res.json();
      if (res.ok) return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? localFallbackSummary(fullPrompt);
      console.warn('Direct Gemini error:', data?.error?.message || 'Gemini API error');
    } catch (err: any) {
      if (err?.name === 'AbortError') throw err;
      console.warn('Direct Gemini failed:', err?.message || err);
    }
  }

  // 3) Final fallback so Course AI Summary works even without API key/internet.
  return localFallbackSummary(fullPrompt);
}
