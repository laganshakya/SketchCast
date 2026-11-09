# SketchCast Design System (`DESIGN.md`)
*Studio Noma Edition — Editorial Craft meets High-Velocity Realtime Engineering*

---

## 1. Design Philosophy & Intent

SketchCast is an audience interaction operating system for technical masterclasses, engineering keynotes, and developer meetups. It bridges the gap between presenter slides and audience devices with sub-40ms WebSocket synchronization.

### Guiding Principles (Prioritized Framework):
1. **Unslop (heydamir/unslop)**: Eliminate generic AI-generated tropes (no random purple gradients, no blurry colored glow blobs, no repetitive cards, no shouty all-caps robot badges, no emoji spam). Every element has purpose, spatial rhythm, and restrained palette discipline.
2. **Distinct Human Voice (Anthropic frontend-design)**: Authentic, tactile, publication-grade tech editorial aesthetic ("Studio Noma"). Tactile warm paper in light mode, deep obsidian carbon in dark mode, crisp hairline borders, and confident typography.
3. **Structured Design Token Truth (VoltAgent/awesome-design-md)**: Pure markdown specification of tokens, component variants, and interactive states as the single source of truth for designers and developers.
4. **Developer Resource Polish (Brad Traversy design resources)**: WCAG AA/AAA compliant contrast ratios, accessible focus rings, semantic form controls, consistent icon weights, and fluid responsive containers.
5. **Modular Block Architecture (HugoBlox/kit)**: Clean, composable UI blocks (Hero, Live Playground, Feature Triad, Network Mesh Pipeline, Accordion FAQ, Footer) that snap together cleanly.

---

## 2. Color Tokens & Palette

The palette is strictly restrained: a single primary energetic accent (**Studio Vermilion / Orange**), an intentional focus/status accent (**Electric Citron / Lime**), and a neutral foundation grounded in paper and deep ink.

### Light Mode (`[data-theme="light"]`) — Paper & Ink Studio
| Token Name | CSS Variable | Hex Value | Semantic Role |
| :--- | :--- | :--- | :--- |
| **Ink** | `--ink` | `#111414` | Primary text, high-emphasis headings, solid contrast elements |
| **Muted** | `--muted` | `#5a6060` | Secondary copy, metadata, timestamps, subtitles |
| **Paper Base** | `--paper` | `#f7f4ee` | Canvas background, tactile paper tone |
| **Paper Card** | `--paper-card` | `#ffffff` | Primary component card background |
| **Paper Surface** | `--paper-surface` | `#fbf9f5` | Hover states, inset panels, sub-cards |
| **Paper Elevated**| `--paper-elevated` | `#ffffff` | Modals, floating sheets, elevated tooltips |
| **Orange (Primary Accent)** | `--orange` | `#e04a1e` | Primary CTA buttons, timers, active selection, flame streaks |
| **Lime (Focus Accent)** | `--lime` | `#d4f728` | High-priority badges, multiplier streaks, correct answers |
| **Sky** | `--sky` | `#0284c7` | Technical code highlights, network links |
| **Hairline** | `--hairline` | `rgba(17, 20, 20, 0.08)` | Subtle card dividers, borders, table row dividers |
| **Hairline Strong** | `--hairline-strong` | `rgba(17, 20, 20, 0.16)` | Active borders, input focus strokes, structural boundaries |

### Dark Mode (`[data-theme="dark"]`) — Obsidian Carbon Studio
| Token Name | CSS Variable | Hex Value | Semantic Role |
| :--- | :--- | :--- | :--- |
| **Ink** | `--ink` | `#f5f3ee` | High-contrast text, headings |
| **Muted** | `--muted` | `#9ca3a3` | Secondary text, subtle metadata |
| **Paper Base** | `--paper` | `#0d1010` | Deep obsidian backdrop |
| **Paper Card** | `--paper-card` | `#141818` | Primary dark card surface |
| **Paper Surface** | `--paper-surface` | `#1a2020` | Secondary surface, inset inputs |
| **Paper Elevated**| `--paper-elevated` | `#222929` | Floating modals, elevated dropdowns |
| **Orange (Primary Accent)** | `--orange` | `#ff6639` | High-vibrancy dark mode primary CTA |
| **Lime (Focus Accent)** | `--lime` | `#d7ff2f` | Night-vision status badges, correct answers |
| **Sky** | `--sky` | `#38bdf8` | Code tokens, technical accents |
| **Hairline** | `--hairline` | `rgba(255, 255, 255, 0.08)` | Delicate dark mode hairline |
| **Hairline Strong** | `--hairline-strong` | `rgba(255, 255, 255, 0.16)` | Active dark mode borders |

### Semantic Status Tokens
- **Success / Correct**: `#10b981` (Emerald) / `#d4f728` (Lime accent)
- **Error / Incorrect**: `#ef4444` (Ruby Crimson)
- **Warning / Alert**: `#f59e0b` (Amber Gold)

---

## 3. Typography Scale & Roles

Loaded via Google Fonts (`DM Serif Display`, `Manrope`, `DM Mono`, `JetBrains Mono`):

1. **Display & Headings (`font-serif`) — `DM Serif Display`**:
   - Used for editorial impact titles, section headers, hero headlines.
   - Characteristics: High contrast, organic serifs, quiet authority.
   - Tracking: `tracking-tight` (`-0.02em` to `-0.03em`).
   - Line-height: Tight (`1.05` to `1.2`).
