import { NextRequest, NextResponse } from "next/server";

const MIMO_API_URL = process.env.MIMO_API_URL || "http://localhost:19911/v1/chat/completions";
const MIMO_API_KEY = process.env.MIMO_API_KEY || "";

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (MIMO_API_KEY) {
      headers["Authorization"] = `Bearer ${MIMO_API_KEY}`;
    }

    const response = await fetch(MIMO_API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "mimo-v2.5-pro",
        messages: [
          {
            role: "system",
            content: `You are a QA engineer who generates thorough test cases. You think about happy paths, edge cases, error handling, security, and performance. You always return valid JSON arrays. Be practical and specific.`,
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 4096,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";

    return NextResponse.json({ content });
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json(
      { content: "Error: Failed to generate test cases." },
      { status: 500 }
    );
  }
}
