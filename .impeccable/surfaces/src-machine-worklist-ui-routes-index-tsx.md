---
version: 1
slug: "src-machine-worklist-ui-routes-index-tsx"
primary_target: "src/machine_worklist/ui/routes/index.tsx"
related_targets: []
---

# Surface brief: Machine attention worklist (src/machine_worklist/ui/routes/index.tsx)

Mode: Operate. Audience: a maintenance lead planning today's ~20 inspections; secondary: Dev Day projector audience.
Task: scan the ranked list, see why each machine is there, claim it, record the outcome; ask the data.
Constraints: the rule ranks and the model is a second opinion; synthetic-data labelling and rule-vs-model evidence stay visible and unembellished; legible from the back of a room. Every existing function stays (filters, keyboard list nav, detail panel, charts, actions, Genie panel).

## Direction contract

THESIS: Today's inspection plan, not a dashboard. The list is cut at crew capacity, and above the cut is the day's work. It refuses the category default of a grey table under a row of vanity tiles.

OWN-WORLD: Crisp light. Cool white ground, white work surfaces, a deep petrol shell band (#0E3B47) for the header and KPI strip, amber for attention, red reserved for critical, green for resolved. Geist for everything; Geist Mono only for machine IDs and SQL. Pill badges, hairline dividers, tabular numerals.

STORY: The lead sees how many machines need a look today, which are high risk and which are already claimed, and that the rule and the model tie. They work down to the capacity line, open a machine, and claim it or record what they found.

FIRST VIEWPORT: Petrol band with the title, the synthetic-data note and "Ask the data" at top right. Below it, four KPI tiles that double as filters (To inspect today 20 · High model risk · Claimed · Rule vs model 31%/30%). Then the filter row; the list on the left (about 60%) and the detail panel on the right.

FORM: Pinned by the user ("Crisp light + KPI strip"), so no concept roll. seed: none (unavailable)

SIGNATURE: Each row's score is drawn as an inline bar on a shared 0–100 track. After row 20, a labelled cut line reads "Crew capacity · 20 machines today". Rows below the line are visibly de-emphasised.
