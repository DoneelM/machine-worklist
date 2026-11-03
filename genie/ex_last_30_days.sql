WITH b AS (SELECT max(sensor_readings.reading_at) AS as_of FROM workshop_demo.manufacturing.sensor_readings)
SELECT sensor_readings.machine_type, round(avg(sensor_readings.vibration_mm_s), 2) AS avg_vibration_mm_s, round(avg(sensor_readings.temperature_c), 1) AS avg_temperature_c
FROM workshop_demo.manufacturing.sensor_readings CROSS JOIN b WHERE sensor_readings.reading_at > b.as_of - INTERVAL 30 DAYS GROUP BY sensor_readings.machine_type ORDER BY avg_vibration_mm_s DESC
