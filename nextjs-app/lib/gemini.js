// Ported from app.py's Gemini setup:
//   GEMINI_MODEL_NAME = "gemini-3.6-flash"
//   GEMINI_CLIENT = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
// using the JS/TS counterpart of the same google-genai SDK family
// (Python: `google-genai` / `from google import genai`; JS: `@google/genai`).
// Same client shape: `ai.models.generateContent({ model, contents })`,
// same `.text` property on the response.

import { GoogleGenAI } from '@google/genai';

export const GEMINI_MODEL_NAME = 'gemini-3.6-flash';

const globalForGemini = globalThis;

export const geminiClient =
  globalForGemini.__konkoorGeminiClient ||
  (globalForGemini.__konkoorGeminiClient = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  }));
