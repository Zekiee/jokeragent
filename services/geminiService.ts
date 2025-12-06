import { GoogleGenAI, Type, Schema } from "@google/genai";
import { WordPair } from "../types";

const wordPairSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    civilian: {
      type: Type.STRING,
      description: "The word for the majority of players (Civilians).",
    },
    spy: {
      type: Type.STRING,
      description: "The word for the spies. Must be related to the civilian word but distinctly different.",
    },
  },
  required: ["civilian", "spy"],
};

export const generateGameWords = async (topic?: string): Promise<WordPair> => {
  try {
    // Initialize inside the function to avoid top-level await/init issues
    // and ensure process.env is ready.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = topic 
      ? `Generate a pair of words for the game 'Who is Undercover' (谁是卧底) based on the topic: "${topic}". Language: Chinese.`
      : `Generate a pair of words for the game 'Who is Undercover' (谁是卧底). The words should be common nouns, idioms, or famous people that are similar but distinguishable. Make it fun and moderately challenging. Language: Chinese.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: wordPairSchema,
        temperature: 0.9, // Higher creativity for varied words
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from Gemini");
    }

    return JSON.parse(text) as WordPair;
  } catch (error) {
    console.error("Error generating words:", error);
    // Fallback words in case of API failure or rate limits
    return {
      civilian: "苹果",
      spy: "梨子"
    };
  }
};
