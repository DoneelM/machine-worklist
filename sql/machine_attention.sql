-- Machine attention score (synthetic demo data: workshop_demo.manufacturing)
-- Window: last 14 days of available data. Weights: vibration 40%, defects 35%, yield 25%.
-- Each component is a percentile rank within machine_type, so a Press is compared with other Presses.
CREATE OR REPLACE TABLE nzlabs_031.default.machine_attention AS
WITH bounds AS (
  SELECT max(reading_at) AS as_of FROM workshop_demo.manufacturing.sensor_readings
),
vib AS (
  SELECT s.machine_id,
         avg(CASE WHEN s.reading_at >  b.as_of - INTERVAL 7 DAYS THEN vibration_mm_s END) AS vib_recent,
         avg(CASE WHEN s.reading_at <= b.as_of - INTERVAL 7 DAYS THEN vibration_mm_s END) AS vib_baseline,
         avg(CASE WHEN s.reading_at >  b.as_of - INTERVAL 7 DAYS THEN temperature_c END)  AS temp_recent
  FROM workshop_demo.manufacturing.sensor_readings s CROSS JOIN bounds b
  WHERE s.reading_at > b.as_of - INTERVAL 14 DAYS
  GROUP BY s.machine_id
),
wo AS (
  SELECT w.machine_id, sum(units_planned) AS units_planned, sum(units_produced) AS units_produced
  FROM workshop_demo.manufacturing.work_orders w CROSS JOIN bounds b
  WHERE w.started_at > b.as_of - INTERVAL 14 DAYS
  GROUP BY w.machine_id
),
dfx AS (
  SELECT d.machine_id,
         count_if(severity IN ('critical','major')) AS serious_defects,
         count_if(severity = 'critical')            AS critical_defects
  FROM workshop_demo.manufacturing.defects d CROSS JOIN bounds b
  WHERE d.detected_at > b.as_of - INTERVAL 14 DAYS
  GROUP BY d.machine_id
),
base AS (
  SELECT m.machine_id, m.plant, m.line, m.machine_type,
         v.vib_recent, v.vib_baseline, v.temp_recent,
         coalesce(v.vib_recent / nullif(v.vib_baseline, 0) - 1, 0)                         AS vib_trend,
         coalesce(f.serious_defects, 0)                                                     AS serious_defects,
         coalesce(f.critical_defects, 0)                                                    AS critical_defects,
         coalesce(1000.0 * f.serious_defects / nullif(w.units_produced, 0), 0)              AS defects_per_1k,
         coalesce(greatest(1 - w.units_produced / nullif(w.units_planned, 0), 0), 0)        AS yield_shortfall,
         w.units_planned, w.units_produced
  FROM workshop_demo.manufacturing.machines m
  LEFT JOIN vib v USING (machine_id)
  LEFT JOIN wo  w USING (machine_id)
  LEFT JOIN dfx f USING (machine_id)
),
ranked AS (
  SELECT *,
         percent_rank() OVER (PARTITION BY machine_type ORDER BY vib_trend)       AS p_vib,
         percent_rank() OVER (PARTITION BY machine_type ORDER BY defects_per_1k)  AS p_defects,
         percent_rank() OVER (PARTITION BY machine_type ORDER BY yield_shortfall) AS p_yield
  FROM base
)
SELECT *,
       round(100 * (0.40 * p_vib + 0.35 * p_defects + 0.25 * p_yield), 1) AS attention_score,
       -- top_driver = the component that is most unusual for this machine (unweighted percentile)
       CASE greatest(p_vib, p_defects, p_yield)
         WHEN p_vib     THEN 'vibration'
         WHEN p_defects THEN 'defects'
         ELSE 'yield' END                                                AS top_driver,
       (SELECT as_of FROM bounds)                                        AS as_of
FROM ranked;
