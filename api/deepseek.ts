
export const config = {
    runtime: 'edge', // Use Edge Runtime for speed
};

export default async function handler(req: Request) {
    // CORS Headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle Options
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
    }

    try {
        const { systemPrompt, userPrompt, jsonMode, model } = await req.json();
        const apiKey = process.env.DEEPSEEK_API_KEY || process.env.GEMINI_API_KEY; // Fallback to GEMINI key var if user recycles it

        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'Missing API Key Configuration' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model || 'deepseek-chat',
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                response_format: jsonMode ? { type: "json_object" } : { type: "text" },
                stream: false
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            return new Response(JSON.stringify({ error: `DeepSeek API Error: ${response.status}`, details: errorText }), {
                status: response.status,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const data = await response.json();
        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}
