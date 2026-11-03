SELECT machine_attention.machine_id, machine_attention.plant, machine_attention.machine_type, machine_attention.attention_score, machine_attention.top_driver, machine_risk_7d.risk_rank, machine_risk_7d.risk_lift
FROM nzlabs_031.default.machine_attention JOIN nzlabs_031.default.machine_risk_7d ON machine_attention.machine_id = machine_risk_7d.machine_id
WHERE machine_risk_7d.risk_rank <= 20 ORDER BY machine_risk_7d.risk_rank
