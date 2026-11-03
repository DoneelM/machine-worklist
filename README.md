# Machine attention worklist

A web app that tells a maintenance team **which machine to look at next**, and why.

It ranks 400 machines across 5 plants, gives a second opinion from a machine-learning model, lets the crew record what they did, and has a chat box for asking questions about the data in plain English.

_Live URL:_ https://machine-worklist-7474644914236022.aws.databricksapps.com

> All data is **synthetic demo data** (`workshop_demo.manufacturing`). The numbers in this README come from that data.

---

## What you can do in the app

| On screen | What it does |
|---|---|
| **The list** | Every machine, ranked by an *attention score* from 0–100. "Why it's here" says which reading is most unusual. |
| **Model column** | The model's view: how much more likely this machine is to have a bad week than the average machine (e.g. `3.4×`). A dot means it's in the model's top 20. |
| **Detail panel** | Click a machine to see its readings, daily vibration/temperature/output charts, and what is pushing the model's risk up. |
| **Action buttons** | *Take this one*, *Found an issue*, *False alarm*, plus a note for the next shift. These are saved, and everyone sees who's on what. |
| **Rule vs model strip** | How well the score and the model would have done on past weeks. |
| **Ask the data** | A chat panel (Genie). Ask e.g. *"Which plant had the most critical defects in July?"* You get the answer, a table and the SQL it ran. |

---

## How it works, in one picture

```
 workshop_demo.manufacturing          nzlabs_031.default (Delta tables)          The app
 (raw data, read-only)
 ┌────────────────────┐   SQL    ┌──────────────────────────┐
 │ machines           │ ───────▶ │ machine_attention  (score)│ ───┐
 │ sensor_readings    │          │ machine_daily     (charts)│ ───┤
 │ work_orders        │ ───────▶ │ machine_features_daily    │    │      ┌──────────────────┐
 │ defects            │          └────────────┬─────────────┘    ├────▶ │ Databricks App   │
 └────────────────────┘                       │ notebook         │      │ React + FastAPI  │
          │                                   ▼                  │      └───┬─────────┬────┘
          │                      ┌──────────────────────────┐    │          │         │
          │                      │ machine_risk_7d  (model) │ ───┤          │         │
          │                      │ failure_risk_eval        │ ───┘          │         │
          │                      └──────────────────────────┘               │         │
          │                                                                 ▼         ▼
          └──────────────────────────────▶ Genie space ◀── "Ask the data"  Lakebase (Postgres)
                                                                            claims, notes, outcomes
```

There are four parts:

1. **SQL turns raw readings into a score** (`sql/`). Delta tables hold the results.
2. **A notebook trains a model** (`notebooks/`) and writes each machine's risk to a table.
3. **The app** reads those tables through a SQL warehouse and saves the crew's actions in **Lakebase**, a Postgres database.
4. **Genie** answers free-form questions over the raw and scored tables.

---

## 1. The attention score (the "rule")

File: `sql/machine_attention.sql`. It looks at the **last 14 days** and scores four things for each machine:

| Signal | What it measures | Weight |
|---|---|---|
| Vibration trend | Last 7 days' average vs the 7 days before | **30%** |
| Temperature change | Same comparison, rising **or** falling, since either can mean trouble | **15%** |
| Serious defects | Major + critical defects per 1,000 units made | **30%** |
| Yield shortfall | How far output fell below plan | **25%** |

Each signal becomes a **percentile within the machine's type**, so a press is compared with other presses and never with a conveyor. Then the weighted sum is scaled to 0–100.

Temperature only gets 15% because on this data it moves almost in step with vibration (correlation 0.84). Both come from wear, so a bigger weight would count the same thing twice.

**To change the weights**, edit the `0.30 * p_vib + 0.15 * p_temp + ...` line, re-run the SQL, and update the matching line in `rule_score()` in the notebook so the comparison stays fair.

---

## 2. The model (the "second opinion")

File: `notebooks/train_failure_risk.py`. It runs on serverless compute, is tracked in MLflow and is registered in Unity Catalog as `nzlabs_031.default.failure_risk_7d`.

**What it predicts:** *will this machine be among the fleet's worst 10% for serious defects over the next 7 days?*

