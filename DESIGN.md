---
name: Machine Worklist
description: Today's inspection plan for a maintenance crew, cut at crew capacity.
colors:
  ground: "#F4F6F8"
  ink: "#0F1E26"
  card: "#FFFFFF"
  petrol-shell: "#0E3B47"
  shell-raised: "#15505F"
  shell-line: "#2A6475"
  shell-foreground: "#F2F7F8"
  shell-muted: "#A9C4CB"
  primary: "#0E3B47"
  primary-foreground: "#FFFFFF"
  muted: "#EEF1F4"
  muted-foreground: "#4F5F68"
  accent: "#E7EEF1"
  border: "#DCE2E7"
  input: "#B7C2CA"
  ring: "#0E7490"
  track: "#E6EBEF"
  signal: "#B45309"
  signal-strong: "#D97706"
  signal-soft: "#FDF0DC"
  signal-ink: "#7A3A06"
  success: "#1A7F43"
  success-soft: "#DDF3E5"
  critical: "#B42318"
  chart-score: "#0E5A6B"
  chart-quiet: "#8796A0"
typography:
  title:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 600
    letterSpacing: "-0.015em"
  kpi-value:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontFeature: "\"tnum\" 1"
  detail-score:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontFeature: "\"tnum\" 1"
  machine-id-heading:
    fontFamily: "Geist Mono Variable, ui-monospace, monospace"
    fontSize: "1.25rem"
    fontWeight: 600
    letterSpacing: "-0.025em"
  machine-id:
    fontFamily: "Geist Mono Variable, ui-monospace, monospace"
    fontSize: "0.9375rem"
    fontWeight: 500
    letterSpacing: "-0.025em"
  figure:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    fontFeature: "\"tnum\" 1"
  body:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    fontFeature: "\"tnum\" 1, \"ss01\" 1"
  section-heading:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
  label:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
rounded:
  focus: "4px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  full: "9999px"
spacing:
  hairline: "1px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  gutter: "24px"
  container: "1440px"
  detail-lg: "400px"
  detail-xl: "440px"
components:
  surface-card:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.xl}"
    padding: "20px"
  kpi-tile:
    backgroundColor: "{colors.shell-raised}"
    textColor: "{colors.shell-foreground}"
    rounded: "{rounded.xl}"
    padding: "10px 16px"
  kpi-tile-active:
    backgroundColor: "{colors.shell-foreground}"
    textColor: "{colors.petrol-shell}"
    rounded: "{rounded.xl}"
    padding: "10px 16px"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.lg}"
    height: "36px"
    padding: "8px 16px"
  button-outline:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    height: "36px"
    padding: "8px 16px"
  button-on-shell:
    backgroundColor: "{colors.shell-foreground}"
    textColor: "{colors.petrol-shell}"
    rounded: "{rounded.lg}"
    height: "36px"
    padding: "8px 16px"
  select:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    height: "36px"
    padding: "0 12px"
  pill-claimed:
    backgroundColor: "{colors.signal-soft}"
    textColor: "{colors.signal-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  pill-resolved:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.success}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  pill-open:
    textColor: "{colors.muted-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  queue-row-selected:
    backgroundColor: "{colors.signal-soft}"
    typography: "{typography.body}"
    padding: "12px 16px"
  score-track:
    backgroundColor: "{colors.track}"
    rounded: "{rounded.full}"
    height: "6px"
    width: "56px"
  capacity-line:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.signal-ink}"
    typography: "{typography.label}"
    padding: "8px 16px"
---

# Design System: Machine Worklist

## Overview

**Creative North Star: "The Shift Plan"**

This is the morning's inspection plan pinned to the board, not a monitoring dashboard. A deep petrol band carries the title and the day's numbers. Below it sits a cool white ground with white work surfaces: a ranked list on the left and the selected machine on the right. The page reads as one sheet of work. The list is cut at what one crew can inspect today, and everything above the cut is the day's job.

Density is high and calm. Hairline dividers separate rows. Numbers use tabular figures and sit next to a plain-language reason. Amber is the only attention colour: it marks the selected row, claimed work, the model's top picks and the capacity cut. Green means resolved and red means critical or failed. Light is the default because it reads best on a projector and on a lit shop floor. Dark mode is a full remap of the same roles, not a different world.

**Key Characteristics:**
- Petrol shell band (header and KPI strip) over a cool white working ground.
- One attention hue (amber); green only for resolved; red only for critical and errors.
- Geist for everything; Geist Mono for machine identity and SQL.
- KPI tiles are filter buttons, not vanity tiles.
- Inline score bars on a shared 0–100 track, and a labelled crew-capacity cut line.
- Pill badges, hairline dividers, tabular numerals, one soft surface shadow.

