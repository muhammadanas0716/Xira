from typing import Optional, Generator
from openai import OpenAI
from app.utils.config import Config

class LLMService:
    def __init__(self):
        self.client = None
        if Config.OPENAI_API_KEY:
            self.client = OpenAI(api_key=Config.OPENAI_API_KEY)
    
    def get_system_prompt(self) -> str:
        return """You are a financial analyst assistant specializing in analyzing SEC filings (10-Q and 10-K reports). 
Your job is to answer questions accurately based on the provided report information.
You must thoroughly search through the ENTIRE document, including all sections, tables, footnotes, and appendices.
Financial metrics like EPS, revenue, net income, and other key figures may appear in multiple places throughout the document.
If the information is not available in the provided text, clearly state that.
Be specific and cite numbers or data when available.

IMPORTANT FORMATTING REQUIREMENTS:
- Use proper paragraph structure with clear breaks between ideas
- Use bullet points (markdown format: - or *) for lists, comparisons, or multiple related items
- Use numbered lists when presenting sequential information or rankings
- Use bold text (**text**) to emphasize key metrics, numbers, or important terms
- Structure longer answers with headings (##) to organize different sections
- Break up dense information into digestible paragraphs
- Use tables when presenting structured data or comparisons"""
    
    def ingest_pdf(self, pdf_text: str) -> Optional[dict]:
        if not self.client:
            return None
        
        print(f"Preparing PDF for ingestion, length: {len(pdf_text)} characters")
        return {"pdf_text": pdf_text, "ingested": True}
    
    def ask_question(self, pdf_text: str, question: str, previous_qa: list = None) -> Optional[str]:
        if not self.client:
            return None
        
        if not pdf_text:
            return None
        
        print(f"Asking question with PDF text ({len(pdf_text)} chars) and {len(previous_qa) if previous_qa else 0} previous Q&A pairs")
        
        try:
            system_prompt = self.get_system_prompt()
            
            messages = [{"role": "system", "content": system_prompt}]
            
            if previous_qa and len(previous_qa) > 0:
                pdf_message = f"""I am providing you with a complete SEC filing (10-Q or 10-K report). This is the same document from our previous conversation.

{pdf_text}

Please use this document to answer the following question, and also consider the context from our previous conversation."""
            else:
                pdf_message = f"""I am providing you with a complete SEC filing (10-Q or 10-K report). Please use this document to answer the following question.

{pdf_text}"""
            
            messages.append({"role": "user", "content": pdf_message})
            
            if previous_qa:
                for qa in previous_qa[-5:]:
                    messages.append({"role": "user", "content": f"Question: {qa['question']}"})
                    messages.append({"role": "assistant", "content": qa['answer']})
            
            messages.append({"role": "user", "content": f"""Question: {question}

IMPORTANT: Search through the ENTIRE document thoroughly. Financial metrics and data may appear in:
- Financial statements (Income Statement, Balance Sheet, Cash Flow Statement)
- Management Discussion and Analysis (MD&A) sections
- Footnotes and notes to financial statements
- Summary sections at the beginning or end
- Tables and exhibits throughout the document

Please provide a clear, detailed answer based on the document. Format your response using markdown:
- Use proper paragraph breaks to separate different ideas
- Use bullet points (- or *) for lists, multiple items, or comparisons
- Use numbered lists (1., 2., 3.) for sequential information
- Use **bold** for key metrics, numbers, and important terms
- Use headings (##) to organize longer answers into sections
- Break up information into readable paragraphs

If you cannot find the answer in the document after thoroughly searching, say so explicitly."""})
            
            print(f"Calling OpenAI API with {len(messages)} messages...")
            response = self.client.chat.completions.create(
                model="gpt-5-nano",
                messages=messages,
                max_completion_tokens=100_000
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
    
    def ask_question_stream(self, pdf_text: str, question: str, previous_qa: list = None) -> Generator[str, None, None]:
        if not self.client:
            yield "data: " + '{"error": "OpenAI client not initialized"}\n\n'
            return
        
        if not pdf_text:
            yield "data: " + '{"error": "PDF text not available"}\n\n'
            return
        
        print(f"Streaming question with PDF text ({len(pdf_text)} chars) and {len(previous_qa) if previous_qa else 0} previous Q&A pairs")
        
        try:
            system_prompt = self.get_system_prompt()
            
            messages = [{"role": "system", "content": system_prompt}]
            
            if previous_qa and len(previous_qa) > 0:
                pdf_message = f"""I am providing you with a complete SEC filing (10-Q or 10-K report). This is the same document from our previous conversation.

{pdf_text}

Please use this document to answer the following question, and also consider the context from our previous conversation."""
            else:
                pdf_message = f"""I am providing you with a complete SEC filing (10-Q or 10-K report). Please use this document to answer the following question.

{pdf_text}"""
            
            messages.append({"role": "user", "content": pdf_message})
            
            if previous_qa:
                for qa in previous_qa[-5:]:
                    messages.append({"role": "user", "content": f"Question: {qa['question']}"})
                    messages.append({"role": "assistant", "content": qa['answer']})
            
            messages.append({"role": "user", "content": f"""Question: {question}

IMPORTANT: Search through the ENTIRE document thoroughly. Financial metrics and data may appear in:
- Financial statements (Income Statement, Balance Sheet, Cash Flow Statement)
- Management Discussion and Analysis (MD&A) sections
- Footnotes and notes to financial statements
- Summary sections at the beginning or end
- Tables and exhibits throughout the document

Please provide a clear, detailed answer based on the document. Format your response using markdown:
- Use proper paragraph breaks to separate different ideas
- Use bullet points (- or *) for lists, multiple items, or comparisons
- Use numbered lists (1., 2., 3.) for sequential information
- Use **bold** for key metrics, numbers, and important terms
- Use headings (##) to organize longer answers into sections
- Break up information into readable paragraphs

If you cannot find the answer in the document after thoroughly searching, say so explicitly."""})
            
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
            system_prompt = """You are a senior financial analyst specializing in comprehensive analysis of SEC quarterly reports (10-Q filings). Your expertise includes financial statement analysis, ratio analysis, trend identification, risk assessment, and investment recommendations.

Your task is to create a comprehensive, professional investment report analyzing the entire quarterly report document provided to you.

IMPORTANT: Write in clear, accessible language that is easy to understand. Use medium-level financial terminology - avoid overly complex jargon, but don't oversimplify. Make the report digestible for readers with basic to intermediate financial knowledge. Explain technical terms when first introduced."""
            
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
            
            prompt = f"""You are analyzing a complete 10-Q quarterly report for {ticker}. Please generate a comprehensive investment analysis report covering the entire document.

{stock_context}

**CRITICAL INSTRUCTIONS:**

1. **Thorough Analysis**: Analyze the ENTIRE document including:
   - All financial statements (Income Statement, Balance Sheet, Cash Flow Statement)
   - Management Discussion and Analysis (MD&A)
   - Risk factors and forward-looking statements
   - Footnotes and notes to financial statements
   - Comparative periods and year-over-year changes
   - Segment information if available
   - Any significant events or transactions

2. **Report Structure**: Organize your report with the following sections:

## Executive Summary
- Brief overview of the quarter's performance
- Key highlights and major developments
- Overall financial health assessment

## Financial Performance Analysis
- Revenue analysis (current quarter vs previous quarter, vs same quarter last year)
- Profitability metrics (gross margin, operating margin, net margin)
- Earnings per share (EPS) analysis
- Create tables comparing key metrics across periods
- Identify trends and patterns

## Balance Sheet Analysis
- Assets, liabilities, and equity changes
- Working capital analysis
- Debt levels and debt-to-equity ratios
- Cash and cash equivalents position
- Use tables to present comparative data

## Cash Flow Analysis
- Operating cash flow trends
- Investing activities
- Financing activities
- Free cash flow analysis
- Cash flow quality assessment

## Key Financial Ratios
Present in a comprehensive table format:
- Liquidity ratios (Current ratio, Quick ratio)
- Profitability ratios (ROE, ROA, Profit margins)
- Efficiency ratios (Asset turnover, Inventory turnover)
- Leverage ratios (Debt-to-equity, Debt-to-assets)
- Compare with previous periods

## Operational Highlights
- Key business developments
- Segment performance (if applicable)
- Market position and competitive landscape
- Strategic initiatives mentioned

## Risk Assessment
- Identify and analyze key risks mentioned in the filing
- Financial risks
- Operational risks
- Market risks
- Regulatory risks

## Outlook and Forward-Looking Statements
- Management's guidance and outlook
- Forward-looking statements analysis
- Expected trends and challenges

## Investment Recommendation

At the end of your report, provide a clear investment recommendation based on your comprehensive analysis. Choose ONE of the following:

**STRONG BUY** - If the company shows exceptional financial performance, strong growth prospects, solid fundamentals, and minimal risks.

**BUY** - If the company shows good financial performance, positive trends, reasonable valuation, and manageable risks.

**SELL** - If the company shows declining performance, concerning trends, weak fundamentals, or significant risks.

**STRONG SELL** - If the company shows severe financial distress, major red flags, unsustainable operations, or critical risks.

Provide detailed justification for your recommendation, including:
- Key factors supporting the recommendation
- Risk factors to consider
- Price targets or valuation considerations (if data supports)
- Time horizon considerations

**FORMATTING REQUIREMENTS:**
- Use markdown formatting throughout
- Use ## for main section headings, ### for subsections
- Create tables using markdown table syntax for all comparative data - ensure tables are well-formatted with clear headers
- Use bullet points (- or *) for lists and key points
- Use **bold** for important metrics, numbers, and key terms
- Use numbered lists for sequential information
- Include specific numbers, percentages, and dates from the document
- Add proper spacing between paragraphs and sections for readability
- For visualizations, describe the data that should be charted (e.g., "Revenue trend: Q1 2023: $X, Q2 2023: $Y, Q3 2023: $Z") and suggest chart types
- Ensure tables have proper spacing and are easy to read

**IMPORTANT**: 
- Base all analysis strictly on the information provided in the quarterly report
- Write in clear, easy-to-understand language - avoid overly complex financial jargon
- Use medium-level terminology that is accessible but professional
- Explain technical terms when first introduced (e.g., "EBITDA (earnings before interest, taxes, depreciation, and amortization)")
- Cite specific page numbers or sections when referencing data
- If information is missing, clearly state what is not available
- Be objective and analytical, not promotional
- Ensure your recommendation is well-supported by the data in the report
- Add clear spacing between sections and paragraphs for better readability
- Format tables with proper alignment and spacing

Now, analyze the following complete 10-Q quarterly report:

{pdf_text}

Generate the comprehensive investment analysis report following the structure and requirements above."""
            
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

