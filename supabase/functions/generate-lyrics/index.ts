// Edge function: generate-lyrics
// Calls OpenAI server-side to produce structured, metatag-wrapped song lyrics.
// The OPENAI_API_KEY secret is stored in Supabase — never exposed to the browser.
// Falls back to a 503 with a clear message if the key isn't configured.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type RhymeScheme = "AABB" | "ABAB" | "AAAA" | "Free";
type Tone = "poetic" | "direct" | "aggressive" | "nostalgic" | "playful";
type Lang = "en" | "es" | "fr" | "ja" | "ar";

interface GenerateRequest {
  theme: string;
  scheme: RhymeScheme;
  tone: Tone;
  lang: Lang;
  structureName: string;
  structureBlurb: string;
  sections: string[];
  genres: string[];
  instruments: string[];
  vocalTypes: string[];
  moods: string[];
  bpm: number;
  // New vocal styling fields
  vocalArchetypes: string[]; // archetype labels
  regionalFlows: string[];   // flow labels
  deliveryDirectives: string[]; // inline directive tags
  blend?: number;
  fusedStyle?: {
    enabled: boolean;
    cadence: string;
    rhymeMeter: string;
    suggestedRhyme: string | null;
    performanceTags: string[];
    parts: Array<{
      weight: number;
      role: "primary" | "accent";
      descriptors: string[];
      cadence: string;
      rhymeMeter: string;
      performanceTags: string[];
      bpmHint: string;
    }>;
  };
}

const TONE_DESCRIPTIONS: Record<Tone, string> = {
  poetic: "poetic and imagery-rich",
  direct: "direct and conversational",
  aggressive: "aggressive and intense",
  nostalgic: "nostalgic and wistful",
  playful: "playful and upbeat",
};

const LANG_NAMES: Record<Lang, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  ja: "Japanese",
  ar: "Arabic",
};

// Archetype → directive mapping for prompt construction
const ARCHETYPE_DIRECTIVES: Record<string, string> = {
  "Neo-Soul / Jazz Phrasing": "Use tags like [Verse 1 | Smoky Alto | Laid-back Jazz Phrasing | Loose Pocket], [Ad-lib | Spoken], [Melismatic Vocal Run]",
  "Retro-Soul / Gritty Torch Jazz": "Use tags like [Verse 1 | Gritty Contralto | Raw Raspy Soul | 60s Torch Ballad Timing], [Chorus | Belted Soul | Brass Stabs]",
  "Melodic Trap Auto-Tune": "Use tags like [Verse 1 | Heavy Auto-Tune | Atmospheric Reverb | Rhythmic Chanting], [Ad-lib: yeah]",
  "Alternative R&B Falsetto": "Use tags like [Verse 1 | Airy Falsetto | Moody Vibrato | Melancholic Runs], [Harmonies]",
  "Belted Power Pop / Diva": "Use tags like [Verse 1 | Full Chest Resonance | Soaring Peaks | Dramatic Vibrato], [Chorus | Belted Soul]",
};

const FLOW_DIRECTIVES: Record<string, string> = {
  "90s East Coast / Boom Bap": "tight multi-syllabic meters with dense internal rhyme and aggressive pocket delivery",
  "West Coast G-Funk": "laid-back elongated vowels with smooth syncopation and a bouncy groove",
  "Southern / Dirty South / Trap": "triplet flows with rapid double-time and heavy ad-libs",
  "UK Drill / Grime": "staccato delivery with sliding 140 BPM syncopation and British slang",
  "Midwest Chopper": "high-speed rapid-fire diction with machine-gun precision",
  "Conscious / Spoken Word": "poetic jazz-inflected phrasing with loose meter and spoken delivery",
};

