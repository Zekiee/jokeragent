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
      description: "The word for the spies. Must be strictly related to the civilian word but subtly different.",
    },
  },
  required: ["civilian", "spy"],
};

export const generateGameWords = async (topic?: string): Promise<WordPair> => {
  try {
    // Initialize inside the function to avoid top-level await/init issues
    // and ensure process.env is ready.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const systemInstruction = `你是专业的中文聚会游戏“谁是卧底”的出题裁判。
你的核心任务是生成一对既相关又容易混淆的中文词语（平民词 vs 卧底词）。
确保生成的词语是简体中文。`;

    let userPrompt = "";

    if (topic && topic.trim() !== "") {
      userPrompt = `请基于用户指定的主题【${topic}】生成题目。

严格要求：
1. **领域限制**：两个词都必须严格属于主题“${topic}”的范畴。
   - 例如主题是“柯南”，词语必须是里面的角色（如工藤新一vs服部平次）、道具（如手表型麻醉枪vs领结变声器）或核心概念。
   - 绝不能出现一个相关、一个不相关的情况。
2. **高混淆度**：平民词和卧底词必须属性极度相似，难以区分。卧底应该很难发现自己拿到了不同的词。
   - 好的例子（主题漫威）：钢铁侠 vs 蝙蝠侠（都是富豪英雄，容易混）。
   - 坏的例子（主题漫威）：钢铁侠 vs 苹果（差异太大，没法玩）。`;
    } else {
      userPrompt = `请随机生成一组适合大众娱乐的题目。

要求：
1. **通俗易懂**：词语必须是生活常识、热门事物、知名明星或常用成语。
2. **高混淆度**：侧重于“像”，让卧底在描述时容易踩雷，或者平民容易误伤。
3. **参考范例**：
   - 麦当劳 vs 肯德基
   - 微信 vs QQ
   - 甄嬛传 vs 延禧攻略
   - 烫发 vs 染发`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: wordPairSchema,
        temperature: 0.9, // High creativity to find interesting pairs
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
      civilian: "福尔摩斯",
      spy: "柯南"
    };
  }
};