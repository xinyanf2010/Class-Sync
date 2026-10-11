# ClassSync - Development & Design Guide

## Project Context
ClassSync is a K-12 classroom focus app prioritizing student agency over surveillance. 
- **Stack:** React Native (Mobile), Next.js/Tailwind (Web), Node/TS (Backend), WebSockets, Postgres/Redis.
- **Core Logic:** Sessions have states (`ACTIVE_LEARNING`, `QUIET_STUDY`, `ASSESSMENT_LOCK`). 
- **Telemetry:** Mobile app tracks `AppState`. If backgrounded during `ASSESSMENT_LOCK`, it triggers an immediate breach alert to the teacher dashboard.

## Design System & Visual Style
Use a modern, clean, Apple-esque aesthetic (Source 1) combined with minimal, structured layouts (Source 2).
- **Core Colors:** Ink (`#101010`), Canvas (`#f5f5f7`), Surface (`#fff`), Brand/Blue (`#08f` / `#0a84ff`), Orange (`#ff9400`), Red (`#ff383c`), Green (`#34c759`).
- **Typography:** System UI fonts (`system-ui, -apple-system...`). Clean, tight letter-spacing (`-0.02em` to `-0.6px` for larger text).
- **Radii & Shadows:** Soft, large card radii (`16px` to `30px`), subtle borders (`#e6e6e9`), and soft shadows.
*(Note to AI: Do not hardcode raw CSS variables in the HTML. Use standard Tailwind utility classes that match the hex codes and spacing above. If you need the exact design tokens, read `design-tokens.css` in the root directory).*

## Current Task: Visual Replication Workflow
You are strictly working on the visual style of the website. Do not change or remove existing web/mobile app features.

**Execute this exact loop:**
1. **Generate:** Create a single `index.html` file using Tailwind CSS (via CDN). Include all content inline. Use `https://placehold.co/` for images. Mobile-first responsive design.
2. **Screenshot:** Use Puppeteer to screenshot the rendered page (`npx puppeteer screenshot index.html -fullpage`). If the page has distinct sections, capture those individually.
3. **Compare:** Compare your screenshot against the reference image. Check for mismatches in: Spacing/padding (px), font sizes/weights/line-heights, exact hex colors, alignment, border radii, shadows, responsive behavior, and icon sizing.
4. **Fix:** Edit the HTML/Tailwind code to fix *every* mismatch found.
5. **Re-screenshot & Compare:** Repeat steps 2-4. 
6. **Iterate:** You MUST do at least 2 comparison rounds. Do NOT stop after one pass. Only stop when the result is within ~2-3px of the reference everywhere, or when the user tells you to stop.