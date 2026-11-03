# Databricks notebook source
# MAGIC %md
# MAGIC # 7-day failure early warning (synthetic demo data)
# MAGIC Predicts whether a machine will be in the **fleet's worst 10%** by major/critical defects over the next 7 days.
# MAGIC (An absolute "11+ defects" label drifted from ~9% to ~41% of days as the fleet wore, so the target is relative.)
# MAGIC Reads `nzlabs_031.default.machine_features_daily` (built by `sql/machine_features_daily.sql`).
# MAGIC
# MAGIC 1. Time split: train on older days, test on the last ~3 weeks, with a 7-day gap so training labels never see test days.
# MAGIC 1b. Every numeric feature is a **percentile within its machine type on that day**, so wear-driven drift doesn't break the model.
# MAGIC 2. Gradient boosting (scikit-learn HistGradientBoosting), compared with the current 40/35/25 rule score on **precision@20**: of the 20 machines a crew would inspect each day, how many had a bad week.
# MAGIC 3. Register in Unity Catalog, score the latest day into `machine_risk_7d` with the top 3 drivers per machine.
# MAGIC    Drivers are **what-if** contributions, not SHAP: risk now minus risk with that one reading set to a typical
# MAGIC    training value. Serverless here has no PyPI access, so LightGBM/SHAP aren't available.

# COMMAND ----------

import json

import mlflow
import numpy as np
import pandas as pd
from mlflow.models import infer_signature
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.inspection import permutation_importance
from sklearn.metrics import roc_auc_score

CATALOG_SCHEMA = "nzlabs_031.default"
MODEL_NAME = f"{CATALOG_SCHEMA}.failure_risk_7d"
CREW_CAPACITY = 20  # machines inspected per day
LABEL = "label_top10_fleet"  # worst 10% of the fleet next week; relative, so it holds as machines wear

FEATURES = [
    "age_days", "vib_7d", "vib_14d", "vib_vs_30d", "vib_trend", "temp_7d", "temp_trend",
    "rpm_7d", "power_7d", "serious_7d", "serious_14d", "critical_7d", "minor_7d",
    "serious_per_1k_7d", "yield_shortfall_7d", "night_share_7d", "machine_type", "plant",
]
CATEGORICAL = ["machine_type", "plant"]
LABELS = {  # plain-English names for the app
    "age_days": "Machine age", "vib_7d": "Vibration (7d avg)", "vib_14d": "Vibration (14d avg)",
    "vib_vs_30d": "Vibration vs 30-day baseline", "vib_trend": "Vibration trend (week on week)",
    "temp_7d": "Temperature (7d avg)", "temp_trend": "Temperature trend", "rpm_7d": "Spindle RPM",
    "power_7d": "Power draw", "serious_7d": "Serious defects (7d)", "serious_14d": "Serious defects (14d)",
    "critical_7d": "Critical defects (7d)", "minor_7d": "Minor defects (7d)",
    "serious_per_1k_7d": "Serious defects per 1k units", "yield_shortfall_7d": "Yield shortfall (7d)",
    "night_share_7d": "Night-shift share", "machine_type": "Machine type", "plant": "Plant",
}

df = spark.table(f"{CATALOG_SCHEMA}.machine_features_daily").toPandas()
df["day"] = pd.to_datetime(df["day"])
for c in CATEGORICAL:
    df[c] = df[c].astype("category")
num_cols = [c for c in FEATURES if c not in CATEGORICAL]
df[num_cols] = df[num_cols].astype(float)
# Machines keep wearing, so absolute levels drift past anything seen in training (bad weeks: ~9% of training
# days, ~41% of test days). Rank each reading within its machine type on that day instead, as the rule does.
RAW = df[num_cols].copy()  # kept for showing real values in the app
df[num_cols] = df.groupby(["day", "machine_type"], observed=True)[num_cols].rank(pct=True)
# ...and across the whole fleet that day, so a machine that's extreme for the plant still stands out.
for c in num_cols:
    df[f"{c}_fleet"] = RAW[c].groupby(df["day"]).rank(pct=True)
MODEL_FEATURES = FEATURES + [f"{c}_fleet" for c in num_cols]

labelled = df[df[LABEL].notna()].copy()
last_labelled = labelled["day"].max()
test_start = last_labelled - pd.Timedelta(days=20)
train_end = test_start - pd.Timedelta(days=8)  # 7-day embargo: training labels stop before test days
train = labelled[labelled["day"] <= train_end]
test = labelled[labelled["day"] >= test_start]

# COMMAND ----------

def rule_score(frame: pd.DataFrame) -> pd.Series:
    """The worklist's 40/35/25 attention score, recomputed per day (7-day windows)."""
    g = frame.groupby(["day", "machine_type"], observed=True)
    p = lambda col: g[col].rank(pct=True)
    return 0.40 * p("vib_trend") + 0.35 * p("serious_per_1k_7d") + 0.25 * p("yield_shortfall_7d")


def precision_at_k(frame: pd.DataFrame, score: str, k: int = CREW_CAPACITY) -> float:
    top = frame.sort_values(score, ascending=False).groupby("day").head(k)
    return float(top[LABEL].mean())


params = {"learning_rate": 0.05, "max_iter": 300, "max_leaf_nodes": 31, "min_samples_leaf": 50,
          "l2_regularization": 1.0, "categorical_features": "from_dtype", "random_state": 42}

