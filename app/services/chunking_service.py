from typing import List, Dict, Optional
from dataclasses import dataclass
import re
import uuid
import tiktoken
from app.utils.config import Config
from app.services.vector_service import ChunkData


@dataclass
class Section:
    """Represents a section in an SEC filing"""
    title: str
    content: str
    start_pos: int
    end_pos: int


class ChunkingService:
    """Intelligent PDF chunking that respects section boundaries"""

    SECTION_PATTERNS = [
        (r'PART\s+I\b', 'PART I'),
        (r'PART\s+II\b', 'PART II'),
        (r'Item\s+1\.\s*Financial\s+Statements', 'Item 1 - Financial Statements'),
        (r'Item\s+1A\.\s*Risk\s+Factors', 'Item 1A - Risk Factors'),
        (r'Item\s+2\.\s*Management\'s\s+Discussion', 'Item 2 - MD&A'),
        (r'Item\s+3\.\s*Quantitative', 'Item 3 - Quantitative Disclosures'),
        (r'Item\s+4\.\s*Controls', 'Item 4 - Controls'),
        (r'Item\s+5\.\s*Other\s+Information', 'Item 5 - Other Information'),
        (r'Item\s+6\.\s*Exhibits', 'Item 6 - Exhibits'),
        (r'NOTES\s+TO\s+(CONDENSED\s+)?CONSOLIDATED\s+FINANCIAL\s+STATEMENTS', 'Notes to Financial Statements'),
        (r'CONSOLIDATED\s+BALANCE\s+SHEETS?', 'Balance Sheet'),
        (r'CONSOLIDATED\s+STATEMENTS?\s+OF\s+OPERATIONS?', 'Income Statement'),
        (r'CONSOLIDATED\s+STATEMENTS?\s+OF\s+CASH\s+FLOWS?', 'Cash Flow Statement'),
        (r'CONSOLIDATED\s+STATEMENTS?\s+OF\s+COMPREHENSIVE', 'Comprehensive Income'),
        (r'CONSOLIDATED\s+STATEMENTS?\s+OF\s+(STOCKHOLDERS\'?|SHAREHOLDERS\'?)\s+EQUITY', 'Equity Statement'),
    ]

    def __init__(self):
        self.chunk_size = Config.CHUNK_SIZE
        self.chunk_overlap = Config.CHUNK_OVERLAP
        try:
            self.tokenizer = tiktoken.encoding_for_model("gpt-4")
        except Exception:
            self.tokenizer = tiktoken.get_encoding("cl100k_base")

    def count_tokens(self, text: str) -> int:
        """Count tokens in text"""
        return len(self.tokenizer.encode(text))

    def identify_sections(self, text: str) -> List[Section]:
        """Identify SEC filing sections using patterns"""
        sections = []
        text_upper = text.upper()

        matches = []
        for pattern, title in self.SECTION_PATTERNS:
            for match in re.finditer(pattern, text_upper, re.IGNORECASE):
                matches.append((match.start(), title))

        matches.sort(key=lambda x: x[0])

        for i, (start_pos, title) in enumerate(matches):
            if i < len(matches) - 1:
                end_pos = matches[i + 1][0]
            else:
                end_pos = len(text)

            content = text[start_pos:end_pos].strip()
            if len(content) > 100:
                sections.append(Section(
                    title=title,
                    content=content,
                    start_pos=start_pos,
                    end_pos=end_pos
                ))

        if not sections:
            sections.append(Section(
                title="Document",
                content=text,
                start_pos=0,
                end_pos=len(text)
            ))

        return sections

    def split_into_sentences(self, text: str) -> List[str]:
        """Split text into sentences"""
        sentence_endings = re.compile(r'(?<=[.!?])\s+(?=[A-Z])')
        sentences = sentence_endings.split(text)
        return [s.strip() for s in sentences if s.strip()]

    def chunk_section(self, section: Section, filing_metadata: Dict) -> List[ChunkData]:
        """Chunk a section while respecting sentence boundaries"""
        chunks = []
        sentences = self.split_into_sentences(section.content)

        if not sentences:
            return chunks

        current_chunk = []
        current_tokens = 0

        for sentence in sentences:
            sentence_tokens = self.count_tokens(sentence)

            if sentence_tokens > self.chunk_size:
                if current_chunk:
                    chunk_text = ' '.join(current_chunk)
                    chunks.append(self._create_chunk(chunk_text, section.title, filing_metadata, len(chunks)))
                    current_chunk = []
                    current_tokens = 0

                words = sentence.split()
                temp_chunk = []
                temp_tokens = 0

                for word in words:
                    word_tokens = self.count_tokens(word + ' ')
                    if temp_tokens + word_tokens > self.chunk_size:
                        if temp_chunk:
                            chunk_text = ' '.join(temp_chunk)
                            chunks.append(self._create_chunk(chunk_text, section.title, filing_metadata, len(chunks)))
                        temp_chunk = [word]
                        temp_tokens = word_tokens
                    else:
                        temp_chunk.append(word)
                        temp_tokens += word_tokens

                if temp_chunk:
                    current_chunk = temp_chunk
                    current_tokens = temp_tokens
                continue

            if current_tokens + sentence_tokens > self.chunk_size:
                if current_chunk:
                    chunk_text = ' '.join(current_chunk)
                    chunks.append(self._create_chunk(chunk_text, section.title, filing_metadata, len(chunks)))

                    overlap_sentences = []
                    overlap_tokens = 0
                    for s in reversed(current_chunk):
                        s_tokens = self.count_tokens(s)
                        if overlap_tokens + s_tokens <= self.chunk_overlap:
                            overlap_sentences.insert(0, s)
                            overlap_tokens += s_tokens
                        else:
                            break

                    current_chunk = overlap_sentences + [sentence]
                    current_tokens = overlap_tokens + sentence_tokens
                else:
                    current_chunk = [sentence]
                    current_tokens = sentence_tokens
            else:
                current_chunk.append(sentence)
                current_tokens += sentence_tokens

        if current_chunk:
            chunk_text = ' '.join(current_chunk)
            chunks.append(self._create_chunk(chunk_text, section.title, filing_metadata, len(chunks)))

        return chunks

    def _create_chunk(self, text: str, section_title: str, filing_metadata: Dict, index: int) -> ChunkData:
        """Create a ChunkData object with metadata"""
        chunk_id = f"{filing_metadata.get('accession_number', 'unknown')}_{section_title.replace(' ', '_')}_{index}"
        chunk_id = re.sub(r'[^a-zA-Z0-9_-]', '', chunk_id)

        metadata = {
            'ticker': filing_metadata.get('ticker', ''),
            'form_type': filing_metadata.get('form_type', '10-Q'),
            'fiscal_year': filing_metadata.get('fiscal_year', 0),
            'fiscal_quarter': filing_metadata.get('fiscal_quarter', 0),
            'filing_date': filing_metadata.get('filing_date', ''),
            'accession_number': filing_metadata.get('accession_number', ''),
            'section': section_title,
            'chunk_index': index
        }

        return ChunkData(
            id=chunk_id,
            text=text,
            metadata=metadata
        )

    def chunk_document(self, text: str, filing_metadata: Dict) -> List[ChunkData]:
        """
        Chunk a document intelligently:
        1. Identify section boundaries
        2. Split within sections respecting sentence boundaries
        3. Add overlap for context continuity
        4. Attach metadata to each chunk
        """
        if not text or not text.strip():
            return []

        text = self._clean_text(text)

        sections = self.identify_sections(text)
        print(f"Identified {len(sections)} sections in document")

        all_chunks = []
        for section in sections:
            section_chunks = self.chunk_section(section, filing_metadata)
            all_chunks.extend(section_chunks)
            print(f"  - {section.title}: {len(section_chunks)} chunks")

        print(f"Total chunks created: {len(all_chunks)}")
        return all_chunks

    def _clean_text(self, text: str) -> str:
        """Clean and normalize text"""
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'(\n\s*){3,}', '\n\n', text)
        text = text.strip()
        return text


chunking_service = ChunkingService()
