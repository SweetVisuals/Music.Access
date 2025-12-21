
// import { GoogleGenAI } from "@google/genai"; // DeepSeek Replacement
import { Project } from '../types';

// Hardcoded for user session as requested (unable to update .env.local)
const DEEPSEEK_API_KEY = 'sk-71eada7563114bde846c61969b83efe8';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const MODEL_NAME = 'deepseek-chat';

// Helper for DeepSeek API Calls
const callDeepSeek = async (systemPrompt: string, userPrompt: string, jsonMode = false): Promise<string> => {
  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: jsonMode ? { type: "json_object" } : { type: "text" },
        stream: false
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DeepSeek API Error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("DeepSeek Call Failed:", error);
    throw error;
  }
};

export const generateCreativeDescription = async (project: Project): Promise<string> => {
  try {
    const prompt = `
      Analyze this music project and provide a single, high-impact sentence describing its vibe.
      
      Project Details:
      Title: ${project.title}
      Producer: ${project.producer}
      Genre: ${project.genre}
      Key: ${project.key}
      BPM: ${project.bpm}
      Tags: ${project.tags.join(', ')}
      
      Constraints:
      1. Output must be exactly ONE sentence.
      2. Maximum 12 words.
      3. Use evocative, marketing-friendly language suitable for a music producer marketplace.
      4. Do not use hashtags or emojis.
      5. Example format: "Dark, cinematic textures blended with aggressive 808s for a late-night trap anthem."
    `;

    return await callDeepSeek(
      "You are a music marketing expert.",
      prompt
    ) || "Analysis unavailable.";

  } catch (error) {
    console.error("Error generating description:", error);
    return "System error: Unable to retrieve AI analysis.";
  }
};

export const askAiAssistant = async (query: string, contextProjects: Project[]): Promise<string> => {
  try {
    const projectSummary = contextProjects.map(p =>
      `- ${p.title} by ${p.producer} (${p.genre}, ${p.bpm}BPM, ${p.key})`
    ).join('\n');

    const prompt = `
      Here is the current list of trending projects available on the screen:
      ${projectSummary}

      User Query: "${query}"

      Answer the user's query based on the available projects or general music production advice. 
      Keep the response concise, technical, and helpful. 
      If recommending a project, mention its title.
    `;

    return await callDeepSeek(
      "You are 'System.AI', a helpful assistant inside a music production terminal app.",
      prompt
    ) || "No response.";
  } catch (error) {
    console.error("Error asking assistant:", error);
    return "Error: AI Assistant offline.";
  }
}

export const getWritingAssistance = async (userPrompt: string, currentText: string): Promise<string> => {
  try {
    const prompt = `
      Current Lyrics/Notes:
      "${currentText}"
      
      User Request:
      "${userPrompt}"
      
      Provide *strictly* the content requested (lyrics, rhymes, structure, or ideas). 
      - Do NOT include "Here is your...", "Sure!", or any conversational filler.
      - Output valid text ready to be inserted directly into the note.
      - If suggesting lyrics, match the vibe and rhyme scheme of the current text.
      - Keep it concise.
    `;

    return await callDeepSeek(
      "You are an expert songwriter and lyricist.",
      prompt
    ) || "No advice generated.";
  } catch (error) {
    console.error("Error getting writing assistance:", error);
    return "System error: AI writing assistant unavailable.";
  }
};

export const getRhymesForWord = async (word: string): Promise<string[]> => {
  try {
    const prompt = `
            List 15 creative, slant, and perfect rhymes for the word "${word}" suitable for modern song lyrics (rap/pop/r&b).
            
            Constraints:
            1. Return STRICTLY a JSON array of strings. Example: ["rhyme1", "rhyme2"]
            2. Do NOT include any markdown formatting (like \`json\` or \`\`).
            3. Do NOT include explanations.
            4. Include a mix of:
               - Perfect rhymes
               - Slant rhymes (e.g. "time" -> "mind")
               - Multi-syllabic rhymes if applicable.
        `;

    const text = await callDeepSeek(
      "You are a rhyming dictionary API. Output JSON only.",
      prompt,
      true // JSON Mode
    );

    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Error fetching AI rhymes:", error);
    return [];
  }
};
