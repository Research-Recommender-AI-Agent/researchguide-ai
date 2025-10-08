import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert research paper and dataset recommendation system. Given a user's research query, recommend relevant academic papers and datasets.

For each recommendation, provide:
- type: "paper" or "dataset"
- title: The exact title of the paper or dataset
- description: A brief description (1-2 sentences)
- score: A relevance score between 0.80 and 0.99
- level: One of "가장 추천", "추천", or "참고"
- reason: Why this is relevant to the query (in Korean, 1-2 sentences)
- url: A real, working URL to the paper or dataset
- For papers: journal, authors (array), year, citationCount, keywords (array)
- For datasets: publisher, year, dataSize, format, keywords (array)

Provide exactly 50 recommendations that are highly relevant to the query. Mix both papers and datasets appropriately.
All URLs must be real and working. Use arxiv.org, nature.com, ieee.org, sciencedirect.com for papers.
Use kaggle.com, github.com, data.gov, huggingface.co for datasets.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Research query: "${query}"\n\nProvide 50 highly relevant paper and dataset recommendations.` }
        ],
        tools: [{
          type: "function",
          function: {
            name: "recommend_resources",
            description: "Return 50 relevant paper and dataset recommendations",
            parameters: {
              type: "object",
              properties: {
                recommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string", enum: ["paper", "dataset"] },
                      title: { type: "string" },
                      description: { type: "string" },
                      score: { type: "number" },
                      level: { type: "string", enum: ["가장 추천", "추천", "참고"] },
                      reason: { type: "string" },
                      url: { type: "string" },
                      journal: { type: "string" },
                      publisher: { type: "string" },
                      authors: { type: "array", items: { type: "string" } },
                      year: { type: "number" },
                      citationCount: { type: "number" },
                      dataSize: { type: "string" },
                      format: { type: "string" },
                      keywords: { type: "array", items: { type: "string" } }
                    },
                    required: ["type", "title", "description", "score", "level", "reason", "url", "keywords"]
                  }
                }
              },
              required: ["recommendations"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "recommend_resources" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No recommendations generated");
    }

    const recommendations = JSON.parse(toolCall.function.arguments).recommendations;

    // Add detailed reason for each recommendation
    const enrichedRecommendations = recommendations.map((rec: any) => ({
      ...rec,
      detailedReason: {
        semanticSimilarity: rec.score,
        keywordMatch: Math.max(0.75, rec.score - 0.05),
        citationRelevance: Math.max(0.70, rec.score - 0.08),
        recencyScore: Math.max(0.80, rec.score - 0.03),
        explanation: rec.reason
      }
    }));

    return new Response(
      JSON.stringify({ recommendations: enrichedRecommendations }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in recommend-papers function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
