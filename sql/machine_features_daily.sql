-- Training/scoring features for the 7-day early-warning model (synthetic demo data: workshop_demo.manufacturing).
-- One row per machine per full day. Every feature uses only data up to and including that day.
-- Labels (NULL where the next 7 days aren't fully observed yet: those are the rows we score):
--   label_top10_fleet: in the fleet's worst 10% that day by major/critical defects over the NEXT 7 days.
--     Relative, so it doesn't drift as the whole fleet wears. This is the one the model trains on.
--   label_bad_week: 11+ major/critical defects in the next 7 days. Absolute; ~9% of days in May-June, ~41% in July.
CREATE OR REPLACE TABLE nzlabs_031.default.machine_features_daily AS
WITH b AS (SELECT date(max(reading_at)) AS last_full_day FROM workshop_demo.manufacturing.sensor_readings),
s AS (
  SELECT machine_id, date(reading_at) AS day,
         avg(vibration_mm_s) AS vib, avg(temperature_c) AS temp, avg(spindle_rpm) AS rpm, avg(power_kw) AS power
  FROM workshop_demo.manufacturing.sensor_readings
  GROUP BY ALL
),
w AS (
  SELECT machine_id, date(started_at) AS day,
         sum(units_planned) AS planned, sum(units_produced) AS produced,
         sum(CASE WHEN shift = 'night' THEN units_planned ELSE 0 END) AS night_planned
  FROM workshop_demo.manufacturing.work_orders
  GROUP BY ALL
),
d AS (
  SELECT machine_id, date(detected_at) AS day,
         count_if(severity IN ('major', 'critical')) AS serious, count_if(severity = 'critical') AS critical,
         count_if(severity = 'minor') AS minor
  FROM workshop_demo.manufacturing.defects
  GROUP BY ALL
),
daily AS (
  SELECT s.machine_id, s.day, s.vib, s.temp, s.rpm, s.power,
         coalesce(w.planned, 0) AS planned, coalesce(w.produced, 0) AS produced,
         coalesce(w.night_planned, 0) AS night_planned,
         coalesce(d.serious, 0) AS serious, coalesce(d.critical, 0) AS critical, coalesce(d.minor, 0) AS minor
  FROM s LEFT JOIN w USING (machine_id, day) LEFT JOIN d USING (machine_id, day)
  WHERE s.day < (SELECT last_full_day FROM b)  -- drop the partial last day
),
rolled AS (
  SELECT *,
    avg(vib)  OVER w7  AS vib_7d,  avg(vib)  OVER w14 AS vib_14d, avg(vib)  OVER w30 AS vib_30d,
    avg(vib)  OVER p7  AS vib_prev_7d,
    avg(temp) OVER w7  AS temp_7d, avg(temp) OVER p7  AS temp_prev_7d,
    avg(rpm)  OVER w7  AS rpm_7d,  avg(power) OVER w7 AS power_7d,
    sum(serious)  OVER w7  AS serious_7d, sum(serious) OVER w14 AS serious_14d,
    sum(critical) OVER w7  AS critical_7d, sum(minor) OVER w7 AS minor_7d,
    sum(planned)  OVER w7  AS planned_7d,  sum(produced) OVER w7 AS produced_7d,
    sum(night_planned) OVER w7 AS night_planned_7d,
    sum(serious)  OVER n7  AS serious_next_7d,
    count(*)      OVER n7  AS days_next_7d,
    count(*)      OVER w30 AS days_hist
  FROM daily
  WINDOW w7  AS (PARTITION BY machine_id ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW),
         w14 AS (PARTITION BY machine_id ORDER BY day ROWS BETWEEN 13 PRECEDING AND CURRENT ROW),
         w30 AS (PARTITION BY machine_id ORDER BY day ROWS BETWEEN 29 PRECEDING AND CURRENT ROW),
         p7  AS (PARTITION BY machine_id ORDER BY day ROWS BETWEEN 13 PRECEDING AND 7 PRECEDING),
         n7  AS (PARTITION BY machine_id ORDER BY day ROWS BETWEEN 1 FOLLOWING AND 7 FOLLOWING)
)
SELECT r.machine_id, r.day, m.plant, m.machine_type,
       datediff(r.day, m.installed_on)                                    AS age_days,
       r.vib_7d, r.vib_14d, r.vib_7d / nullif(r.vib_30d, 0) - 1            AS vib_vs_30d,
       r.vib_7d / nullif(r.vib_prev_7d, 0) - 1                            AS vib_trend,
       r.temp_7d, r.temp_7d - r.temp_prev_7d                              AS temp_trend,
       r.rpm_7d, r.power_7d,
       r.serious_7d, r.serious_14d, r.critical_7d, r.minor_7d,
       1000.0 * r.serious_7d / nullif(r.produced_7d, 0)                   AS serious_per_1k_7d,
       greatest(1 - r.produced_7d / nullif(r.planned_7d, 0), 0)           AS yield_shortfall_7d,
       r.night_planned_7d / nullif(r.planned_7d, 0)                       AS night_share_7d,
       r.serious_next_7d,
       CASE WHEN r.days_next_7d = 7 THEN CAST(r.serious_next_7d >= 11 AS INT) END AS label_bad_week,
       CASE WHEN r.days_next_7d = 7
            THEN CAST(percent_rank() OVER (PARTITION BY r.day ORDER BY r.serious_next_7d) >= 0.9 AS INT) END AS label_top10_fleet
FROM rolled r JOIN workshop_demo.manufacturing.machines m USING (machine_id)
WHERE r.days_hist = 30;  -- need 30 days of history for the baselines
