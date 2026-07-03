import 'dotenv/config';
import OpenAI from 'openai';

// Model-agnostic wrapper so we can swap providers later, but defaults to OpenAI.
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

/**
 * generate(system, user, opts)
 *  - json:true  -> returns parsed JSON object
 *  - returns string otherwise
 * Note: some of the newest models ignore `temperature` or prefer the Responses API.
 * If your chosen model rejects a param, adjust here in one place.
 */
export async function generate(system, user, { model = MODEL, json = false, temperature = 0.7 } = {}) {
  const res = await client.chat.completions.create({
    model,
    temperature,
    ...(json ? { response_format: { type: 'json_object' } } : {}),
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });
  const text = res.choices[0]?.message?.content ?? '';
  return json ? JSON.parse(text) : text;
}