function buildSystemPrompt(req: GenerateRequest): string {
  const rules: string[] = [
    "You are a master music producer, lyricist, and vocal arranger for AI audio models (Suno/Udio).",
    "",
    "When generating lyrics:",
    "1. Cadence & Meter: Match the syllable count and rhyme rhythm to the selected regional flow.",
    "2. Metatag Voice Directives: Always prefix song sections with bracketed performance and vocal styling tags matching the archetype.",
    "3. Inject inline vocal cues (e.g., [Whispered], [Vocal Run], [Ad-lib: yeah], [Off-beat phrasing]) throughout the verses and choruses to guide the model's vocal expression.",
    "4. Wrap EVERY section in square-bracket metatags on their own line: [Intro], [Verse 1], [Pre-Chorus], [Chorus], [Drop], [Build-up], [Breakdown], [Bridge], [Guitar Solo], [Instrumental Solo], [Outro], [Fade Out], [End].",
    "5. Follow the requested rhyme scheme within each section (AABB, ABAB, AAAA, or Free Verse).",
    "6. Match the requested tone and language exactly.",
    "7. Keep choruses memorable and repeatable. Verses should advance the narrative.",
    "8. For instrumental sections (Guitar Solo, Instrumental Solo, Drop, Build-up, Breakdown), include only metatags and brief cues — no sung lyrics.",
    "9. Do NOT include any commentary, explanations, or markdown. Output ONLY the lyrics with metatags.",
    "10. Separate sections with a single blank line.",
    "11. Never name celebrity artists. Describe timbre, register, cadence, and production only.",
    "12. Banned cliches: never use the words or close variants of neon, shadows, echoes, ignite, or whispers.",
    "13. Use grounded contemporary imagery: concrete tactile details, specific objects, ordinary places, phones, transit, kitchens, offices, streets, and believable modern settings.",
    "14. Prefer conversational phrasing that sounds like a person speaking now. Avoid generic glowing nightlife tropes and abstract emotional filler.",
    "15. Before returning lyrics, scan every line and replace banned cliches with a concrete sensory or conversational detail.",
  ];

  const fused = req.fusedStyle;
  if (fused && fused.parts && fused.parts.length > 0) {
    rules.push("");
    rules.push(fused.enabled
      ? "Style Fusion Mode — write as ONE fused performance, not two songs glued together:"
      : "Vocal / style alignment:");
    rules.push(`Fused cadence: ${fused.cadence}`);
    rules.push(`Rhyme meter to match: ${fused.rhymeMeter}`);
    if (fused.suggestedRhyme) {
      rules.push(`Prefer this rhyme density when it does not conflict with the requested scheme: ${fused.suggestedRhyme}.`);
    }
    for (const part of fused.parts) {
      const role = part.role === "primary" ? "PRIMARY" : "ACCENT";
      rules.push(
        `- ${role} ${part.weight}%: ${part.descriptors.join(", ")}. Cadence: ${part.cadence}. Meter: ${part.rhymeMeter}. BPM pocket: ${part.bpmHint}.`,
      );
    }
    if (fused.performanceTags?.length) {
      rules.push(
        `Weave these inline performance tags into verses/hooks (own line, square brackets): ${fused.performanceTags.join(", ")}.`,
      );
    }
    if (fused.enabled) {
      rules.push("Verses follow the PRIMARY cadence and meter; hooks, ad-libs, and drum breaks can tilt toward ACCENT tags.");
      rules.push("Example fused tags: [Smoky Alto Ad-lib], [Boom-Bap Drum Break], [Psychedelic Trap Melody].");
    }
  }

  // Add archetype-specific directive examples
  if (req.vocalArchetypes.length > 0) {
    rules.push("");
    rules.push("Vocal Archetype Directives:");
    for (const arch of req.vocalArchetypes) {
      const directive = ARCHETYPE_DIRECTIVES[arch];
      if (directive) {
        rules.push(`- For ${arch}: ${directive}`);
      }
    }
  }

  // Add regional flow guidance
  if (req.regionalFlows.length > 0) {
    rules.push("");
    rules.push("Regional Flow Cadence:");
    for (const flow of req.regionalFlows) {
      const meter = FLOW_DIRECTIVES[flow];
      if (meter) {
        rules.push(`- ${flow}: ${meter}`);
      }
    }
  }

  // Add delivery directives
  if (req.deliveryDirectives.length > 0) {
    rules.push("");
    rules.push(`Inject these delivery directive tags where appropriate: ${req.deliveryDirectives.join(", ")}`);
  }

  return rules.join("\n");
}

function buildUserPrompt(req: GenerateRequest): string {
  const sectionList = req.sections.join(" -> ");
  const contextParts: string[] = [];
  if (req.genres.length) contextParts.push(`Genres: ${req.genres.join(", ")}`);
  if (req.instruments.length) contextParts.push(`Instruments: ${req.instruments.join(", ")}`);
  if (req.vocalTypes.length) contextParts.push(`Vocal style: ${req.vocalTypes.join(", ")}`);
  if (req.moods.length) contextParts.push(`Mood: ${req.moods.join(", ")}`);
  if (req.bpm) contextParts.push(`Tempo: ${req.bpm} BPM`);
  if (typeof req.blend === "number" && req.genres.length >= 2) {
    contextParts.push(`Genre blend: primary ${req.blend}% / accent ${100 - req.blend}%`);
  }
  if (req.fusedStyle?.enabled) {
    contextParts.push(`Style fusion: ${req.fusedStyle.cadence}`);
    contextParts.push(`Fused rhyme meter: ${req.fusedStyle.rhymeMeter}`);
  }
  const context = contextParts.length ? `\n\nMusical context:\n${contextParts.join("\n")}` : "";

  return [
    `Write a complete song in ${LANG_NAMES[req.lang]} with a ${TONE_DESCRIPTIONS[req.tone]} tone.`,
    `Theme/story: "${req.theme}"`,
    `Rhyme scheme: ${req.scheme}`,
    `Song structure: ${sectionList}`,
    context,
    "",
    "Output the full lyrics now, wrapped in the appropriate metatags for each section.",
  ].join("\n");
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
    if (!body || typeof body.theme !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing 'theme' in request body." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "OPENAI_API_KEY is not configured. Add it as an edge function secret in Supabase.",
          fallback: true,
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const reqData: GenerateRequest = {
      theme: body.theme,
      scheme: body.scheme || "ABAB",
      tone: body.tone || "poetic",
      lang: body.lang || "en",
      structureName: body.structureName || "Standard Pop",
      structureBlurb: body.structureBlurb || "",
      sections: body.sections || ["Intro", "Verse 1", "Chorus", "Verse 2", "Chorus", "Outro"],
      genres: body.genres || [],
      instruments: body.instruments || [],
      vocalTypes: body.vocalTypes || [],
      moods: body.moods || [],
      bpm: body.bpm || 120,
      vocalArchetypes: body.vocalArchetypes || [],
      regionalFlows: body.regionalFlows || [],
      deliveryDirectives: body.deliveryDirectives || [],
      blend: typeof body.blend === "number" ? body.blend : undefined,
      fusedStyle: body.fusedStyle || undefined,
    };

    const systemPrompt = buildSystemPrompt(reqData);
    const userPrompt = buildUserPrompt(reqData);

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
        temperature: 0.9,
        max_tokens: 1200,
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
    const lyrics: string | undefined = openaiData?.choices?.[0]?.message?.content;

    if (!lyrics || typeof lyrics !== "string") {
      return new Response(
        JSON.stringify({ error: "OpenAI returned an unexpected response." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ lyrics: lyrics.trim(), source: "openai" }),
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