2. **Interface & Body (`font-sans`) — `Manrope`**:
   - Used for UI copy, question prompts, option text, buttons, body paragraphs.
   - Characteristics: Clean geometric sans, open counters, exceptional readability at 12–16px.
   - Tracking: Normal (`0em`) to slightly snug (`-0.01em` on large body).
   - Line-height: `1.4` (UI) to `1.6` (Reading).
3. **Telemetry & Code (`font-mono`) — `DM Mono` & `JetBrains Mono`**:
   - Used for Room Codes, Countdown Timers, Multipliers, Points, Code Blocks, and Metadata tags.
   - Characteristics: Tabular numbers (monospaced), distinct numerals, zero ambiguity between `0` and `O`.
   - Tracking: `tracking-wider` on small metadata (`text-[10px] sm:text-[11px]`).

---

## 4. Spacing, Rhythm & Radii

A strict 4px grid rhythm:
- `gap-1` / `p-1`: 4px (tight micro-elements)
- `gap-2` / `p-2`: 8px (icon + label spacing, tag padding)
- `gap-3` / `p-3`: 12px (form input internal padding, compact cards)
- `gap-4` / `p-4`: 16px (standard card padding, modular gap)
- `gap-6` / `p-6`: 24px (standard desktop card padding, section gap)
- `gap-8` / `p-8`: 32px (large component separation)
- `gap-12` / `p-12`: 48px (major section vertical rhythm)

### Border Radii Hierarchy:
- `rounded-lg`: 8px (small badges, code snippets, inner chips)
- `rounded-xl`: 12px (buttons, inputs, dropdown items)
- `rounded-2xl`: 16px (cards, nested containers, option cards)
- `rounded-3xl`: 24px (major cards, hero container, modals)
- `rounded-full`: 9999px (pills, status chips, primary action buttons, avatars)

---

## 5. Anti-Slop (Unslop) Checklist

Applied across all components:

| Slop Anti-Pattern | Replaced By (Clean Pattern) |
| :--- | :--- |
| **Random Blurry Glow Blobs (`blur-3xl`)** | Subtle architectural hairline borders, micro dot grids, and crisp card elevation. |
| **Shouty ALL-CAPS Robot Copy** | Natural, human, confident casing ("Live Audience Arena" not "REAL-TIME AUDIENCE OPERATING SYSTEM"). |
| **Emoji-Stuffed Labels (`🔥 STAGE`, `⚡ NEW`)** | Clean Lucide SVG icons with uniform 1.75 stroke-weight and semantic color accent. |
| **Generic Purple/Blue SaaS Gradients** | Restrained Studio Vermilion (`#e04a1e`) on warm tactile paper (`#f7f4ee`). |
| **Jarring 3D Card Rotations (`rotate(-10deg)`)** | Crisp linear/spring elevation (`y: -1px` on hover, `scale: 0.98` on tap). |
| **Uneven Card Margins & Padding** | Strict 16px/24px modular padding scale across desktop and mobile. |
| **Mobile Bottom Bar Collisions** | Dedicated safe-area padding (`pb-safe`), clearance spacer (`pb-28`), floating action button elevation (`bottom-[76px]`). |
| **Hardcoded Arbitrary Hex Colors** | Unified design token CSS variables (`var(--paper)`, `var(--ink)`, `var(--orange)`). |

---

## 6. Component Specs

### Buttons
1. **Primary (`btn-noma-orange`)**:
   - Background: `var(--orange)`, Text: `#ffffff`
   - Shape: `rounded-full`, Font: `font-mono text-xs font-bold uppercase tracking-wider`
   - States: Hover `translate-y-[-1px] shadow-md`, Active `scale-[0.98]`, Disabled `opacity-40 cursor-not-allowed`
2. **Focus/Streak (`btn-noma-lime`)**:
   - Background: `var(--lime)`, Text: `#111414`
   - Shape: `rounded-full`, Font: `font-mono text-xs font-bold uppercase`
   - States: Hover `translate-y-[-1px] shadow-md`, Active `scale-[0.98]`
3. **Ghost / Outline (`btn-noma-ghost`)**:
   - Background: `transparent`, Border: `1px solid var(--hairline-strong)`, Text: `var(--ink)`
   - Hover: `background: var(--paper-surface), border: var(--ink)`

### Segmented Controls (Tabs)
- Capsule wrapper: `bg-paper-card border border-hairline rounded-2xl p-1`
- Active item: `bg-ink text-paper shadow-xs rounded-xl font-bold`
- Inactive item: `text-muted hover:text-ink rounded-xl transition-colors`

### Option Cards (A, B, C, D)
- Height: Min 52px for touch ergonomics
- Default: `bg-paper-card hover:bg-paper-surface border border-hairline text-ink`
- Selected: `bg-ink text-paper border-2 border-ink shadow-sm font-semibold`
- Correct Reveal: `bg-lime/20 border-2 border-lime text-ink font-bold`
- Incorrect Reveal: `bg-orange/15 border-2 border-orange text-orange font-bold`
- Option Badge (Letter): Monospace circular or rounded-lg chip with high contrast

### Mobile Bottom Navigation Bar
- Fixed at bottom: `fixed bottom-0 inset-x-0 min-h-[64px] bg-paper/95 backdrop-blur-md border-t border-hairline pb-safe z-40`
- Icons: 18x18px with subtle active dot or background pill
- Touch Target: Min 48px height per navigation tab
