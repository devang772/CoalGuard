print("RISK MODEL FILE STARTED")

from pathlib import Path

import numpy as np
import pandas as pd

from sklearn.ensemble import IsolationForest


BASE_DIR = Path(__file__).resolve().parents[2]

DATA_DIR = BASE_DIR / "ai_data"


# ============================================================
# PRODUCTION / DISPATCH
# ============================================================

def detect_production_anomalies():

    df = pd.read_csv(
        DATA_DIR / "production.csv"
    )

    df["gap"] = (
        df["produced_t"]
        - df["dispatched_t"]
    )

    df["gap_ratio"] = (
        df["gap"]
        / df["produced_t"].replace(
            0,
            np.nan,
        )
    )

    results = []

    for mine_name, group in df.groupby(
        "mine_name"
    ):

        if len(group) < 20:
            continue

        X = group[
            ["gap", "gap_ratio"]
        ].fillna(0)

        model = IsolationForest(
            contamination=0.03,
            random_state=42,
        )

        model.fit(X)

        # Lower decision_function =
        # more anomalous

        raw = -model.decision_function(X)

        min_raw = raw.min()

        max_raw = raw.max()

        if max_raw == min_raw:

            scores = np.zeros(
                len(raw)
            )

        else:

            scores = (
                raw - min_raw
            ) / (
                max_raw - min_raw
            )

        expected = (
            group["gap"]
            .median()
        )

        for (_, row), score in zip(
            group.iterrows(),
            scores,
        ):

            results.append(
                {
                    "id":
                        f"pdg-{row['mine_name']}-{row['date']}",

                    "mine_name":
                        row["mine_name"],

                    "type":
                        "production_dispatch_gap",

                    "date":
                        row["date"],

                    "value":
                        round(
                            row["gap"],
                            2,
                        ),

                    "expected":
                        round(
                            expected,
                            2,
                        ),

                    "score":
                        round(
                            float(score),
                            3,
                        ),

                    "description":
                        (
                            f"Produced "
                            f"{row['produced_t']:,.0f} t "
                            f"but dispatched only "
                            f"{row['dispatched_t']:,.0f} t "
                            f"(gap "
                            f"{row['gap']:,.0f} t "
                            f"vs usual ~"
                            f"{expected:,.0f} t)."
                        ),
                }
            )

    return results


# ============================================================
# ATTENDANCE
# ============================================================

def detect_attendance_anomalies():

    df = pd.read_csv(
        DATA_DIR / "attendance.csv"
    )

    df["date"] = pd.to_datetime(
        df["date"]
    )

    results = []

    for contractor, group in df.groupby(
        "contractor"
    ):

        group = group.sort_values(
            "date"
        ).copy()

        # Previous 14 days only
        group["median_14d"] = (
            group["present"]
            .shift(1)
            .rolling(
                14,
                min_periods=7,
            )
            .median()
        )

        group["mad_14d"] = (
            group["present"]
            .shift(1)
            .rolling(
                14,
                min_periods=7,
            )
            .apply(
                lambda x:
                    np.median(
                        np.abs(
                            x
                            - np.median(x)
                        )
                    ),
                raw=True,
            )
        )

        for _, row in group.iterrows():

            median = row["median_14d"]
            mad = row["mad_14d"]

            if pd.isna(median):
                continue

            if pd.isna(mad) or mad == 0:

                is_anomaly = (
                    row["present"]
                    > median + 15
                )

                score = (
                    1.0
                    if is_anomaly
                    else 0.0
                )

            else:

                distance = (
                    row["present"]
                    - median
                ) / mad

                is_anomaly = (
                    distance > 3
                )

                score = min(
                    max(
                        distance / 10,
                        0,
                    ),
                    1,
                )

            if is_anomaly:

                results.append(
                    {
                        "id":
                            f"attendance-{contractor}-{row['date'].date()}",

                        "mine_name":
                            row["mine_name"],

                        "type":
                            "attendance_spike",

                        "date":
                            str(
                                row["date"].date()
                            ),

                        "value":
                            int(
                                row["present"]
                            ),

                        "expected":
                            round(
                                median,
                                1,
                            ),

                        "score":
                            round(
                                float(score),
                                3,
                            ),

                        "description":
                            (
                                f"{contractor} recorded "
                                f"{row['present']} workers "
                                f"vs usual ~"
                                f"{median:.0f}."
                            ),
                    }
                )

    return results


# ============================================================
# ENVIRONMENT
# ============================================================

def detect_environment_anomalies():

    df = pd.read_csv(
        DATA_DIR / "environment.csv"
    )

    df["date"] = pd.to_datetime(
        df["date"]
    )

    results = []

    for mine_name, group in df.groupby(
        "mine_name"
    ):

        group = group.sort_values(
            "date"
        ).copy()

        group["median_14d"] = (
            group["pm10"]
            .shift(1)
            .rolling(
                14,
                min_periods=7,
            )
            .median()
        )

        group["mad_14d"] = (
            group["pm10"]
            .shift(1)
            .rolling(
                14,
                min_periods=7,
            )
            .apply(
                lambda x:
                    np.median(
                        np.abs(
                            x
                            - np.median(x)
                        )
                    ),
                raw=True,
            )
        )

        for _, row in group.iterrows():

            median = row["median_14d"]
            mad = row["mad_14d"]

            if pd.isna(median):
                continue

            if pd.isna(mad) or mad == 0:

                score = (
                    1.0
                    if row["pm10"]
                    > median + 30
                    else 0
                )

            else:

                distance = (
                    row["pm10"]
                    - median
                ) / mad

                score = min(
                    max(
                        distance / 10,
                        0,
                    ),
                    1,
                )

            # Also flag very high PM10
            if (
                row["pm10"] > 100
                or score > 0.5
            ):

                results.append(
                    {
                        "id":
                            f"env-{row['mine_name']}-{row['date'].date()}",

                        "mine_name":
                            row["mine_name"],

                        "type":
                            "env_spike",

                        "date":
                            str(
                                row["date"].date()
                            ),

                        "value":
                            round(
                                row["pm10"],
                                2,
                            ),

                        "expected":
                            round(
                                median,
                                2,
                            ),

                        "score":
                            round(
                                float(score),
                                3,
                            ),

                        "description":
                            (
                                f"PM10 measured "
                                f"{row['pm10']:.1f} "
                                f"µg/m³ vs recent "
                                f"normal ~"
                                f"{median:.1f}."
                            ),
                    }
                )

    return results


# ============================================================
# RUN ALL
# ============================================================

def detect_all_anomalies():

    results = []

    results.extend(
        detect_production_anomalies()
    )

    results.extend(
        detect_attendance_anomalies()
    )

    results.extend(
        detect_environment_anomalies()
    )

    results.sort(
        key=lambda x: x["score"],
        reverse=True,
    )

    return results[:50]


if __name__ == "__main__":

    results = detect_all_anomalies()

    print(
        f"\nFound {len(results)} anomalies:\n"
    )

    for item in results[:20]:

        print(
            f"{item['score']:.2f} | "
            f"{item['type']} | "
            f"{item['mine_name']} | "
            f"{item['date']}"
        )

        print(
            f"    {item['description']}"
        )