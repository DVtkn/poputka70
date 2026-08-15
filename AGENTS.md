<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

#
# ui-ux-pro-max-skill - UI/UX Design Intelligence
#
# Skill location: /tmp/ui-ux-pro-max-skill (or copy to ~/.opencode/skills/)
# Search script: python3 /tmp/ui-ux-pro-max-skill/.claude/skills/ui-ux-pro-max/scripts/search.py
#
# Key domains: ux, style, color, typography, icons, landing, product, chart, gsap, react, web
# Key stacks: react, nextjs, vue, svelte, astro, swiftui, react-native, flutter, html-tailwind, shadcn
#
# How to use (from any project directory):
#   python3 /tmp/ui-ux-pro-max-skill/.claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain <domain> --stack <stack> --max-results 5
#
# Example queries verified for poputka70 project:
#   - "mobile first responsive layout" --domain ux --stack nextjs
#   - "touch target" --domain ux --stack nextjs
#   - "font pairing typography" --domain typography --stack nextjs
#   - "color contrast" --domain color --stack nextjs
#   - "font stacking" --domain product --stack nextjs
#
# Generated design tokens for poputka70 (TECH_SPEC compliant):
#   - Palette: snow/taiga/river/birch/fog/frost/ember (unchanged per spec)
#   - Fonts: Unbounded (display), Golos Text (body), JetBrains Mono (utility)
#   - No emojis in UI — replaced with Lucide stroke 1.5-2 icons
#   - MobileBottomNav + AppShell pattern for consistent inner-page navigation
#
# Pre-delivery checklist (from skill priority table):
#   1. Accessibility: contrast 4.5:1, alt text, keyboard nav, aria-labels
#   2. Touch & interaction: min 44×44px, 8px+ spacing, loading feedback
#   3. Performance: WebP/AVIF, lazy loading, CLS < 0.1, reserve space
#   4. Style selection: consistency, SVG icons (no emoji), match product type
#   5. Layout & responsive: mobile-first breakpoints, viewport meta, no horizontal scroll
#   6. Typography & color: base 16px, line-height 1.5, semantic color tokens
#   7. Animation: context-aware timing, GSAP presets, respect reduced-motion
#   8. Forms & feedback: visible labels, error near field, helper text
#   9. Navigation patterns: predictable back, bottom nav ≤5 items, deep linking
#  10. Charts & data: legends, tooltips, accessible colors (not color-alone meaning)
