marked.setOptions({
  breaks: false,
  gfm: true,
  headerIds: false,
  mangle: false,
});

function preprocessLaTeX(text) {
  if (!text) return text;
  
  let processed = text;
  
  const isMathLike = (str) => {
    const trimmed = str.trim();
    if (!trimmed) return false;
    
    if (trimmed.includes('\\')) return true;
    if (trimmed.includes('=') && (trimmed.includes('\\') || /[a-zA-Z]/.test(trimmed))) return true;
    if (/[∫∑∏√∞±×÷≤≥≠≈]/.test(trimmed)) return true;
    if (/[a-zA-Z]\s*[=+\-*/^]|[=+\-*/^]\s*[a-zA-Z]/.test(trimmed)) return true;
    if (/\d+\s*[+\-*/^]|[+\-*/^]\s*\d+/.test(trimmed)) return true;
    
    return false;
  };
  
  const isURL = (str) => {
    const trimmed = str.trim();
    return trimmed.startsWith('http') || trimmed.includes('://') || trimmed.startsWith('mailto:') || trimmed.startsWith('www.');
  };
  
  const findMatchingParen = (text, startPos) => {
    let depth = 1;
    for (let i = startPos + 1; i < text.length; i++) {
      if (text[i] === '(') depth++;
      if (text[i] === ')') {
        depth--;
        if (depth === 0) return i;
      }
    }
    return -1;
  };
  
  const findMatchingBracket = (text, startPos) => {
    let depth = 1;
    for (let i = startPos + 1; i < text.length; i++) {
      if (text[i] === '[') depth++;
      if (text[i] === ']') {
        depth--;
        if (depth === 0) return i;
      }
    }
    return -1;
  };
  
  let i = 0;
  while (i < processed.length) {
    if (processed[i] === '(' && (i === 0 || processed[i-1] !== '\\')) {
      const endPos = findMatchingParen(processed, i);
      if (endPos > i) {
        const content = processed.substring(i + 1, endPos);
        if (isMathLike(content) && !isURL(content)) {
          processed = processed.substring(0, i) + `\\(${content.trim()}\\)` + processed.substring(endPos + 1);
          i += content.trim().length + 4;
          continue;
        }
      }
    }
    if (processed[i] === '[' && (i === 0 || processed[i-1] !== '\\')) {
      const endPos = findMatchingBracket(processed, i);
      if (endPos > i) {
        const content = processed.substring(i + 1, endPos);
        if (isMathLike(content) && !isURL(content)) {
          processed = processed.substring(0, i) + `\\[${content.trim()}\\]` + processed.substring(endPos + 1);
          i += content.trim().length + 4;
          continue;
        }
      }
    }
    i++;
  }
  
  return processed;
}

function renderMarkdown(text) {
  if (!text) return "";
  try {
    const processedText = preprocessLaTeX(text);
    const html = marked.parse(processedText);
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
        let html = element.innerHTML;
        
        const isMathLike = (str) => {
          const trimmed = str.trim();
          if (!trimmed) return false;
          
          if (trimmed.includes('\\')) return true;
          if (/[a-zA-Z]\s*[=+\-*/^]|[=+\-*/^]\s*[a-zA-Z]/.test(trimmed)) return true;
          if (/\d+\s*[+\-*/^]|[+\-*/^]\s*\d+/.test(trimmed)) return true;
          if (trimmed.includes('=') && (trimmed.includes('\\') || /[a-zA-Z]/.test(trimmed))) return true;
          if (/[∫∑∏√∞±×÷≤≥≠≈]/.test(trimmed)) return true;
          
          return false;
        };
        
        const isURL = (str) => {
          return str.startsWith('http') || str.includes('://') || str.startsWith('mailto:') || str.startsWith('www.');
        };
        
        const findMatchingParen = (text, startPos) => {
          let depth = 1;
          for (let i = startPos + 1; i < text.length; i++) {
            if (text[i] === '(') depth++;
            if (text[i] === ')') {
              depth--;
              if (depth === 0) return i;
            }
          }
          return -1;
        };
        
        const findMatchingBracket = (text, startPos) => {
          let depth = 1;
          for (let i = startPos + 1; i < text.length; i++) {
            if (text[i] === '[') depth++;
            if (text[i] === ']') {
              depth--;
              if (depth === 0) return i;
            }
          }
          return -1;
        };
        
        let j = 0;
        while (j < html.length) {
          if (html[j] === '(' && (j === 0 || html[j-1] !== '\\')) {
            const endPos = findMatchingParen(html, j);
            if (endPos > j) {
              const content = html.substring(j + 1, endPos);
              if (isMathLike(content) && !isURL(content)) {
                html = html.substring(0, j) + `\\(${content.trim()}\\)` + html.substring(endPos + 1);
                j += content.trim().length + 4;
                continue;
              }
            }
          }
          if (html[j] === '[' && (j === 0 || html[j-1] !== '\\')) {
            const endPos = findMatchingBracket(html, j);
            if (endPos > j) {
              const content = html.substring(j + 1, endPos);
              if (isMathLike(content) && !isURL(content)) {
                html = html.substring(0, j) + `\\[${content.trim()}\\]` + html.substring(endPos + 1);
                j += content.trim().length + 4;
                continue;
              }
            }
          }
          j++;
        }
        
        element.innerHTML = html;
        
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
      }
    } else {
      setTimeout(attemptRender, 100);
    }
  };
  
  attemptRender();
}

