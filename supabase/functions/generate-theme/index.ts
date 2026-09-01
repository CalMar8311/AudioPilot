// Edge function: generate-theme
// Calls OpenAI to produce a genre-aware song theme/story + title as JSON.
// Used by the "Surprise Me" button for contextual, non-random theme generation.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ThemeRequest {
  genre: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed. Use POST." }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body.genre !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing 'genre' in request body." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "OPENAI_API_KEY is not configured.",
          fallback: true,
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const genre: string = body.genre;
    const systemPrompt =
      "You are a creative music director. Generate a unique, evocative, and culturally accurate 2-sentence song theme/story. Return ONLY valid JSON with no markdown, no code fences, no commentary.";
    const userPrompt =
      `For the genre: "${genre}", generate a unique, evocative, and culturally accurate 2-sentence song theme/story and title. ` +
      `Return ONLY valid JSON: {"title": "...", "theme": "..."}`;

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.95,
        max_tokens: 200,
        response_format: { type: "json_object" },
      }),
    });

    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text();
      return new Response(
        JSON.stringify({
          error: `OpenAI request failed (${openaiResponse.status}).`,
          details: errText,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const openaiData = await openaiResponse.json();
    const content: string | undefined = openaiData?.choices?.[0]?.message?.content;

    if (!content || typeof content !== "string") {
      return new Response(
        JSON.stringify({ error: "OpenAI returned an unexpected response." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Parse the JSON response
    let parsed: { title?: string; theme?: string };
    try {
      parsed = JSON.parse(content);
    } catch {
      // If JSON parsing fails, try to extract theme from raw text
      return new Response(
        JSON.stringify({
          title: genre,
          theme: content.trim().replace(/^["']|["']$/g, ""),
          source: "openai",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!parsed.theme || typeof parsed.theme !== "string") {
      return new Response(
        JSON.stringify({ error: "OpenAI response missing 'theme' field." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        title: parsed.title || genre,
        theme: parsed.theme.trim(),
        source: "openai",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
