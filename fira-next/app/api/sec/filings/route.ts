import { NextRequest, NextResponse } from "next/server";

const SEC_API_BASE = "https://efts.sec.gov/LATEST/search-index";
const COMPANY_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json";

interface SECFiling {
  ticker: string;
  formType: string;
  filingDate: string;
  accessionNumber: string;
  companyName: string;
}

interface StockInfo {
  symbol: string;
  companyName: string;
  price?: number;
  change?: number;
  changePercent?: number;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const ticker = searchParams.get("ticker")?.toUpperCase();

  if (!ticker) {
    return NextResponse.json({ error: "Ticker is required" }, { status: 400 });
  }

  try {
    // Get company CIK from ticker
    const tickersResponse = await fetch(COMPANY_TICKERS_URL, {
      headers: {
        "User-Agent": "Fira SEC Analysis research@fira.app",
      },
    });

    if (!tickersResponse.ok) {
      throw new Error("Failed to fetch company tickers");
    }

    const tickersData = await tickersResponse.json();

    // Find company by ticker
    let companyInfo = null;
    let cik = null;

    for (const key in tickersData) {
      if (tickersData[key].ticker === ticker) {
        companyInfo = tickersData[key];
        cik = String(tickersData[key].cik_str).padStart(10, "0");
        break;
      }
    }

    if (!cik) {
      return NextResponse.json(
        { error: "Company not found", filings: [], stockInfo: null },
        { status: 200 }
      );
    }

    // Fetch filings from SEC EDGAR
    const filingsUrl = `https://data.sec.gov/submissions/CIK${cik}.json`;
    const filingsResponse = await fetch(filingsUrl, {
      headers: {
        "User-Agent": "Fira SEC Analysis research@fira.app",
      },
    });

    if (!filingsResponse.ok) {
      throw new Error("Failed to fetch filings");
    }

    const filingsData = await filingsResponse.json();
    const recentFilings = filingsData.filings?.recent || {};

    // Extract relevant filings (10-K, 10-Q, 8-K)
    const filings: SECFiling[] = [];
    const formTypes = ["10-K", "10-Q", "8-K"];

    if (recentFilings.form) {
      for (let i = 0; i < Math.min(recentFilings.form.length, 100); i++) {
        const form = recentFilings.form[i];
        if (formTypes.includes(form)) {
          filings.push({
            ticker: ticker,
            formType: form,
            filingDate: recentFilings.filingDate[i],
            accessionNumber: recentFilings.accessionNumber[i],
            companyName: filingsData.name || companyInfo?.title || ticker,
          });
        }
      }
    }

    // Fetch stock info (basic implementation)
    let stockInfo: StockInfo | null = null;
    try {
      stockInfo = {
        symbol: ticker,
        companyName: filingsData.name || companyInfo?.title || ticker,
      };

      // Optional: Fetch real-time price from a stock API
      // This is a placeholder - you would integrate with Polygon, Yahoo Finance, etc.
      if (process.env.POLYGON_API_KEY) {
        const stockResponse = await fetch(
          `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev?adjusted=true&apiKey=${process.env.POLYGON_API_KEY}`
        );
        if (stockResponse.ok) {
          const stockData = await stockResponse.json();
          if (stockData.results?.[0]) {
            const result = stockData.results[0];
            stockInfo.price = result.c;
            stockInfo.change = result.c - result.o;
            stockInfo.changePercent = ((result.c - result.o) / result.o) * 100;
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch stock info:", error);
    }

    return NextResponse.json({
      filings,
      stockInfo,
      companyName: filingsData.name || companyInfo?.title || ticker,
    });
  } catch (error) {
    console.error("SEC API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch SEC filings" },
      { status: 500 }
    );
  }
}
