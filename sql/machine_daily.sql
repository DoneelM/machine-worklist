-- Daily per-machine history for the detail drawer (last 30 days of available data).
CREATE OR REPLACE TABLE nzlabs_031.default.machine_daily AS
WITH b AS (SELECT max(reading_at) AS as_of FROM workshop_demo.manufacturing.sensor_readings),
s AS (
  SELECT machine_id, date(reading_at) AS day,
         round(avg(vibration_mm_s), 3) AS vibration_mm_s, round(avg(temperature_c), 2) AS temperature_c
  FROM workshop_demo.manufacturing.sensor_readings, b
  WHERE reading_at > b.as_of - INTERVAL 30 DAYS GROUP BY ALL
),
w AS (
  SELECT machine_id, date(started_at) AS day, sum(units_planned) AS units_planned, sum(units_produced) AS units_produced
  FROM workshop_demo.manufacturing.work_orders, b
  WHERE started_at > b.as_of - INTERVAL 30 DAYS GROUP BY ALL
),
d AS (
  SELECT machine_id, date(detected_at) AS day,
         count_if(severity = 'critical') AS critical_defects, count_if(severity = 'major') AS major_defects,
         count_if(severity = 'minor') AS minor_defects
  FROM workshop_demo.manufacturing.defects, b
  WHERE detected_at > b.as_of - INTERVAL 30 DAYS GROUP BY ALL
)
SELECT s.machine_id, s.day, s.vibration_mm_s, s.temperature_c,
       coalesce(w.units_planned, 0) AS units_planned, coalesce(w.units_produced, 0) AS units_produced,
       coalesce(d.critical_defects, 0) AS critical_defects, coalesce(d.major_defects, 0) AS major_defects,
       coalesce(d.minor_defects, 0) AS minor_defects
FROM s LEFT JOIN w USING (machine_id, day) LEFT JOIN d USING (machine_id, day)
WHERE s.day < (SELECT date(as_of) FROM b);  -- drop the partial last day
