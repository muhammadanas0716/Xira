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

llm_service = LLMService()

