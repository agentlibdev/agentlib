import assert from "node:assert/strict";
import test from "node:test";

import { buildMarkdownExcerpt } from "../src/lib/markdown-excerpt.js";

test("buildMarkdownExcerpt leaves short markdown untouched", () => {
  const result = buildMarkdownExcerpt("# Title\n\nShort body.", 100);

  assert.deepEqual(result, {
    text: "# Title\n\nShort body.",
    truncated: false
  });
});

test("buildMarkdownExcerpt truncates long markdown on a sensible boundary", () => {
  const markdown = "# Title\n\n" + "a".repeat(900) + "\n\n" + "b".repeat(900);
  const result = buildMarkdownExcerpt(markdown, 1000);

  assert.equal(result.truncated, true);
  assert.ok(result.text.length < 1000);
  assert.match(result.text, /^# Title/);
});
