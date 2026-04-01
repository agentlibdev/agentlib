# Bolt Style Parity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Align the AgentLib web app with the provided Bolt-generated reference style while preserving current product routes and behaviors.

**Architecture:** Keep the existing React route structure and data flow, but replace the current visual tokens, shared shell, and the main page compositions with the darker Bolt-like design system. Add a light theme as an extension of that same system instead of keeping the previous visual direction.

**Tech Stack:** React, TypeScript, Tailwind CSS, Vite

### Task 1: Replace shared visual tokens

**Files:**
- Modify: `apps/web/src/styles.css`
- Modify: `apps/web/tailwind.config.js`

**Step 1:** Replace current gradients, panel shapes, shadows, and helper classes with Bolt-like gray/cyan/purple tokens.

**Step 2:** Keep theme support, but make dark mode the reference baseline and light mode a derived variant.

**Step 3:** Run `npm run build:web`.

### Task 2: Align the shell with the reference app

**Files:**
- Modify: `apps/web/src/app.tsx`
- Modify: `apps/web/src/components/breadcrumbs.tsx`

**Step 1:** Rework the top shell to match the reference header structure and nav feel.

**Step 2:** Preserve current navigation logic, auth actions, and the theme toggle.

**Step 3:** Run `npm run typecheck`.

### Task 3: Bring key surfaces into style parity

**Files:**
- Modify: `apps/web/src/routes/home-page.tsx`
- Modify: `apps/web/src/routes/agent-page.tsx`
- Modify: `apps/web/src/routes/version-page.tsx`

**Step 1:** Rewrite the main catalog page to follow the reference composition more closely.

**Step 2:** Apply the same cards, borders, spacing, and accent language to detail pages.

**Step 3:** Run `npm test`.

### Task 4: Keep project notes honest

**Files:**
- Modify: `TODO.md`

**Step 1:** Replace the stale UI salvage note with the Bolt parity work now landing on `main`.

**Step 2:** Leave only still-actionable follow-ups.
