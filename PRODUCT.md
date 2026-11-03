# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary:** a maintenance or reliability lead who decides each day which ~20 of 400 machines (5 plants) a crew inspects. They work at a desk or on a shop-floor screen, scan the ranked list, open a machine to see why it is there, claim it, and record what the inspection found.
- **Secondary (now):** the Databricks AI Dev Day audience, who see the app on a venue projector during a 5-minute talk.

## Product Purpose

Tell a maintenance team which machine to look at next, and why, so inspection time goes to the machines most likely to cause serious defects. Success: the crew's daily inspections land on machines that really were about to have a bad week, and every outcome is recorded.

## Positioning

A transparent rule (vibration trend, temperature change, serious-defect rate, yield shortfall, each ranked against the machine's own type) leads the ranking. A machine-learning model is shown alongside it as a second opinion, together with an honest, measured comparison of the two. Crew outcomes ("Found an issue" / "False alarm") are captured as future training labels.

## Operating Context

- A daily planning ritual: filter by plant, machine type and status; work down the list; claim machines; leave notes for the next shift.
- Free-form questions go to "Ask the data" (Genie), which shows the SQL it ran.
- Runs as a Databricks App over Delta tables; actions are stored in Lakebase (Postgres).

## Capabilities and Constraints

- Ranked worklist (attention score 0–100, weights 30/15/30/25), with "why it's here" from the most unusual signal.
- Detail panel: readings, daily vibration, temperature and output charts, the model's second opinion with what-if drivers, and actions (claim, found an issue, false alarm, reopen, note).
- Rule-vs-model evidence strip; slide-out Genie chat.
- **The rule ranks; the model is a second opinion.** This ordering is a confirmed product decision.
- Terminology: "serious" = major + critical defects; model risk is shown as a multiple of the fleet average (e.g. `3.4×`).

## Evidence on Hand

- All data is **synthetic demo data** (`workshop_demo.manufacturing`). Test window 4–24 Jul 2026: rule 30.7% vs model 30.0% precision@20 against an 8.5% base rate. The rule and the model agree on about 4 of their top 20.
- There are no real customers, testimonials or field results; do not imply any.

## Product Principles

1. Say why a machine is on the list, in plain words, before showing a number.
2. Be honest about the data and the model: label synthetic data and never embellish the evidence.
3. The crew's action is the point; make claiming and recording outcomes effortless.
4. Rule first, model second.

## Accessibility & Inclusion

- Must stay legible on a venue projector (type size and contrast readable from the back of a room).
