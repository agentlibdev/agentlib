export type MarkdownExcerpt = {
  text: string;
  truncated: boolean;
};

export function buildMarkdownExcerpt(markdown: string, maxChars = 1400): MarkdownExcerpt {
  if (markdown.length <= maxChars) {
    return {
      text: markdown,
      truncated: false
    };
  }

  const truncated = markdown.slice(0, maxChars);
  const lastBreak = Math.max(truncated.lastIndexOf("\n\n"), truncated.lastIndexOf("\n"), truncated.lastIndexOf(" "));
  const text = (lastBreak > maxChars * 0.6 ? truncated.slice(0, lastBreak) : truncated).trimEnd();

  return {
    text,
    truncated: true
  };
}