## Colors

A cool, low-chroma petrol-and-slate palette with a single warm amber signal.

### Primary
- **Deep Petrol** (`petrol-shell` / `primary`): the shell band behind the title, KPI tiles and the data note. Also the default filled button and the user's own question bubble in the Ask panel. In light mode the shell and primary are the same petrol.
- **Raised Petrol** (`shell-raised`): KPI tiles at rest (at 60% opacity, full on hover) and the theme toggle's hover state.
- **Petrol Hairline** (`shell-line`): tile borders and the toggle border inside the band.
- **Shell Paper** (`shell-foreground`) and **Shell Mist** (`shell-muted`): text on the band. Shell Paper is also the fill of an active KPI tile and of the "Ask the data" button, so both read as lit against the petrol.

### Secondary
- **Amber Signal** (`signal`): text-weight attention, e.g. the model's risk multiple when a machine is in the model's top 20, and the dashed prior-week reference line in trend charts.
- **Amber Strong** (`signal-strong`): marks drawn at small sizes: the 3px left bar on the selected row, the model-top dot, the capacity cut rules (at 70%) and the active KPI tile border.
- **Amber Wash** (`signal-soft`) with **Amber Ink** (`signal-ink`): selected row background, claimed pill, "in today's 20" rank badge, capacity-line label, and text selection.

### Tertiary
- **Resolved Green** (`success`, on `success-soft`): the resolved pill only.
- **Critical Red** (`critical`, the `--destructive` token): error icons, failed-request messages and destructive buttons only.

### Neutral
- **Cool Ground** (`ground`): page background; also the outline-button fill.
- **Work Surface** (`card`): list, detail panel, inputs, Ask panel.
- **Slate Ink** (`ink`) and **Slate Muted** (`muted-foreground`): body text and secondary text (plant, line, units, captions).
- **Mist Panel** (`muted`): list header (60%), capacity-line band (60%), the facts panel in the detail (60%), info notes, skeletons.
- **Hairline** (`border`): row dividers, panel borders, the open pill outline, chart gridlines.
- **Field Edge** (`input`): select and textarea borders, chart crosshair, scrollbar thumb.
- **Teal Ring** (`ring`): focus outline and text caret.
- **Track** (`track`): the empty part of a score bar.
- **Score Teal** (`chart-score`) and **Quiet Slate** (`chart-quiet`): score-bar fill and trend lines; Quiet Slate replaces Score Teal for rows below the capacity cut.

