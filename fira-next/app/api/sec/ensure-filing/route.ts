import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticker, formType, filingDate, accessionNumber, companyName } = body;

    if (!ticker || !formType || !accessionNumber) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if filing exists or create it
    const filingId = await convex.mutation(api.filings.ensureFiling, {
      ticker: ticker.toUpperCase(),
      formType,
      filingDate,
      accessionNumber,
      companyName,
    });

    return NextResponse.json({ filingId });
  } catch (error) {
    console.error("Ensure filing error:", error);
    return NextResponse.json(
      { error: "Failed to process filing" },
      { status: 500 }
    );
  }
}