**How:**
- `sql/machine_features_daily.sql` builds one row per machine per day: rolling vibration, temperature, RPM, power, defects, yield, night-shift share and age. Each row uses only data available up to that day.
- Each reading becomes a percentile *for that day*. As the whole fleet wears, raw readings rise past anything the model saw in training, but a percentile stays comparable over time.
- The model is gradient boosting (scikit-learn), trained on 17 May–26 Jun and tested on 4–24 Jul. The week in between is skipped so the training labels can't see the test period.
- **Drivers** come from a *what-if*: set one reading to a typical value for that machine type and see how much the risk drops. (SHAP wasn't available on this serverless setup.)

**What we found:**

| Test weeks (4–24 Jul) | Rule | Model |
|---|---|---|
| Of 20 machines inspected per day, share that really had a bad week | 30.7% | 30.0% |
| Picking at random | 8.5% | 8.5% |
| Overall ranking quality (AUC) | 0.84 | 0.78 |

It's **a tie**, so the rule stays in charge of the ranking. Interestingly, the two agree on only about 4 of their top 20 machines, so they're catching *different* problems.

**Lessons that shaped the design:**
- "Any serious defect next week" was true for 94% of machine-weeks, which makes it useless as a target.
- "11+ serious defects next week" climbed from 0% to 54% of days as the fleet wore. A model trained on that goes stale, so the target became the *relative* "worst 10%".

**To retrain:** re-run `sql/machine_features_daily.sql`, then run the notebook (it's also in the workspace under `machine-worklist/train_failure_risk`). It rewrites `machine_risk_7d` and `failure_risk_eval`, and the app picks them up on the next page load.

---

## 3. The app

| Part | Where | What it does |
|---|---|---|
| Backend (Python, FastAPI) | `src/machine_worklist/backend/` | `router.py` serves the API. `warehouse.py` runs SQL. `actions.py` saves actions to Lakebase. `genie.py` talks to Genie. |
| Frontend (React) | `src/machine_worklist/ui/` | `routes/index.tsx` is the page. `components/worklist/` holds the charts, formatting and the chat panel. |
| Config | `databricks.yml`, `app.yml` | The app's warehouse, Lakebase database, Genie space id and user permissions |

**Saving actions (Lakebase).** Claims, notes and outcomes are written to `worklist.machine_actions` (current state) and `worklist.action_log` (history). When someone presses *Found an issue* or *False alarm*, the model's risk at that moment is stored too. Over time those become **real labels** for checking whether the model helps on a real plant floor.

**Who sees what.** The worklist reads data as the app. The chat runs **as the signed-in user**, so Genie only shows data that person is allowed to read.

---

## 4. Ask the data (Genie)

A Genie space called "Machine worklist: Ask the data" covers the four raw tables plus `machine_attention` and `machine_risk_7d`.

- It's defined in code in `genie/build_space.py`: table descriptions, synonyms ("temp" means `temperature_c`), the links between tables, three example queries (`genie/*.sql`) and a few rules. For example, "serious" means major + critical, and dates count back from the last day in the data.
- **To change it**, edit the file, run `python3 genie/build_space.py`, then push it with `databricks genie update-space <id> --json ...` (the id is in `genie/space_id`).

---

## Run, check and deploy

```bash
apx dev start                     # local dev servers (actions and chat only work once deployed)
apx dev check                     # type checks, Python + TypeScript
apx build                         # production build
workshop-app-deploy --project . --target dev   # deploy (in this workshop, use this, not bundle deploy)
```

## Known limits

- All data is synthetic. Patterns are illustrative, and temperature only ever rises in it, so the "falling temperature" side is built but untested.
- Model drivers are a one-reading-at-a-time what-if. They can understate risk when several readings are extreme together.
- The model is scored once (for 31 Jul). There's no daily schedule yet.

## Ideas for next

- Blend rule and model, e.g. inspect the rule's top 10 plus the model's top 10.
- Schedule the SQL and notebook as a daily Lakeflow Job.
- Retrain on real *Found an issue* / *False alarm* outcomes once there are enough.

<!-- workshop-brief:v1 -->
## Workshop brief

- Original request: an AI Dev Days project on the manufacturing demo data. Started as an action worklist; added a 7-day failure early warning, a temperature indicator and a Genie chat.
- First version and primary action: a ranked machine worklist where a crew claims a machine and records whether it was a real issue or a false alarm.
- Stated facts: weights 30/15/30/25 (vibration/temperature/defects/yield); temperature change counts in either direction against the machine's prior week; the model is a second opinion shown as lift vs fleet average; local git commits only.
- Demo assumptions: synthetic `workshop_demo.manufacturing` data; "serious" = major + critical; target = fleet's worst 10% next 7 days; actions stored in Lakebase.
- Checks: rule 30.7% vs model 30.0% precision@20 (base rate 8.5%) on 4–24 Jul; Genie answers checked against hand-written SQL; deployed page inspected. Not yet clicked in the browser: the chat panel and the outcome buttons.
<!-- /workshop-brief -->
