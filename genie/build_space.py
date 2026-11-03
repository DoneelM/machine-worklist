"""Builds genie/space.json, the serialized Genie space for 'Ask the data'. Re-run after editing, then update-space."""
import json
import pathlib

D = "workshop_demo.manufacturing"
M = "nzlabs_031.default"
ex = lambda f: [pathlib.Path(f).read_text().strip()]
cat = lambda *cols: [{"column_name": c, "enable_format_assistance": True, "enable_entity_matching": True} for c in cols]


def cfg(cols):
    return sorted(cols, key=lambda c: c["column_name"])


space = {
    "version": 2,
    "config": {"sample_questions": [
        {"id": f"1000000000000000000000000000000{i}", "question": [q]} for i, q in enumerate([
            "Which 10 machines have the highest attention score, and what's driving each?",
            "Which plant had the most critical defects in July 2026?",
            "How do serious defects per 1,000 units compare between day and night shifts?",
            "Average vibration and temperature by machine type over the last 30 days",
            "Which machines does the model rank in its top 20 but the attention score doesn't?",
        ], start=1)
    ]},
    "data_sources": {"tables": sorted([
        {"identifier": f"{D}.defects", "column_configs": cfg(cat("defect_type", "plant", "shift") + [
            {"column_name": "severity", "description": ["minor, major or critical. 'Serious' means major + critical."],
             "synonyms": ["serious", "criticality"], "enable_format_assistance": True, "enable_entity_matching": True}])},
        {"identifier": f"{D}.machines", "column_configs": cfg(cat("line", "machine_type", "plant"))},
        {"identifier": f"{D}.sensor_readings", "column_configs": cfg(cat("machine_type", "plant") + [
            {"column_name": "vibration_mm_s", "synonyms": ["vibration", "vib"]},
            {"column_name": "temperature_c", "synonyms": ["temperature", "temp", "heat"]}])},
        {"identifier": f"{D}.work_orders", "column_configs": cfg(cat("plant", "shift") + [
            {"column_name": "units_produced", "synonyms": ["output", "production"]}])},
        {"identifier": f"{M}.machine_attention", "column_configs": cfg([
            {"column_name": "attention_score", "description": [
                "0-100 rule score over the last 14 days: 30% vibration trend, 15% temperature change (either direction), "
                "30% serious defects per 1k units, 25% yield shortfall; each a percentile within machine type."],
             "synonyms": ["score", "priority", "attention"]},
            {"column_name": "top_driver", "description": ["The component most unusual for this machine: vibration, temperature, defects or yield."],
             "synonyms": ["reason", "why"], "enable_format_assistance": True, "enable_entity_matching": True},
            {"column_name": "temp_change", "description": ["7-day average temperature minus the prior 7 days, in °C."]},
        ])},
        {"identifier": f"{M}.machine_risk_7d", "column_configs": cfg([
            {"column_name": "risk_7d", "description": ["Model probability the machine is in the fleet's worst 10% for major/critical defects over the next 7 days."],
             "synonyms": ["risk", "failure risk", "predicted risk"]},
            {"column_name": "risk_lift", "description": ["risk_7d as a multiple of today's fleet average."], "synonyms": ["lift"]},
            {"column_name": "risk_rank", "description": ["1 = highest model risk in the fleet."], "synonyms": ["model rank"]},
            {"column_name": "drivers", "exclude": True},
        ])},
    ], key=lambda t: t["identifier"])},
    "instructions": {
        "text_instructions": [{"id": "30000000000000000000000000000001", "content": [
            "## PURPOSE\n- Answer maintenance and quality questions about 400 machines across 5 plants for plant and maintenance leads.\n\n"
            "## DISAMBIGUATION\n- 'Serious defects' means defects.severity in major or critical.\n"
            "- Relative dates ('last 30 days', 'this month') are relative to the latest sensor_readings.reading_at (data ends 1 Aug 2026), not today.\n\n"
            "## Instructions you must follow when providing summaries\n- Say once that this is synthetic demo data.\n"
            "- State the date range used."]}],
        "example_question_sqls": [
            {"id": "20000000000000000000000000000001", "question": ["Serious defects per 1,000 units by shift"], "sql": ex("genie/ex_shift_rate.sql"),
             "usage_guidance": ["Rates: aggregate defects and work_orders separately, then join, so units aren't double counted."]},
            {"id": "20000000000000000000000000000002", "question": ["Average vibration by machine type over the last 30 days"], "sql": ex("genie/ex_last_30_days.sql"),
             "usage_guidance": ["Relative time windows anchor on the latest reading, not current_date()."]},
            {"id": "20000000000000000000000000000003", "question": ["Machines in the model's top 20"], "sql": ex("genie/ex_model_top20.sql")},
        ],
        "join_specs": [
            {"id": f"4000000000000000000000000000000{i}", "left": {"identifier": f"{D}.machines", "alias": "machines"},
             "right": {"identifier": r, "alias": a}, "sql": [f"`machines`.`machine_id` = `{a}`.`machine_id`", rt]}
            for i, (r, a, rt) in enumerate([
                (f"{D}.defects", "defects", "--rt=FROM_RELATIONSHIP_TYPE_ONE_TO_MANY--"),
                (f"{D}.sensor_readings", "sensor_readings", "--rt=FROM_RELATIONSHIP_TYPE_ONE_TO_MANY--"),
                (f"{D}.work_orders", "work_orders", "--rt=FROM_RELATIONSHIP_TYPE_ONE_TO_MANY--"),
                (f"{M}.machine_attention", "machine_attention", "--rt=FROM_RELATIONSHIP_TYPE_ONE_TO_ONE--"),
                (f"{M}.machine_risk_7d", "machine_risk_7d", "--rt=FROM_RELATIONSHIP_TYPE_ONE_TO_ONE--"),
            ], start=1)
        ] + [{"id": "40000000000000000000000000000006", "left": {"identifier": f"{D}.defects", "alias": "defects"},
              "right": {"identifier": f"{D}.work_orders", "alias": "work_orders"},
              "sql": ["`defects`.`work_order_id` = `work_orders`.`work_order_id`", "--rt=FROM_RELATIONSHIP_TYPE_MANY_TO_ONE--"]}],
    },
}
pathlib.Path("genie/space.json").write_text(json.dumps(space, indent=1))
print("ok", len(space["data_sources"]["tables"]), "tables")
