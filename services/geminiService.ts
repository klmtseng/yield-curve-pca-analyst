import { GoogleGenAI } from "@google/genai";
import { PCAResult, Tenor } from "../types";

const API_KEY = process.env.API_KEY || '';

// Initialize client safely - if no key, we will handle in UI
let ai: GoogleGenAI | null = null;
if (API_KEY) {
  ai = new GoogleGenAI({ apiKey: API_KEY });
}

export const getGeminiInterpretation = async (
  pcaResult: PCAResult,
  sampleDataDates: { start: string, end: string }
): Promise<string> => {
  if (!ai) {
    return "API Key is missing. Please configure your environment to use Gemini interpretation.";
  }

  // Prepare a concise summary for the prompt to save tokens
  const loadingsSummary = pcaResult.eigenvectors.slice(0, 3).map((vec, idx) => {
    return `PC${idx + 1}: [${vec.map(v => v.toFixed(3)).join(', ')}] (Explains ${(pcaResult.explainedVariance[idx] * 100).toFixed(1)}%)`;
  }).join('\n');

  const tenorList = pcaResult.tenors.join(', ');

  const prompt = `
    You are a senior quantitative fixed income analyst. 
    I have performed a Principal Component Analysis (PCA) on the US Treasury yield curve (Tenors: ${tenorList}) 
    using data from ${sampleDataDates.start} to ${sampleDataDates.end}.

    Here are the top 3 Principal Components (Eigenvectors) and their explained variance:
    ${loadingsSummary}

    Task:
    1. Interpret the physical meaning of PC1, PC2, and PC3 based on the loadings (Identify Level, Slope, Curvature).
    2. Analyze what this implies about the correlation structure of the curve.
    3. Briefly discuss how a trader might use these components for hedging or relative value trading.

    Keep the response professional, concise, and formatted with Markdown (use headings and bullet points).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 } // Speed over deep reasoning for this task
      }
    });
    
    return response.text || "No interpretation generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Failed to generate interpretation. Please try again.";
  }
};
