import assert from "node:assert/strict";
import test from "node:test";

import { nextTheme, resolveInitialTheme } from "../src/lib/theme.js";

test("resolveInitialTheme prefers an explicit stored theme", () => {
  assert.equal(resolveInitialTheme("dark", false), "dark");
  assert.equal(resolveInitialTheme("light", true), "light");
});

test("resolveInitialTheme falls back to system preference", () => {
  assert.equal(resolveInitialTheme(null, true), "dark");
  assert.equal(resolveInitialTheme(null, false), "light");
});

test("nextTheme toggles between light and dark", () => {
  assert.equal(nextTheme("light"), "dark");
  assert.equal(nextTheme("dark"), "light");
});
