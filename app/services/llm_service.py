from typing import Optional, Generator
from openai import OpenAI
from app.utils.config import Config

class LLMService:
    _system_prompt_cache = None
    
    def __init__(self):
        self.client = None
        if Config.OPENAI_API_KEY:
            self.client = OpenAI(api_key=Config.OPENAI_API_KEY)
    
    def get_system_prompt(self) -> str:
        if LLMService._system_prompt_cache is None:
            LLMService._system_prompt_cache = """You are a financial analyst assistant. You analyze SEC filings (10-Q and 10-K reports) and answer questions clearly and concisely.

RESPONSE STYLE:
- Keep answers short and to the point unless the user asks for detailed analysis
- Use simple, clear language that's easy to understand
- Avoid unnecessary explanations or filler words
- Only expand on details if specifically requested

ACCURACY:
- Search the entire document thoroughly (all sections, tables, footnotes)
- Financial data may appear in multiple places - check everywhere
- If information isn't found, say so clearly
- Always cite specific numbers when available
- Don't hesitate to use values present in the file to perform calculations as needed (e.g., if total revenue is given for a quarter, calculate monthly averages; convert quarterly to annualized, derive per-share metrics from totals)

FORMATTING:
- Use headings (##) wisely to organize longer answers with multiple topics - don't overuse them for short responses
- Use tables when they add clarity: comparisons, financial metrics across periods, ratios, structured data with multiple values
- Use bullet points (-) for simple lists or when tables aren't needed
- Use **bold** for key numbers and metrics
- Use <span style="color: green">green text</span> sparingly to highlight positive trends, improvements, or strengths
- Use <span style="color: red">red text</span> sparingly to highlight concerns, declines, or weaknesses
- Only use colors for emphasis on 1-3 key points per response - don't overuse colors
- Choose the format that best presents the information - tables for comparisons, headings for organization, bullets for lists
- Keep paragraphs short and readable
- For mathematical equations and formulas, use LaTeX notation with proper delimiters: use \\[ and \\] for display math (block equations) and \\( and \\) for inline math. Ensure LaTeX syntax is correct and properly formatted."""
        return LLMService._system_prompt_cache
    
    def ingest_pdf(self, pdf_text: str) -> Optional[dict]:
        if not self.client:
            return None
        
        print(f"Preparing PDF for ingestion, length: {len(pdf_text)} characters")
        return {"pdf_text": pdf_text, "ingested": True}
    
    def ask_question(self, pdf_text: str, question: str, previous_qa: list = None, cached_pdf_message: str = None) -> Optional[str]:
        if not self.client:
            return None
        
        if not pdf_text and not cached_pdf_message:
            return None
        
        print(f"Asking question with PDF text ({len(pdf_text) if pdf_text else 0} chars) and {len(previous_qa) if previous_qa else 0} previous Q&A pairs")
        
        try:
            system_prompt = self.get_system_prompt()
            
            messages = [{"role": "system", "content": system_prompt}]
            
            if cached_pdf_message:
                pdf_message = cached_pdf_message
            elif previous_qa and len(previous_qa) > 0:
                pdf_message = f"""SEC filing document (same as previous conversation):

{pdf_text}"""
            else:
                pdf_message = f"""SEC filing document:

{pdf_text}"""
            
            messages.append({"role": "user", "content": pdf_message})
            
            if previous_qa:
                for qa in previous_qa[-5:]:
                    messages.append({"role": "user", "content": f"Question: {qa['question']}"})
                    messages.append({"role": "assistant", "content": qa['answer']})
            
            messages.append({"role": "user", "content": f"""Question: {question}

Answer concisely and clearly. Search the entire document (financial statements, MD&A, footnotes, tables).

Format:
- Use headings (##) to organize longer answers with multiple topics
- Use tables when helpful: comparisons, financial metrics across periods, ratios, structured data
- Use bullet points (-) for simple lists or when tables aren't needed
- Use **bold** for key numbers
- Use <span style="color: green">green text</span> sparingly (1-3 times max) to highlight positive trends or strengths
- Use <span style="color: red">red text</span> sparingly (1-3 times max) to highlight concerns or weaknesses
- Choose the best format for each piece of information
- Keep it short unless detailed analysis is needed
- For mathematical equations and formulas, use LaTeX notation with proper delimiters: use \\[ and \\] for display math (block equations) and \\( and \\) for inline math. Ensure LaTeX syntax is correct and properly formatted.

If the answer isn't in the document, say so directly."""})
            
            print(f"Calling OpenAI API with {len(messages)} messages...")
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                max_tokens=4000
            )
            
            answer = response.choices[0].message.content
            print(f"LLM response received, length: {len(answer)} characters")
            print(f"Answer preview: {answer[:200]}")
            
            return answer
        except Exception as e:
            print(f"Error calling OpenAI: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def ask_question_stream(self, pdf_text: str, question: str, previous_qa: list = None, cached_pdf_message: str = None) -> Generator[str, None, None]:
        if not self.client:
            yield "data: " + '{"error": "OpenAI client not initialized"}\n\n'
            return
        
        if not pdf_text and not cached_pdf_message:
            yield "data: " + '{"error": "PDF text not available"}\n\n'
            return
        
        print(f"Streaming question with PDF text ({len(pdf_text) if pdf_text else 0} chars) and {len(previous_qa) if previous_qa else 0} previous Q&A pairs")
        
        try:
            system_prompt = self.get_system_prompt()
            
            messages = [{"role": "system", "content": system_prompt}]
            
            if cached_pdf_message:
                pdf_message = cached_pdf_message
            elif previous_qa and len(previous_qa) > 0:
                pdf_message = f"""SEC filing document (same as previous conversation):

{pdf_text}"""
            else:
                pdf_message = f"""SEC filing document:

{pdf_text}"""
            
            messages.append({"role": "user", "content": pdf_message})
            
            if previous_qa:
                for qa in previous_qa[-5:]:
                    messages.append({"role": "user", "content": f"Question: {qa['question']}"})
                    messages.append({"role": "assistant", "content": qa['answer']})
            
            messages.append({"role": "user", "content": f"""Question: {question}

Answer concisely and clearly. Search the entire document (financial statements, MD&A, footnotes, tables).

Format:
- Use headings (##) to organize longer answers with multiple topics
- Use tables when helpful: comparisons, financial metrics across periods, ratios, structured data
- Use bullet points (-) for simple lists or when tables aren't needed
- Use **bold** for key numbers
- Use <span style="color: green">green text</span> sparingly (1-3 times max) to highlight positive trends or strengths
- Use <span style="color: red">red text</span> sparingly (1-3 times max) to highlight concerns or weaknesses
- Choose the best format for each piece of information
- Keep it short unless detailed analysis is needed
- For mathematical equations and formulas, use LaTeX notation with proper delimiters: use \\[ and \\] for display math (block equations) and \\( and \\) for inline math. Ensure LaTeX syntax is correct and properly formatted.

If the answer isn't in the document, say so directly."""})
            
            print(f"Calling OpenAI API with streaming, {len(messages)} messages...")
            stream = self.client.chat.completions.create(
                model="gpt-5-nano",
                messages=messages,
                max_completion_tokens=100_000,
                stream=True
            )
            
            full_answer = ""
            for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                    content = chunk.choices[0].delta.content
                    full_answer += content
                    yield f"data: {content}\n\n"
            
            print(f"Streaming complete, total length: {len(full_answer)} characters")
            yield "data: [DONE]\n\n"
            
        except Exception as e:
            print(f"Error streaming from OpenAI: {e}")
            import traceback
            traceback.print_exc()
            yield f"data: " + '{"error": "' + str(e) + '"}\n\n'
    
    def generate_report(self, pdf_text: str, ticker: str, stock_info: dict = None) -> Optional[str]:
        if not self.client:
            return None
        
        if not pdf_text:
            return None
        
        print(f"Generating comprehensive report for {ticker}, PDF text length: {len(pdf_text)} characters")
        
        try:
            system_prompt = """You are a financial analyst creating investment reports from SEC quarterly filings (10-Q reports).

Write in clear, simple language that's easy to understand. Avoid complex jargon. Explain technical terms when you first use them. Make the report accessible to readers with basic financial knowledge."""
            
            stock_context = ""
            if stock_info:
                market_cap = stock_info.get('marketCap')
                market_cap_str = f"${market_cap:,.0f}" if market_cap else 'N/A'
                stock_context = f"""
Company Information:
- Company Name: {stock_info.get('name', 'N/A')}
- Ticker: {ticker}
- Current Price: ${stock_info.get('currentPrice', 'N/A')}
- P/E Ratio: {stock_info.get('peRatio', 'N/A')}
- Market Cap: {market_cap_str}
- Sector: {stock_info.get('sector', 'N/A')}
"""
            
            prompt = f"""Analyze the complete 10-Q quarterly report for {ticker} and create a comprehensive investment report.

{stock_context}

**ANALYSIS REQUIREMENTS:**
Review the entire document: financial statements, MD&A, footnotes, risk factors, and all sections.
- Don't hesitate to use values present in the file to perform calculations as needed (e.g., if total revenue is given for a quarter, calculate monthly averages; convert quarterly to annualized, derive per-share metrics from totals, calculate ratios from provided figures)

**REPORT STRUCTURE:**

## Executive Summary
- Quarter performance overview
- Key highlights
- Overall financial health

## Financial Performance
- Revenue (current vs previous quarter, vs same quarter last year)
- Profitability (gross margin, operating margin, net margin)
- Earnings per share (EPS)
- Use tables when comparing metrics across multiple periods
- Identify trends

## Balance Sheet
- Changes in assets, liabilities, equity
- Working capital
- Debt levels and ratios
- Cash position
- Use tables when comparing across periods or presenting structured data

## Cash Flow
- Operating cash flow trends
- Investing and financing activities
- Free cash flow
- Cash flow quality
- Use tables when comparing across periods

## Key Financial Ratios
- Liquidity ratios (Current ratio, Quick ratio)
- Profitability ratios (ROE, ROA, margins)
- Efficiency ratios (Asset turnover, Inventory turnover)
- Leverage ratios (Debt-to-equity, Debt-to-assets)
- Present in tables when comparing across periods

## Operational Highlights
- Key business developments
- Segment performance (if available) - use tables if multiple segments with data
- Strategic initiatives

## Risk Assessment
- Financial, operational, market, and regulatory risks from the filing

## Outlook
- Management guidance
- Forward-looking statements
- Expected trends and challenges

## Investment Recommendation
Choose ONE: **STRONG BUY**, **BUY**, **SELL**, or **STRONG SELL**

Justify with:
- Key supporting factors
- Risk considerations
- Valuation notes (if data supports)
- Time horizon

**FORMATTING:**
- Use markdown (## headings, bullet points, **bold** for numbers)
- Use headings (##) to organize sections - don't overuse them
- Use tables when they add clarity: comparisons across periods, financial metrics, ratios, structured data with multiple values
- Use bullet points for simple lists or when tables aren't needed
- Use <span style="color: green">green text</span> sparingly (2-5 times max) to highlight positive trends, improvements, or strengths
- Use <span style="color: red">red text</span> sparingly (2-5 times max) to highlight concerns, declines, or weaknesses
- Choose the best format for each piece of information
- Include specific numbers and dates
- Keep language clear and simple
- Explain technical terms when first used
- If data is missing, state it clearly
- For mathematical equations and formulas, use LaTeX notation with proper delimiters: use \\[ and \\] for display math (block equations) and \\( and \\) for inline math. Ensure LaTeX syntax is correct and properly formatted

**DOCUMENT:**
{pdf_text}

Generate the report following this structure."""
            
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ]
            
            print(f"Calling OpenAI API for report generation with {len(messages)} messages...")
            response = self.client.chat.completions.create(
                model="gpt-5-nano",
                messages=messages,
                max_completion_tokens=100_000
            )
            
            report = response.choices[0].message.content
            print(f"Report generated successfully, length: {len(report)} characters")
            print(f"Report preview: {report[:300]}")
            
            return report
        except Exception as e:
            print(f"Error generating report: {e}")
            import traceback
            traceback.print_exc()
            return None

llm_service = LLMService()

