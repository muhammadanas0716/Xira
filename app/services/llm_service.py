from typing import Optional
from openai import OpenAI
from app.utils.config import Config

class LLMService:
    def __init__(self):
        self.client = None
        if Config.OPENAI_API_KEY:
            self.client = OpenAI(api_key=Config.OPENAI_API_KEY)
    
    def ingest_pdf(self, pdf_text: str) -> Optional[list]:
        if not self.client:
            return None
        
        print(f"Ingesting PDF text into LLM memory, length: {len(pdf_text)} characters")
        
        try:
            system_prompt = """You are a financial analyst assistant specializing in analyzing SEC filings (10-Q and 10-K reports). 
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
            
            user_prompt = f"""I am providing you with a complete SEC filing (10-Q or 10-K report). Please read and remember this entire document so you can answer questions about it later.

{pdf_text}

Please acknowledge that you have read and understood this document. You will now be able to answer questions about this filing."""
            
            print("Calling OpenAI API to ingest PDF...")
            response = self.client.chat.completions.create(
                model="gpt-5-nano",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_completion_tokens=100_000
            )
            
            conversation_messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
                {"role": "assistant", "content": response.choices[0].message.content}
            ]
            
            print(f"PDF ingested successfully. Response length: {len(response.choices[0].message.content)} characters")
            return conversation_messages
        except Exception as e:
            print(f"Error ingesting PDF: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def ask_question(self, conversation_messages: list, question: str) -> Optional[str]:
        if not self.client:
            return None
        
        if not conversation_messages:
            return None
        
        print(f"Asking question with conversation history ({len(conversation_messages)} messages)")
        
        try:
            messages = conversation_messages.copy()
            messages.append({"role": "user", "content": f"""Question: {question}

IMPORTANT: Search through the ENTIRE document thoroughly. Financial metrics and data may appear in:
- Financial statements (Income Statement, Balance Sheet, Cash Flow Statement)
- Management Discussion and Analysis (MD&A) sections
- Footnotes and notes to financial statements
- Summary sections at the beginning or end
- Tables and exhibits throughout the document

Please provide a clear, detailed answer based on the document you have in memory. Format your response using markdown:
- Use proper paragraph breaks to separate different ideas
- Use bullet points (- or *) for lists, multiple items, or comparisons
- Use numbered lists (1., 2., 3.) for sequential information
- Use **bold** for key metrics, numbers, and important terms
- Use headings (##) to organize longer answers into sections
- Break up information into readable paragraphs

If you cannot find the answer in the document after thoroughly searching, say so explicitly."""})
            
            print("Calling OpenAI API...")
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

llm_service = LLMService()

