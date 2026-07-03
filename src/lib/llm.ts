import OpenAI from "openai";

let _client: OpenAI | null = null;
function client(): OpenAI {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}
export const MODEL = process.env.OPENAI_MODEL || "gpt-4o";

export async function generateJSON<T = any>(system: string, user: string): Promise<T> {
  const res = await client().chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return JSON.parse(res.choices[0]?.message?.content || "{}") as T;
}

export async function generateText(system: string, user: string): Promise<string> {
  const res = await client().chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return res.choices[0]?.message?.content || "";
}
