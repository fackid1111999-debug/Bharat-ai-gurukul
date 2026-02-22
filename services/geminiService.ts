
import { GoogleGenAI, Type, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

async function callWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (error.status === 500 || error.message?.includes('xhr') || error.message?.includes('500'))) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return callWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export const generateStageContent = async (courseName: string, stageNumber: number, stageTitle: string, language: string) => {
  return callWithRetry(async () => {
    const isGodLevel = stageNumber === 201;
    const difficulty = isGodLevel ? "10.0" : (stageNumber / 20).toFixed(1);
    const isCA = courseName.toLowerCase().includes('chartered accountant') || courseName.toLowerCase().includes('ca');
    const isNumerical = courseName.toLowerCase().includes('math') || courseName.toLowerCase().includes('finance') || courseName.toLowerCase().includes('accounting');
    
    let prompt = `
      You are the Master Guru of Bharat AI-Gurukul. 
      Topic: "${stageTitle}" for the course "${courseName}" (Stage ${stageNumber} of 200).
      ${isGodLevel ? 'CRITICAL: This is the GOD LEVEL. The final ultimate challenge. Make the explanation and task extremely advanced and profound.' : ''}
      Target Language: ${language}.
      Difficulty Level: ${difficulty}/10.0.
      
      Structure:
      1. Explanation: High-level professional knowledge explained simply. 
      2. Language Tone: If language is 'hinglish', use "Pure Hinglish" - the way young people in India talk. Mix Hindi and English words naturally. (e.g., "Aaj hum seekhenge kaise complex problems ko solve karte hain" instead of "Aaj hum jatil samasyaon ka samadhan seekhenge"). Use Devanagari for Hindi parts.
      3. Analogy: Compare this specific course concept to a deeply local Indian life situation.
      4. Interactive Task: A highly specific, practical, hands-on task.
      5. Image Prompt: If this is a numerical or technical task, provide a detailed prompt to generate an image that helps visualize the problem (e.g., a diagram, a chalkboard with numbers, or a technical component).
      
      Return strictly JSON.
    `;

    if (isCA) {
      prompt += `
        IMPORTANT: This is a Chartered Accountant (CA) course regulated by the ICAI (Statutory Corporation). 
        The 'Interactive Task' MUST be a real practical problem, illustration, or question that exists in the official ICAI study material (BOS Knowledge Portal). 
        Do NOT create a generic task. Use actual curriculum data.
        Reference URLs: 
        - https://www.icai.org/post/bos-knowledge-portal
        - https://www.icai.org/post/foundation-course-new-scheme
        - https://www.icai.org/post/intermediate-course-new-scheme
        - https://www.icai.org/post/final-course-new-scheme
      `;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: isCA ? [{ urlContext: {} }] : undefined,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            explanation: { type: Type.STRING },
            analogy: { type: Type.STRING },
            task: { type: Type.STRING },
            check: { type: Type.STRING },
            imagePrompt: { type: Type.STRING, description: 'Prompt for image generation if needed' }
          },
          required: ["explanation", "analogy", "task", "check"]
        }
      }
    });

    const content = JSON.parse(response.text);

    // If there's an image prompt, generate the image
    if (content.imagePrompt && isNumerical) {
      try {
        const imageResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: [{ text: `Educational illustration for ${courseName}: ${content.imagePrompt}. Clear, professional, high contrast.` }] },
          config: { imageConfig: { aspectRatio: "16:9" } }
        });
        
        for (const part of imageResponse.candidates[0].content.parts) {
          if (part.inlineData) {
            content.imageUrl = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }
      } catch (e) {
        console.error("Image generation failed", e);
      }
    }

    return content;
  });
};

export const generateExamContent = async (courseName: string, level: number, language: string, questionCount: number = 50) => {
  return callWithRetry(async () => {
    const difficulty = (level / 20).toFixed(1);
    const isCA = courseName.toLowerCase().includes('chartered accountant') || courseName.toLowerCase().includes('ca');

    let prompt = `
      You are the Master Guru of Bharat AI-Gurukul. 
      Create a "Maha-Pariksha" (Exam) specifically for the course "${courseName}" after the student has completed Level ${level}.
      Target Language: ${language}.
      Difficulty Level: ${difficulty}/10.0.
      
      Requirements:
      - Generate ${questionCount} challenging multiple-choice questions that strictly test the core skills and knowledge of "${courseName}".
      - The questions must be highly relevant to the specific subject matter of "${courseName}" and cover concepts learned from level ${level - 9} to ${level}.
      - Language should be ${language}.
      - Each question must have 4 plausible but distinct options.
      - correctAnswer is the index (0-3).
      - Include a brief "Guru's Explanation" for each question to help the student learn from their mistakes.

      Return strictly JSON.
    `;

    if (isCA) {
      prompt += `
        IMPORTANT: This is a Chartered Accountant (CA) course regulated by the ICAI (Statutory Corporation). 
        The questions MUST be real exam-style questions or direct problems from the official ICAI study material (BOS Knowledge Portal). 
        Strictly follow the official ICAI syllabus and standard of examination.
        Reference URLs for context:
        - https://www.icai.org/post/bos-knowledge-portal
        - https://www.icai.org/post/foundation-course-new-scheme
        - https://www.icai.org/post/intermediate-course-new-scheme
        - https://www.icai.org/post/final-course-new-scheme
      `;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: isCA ? [{ urlContext: {} }] : undefined,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswer: { type: Type.INTEGER },
                  explanation: { type: Type.STRING }
                },
                required: ["question", "options", "correctAnswer", "explanation"]
              }
            }
          },
          required: ["title", "questions"]
        }
      }
    });

    return JSON.parse(response.text);
  });
};

export const generateTTS = async (text: string, language: string) => {
  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Speak this text in a warm, expert Indian guru voice. Language context is ${language}: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  });
};
