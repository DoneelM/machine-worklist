WITH d AS (SELECT defects.shift, count_if(defects.severity IN ('major', 'critical')) AS serious_defects FROM workshop_demo.manufacturing.defects GROUP BY defects.shift),
w AS (SELECT work_orders.shift, sum(work_orders.units_produced) AS units_produced FROM workshop_demo.manufacturing.work_orders GROUP BY work_orders.shift)
SELECT d.shift, d.serious_defects, w.units_produced, round(1000.0 * d.serious_defects / w.units_produced, 3) AS serious_per_1k_units FROM d JOIN w USING (shift) ORDER BY serious_per_1k_units DESC