mlflow.set_registry_uri("databricks-uc")
with mlflow.start_run(run_name="failure_risk_7d") as run:
    model = HistGradientBoostingClassifier(**params)
    model.fit(train[MODEL_FEATURES], train[LABEL].astype(int))

    test = test.assign(model_score=model.predict_proba(test[MODEL_FEATURES])[:, 1], rule_score=rule_score(test))
    metrics = {
        "base_rate": float(test[LABEL].mean()),
        "model_auc": roc_auc_score(test[LABEL], test["model_score"]),
        "rule_auc": roc_auc_score(test[LABEL], test["rule_score"]),
        "model_precision_at_20": precision_at_k(test, "model_score"),
        "rule_precision_at_20": precision_at_k(test, "rule_score"),
        "train_rows": len(train), "test_rows": len(test),
    }
    mlflow.log_params({**params, "train_end": str(train_end.date()), "test_start": str(test_start.date()),
                       "label": "worst 10% of fleet by major/critical defects, next 7 days"})
    mlflow.log_metrics(metrics)
    sample_test = test.sample(n=min(6000, len(test)), random_state=0)
    perm = permutation_importance(model, sample_test[MODEL_FEATURES], sample_test[LABEL].astype(int),
                                  scoring="roc_auc", n_repeats=3, random_state=0)
    importance = pd.Series(perm.importances_mean, index=MODEL_FEATURES).sort_values(ascending=False)  # AUC lost when shuffled
    mlflow.log_dict(importance.round(4).to_dict(), "permutation_importance_auc.json")

    sample = train[MODEL_FEATURES].head(50)
    info = mlflow.sklearn.log_model(model, "model", signature=infer_signature(sample, model.predict_proba(sample)[:, 1]),
                                    input_example=sample.head(3), registered_model_name=MODEL_NAME)

# COMMAND ----------

# Score the latest day, then a what-if per feature: set it to a typical training value, re-score, take the difference.
latest = df[df["day"] == df["day"].max()].copy()
latest["risk_7d"] = model.predict_proba(latest[MODEL_FEATURES])[:, 1]
typical = {c: train[c].mode()[0] if c in CATEGORICAL else 0.5 for c in FEATURES}  # 0.5 = median machine of its type
contrib = np.zeros((len(latest), len(FEATURES)))
for j, c in enumerate(FEATURES):
    alt = latest[MODEL_FEATURES].copy()
    if c in CATEGORICAL:
        alt[c] = pd.Categorical([typical[c]] * len(alt), categories=latest[c].cat.categories)
    else:
        alt[c] = alt[f"{c}_fleet"] = 0.5  # what if this reading were median, for its type and the fleet
    contrib[:, j] = latest["risk_7d"].to_numpy() - model.predict_proba(alt)[:, 1]

def _driver(idx, i: int, c: np.ndarray) -> dict:
    f = FEATURES[i]
    if f in CATEGORICAL:
        return {"feature": f, "label": LABELS[f], "value": str(latest.at[idx, f]), "percentile": None,
                "contribution": round(float(c[i]), 3)}
    return {"feature": f, "label": LABELS[f], "value": round(float(RAW.at[idx, f]), 3),
            "percentile": round(float(latest.at[idx, f]), 3), "contribution": round(float(c[i]), 3)}


drivers = [json.dumps([_driver(idx, i, c) for i in np.argsort(-c)[:3]]) for idx, c in zip(latest.index, contrib)]
latest["drivers"] = drivers
latest["risk_rank"] = latest["risk_7d"].rank(ascending=False, method="first").astype(int)
latest["model_version"] = str(info.registered_model_version)

latest["risk_lift"] = (latest["risk_7d"] / latest["risk_7d"].mean()).round(2)  # x the fleet average today
out = latest[["machine_id", "day", "risk_7d", "risk_lift", "risk_rank", "drivers", "model_version"]].rename(columns={"day": "scored_for_day"})
out["risk_7d"] = out["risk_7d"].round(4)
spark.createDataFrame(out).write.mode("overwrite").option("overwriteSchema", "true").saveAsTable(f"{CATALOG_SCHEMA}.machine_risk_7d")
spark.sql(f"COMMENT ON TABLE {CATALOG_SCHEMA}.machine_risk_7d IS "
          "'7-day risk of being in the fleet''s worst 10% per machine (synthetic demo data). drivers = top 3 what-if contributions (risk minus risk with that feature at a typical value) as JSON.'")

# One-row evaluation summary the app shows next to the model column.
evaluation = pd.DataFrame([{
    "model_version": str(info.registered_model_version), "label": "Worst 10% of fleet by major/critical defects, next 7 days",
    "train_end": train_end.date(), "test_start": test_start.date(), "test_end": last_labelled.date(),
    "crew_capacity": CREW_CAPACITY, **{k: float(v) for k, v in metrics.items() if k.endswith(("auc", "_20", "rate"))},
}])
spark.createDataFrame(evaluation).write.mode("overwrite").option("overwriteSchema", "true").saveAsTable(f"{CATALOG_SCHEMA}.failure_risk_eval")

dbutils.notebook.exit(json.dumps({
    **{k: round(v, 4) if isinstance(v, float) else v for k, v in metrics.items()},
    "model_version": str(info.registered_model_version), "run_id": run.info.run_id,
    "train_end": str(train_end.date()), "test_start": str(test_start.date()),
    "top_features": importance.head(6).round(4).to_dict(), "scored_rows": len(out),
    "high_risk_machines": int((out["risk_7d"] >= 0.5).sum()),
}))
