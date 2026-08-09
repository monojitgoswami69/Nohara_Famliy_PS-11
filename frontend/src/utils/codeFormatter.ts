/**
 * Code Formatter Utility
 * Formats JavaScript/TypeScript, JSON, HTML, CSS, and Python code cleanly.
 */

export function formatCode(code: string, language: string): string {
  if (!code || !code.trim()) return code;

  const lang = language.toLowerCase();

  try {
    if (lang === 'json') {
      const parsed = JSON.parse(code);
      return JSON.stringify(parsed, null, 2);
    }

    if (lang === 'javascript' || lang === 'typescript' || lang === 'jsx' || lang === 'tsx') {
      return formatJavaScript(code);
    }

    if (lang === 'html' || lang === 'xml') {
      return formatHTML(code);
    }

    if (lang === 'css') {
      return formatCSS(code);
    }

    if (lang === 'python') {
      return formatPython(code);
    }

    // Default clean-up: trim trailing whitespace and normalize line endings
    return normalizeWhitespace(code);
  } catch (err) {
    console.warn('Formatting fallback applied:', err);
    return normalizeWhitespace(code);
  }
}

function normalizeWhitespace(code: string): string {
  return code
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .trim() + '\n';
}

function formatJavaScript(code: string): string {
  const lines = code.split('\n');
  let indentLevel = 0;
  const formattedLines: string[] = [];

  for (let rawLine of lines) {
    let line = rawLine.trim();

    if (!line) {
      formattedLines.push('');
      continue;
    }

    // Decrease indent level for closing braces/brackets before writing line
    if (line.startsWith('}') || line.startsWith(']') || line.startsWith(')')) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    const indent = '  '.repeat(indentLevel);
    formattedLines.push(indent + line);

    // Increase indent level if line ends with opening braces/brackets
    const openBraces = (line.match(/[\{\[\(]/g) || []).length;
    const closeBraces = (line.match(/[\}\]\)]/g) || []).length;
    const diff = openBraces - closeBraces;

    if (!line.startsWith('}') && !line.startsWith(']') && !line.startsWith(')')) {
      indentLevel = Math.max(0, indentLevel + diff);
    }
  }

  return formattedLines.join('\n').trim() + '\n';
}

function formatHTML(code: string): string {
  const tokens = code.replace(/>\s+</g, '><').split(/(?=<)/);
  let indentLevel = 0;
  const formatted: string[] = [];

  for (let token of tokens) {
    const trimmed = token.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('</')) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    const indent = '  '.repeat(indentLevel);
    formatted.push(indent + trimmed);

    if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.startsWith('<?') && !trimmed.endsWith('/>') && !trimmed.startsWith('<!')) {
      indentLevel++;
    }
  }

  return formatted.join('\n') + '\n';
}

function formatCSS(code: string): string {
  return code
    .replace(/\s*\{\s*/g, ' {\n  ')
    .replace(/;\s*/g, ';\n  ')
    .replace(/\s*\}\s*/g, '\n}\n\n')
    .replace(/\n  \n/g, '\n')
    .trim() + '\n';
}

function formatPython(code: string): string {
  return normalizeWhitespace(code);
}
