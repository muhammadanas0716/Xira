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

FORMATTING:
- Use headings (##) wisely to organize longer answers with multiple topics - don't overuse them for short responses
- Use tables when they add clarity: comparisons, financial metrics across periods, ratios, structured data with multiple values
- Use bullet points (-) for simple lists or when tables aren't needed
- Use **bold** for key numbers and metrics
- Choose the format that best presents the information - tables for comparisons, headings for organization, bullets for lists
- Keep paragraphs short and readable"""
        return LLMService._system_prompt_cache
    
    def upload_pdf_file(self, file_path: str) -> Optional[str]:
        if not self.client:
            return None
        
        try:
            print(f"Uploading PDF file: {file_path}")
            with open(file_path, 'rb') as f:
                file = self.client.files.create(
                    file=f,
                    purpose='assistants'
                )
            print(f"File uploaded successfully, file_id: {file.id}")
            return file.id
        except Exception as e:
            print(f"Error uploading file: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def create_assistant(self, file_id: str, ticker: str) -> Optional[str]:
        if not self.client:
            return None
        
        try:
            system_prompt = self.get_system_prompt()
            print(f"Creating assistant for {ticker} with file_id: {file_id}")
            
            vector_store = self.client.beta.vector_stores.create(
                name=f"SEC Filing - {ticker}",
                file_ids=[file_id]
            )
            print(f"Vector store created, vector_store_id: {vector_store.id}")
            
            assistant = self.client.beta.assistants.create(
                name=f"Financial Analyst - {ticker}",
                instructions=system_prompt,
                model="gpt-4o-mini",
                tools=[{"type": "file_search"}],
                tool_resources={
                    "file_search": {
                        "vector_store_ids": [vector_store.id]
                    }
                }
            )
            print(f"Assistant created successfully, assistant_id: {assistant.id}")
            
            return assistant.id
        except Exception as e:
            print(f"Error creating assistant: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def create_thread(self) -> Optional[str]:
        if not self.client:
            return None
        
        try:
            print("Creating thread...")
            thread = self.client.beta.threads.create()
            print(f"Thread created successfully, thread_id: {thread.id}")
            return thread.id
        except Exception as e:
            print(f"Error creating thread: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def ingest_pdf(self, pdf_text: str) -> Optional[dict]:
        if not self.client:
            return None
        
        print(f"Preparing PDF for ingestion, length: {len(pdf_text)} characters")
        return {"pdf_text": pdf_text, "ingested": True}
    
    def ask_question_with_assistant(self, thread_id: str, assistant_id: str, question: str) -> Optional[str]:
        if not self.client:
            return None
        
        if not thread_id or not assistant_id:
            return None
        
        try:
            formatted_question = f"""Question: {question}

Answer concisely and clearly. Search the entire document (financial statements, MD&A, footnotes, tables).

Format:
- Use headings (##) to organize longer answers with multiple topics
- Use tables when helpful: comparisons, financial metrics across periods, ratios, structured data
- Use bullet points (-) for simple lists or when tables aren't needed
- Use **bold** for key numbers
- Choose the best format for each piece of information
- Keep it short unless detailed analysis is needed

If the answer isn't in the document, say so directly."""
            
            print(f"Adding message to thread {thread_id}...")
            self.client.beta.threads.messages.create(
                thread_id=thread_id,
                role="user",
                content=formatted_question
            )
            
            print(f"Running assistant {assistant_id} on thread {thread_id}...")
            run = self.client.beta.threads.runs.create(
                thread_id=thread_id,
                assistant_id=assistant_id
            )
            
            print(f"Run created: {run.id}, status: {run.status}")
            
            while run.status in ['queued', 'in_progress', 'cancelling']:
                import time
                time.sleep(0.5)
                run = self.client.beta.threads.runs.retrieve(
                    thread_id=thread_id,
                    run_id=run.id
                )
                print(f"Run status: {run.status}")
            
            if run.status == 'completed':
                messages = self.client.beta.threads.messages.list(
                    thread_id=thread_id,
                    limit=1
                )
                
                if messages.data:
                    message = messages.data[0]
                    if message.content[0].type == 'text':
                        answer = message.content[0].text.value
                        print(f"Answer received, length: {len(answer)} characters")
                        return answer
                
                print("No text content found in response")
                return None
            else:
                print(f"Run failed with status: {run.status}")
                if run.last_error:
                    print(f"Error: {run.last_error}")
                return None
                
        except Exception as e:
            print(f"Error asking question with assistant: {e}")
            import traceback
            traceback.print_exc()
            return None
    
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
- Choose the best format for each piece of information
- Keep it short unless detailed analysis is needed

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
- Choose the best format for each piece of information
- Keep it short unless detailed analysis is needed

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
- Choose the best format for each piece of information
- Include specific numbers and dates
- Keep language clear and simple
- Explain technical terms when first used
- If data is missing, state it clearly

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

