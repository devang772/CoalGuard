from app.ai.risk_model import (
    train_model,
    predict_current_risk,
)

from app.ai.anomaly import (
    detect_all_anomalies,
)

from app.ai.recurrence import (
    detect_recurring_violations,
)


# ============================================================
# RISK
# ============================================================

print("\n")
print("=" * 70)
print("1. RISK FORECAST")
print("=" * 70)

train_model()

risk_results = predict_current_risk()

for item in risk_results:

    print(
        f"{item['mine_name']}: "
        f"{item['risk_pct']}% "
        f"({item['level']})"
    )

    for reason in item[
        "reasons"
    ]:

        print(
            f"    → "
            f"{reason['factor']}"
        )


# ============================================================
# ANOMALIES
# ============================================================

print("\n")
print("=" * 70)
print("2. ANOMALY DETECTION")
print("=" * 70)

anomalies = detect_all_anomalies()

for item in anomalies[:10]:

    print(
        f"{item['score']:.2f} | "
        f"{item['type']} | "
        f"{item['mine_name']}"
    )

    print(
        f"    {item['description']}"
    )


# ============================================================
# RECURRING VIOLATIONS
# ============================================================

print("\n")
print("=" * 70)
print("3. RECURRING VIOLATIONS")
print("=" * 70)

recurring = (
    detect_recurring_violations()
)

for item in recurring:

    print(
        f"{item['label']} "
        f"→ {item['count']} occurrences"
    )

    print(
        f"    Mines: "
        f"{', '.join(item['mines'])}"
    )