### Dark mode mapping
`.dark` remaps every role on the same names. The ground goes to near-black petrol (#0B151A) and cards to #111E24. The shell goes deeper (#0A2830, raised #103741, line #1E4E5A). Primary, ring and chart-score all become a bright cyan (#5CC3D6, with #06232B text on primary). Signal and signal-strong merge into one #F5A524; signal-soft becomes a dark amber wash (#3A2A10) under light ink (#FBD38D). Success becomes #4ACB7E on #12301F, critical becomes #F0705F, borders #23343C, inputs #3A4F59, track #22333B and chart-quiet #6E848E. `color-scheme` follows the theme so native controls and scrollbars match.

### Named Rules
**The One Signal Rule.** Amber is the only attention colour. It means "look here": selected, claimed, the model's top pick, or the capacity cut. Never use it for decoration or for state that isn't attention.

**The Reserved Red Rule.** Red appears only for critical and failure. A high score is never red; urgency is shown by rank and position above the cut.

## Typography

**Display Font:** Geist Variable (with ui-sans-serif, system-ui)
**Body Font:** Geist Variable
**Label/Mono Font:** Geist Mono Variable (with ui-monospace)

**Character:** A neutral, engineered grotesque that holds dense tabular data cleanly. The body is set globally with tabular figures and stylistic set 1 (`"tnum" 1, "ss01" 1`) at a 15px base, so every column of numbers lines up.

### Hierarchy
- **Detail score** (600, 2.25rem, line-height 1, -0.02em): the one big number in the detail panel, labelled "score of 100".
- **KPI value** (600, 1.75rem, line-height 1, -0.02em): KPI tile values, with an optional 0.9375rem unit ("of 20", "vs").
- **Title** (600, 1.375rem, -0.015em): the page title on the shell band.
- **Machine ID heading** (Mono 600, 1.25rem, tight): the machine name at the top of the detail panel.
- **Figure** (600, 1rem, tabular): the row score next to its bar, and fact values.
- **Body** (400, 0.9375rem): row reasons, select values, notes, detail prose. Section headings ("Action", "Model second opinion", "Activity") use the same size at 600.
- **Machine ID** (Mono 500, 0.9375rem, tight): the ID in each queue row.
- **Label** (500 or 400, 0.8125rem): column headers, KPI labels and captions, field labels, pills, rank numbers, the capacity-line label, timestamps, and the data note on the shell.

The scale has three working steps (0.8125 / 0.9375 / 1rem) plus three display sizes (1.375 / 1.75 / 2.25rem). Nothing is uppercase or letter-spaced wide.

### Named Rules
**The Mono Means Identity Rule.** Geist Mono is used for machine IDs and for SQL (the query Genie ran and its raw result cells). Readings, scores and percentages stay in Geist with tabular figures.

**The Projector Floor Rule.** 0.8125rem is the smallest text in the core surface. It has to stay legible from the back of a room.

## Layout

The page is one centred column, up to 1440px wide, with 24px side gutters. The shell band runs full-bleed behind the header: title and one-line subtitle on the left; "Ask the data" and the theme toggle on the right. Below it is a 4-up KPI grid (2-up under 1024px) with 12px gaps, then the data note.

The work area has a filter row (selects with labels on top, an optional removable filter chip, and a right-aligned live "Showing N of M" count). Under it is a two-column grid with 20px gaps: the list takes the remaining width and the detail panel is fixed at 400px (1024px and up) or 440px (1280px and up). The detail panel is sticky at 20px from the top. The list scrolls inside its own surface (`max-height: calc(100vh - 17rem)`).

Queue rows use a fixed column template: rank 1.75rem · machine 6.25rem · reason (flexible) · score 6.5rem · model 4rem · status 6.25rem, with 12px gaps and 16px horizontal padding. Under 640px this collapses to three columns (rank, content, score), the reason and status wrap to a second line, and the header row, score track and model column are hidden.

Rhythm: 20px panel padding, 12px row padding, 16px between detail blocks, and 8–12px inside groups.

## Elevation & Depth

Mostly flat, with tonal layering. Depth comes from the petrol band against the cool ground, and from white cards on that ground. One soft, two-layer surface shadow lifts the work surfaces. The Ask panel is the only overlay; it casts a wider shadow to the left as it slides in.

### Shadow Vocabulary
- **Work surface** (`box-shadow: 0 1px 2px rgb(15 30 38 / 0.05), 0 6px 16px -8px rgb(15 30 38 / 0.10)`): the queue, the detail panel and its loading and error states.
- **Side sheet** (`box-shadow: -12px 0 32px -12px rgb(15 30 38 / 0.25)`): the Ask the data panel while open; it is removed when the panel is closed.

### Named Rules
**The One Lift Rule.** Work surfaces share one soft shadow. Elements on the band (tiles, buttons) are not lifted; they separate by tone and hairline borders.

## Shapes

Gently rounded rectangles with a 10px base radius (`--radius: 0.625rem`). Large containers and KPI tiles use 14px. Buttons, selects, textareas, the facts panel and info notes use 10px. Genie tables and SQL blocks use 8px. Pills, score tracks, score fills and the model-top dot are fully round. The focus outline has a 4px radius. Queue rows are square inside their surface, and the selected row has a 3px amber bar on its left edge. Dividers are 1px hairlines throughout.

## Components

### Buttons
Quiet, compact and labelled with a verb.
- **Shape:** 10px corners (rounded-lg is passed to every action button), 36px tall, icon at 16px before the label.
- **Primary:** Deep Petrol fill with white text. It is the next step for the current state: "Take this one" when open, "Found an issue" once claimed.
- **Outline:** ground fill, Field Edge border; hover moves to the accent tint. Used for the alternative outcomes and "Try again".
- **Ghost:** no fill until hover; used for "Save note", "New chat" and close.
- **On-shell:** "Ask the data" sits on the band in Shell Paper with petrol text and no shadow. The theme toggle is a 36px square with a Petrol Hairline border, filling to Raised Petrol on hover.
- **Pending:** the label changes to the present participle ("Claiming…", "Saving…"); controls disable at 50% opacity.

### KPI tiles (filter buttons)
Every count tile is a toggle button with `aria-pressed`. At rest it is Raised Petrol at 60% with a Petrol Hairline border; hover raises the border to Shell Mist and the fill to full. When active it inverts to Shell Paper with petrol text and an Amber Strong border, and its caption changes to "Showing only these · click to clear". A second click clears it, and a removable pill in the filter row shows the active filter. The evidence tile ("Rule vs model") has the same shape but is a labelled section, not a button; its detail is in its tooltip. Colour changes take 150ms.

### Chips and pills
- **Status pills** (fully round, 0.8125rem 500, 2px 8px padding, 12px Lucide icon): open is outlined in Hairline with muted text; claimed is Amber Wash and Amber Ink and shows the owner's short name; resolved is green on its wash.
- **Rank badge:** a round pill under the detail heading, amber when the machine is in today's 20 and muted when it is below the cut.
- **Driver effect chip:** a round Mist Panel chip with a tabular value.
- **Filter chip:** a 36px round pill on the card with an × icon; it clears the active KPI filter.

### Cards / Containers
- **Corner Style:** 14px.
- **Background:** Work Surface on the Cool Ground.
- **Shadow Strategy:** the single work-surface shadow (see Elevation & Depth).
- **Border:** 1px Hairline; the detail panel's internal sections are separated by hairline dividers.
- **Internal Padding:** 20px. The facts grid inside the detail sits on a 60% Mist Panel with 10px corners and 12px padding.

### Inputs / Fields
- **Style:** Work Surface fill, Field Edge border, 10px corners, 36px tall selects with a minimum width of 11rem; body-size value; label above in 0.8125rem 500 muted.
- **Hover:** the border darkens to 50% ink.
- **Focus:** the global 2px Teal Ring outline at a 2px offset; the text caret is Teal Ring too.
- **Disabled:** 60% opacity (textarea) or 50% (buttons).

### Queue rows
Each row is a listbox option, navigated with the arrow keys and selected with Enter or Space. Hover tints it Mist Panel at 70%. When selected it takes the Amber Wash with a 3px Amber Strong bar on its left edge. Its focus outline is inset by 2px so the row stays square. The machine ID is in mono with plant · line underneath. The reason comes before the number.

### Inline score bar
A 56px-wide, 6px-tall round track in Track colour, filled to the score (minimum 2%) in Score Teal, with the score in tabular 1rem 600 to its right. Rows below the capacity cut switch the fill to Quiet Slate and their rank number to muted, so position is visible without reading.

### Crew-capacity cut line (signature)
After rank 20, a `role="separator"` band on 60% Mist Panel reads "Crew capacity · 20 machines today" in Amber Ink, between two 1px Amber Strong rules at 70%. It appears only when the list shows the full ranking (no KPI or status filter), because the cut only means something in rank order. Rank numbers are fixed to the plant/type view, so filtering never renumbers the plan.

### Model cell and second opinion
The model's risk is shown as a multiple of the fleet average (e.g. `3.4×`) in tabular body text. Inside the model's top 20 it becomes Amber Signal 600 with a small Amber Strong dot. The detail panel repeats it as "Model second opinion", below the action block, so the rule comes first.

### Trend charts
Single-series SVG lines, 132px tall: a 2px Score Teal line, Hairline gridlines, a dashed 1.5px Amber Signal reference line for the prior-week average, a Field Edge crosshair and a ringed point on hover. The caption shows the title, the unit and the last or hovered reading.

### Ask the data panel
A right-hand side sheet, up to 480px wide, that slides in over 200ms and closes with Escape. Starter questions are bordered 10px cards. The user's questions are petrol bubbles with a tight bottom-right corner. Answers show text, a bordered result table and a collapsible "Show the SQL Genie ran" in mono on Mist Panel.

### Focus, selection and scrollbars
All focus uses a 2px Teal Ring outline at a 2px offset with 4px corners (inset by 2px on queue rows). Selected text takes the Amber Wash. Scrollbars are thin, with a Field Edge thumb on a transparent track.

## Do's and Don'ts

### Do:
- **Do** put the shell band in Deep Petrol and keep the working ground Cool Ground with white Work Surfaces.
- **Do** keep amber for attention only (selected, claimed, model top 20, the capacity cut), per The One Signal Rule.
- **Do** make summary counts into `aria-pressed` filter buttons that invert to Shell Paper with an amber border when active.
- **Do** draw scores as an inline bar on the shared 0–100 Track, and fade rows below the capacity cut to Quiet Slate.
- **Do** set every number in tabular figures, and put the plain-words reason before the number.
- **Do** use Geist Mono only for machine IDs and SQL.
- **Do** keep text at 0.8125rem or larger and use 600 weight for figures.
- **Do** define every new colour as a role in both `:root` and `.dark`.

### Don't:
- **Don't** use red for high scores or urgency; red is for critical and failure only.
- **Don't** add a second accent hue or tint the ground with petrol; petrol belongs to the shell band and to primary actions.
- **Don't** add uppercase eyebrow labels or kickers above headings; labels are sentence-case 0.8125rem.
- **Don't** add hard or offset shadows, or stack shadows on elements on the band; there is one soft work-surface lift.
- **Don't** show the capacity cut line on a filtered list, and don't renumber ranks when a filter narrows the list.
