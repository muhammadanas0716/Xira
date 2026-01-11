import { NextRequest } from "next/server";
import OpenAI from "openai";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const SYSTEM_PROMPT = `You are an expert SEC filing analyst assistant. Your role is to help users understand SEC filings (10-K, 10-Q, 8-K) by providing accurate, well-sourced answers based on the filing content.

Guidelines:
1. Base your answers strictly on the provided filing context
2. If the context doesn't contain relevant information, say so clearly
3. Use specific numbers, dates, and quotes when available
4. Explain financial terms in plain language when helpful
5. Highlight key risks, opportunities, and changes from prior periods
6. Be concise but thorough
7. Format responses with markdown for readability (headers, lists, bold for emphasis)

When analyzing filings:
- Focus on material information that impacts business operations
- Note any forward-looking statements and their associated risks
- Compare to prior periods when data is available
- Identify management's tone and key strategic priorities`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, filingId, ticker, chatId, messageId } = body;

    if (!question || !filingId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get relevant chunks from vector search
    let context = "";
    try {
      const chunks = await convex.query(api.vectorSearch.searchChunks, {
        query: question,
        filingId: filingId as Id<"filings">,
        limit: 5,
      });

      if (chunks && chunks.length > 0) {
        context = chunks
          .map(
            (chunk: { section: string; text: string }, i: number) =>
              `[Source ${i + 1} - ${chunk.section}]\n${chunk.text}`
          )
          .join("\n\n---\n\n");
      }
    } catch (error) {
      console.error("Vector search error:", error);
      // Continue without context if vector search fails
    }

    // Build the prompt
    const userPrompt = context
      ? `Context from ${ticker} SEC filing:\n\n${context}\n\n---\n\nQuestion: ${question}`
      : `Note: No specific filing content was found for this question. Providing a general response based on SEC filing knowledge.\n\nQuestion about ${ticker}: ${question}`;

    // Create streaming response
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      stream: true,
      temperature: 0.3,
      max_tokens: 2000,
    });

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("RAG API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process question" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
