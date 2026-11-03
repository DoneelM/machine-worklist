# Presenting at AI Dev Day: 5-minute cheat sheet

**App:** https://machine-worklist-7474644914236022.aws.databricksapps.com
**Code:** https://github.com/DoneelM/machine-worklist

## Before you go on (5 min early)

- [ ] Open the app and click around so it's awake.
- [ ] Ask Genie in advance and leave the answer open: *"How do serious defects per 1,000 units compare between day and night shifts?"* (it takes 10–20 s, too slow to wait on stage)
- [ ] Light mode. Zoom the browser to 110–125% in a big room.
- [ ] All tiles and filters cleared, **MC0027** selected.
- [ ] Backup screenshots ready in case the Wi-Fi drops.

## The run: walk the header tiles left to right

**0:00–0:30 · Problem** (don't touch the screen)
> "400 machines, 5 plants, one crew that can inspect 20 a day. Which 20?"

**0:30–1:30 · Tile 1: To inspect today: 20**
- Point at the **crew-capacity line** after row 20: *"Above the line is today's work."*
- Click **MC0027**: *"Vibration up 11% on last week, compared with other injection moulders. No black box."*
- Click **Take this one**: *"Saved to Lakebase, so the next shift sees who's on it."*

**1:30–3:00 · Tile 4: Rule vs model 31% vs 30%** (the part people will remember)
> "The score is a formula: what looks wrong **today**. The model is machine learning: what goes wrong **next week**. Tested on three weeks of history: of the 20 machines each would inspect, 31% vs 30% really had a bad week. Random picking gets 8.5%. **A tie.** So the simple, explainable rule ranks the list and the model is a second opinion."

*Optional:* "Our first targets failed: one was true 94% of the time, another drifted from 0% to 54% as machines wore out."

**3:00–3:45 · Tile 2: Model agrees: 4 of 20** (click it)
> "They only agree on 4 machines, so they're catching different failures. These 4 are flagged by both: start here."

Click again to clear.

**3:45–4:30 · Ask the data** (show the pre-loaded answer)
> "Anyone can ask in plain English." Open **Show the SQL Genie ran**: "and check its working."

**4:30–5:00 · Close**
> "All on Databricks: Delta tables, MLflow, a Databricks App, Lakebase, Genie. Next: the *Found an issue / False alarm* buttons collect real outcomes, so we can retest the model on real inspections."

## Numbers to remember

| | |
|---|---|
| Fleet | 400 machines, 5 plants, synthetic data |
| Crew capacity | 20 machines/day |
| Rule hit rate (top 20) | **31%** |
| Model hit rate (top 20) | **30%** |
| Random | **8.5%** |
| Agreement | **4 of 20** |
| Score weights | vibration 30 · temperature 15 · defects 30 · yield 25 |
| Night vs day shift | 0.218 vs 0.170 serious defects per 1k units (+28%) |

## Likely questions

- **"So is ML pointless?"** "No. This data comes from a simple wear process, so a good rule is basically the formula. Real plants are messier, and that's why we collect outcome labels."
- **"Why 20?"** "One crew's daily capacity. We judge both methods on the machines a crew would actually inspect."
- **"Score vs model?"** "The score says what looks wrong today; the model predicts what goes wrong next week."
- **"Is it real data?"** "Synthetic demo data. The method carries over; the numbers are illustrative."
