print("RISK MODEL FILE STARTED")

from pathlib import Path
import joblib
import pandas as pd
import numpy as np

from xgboost import XGBClassifier
from sklearn.metrics import (
    roc_auc_score,
    precision_score,
    recall_score,
)


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[2]

DATA_FILE = BASE_DIR / "ai_data" / "risk_history.csv"

MODEL_DIR = Path(__file__).resolve().parent / "models"

MODEL_DIR.mkdir(exist_ok=True)

MODEL_FILE = MODEL_DIR / "risk.joblib"


# ============================================================
# FEATURES USED BY THE MODEL
# ============================================================

FEATURES = [
    "overdue_tasks",
    "open_capas",
    "overdue_capas",
    "avg_capa_close_days_8w",
    "near_miss_4w",
    "incidents_12w",
    "critical_findings_4w",
    "expired_training_pct",
    "invalid_attendance_pct_4w",
    "low_trust_evidence_pct_4w",
    "is_monsoon",
]


# ============================================================
# TRAIN MODEL
# ============================================================

def train_model():

    print("\nLoading risk data...")

    df = pd.read_csv(DATA_FILE)

    df["week"] = pd.to_datetime(
        df["week"]
    )

    # --------------------------------------------------------
    # IMPORTANT:
    # We split by time.
    #
    # Older data = training
    # Last 4 weeks = testing
    # --------------------------------------------------------

    last_week = df["week"].max()

    test_start = (
        last_week
        - pd.Timedelta(weeks=3)
    )

    train_df = df[
        df["week"] < test_start
    ]

    test_df = df[
        df["week"] >= test_start
    ]

    X_train = train_df[FEATURES]
    y_train = train_df["y"]

    X_test = test_df[FEATURES]
    y_test = test_df["y"]

    print(
        f"Training rows: {len(train_df)}"
    )

    print(
        f"Testing rows: {len(test_df)}"
    )

    # --------------------------------------------------------
    # XGBoost
    # --------------------------------------------------------

    model = XGBClassifier(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.1,
        random_state=42,
        eval_metric="logloss",
    )

    print("\nTraining model...")

    model.fit(
        X_train,
        y_train,
    )

    # --------------------------------------------------------
    # TEST
    # --------------------------------------------------------

    probabilities = model.predict_proba(
        X_test
    )[:, 1]

    predictions = (
        probabilities >= 0.5
    ).astype(int)

    try:

        auc = roc_auc_score(
            y_test,
            probabilities,
        )

        print(
            f"\nROC-AUC: {auc:.3f}"
        )

    except ValueError:

        print(
            "\nROC-AUC could not be calculated."
        )

    precision = precision_score(
        y_test,
        predictions,
        zero_division=0,
    )

    recall = recall_score(
        y_test,
        predictions,
        zero_division=0,
    )

    print(
        f"Precision: {precision:.3f}"
    )

    print(
        f"Recall:    {recall:.3f}"
    )

    # --------------------------------------------------------
    # Save model + information needed later
    # --------------------------------------------------------

    package = {
        "model": model,
        "features": FEATURES,
        "means": X_train.mean(),
        "stds": X_train.std(),
    }

    joblib.dump(
        package,
        MODEL_FILE,
    )

    print(
        f"\nModel saved to:\n{MODEL_FILE}"
    )

    return model


# ============================================================
# RISK LEVEL
# ============================================================

def risk_level(risk_pct):

    if risk_pct < 40:
        return "low"

    if risk_pct < 70:
        return "medium"

    return "high"


# ============================================================
# FRIENDLY FEATURE NAMES
# ============================================================

FRIENDLY_NAMES = {

    "overdue_tasks":
        "Overdue compliance tasks",

    "open_capas":
        "Open CAPAs",

    "overdue_capas":
        "Overdue CAPAs",

    "avg_capa_close_days_8w":
        "Average CAPA closure time",

    "near_miss_4w":
        "Recent near-misses",

    "incidents_12w":
        "Recent incidents",

    "critical_findings_4w":
        "Critical/high findings",

    "expired_training_pct":
        "Workers with expired training",

    "invalid_attendance_pct_4w":
        "Invalid attendance",

    "low_trust_evidence_pct_4w":
        "Low-trust evidence",

    "is_monsoon":
        "Monsoon season",
}


# ============================================================
# PREDICT CURRENT RISK
# ============================================================

def predict_current_risk():

    package = joblib.load(
        MODEL_FILE
    )

    model = package["model"]

    means = package["means"]

    stds = package["stds"]

    df = pd.read_csv(
        DATA_FILE
    )

    df["week"] = pd.to_datetime(
        df["week"]
    )

    # Current week
    current_week = df["week"].max()

    current = df[
        df["week"] == current_week
    ].copy()

    X_current = current[FEATURES]

    probabilities = model.predict_proba(
        X_current
    )[:, 1]

    results = []

    importances = model.feature_importances_

    # --------------------------------------------------------
    # Calculate mine risk + reasons
    # --------------------------------------------------------

    for i, (_, row) in enumerate(
        current.iterrows()
    ):

        probability = float(
            probabilities[i]
        )

        risk_pct = round(
            probability * 100
        )

        contributions = []

        for j, feature in enumerate(
            FEATURES
        ):

            std = stds[feature]

            if std == 0:
                continue

            z = (
                row[feature]
                - means[feature]
            ) / std

            contribution = (
                importances[j] * z
            )

            if contribution > 0:

                contributions.append(
                    (
                        feature,
                        contribution,
                    )
                )

        contributions.sort(
            key=lambda x: x[1],
            reverse=True,
        )

        top = contributions[:3]

        positive_sum = sum(
            value
            for _, value in top
        )

        reasons = []

        for feature, value in top:

            if positive_sum > 0:

                impact = (
                    value
                    / positive_sum
                    * max(
                        risk_pct - 25,
                        1,
                    )
                )

            else:

                impact = 0

            reasons.append(
                {
                    "factor":
                        FRIENDLY_NAMES[
                            feature
                        ],

                    "value":
                        round(
                            float(
                                row[
                                    feature
                                ]
                            ),
                            2,
                        ),

                    "impact_pct":
                        round(
                            impact,
                        ),
                }
            )

        results.append(
            {
                "mine_id":
                    row["mine_id"],

                "mine_name":
                    row["mine_name"],

                "subsidiary":
                    row["subsidiary"],

                "risk_pct":
                    risk_pct,

                "level":
                    risk_level(
                        risk_pct
                    ),

                "reasons":
                    reasons,
            }
        )

    results.sort(
        key=lambda x: x["risk_pct"],
        reverse=True,
    )

    return results


# ============================================================
# RUN FROM TERMINAL
# ============================================================

if __name__ == "__main__":

    train_model()

    print("\nCurrent risk forecast:\n")

    results = predict_current_risk()

    for result in results:

        print(
            f"{result['mine_name']}: "
            f"{result['risk_pct']}% "
            f"({result['level']})"
        )

        for reason in result["reasons"]:

            print(
                f"    - "
                f"{reason['factor']}: "
                f"{reason['value']}"
            )