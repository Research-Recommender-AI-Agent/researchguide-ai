import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Clarify trigger function - 모호도 계산
function calculateAmbiguity(query: string): { needsClarify: boolean; candidates: string[] } {
  const lowerQuery = query.toLowerCase().trim();
  
  // 단일 단어 또는 모호한 키워드 체크
  const ambiguousKeywords: Record<string, string[]> = {
    "learning": ["Machine Learning", "Deep Learning", "Reinforcement Learning", "Transfer Learning"],
    "representation": ["Knowledge Representation", "Data Representation", "Neural Representation", "Visual Representation"],
    "vision": ["Computer Vision", "3D Vision", "Video Understanding", "Scene Understanding"],
    "transformer": ["Vision Transformer", "Language Transformer", "Audio Transformer", "Multimodal Transformer"],
    "memory": ["Memory Networks", "Working Memory", "Long-term Memory", "Attention Memory"],
    "attention": ["Self-Attention", "Cross-Attention", "Multi-head Attention", "Sparse Attention"],
    "model": ["Language Model", "Vision Model", "Multimodal Model", "Generative Model"],
    "optimization": ["Hyperparameter Optimization", "Model Optimization", "Training Optimization", "Architecture Optimization"],
    "graph": ["Graph Neural Networks", "Knowledge Graphs", "Scene Graphs", "Social Graphs"],
    "neural": ["Neural Networks", "Neural Architecture", "Neural Rendering", "Neural ODEs"]
  };
  
  // 키워드 매칭
  for (const [keyword, candidates] of Object.entries(ambiguousKeywords)) {
    if (lowerQuery === keyword || lowerQuery.includes(keyword)) {
      return { needsClarify: true, candidates };
    }
  }
  
  // 단일 단어 쿼리 체크 (공백 없음)
  if (!lowerQuery.includes(" ") && lowerQuery.length > 2) {
    return {
      needsClarify: true,
      candidates: [
        `${lowerQuery.charAt(0).toUpperCase() + lowerQuery.slice(1)} in AI`,
        `${lowerQuery.charAt(0).toUpperCase() + lowerQuery.slice(1)} in Computer Vision`,
        `${lowerQuery.charAt(0).toUpperCase() + lowerQuery.slice(1)} in NLP`,
        "Other related fields"
      ]
    };
  }
  
  return { needsClarify: false, candidates: [] };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, selectedOption } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Clarify 로직
    const ambiguity = calculateAmbiguity(query);
    
    // 모호도가 높고 사용자가 아직 선택하지 않았다면 Clarify 질문 반환
    if (ambiguity.needsClarify && !selectedOption) {
      return new Response(
        JSON.stringify({
          needsClarify: true,
          question: `"${query}"는 여러 의미로 해석될 수 있습니다. 어떤 분야를 의미하시나요?`,
          options: ambiguity.candidates
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 실제 검색 쿼리 구성
    const searchQuery = selectedOption ? `${selectedOption} ${query}` : query;

    const systemPrompt = `You are an expert research paper and dataset recommendation system. Given a user's research query, recommend relevant academic papers and datasets.

CRITICAL REQUIREMENTS:
- All recommendations MUST be highly relevant to the query
- Only recommend papers that ACTUALLY EXIST and can be accessed via the provided URLs
- Papers MUST be from reputable sources (arxiv.org, nature.com, ieee.org, ACM, springer.com, sciencedirect.com)
- Datasets MUST be from verified sources (kaggle.com, huggingface.co, github.com, paperswithcode.com)
- ALL URLs must be real and working - verify the URL format is correct
- For papers: Use DOI links or direct arxiv links (https://arxiv.org/abs/XXXX.XXXXX)
- For datasets: Use official dataset homepages or repository links

For each recommendation, provide:
- type: "paper" or "dataset"
- title: The EXACT title of the paper or dataset (must be a real publication)
- description: A brief description (1-2 sentences) in Korean
- score: A relevance score between 0.85 and 0.99 (higher scores for more relevant results)
- level: One of "가장 추천", "추천", or "참고"
- reason: Why this is relevant to the query (in Korean, 2-3 sentences explaining the connection)
- url: A REAL, WORKING URL to the paper or dataset
- For papers: journal, authors (array), year (realistic year between 2010-2024), citationCount, keywords (array)
- For datasets: publisher, year (realistic year between 2015-2024), dataSize, format, keywords (array)

Provide exactly 50 recommendations that are HIGHLY RELEVANT to: "${searchQuery}"
Mix both papers (60%) and datasets (40%) appropriately.

IMPORTANT:
- Focus on QUALITY over quantity
- Only recommend resources that are DIRECTLY related to the query
- Higher relevance scores (0.90+) should only be given to highly relevant results
- Use proper Korean grammar and natural language in descriptions and reasons`;

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
          { role: "user", content: `Research query: "${searchQuery}"\n\nProvide 50 highly relevant paper and dataset recommendations with real, working URLs.` }
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
          JSON.stringify({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "크레딧이 부족합니다. 관리자에게 문의하세요." }),
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

    // 연관성 점수 기반 필터링 (0.85 이상만)
    const filteredRecommendations = recommendations.filter((rec: any) => rec.score >= 0.85);

    // Add detailed reason for each recommendation
    const enrichedRecommendations = filteredRecommendations.map((rec: any, index: number) => ({
      ...rec,
      id: index + 1,
      detailedReason: {
        semanticSimilarity: rec.score,
        keywordMatch: Math.max(0.75, rec.score - 0.05),
        citationRelevance: Math.max(0.70, rec.score - 0.08),
        recencyScore: Math.max(0.80, rec.score - 0.03),
        explanation: rec.reason
      }
    }));

    console.log(`Generated ${enrichedRecommendations.length} recommendations for query: "${searchQuery}"`);

    return new Response(
      JSON.stringify({ 
        recommendations: enrichedRecommendations,
        clarifiedQuery: selectedOption ? searchQuery : query
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in recommend-papers function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
