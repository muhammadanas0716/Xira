marked.setOptions({
  breaks: false,
  gfm: true,
  headerIds: false,
  mangle: false,
});

function preprocessLaTeX(text) {
  if (!text) return { processed: text, placeholders: [] };
  
  let blockIndex = 0;
  let processed = text;
  const placeholders = [];
  
  const isURL = (str) => {
    const trimmed = str.trim();
    return trimmed.startsWith('http') || trimmed.includes('://') || trimmed.startsWith('mailto:') || trimmed.startsWith('www.');
  };
  
  const findMatchingDelimiter = (text, startPos, openDelim, closeDelim) => {
    let depth = 1;
    let i = startPos + openDelim.length;
    while (i < text.length) {
      if (text.substring(i, i + openDelim.length) === openDelim) {
        depth++;
        i += openDelim.length;
      } else if (text.substring(i, i + closeDelim.length) === closeDelim) {
        depth--;
        if (depth === 0) {
          return i + closeDelim.length;
        }
        i += closeDelim.length;
      } else {
        i++;
      }
    }
    return -1;
  };
  
  const patterns = [
    { open: '\\[', close: '\\]' },
    { open: '\\(', close: '\\)' },
    { open: '$$', close: '$$' },
    { open: '$', close: '$' }
  ];
  
  for (const pattern of patterns) {
    let i = 0;
    while (i < processed.length) {
      const openIndex = processed.indexOf(pattern.open, i);
      if (openIndex === -1) break;
      
      if (openIndex > 0 && processed[openIndex - 1] === '\\') {
        i = openIndex + 1;
        continue;
      }
      
      const closeIndex = findMatchingDelimiter(processed, openIndex, pattern.open, pattern.close);
      if (closeIndex === -1) break;
      
      const content = processed.substring(openIndex + pattern.open.length, closeIndex - pattern.close.length);
      if (!isURL(content)) {
        const placeholder = `__LATEX_BLOCK_${blockIndex}__`;
        placeholders.push({
          placeholder,
          content: processed.substring(openIndex, closeIndex)
        });
        processed = processed.substring(0, openIndex) + placeholder + processed.substring(closeIndex);
        blockIndex++;
        i = openIndex + placeholder.length;
      } else {
        i = closeIndex;
      }
    }
  }
  
  return { processed, placeholders };
}

function renderMarkdown(text) {
  if (!text) return "";
  try {
    const { processed, placeholders } = preprocessLaTeX(text);
    let html = marked.parse(processed);
    
    placeholders.forEach(({ placeholder, content }) => {
      html = html.replace(placeholder, content);
    });
    
    return html;
  } catch (e) {
    return text.replace(/\n/g, "<br>");
  }
}

function renderMath(element) {
  if (!element) return;
  
  const attemptRender = () => {
    if (typeof renderMathInElement !== 'undefined') {
      try {
        renderMathInElement(element, {
          delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false},
            {left: '\\[', right: '\\]', display: true},
            {left: '\\(', right: '\\)', display: false}
          ],
          throwOnError: false,
          errorColor: '#cc0000',
          strict: false
        });
      } catch (e) {
        console.error('Error rendering math:', e);
      }
    } else {
      setTimeout(attemptRender, 100);
    }
  };
  
  attemptRender();
}

