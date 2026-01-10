from typing import Optional, List, Dict, Generator
from openai import OpenAI
from app.utils.config import Config
from app.services.vector_service import QueryResult


class LLMService:
    def __init__(self):
        self.client = None
        if Config.OPENAI_API_KEY:
            self.client = OpenAI(api_key=Config.OPENAI_API_KEY)

    def is_available(self) -> bool:
        return self.client is not None

    def _get_rag_system_prompt(self) -> str:
        return """You are a financial analyst assistant specializing in SEC filings analysis. You answer questions based on the provided context from SEC filings.

RESPONSE STYLE:
- Keep answers concise and to the point unless detailed analysis is requested
- Use clear, simple language
- Cite specific numbers when available
- If information isn't in the provided context, say so clearly

ACCURACY:
- Only use information from the provided context
- Don't make up or infer data not present in the context
- If the context doesn't contain enough information, acknowledge it

FORMATTING:
- Use headings (##) for longer answers with multiple topics
- Use tables for comparisons and financial metrics
- Use bullet points for lists
- Use **bold** for key numbers
- Use <span style="color: green">green</span> sparingly for positive trends
- Use <span style="color: red">red</span> sparingly for concerns"""

    def _format_chunks_as_context(self, chunks: List[QueryResult]) -> str:
        """Format retrieved chunks as context for the LLM"""
        if not chunks:
            return "No relevant context found."

        context_parts = []
        for i, chunk in enumerate(chunks, 1):
            section = chunk.metadata.get('section', 'Unknown Section')
            context_parts.append(f"[Source {i} - {section}]\n{chunk.text}")

        return "\n\n---\n\n".join(context_parts)

    def _format_conversation_history(self, history: List[Dict], max_pairs: int = 5) -> List[Dict]:
        """Format conversation history for the LLM"""
        messages = []
        recent_history = history[-max_pairs:] if len(history) > max_pairs else history

        for qa in recent_history:
            messages.append({"role": "user", "content": qa['question']})
            messages.append({"role": "assistant", "content": qa['answer']})

        return messages

    def ask_question_rag(
        self,
        query: str,
        retrieved_chunks: List[QueryResult],
        conversation_history: List[Dict] = None,
        filing_metadata: Dict = None
    ) -> Optional[str]:
        """Answer a question using RAG context"""
        if not self.client:
            return None

        context = self._format_chunks_as_context(retrieved_chunks)

        filing_info = ""
        if filing_metadata:
            filing_info = f"""
Filing Information:
- Ticker: {filing_metadata.get('ticker', 'N/A')}
- Form: {filing_metadata.get('form_type', '10-Q')}
- Period: {filing_metadata.get('fiscal_period', 'N/A')}
- Filing Date: {filing_metadata.get('filing_date', 'N/A')}
"""

        messages = [{"role": "system", "content": self._get_rag_system_prompt()}]

        messages.append({
            "role": "user",
            "content": f"""Context from SEC Filing:
{filing_info}
{context}"""
        })

        if conversation_history:
            messages.extend(self._format_conversation_history(conversation_history))

        messages.append({
            "role": "user",
            "content": f"""Question: {query}

Answer based on the provided context. If the information isn't available in the context, say so."""
        })

        try:
            print(f"RAG query with {len(retrieved_chunks)} chunks, {len(messages)} messages")

            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                max_tokens=4000
            )

            answer = response.choices[0].message.content
            print(f"RAG response: {len(answer)} characters")
            return answer

        except Exception as e:
            print(f"Error in RAG query: {e}")
            import traceback
            traceback.print_exc()
            return None

    def ask_question_rag_stream(
        self,
        query: str,
        retrieved_chunks: List[QueryResult],
        conversation_history: List[Dict] = None,
        filing_metadata: Dict = None
    ) -> Generator[str, None, None]:
        """Stream answer using RAG context"""
        if not self.client:
            yield 'data: {"error": "OpenAI client not initialized"}\n\n'
            return

        context = self._format_chunks_as_context(retrieved_chunks)

        filing_info = ""
        if filing_metadata:
            filing_info = f"""
Filing Information:
- Ticker: {filing_metadata.get('ticker', 'N/A')}
- Form: {filing_metadata.get('form_type', '10-Q')}
- Period: {filing_metadata.get('fiscal_period', 'N/A')}
"""

        messages = [{"role": "system", "content": self._get_rag_system_prompt()}]

        messages.append({
            "role": "user",
            "content": f"""Context from SEC Filing:
{filing_info}
{context}"""
        })

        if conversation_history:
            messages.extend(self._format_conversation_history(conversation_history))

        messages.append({
            "role": "user",
            "content": f"Question: {query}"
        })

        try:
            stream = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                max_tokens=4000,
                stream=True
            )

            for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                    content = chunk.choices[0].delta.content
                    yield f"data: {content}\n\n"

            yield "data: [DONE]\n\n"

        except Exception as e:
            print(f"Error streaming RAG response: {e}")
            yield f'data: {{"error": "{str(e)}"}}\n\n'

    def generate_report_rag(
        self,
        filing_metadata: Dict,
        section_contexts: Dict[str, List[QueryResult]],
        stock_info: Dict = None
    ) -> Optional[str]:
        """Generate comprehensive report using multiple section contexts"""
        if not self.client:
            return None

        stock_context = ""
        if stock_info:
            market_cap = stock_info.get('marketCap')
            market_cap_str = f"${market_cap:,.0f}" if market_cap else 'N/A'
            stock_context = f"""
Current Market Information:
- Company: {stock_info.get('name', 'N/A')}
- Ticker: {filing_metadata.get('ticker', 'N/A')}
- Current Price: ${stock_info.get('currentPrice', 'N/A')}
- P/E Ratio: {stock_info.get('peRatio', 'N/A')}
- Market Cap: {market_cap_str}
- Sector: {stock_info.get('sector', 'N/A')}
"""

        all_context = []
        for section_name, chunks in section_contexts.items():
            if chunks:
                section_text = self._format_chunks_as_context(chunks)
                all_context.append(f"## {section_name}\n{section_text}")

        combined_context = "\n\n".join(all_context)

        system_prompt = """You are a financial analyst creating investment reports from SEC quarterly filings.
Write in clear, simple language. Explain technical terms. Make the report accessible to readers with basic financial knowledge."""

        prompt = f"""Analyze the 10-Q filing for {filing_metadata.get('ticker', 'Unknown')} ({filing_metadata.get('fiscal_period', '')}) and create a comprehensive investment report.

{stock_context}

**SEC Filing Context:**
{combined_context}

**REPORT STRUCTURE:**

## Executive Summary
- Quarter performance overview and key highlights

## Financial Performance
- Revenue, profitability, margins, EPS with comparisons

## Balance Sheet
- Assets, liabilities, working capital, debt, cash position

## Cash Flow
- Operating, investing, financing activities

## Key Financial Ratios
- Liquidity, profitability, leverage ratios

## Risk Assessment
- Key risks from the filing

## Outlook
- Management guidance and forward-looking statements

## Investment Recommendation
Choose ONE: **STRONG BUY**, **BUY**, **SELL**, or **STRONG SELL**
Justify with supporting factors.

**FORMATTING:**
- Use markdown headings, bullet points, tables where helpful
- Bold key numbers
- Use colors sparingly for trends"""

        try:
            print(f"Generating RAG report for {filing_metadata.get('ticker')}")

            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=8000
            )

            report = response.choices[0].message.content
            print(f"Report generated: {len(report)} characters")
            return report

        except Exception as e:
            print(f"Error generating report: {e}")
            import traceback
            traceback.print_exc()
            return None


llm_service = LLMService()
