# Web Brand Mark And Favicon

**Goal:** Replace the temporary bot iconography in the web shell with the new AgentLib network-bot mark, and use the same visual language for the browser favicon.

**What changed**

- Added a dedicated reusable brand component at `apps/web/src/components/brand-mark.tsx`
- Replaced the header `lucide-react` bot icon with the new brand mark
- Replaced the home empty-state bot icon with the same mark
- Added a real SVG favicon at `apps/web/public/favicon.svg`
- Wired the favicon through `apps/web/index.html`

**Sizing**

- Header brand mark was increased to `h-10 w-10` so it renders at `2.5rem`
- Empty-state mark keeps the larger presentation size already used in the layout

**Why**

- The old `lucide-react` bot was generic and disconnected from the product identity
- A shared brand mark keeps the shell, favicon, and empty states visually aligned
- The favicon now matches the product symbol instead of falling back to a browser default
