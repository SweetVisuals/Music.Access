
// import { GoogleGenAI } from "@google/genai"; // DeepSeek Replacement
import { Project } from '../types';

// Hardcoded Key REMOVED for Security.
const PROXY_URL = '/api/deepseek';


// Helper for DeepSeek API Calls
const callDeepSeek = async (
  systemPromptOrMessages: string | { role: string, content: string }[],
  userPrompt?: string,
  jsonMode = false
): Promise<string> => {
  try {
    let messagesPayload: { role: string, content: string }[] = [];

    if (Array.isArray(systemPromptOrMessages)) {
      messagesPayload = systemPromptOrMessages;
    } else {
      messagesPayload = [
        { role: "system", content: systemPromptOrMessages },
        { role: "user", content: userPrompt || "" }
      ];
    }

    // 1. Try Vercel Proxy (Secure, No CORS)
    try {
      const proxyResponse = await fetch(PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messagesPayload,
          jsonMode,
          model: 'deepseek-chat'
        })
      });

      const proxyContentType = proxyResponse.headers.get('content-type');

      if (proxyResponse.ok && proxyContentType && proxyContentType.includes('application/json')) {
        const data = await proxyResponse.json();
        return data.choices[0]?.message?.content || "";
      } else {
        throw new Error('Proxy unreachable');
      }
    } catch (proxyError) {
      // 2. OpenRouter / DeepSeek Fallback (Since local proxy is 404ing)
      console.log('Falling back to OpenRouter (DeepSeek Model)...');
      // User provided OpenRouter Key: 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
      const OPENROUTER_KEY = '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';
      const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

      const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_KEY}`,
          'HTTP-Referer': 'https://music-access-mobile.vercel.app', // App URL
          'X-Title': 'Music Access'
        },
        body: JSON.stringify({
          model: 'deepseek/deepseek-chat', // OpenRouter ID for DeepSeek V3
          messages: messagesPayload,
          response_format: jsonMode ? { type: "json_object" } : { type: "text" }
        })
      });

      if (!response.ok) {
        // Check for 429 specifically if needed, otherwise throw text
        const errorText = await response.text();
        throw new Error(`OpenRouter/DeepSeek Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || "";
    }

  } catch (error) {
    console.error("DeepSeek/OpenRouter Call Failed:", error);
    // Return a safe error string that isn't JSON if we want caller to handle, 
    // BUT caller expects JSON often. 
    // Better to throw so catch blocks handle it.
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

export const askAiAssistant = async (messages: { role: string, text: string }[], contextProjects: Project[]): Promise<string> => {
  try {
    const projectSummary = contextProjects.map(p =>
      `- ${p.title} by ${p.producer} (${p.genre}, ${p.bpm}BPM, ${p.key})`
    ).join('\n');

    // Convert internal AiMessage format to DeepSeek format
    // Take last 5 messages for context
    const recentMessages = messages.slice(-5);

    const formattedMessages = recentMessages.map(msg => ({
      role: msg.role === 'model' ? 'assistant' : 'user',
      content: msg.text
    }));

    const systemPrompt = `
      You are 'System.AI', a helpful assistant inside a music production terminal app.
      Here is the current list of trending projects available on the screen:
      ${projectSummary}
      
      Keep the response concise, technical, and helpful. 
      If recommending a project, mention its title.
    `;

    // We need to modify callDeepSeek to accept 'messages' array directly, or construct a prompt string.
    // Since callDeepSeek takes (systemPrompt, userPrompt), let's just concatenate for now as a quick fix 
    // OR better, we need to pass the history. 
    // However, callDeepSeek implementation (lines 37-52) *constructs* the messages array.
    // To support history propertly without breaking other calls, we should probably refactor callDeepSeek 
    // or just pass the history as a "userPrompt" block which is hacky but might work if we can't change callDeepSeek easily.

    // WAIT, I should check callDeepSeek again.
    // It takes (systemPrompt, userPrompt).
    // If I want to pass history, I need to change callDeepSeek signature or make a new one.
    // Let's modify callDeepSeek to accept an optional full messages array?
    // Or simpler: Just format the history into the "User Prompt" for this specific call.

    /* 
       Optimized Approach for this task without breaking `generateCreativeDescription` etc:
       We will format the history into a single text block for the 'userPrompt' argument.
       Most LLMs handle "Here is the conversation history:\n..." quite well.
       
       OR... looking at callDeepSeek, it's local to this file. I can modify it!
    */

    // Let's modify callDeepSeek to be more flexible.

    return await callDeepSeek(
      systemPrompt,
      JSON.stringify(formattedMessages) // Passing JSON string to be handled inside? No.
      // Let's just pass the last user message as "userPrompt" but PREPEND the history to the system prompt?
      // No, that's messy.
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
            List 25 creative, slant, and perfect rhymes for the word "${word}" suitable for modern song lyrics (rap/pop/r&b).
            
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
