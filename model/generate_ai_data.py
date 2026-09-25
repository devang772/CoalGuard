from pathlib import Path
import numpy as np
import pandas as pd


# ============================================================
# BASIC SETTINGS
# ============================================================

RNG = np.random.default_rng(42)

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "ai_data"

DATA_DIR.mkdir(exist_ok=True)


# ============================================================
# MINES
# ============================================================

MINES = [
    ("1", "Kusunda OCP", "BCCL", "opencast"),
    ("2", "Bastacolla OCP", "BCCL", "opencast"),
    ("3", "Moonidih UG", "BCCL", "underground"),
    ("4", "Lodna OCP", "BCCL", "opencast"),
    ("5", "Sijua OCP", "BCCL", "opencast"),
    ("6", "Barora OCP", "BCCL", "opencast"),
    ("7", "Govindpur OCP", "BCCL", "opencast"),
    ("8", "Block-II OCP", "BCCL", "opencast"),
    ("9", "Muraidih OCP", "BCCL", "opencast"),
    ("10", "Maheshpur OCP", "BCCL", "opencast"),
    ("11", "Shatabdi OCP", "BCCL", "opencast"),
    ("12", "Eastern UG", "BCCL", "underground"),
]


# ============================================================
# 1. RISK DATA
# ============================================================

def generate_risk_data():

    weeks = pd.date_range(
        start="2026-01-05",
        end="2026-09-21",
        freq="W-MON",
    )

    rows = []

    for mine_id, mine_name, subsidiary, mine_type in MINES:

        for week in weeks:

            month = week.month

            is_monsoon = 1 if month in [7, 8, 9] else 0

            # ------------------------------------------------
            # Base values
            # ------------------------------------------------

            overdue_tasks = RNG.poisson(
                2 + 1.0 * is_monsoon
            )

            open_capas = RNG.poisson(
                4 + 1.0 * is_monsoon
            )

            overdue_capas = RNG.poisson(
                1 + 0.5 * is_monsoon
            )

            avg_capa_close_days_8w = max(
                1,
                RNG.normal(
                    6 + 2 * is_monsoon,
                    2,
                ),
            )

            near_miss_4w = RNG.poisson(
                2 + 1.5 * is_monsoon
            )

            incidents_12w = RNG.poisson(
                1 + 0.8 * is_monsoon
            )

            critical_findings_4w = RNG.poisson(
                1 + 0.7 * is_monsoon
            )

            expired_training_pct = max(
                0,
                RNG.normal(10, 5),
            )

            invalid_attendance_pct_4w = max(
                0,
                RNG.normal(4, 2),
            )

            low_trust_evidence_pct_4w = max(
                0,
                RNG.normal(5, 2),
            )

            # ------------------------------------------------
            # PLANTED PATTERN:
            # Kusunda OCP becomes increasingly risky
            # during the last 8 weeks.
            # ------------------------------------------------

            if mine_name == "Kusunda OCP":

                weeks_from_end = (
                    weeks.max() - week
                ).days // 7

                if weeks_from_end <= 8:

                    severity = 9 - weeks_from_end

                    overdue_tasks += severity
                    open_capas += severity
                    overdue_capas += severity // 2
                    near_miss_4w += severity
                    incidents_12w += severity // 3
                    critical_findings_4w += severity // 2
                    expired_training_pct += severity * 1.5

            # ------------------------------------------------
            # Underground mines have slightly different pattern
            # ------------------------------------------------

            if mine_type == "underground":
                near_miss_4w += 1
                critical_findings_4w += RNG.integers(0, 2)

            # ------------------------------------------------
            # Calculate probability of serious event
            #
            # This is ONLY to create demo labels.
            # It is NOT our real ML model.
            # ------------------------------------------------

            latent_score = (
                0.12 * overdue_tasks
                + 0.14 * overdue_capas
                + 0.08 * open_capas
                + 0.10 * near_miss_4w
                + 0.07 * incidents_12w
                + 0.10 * critical_findings_4w
                + 0.025 * expired_training_pct
                + 0.08 * invalid_attendance_pct_4w
                + 0.05 * low_trust_evidence_pct_4w
                + 0.8 * is_monsoon
            )

            probability = 1 / (
                1 + np.exp(
                    -(latent_score - 4.5)
                )
            )

            # Future event:
            # 1 = serious event next week
            future_event = RNG.binomial(
                1,
                probability,
            )

            rows.append(
                {
                    "mine_id": mine_id,
                    "mine_name": mine_name,
                    "subsidiary": subsidiary,
                    "mine_type": mine_type,
                    "week": week.strftime("%Y-%m-%d"),

                    "overdue_tasks": int(overdue_tasks),
                    "open_capas": int(open_capas),
                    "overdue_capas": int(overdue_capas),
                    "avg_capa_close_days_8w": round(
                        avg_capa_close_days_8w,
                        2,
                    ),
                    "near_miss_4w": int(near_miss_4w),
                    "incidents_12w": int(incidents_12w),
                    "critical_findings_4w": int(
                        critical_findings_4w
                    ),
                    "expired_training_pct": round(
                        expired_training_pct,
                        2,
                    ),
                    "invalid_attendance_pct_4w": round(
                        invalid_attendance_pct_4w,
                        2,
                    ),
                    "low_trust_evidence_pct_4w": round(
                        low_trust_evidence_pct_4w,
                        2,
                    ),
                    "is_monsoon": is_monsoon,

                    # Target
                    "y": future_event,
                }
            )

    df = pd.DataFrame(rows)

    df.to_csv(
        DATA_DIR / "risk_history.csv",
        index=False,
    )

    print(
        f"Created {len(df)} risk-history rows."
    )


# ============================================================
# 2. PRODUCTION / DISPATCH DATA
# ============================================================

def generate_production_data():

    dates = pd.date_range(
        start="2026-06-01",
        end="2026-09-21",
        freq="D",
    )

    rows = []

    for mine_id, mine_name, subsidiary, mine_type in MINES:

        for date in dates:

            produced = max(
                0,
                RNG.normal(4200, 300),
            )

            dispatched = max(
                0,
                produced - abs(
                    RNG.normal(300, 100)
                ),
            )

            # PLANTED ANOMALIES:
            # Bastacolla has several large gaps.

            if (
                mine_name == "Bastacolla OCP"
                and date.day in [5, 17, 28]
            ):
                dispatched = produced * 0.50

            rows.append(
                {
                    "mine_id": mine_id,
                    "mine_name": mine_name,
                    "date": date.strftime(
                        "%Y-%m-%d"
                    ),
                    "produced_t": round(
                        produced,
                        2,
                    ),
                    "dispatched_t": round(
                        dispatched,
                        2,
                    ),
                }
            )

    df = pd.DataFrame(rows)

    df.to_csv(
        DATA_DIR / "production.csv",
        index=False,
    )

    print(
        f"Created {len(df)} production rows."
    )


# ============================================================
# 3. ATTENDANCE DATA
# ============================================================

def generate_attendance_data():

    dates = pd.date_range(
        start="2026-06-01",
        end="2026-09-21",
        freq="D",
    )

    contractors = [
        ("Moonidih Contractor A", "3"),
        ("Moonidih Contractor B", "3"),
        ("Kusunda Contractor A", "1"),
        ("Bastacolla Contractor A", "2"),
    ]

    rows = []

    for contractor, mine_id in contractors:

        mine_name = next(
            x[1]
            for x in MINES
            if x[0] == mine_id
        )

        for date in dates:

            base = {
                "Moonidih Contractor A": 100,
                "Moonidih Contractor B": 85,
                "Kusunda Contractor A": 120,
                "Bastacolla Contractor A": 100,
            }[contractor]

            present = int(
                max(
                    0,
                    RNG.normal(base, 5),
                )
            )

            # PLANTED GHOST-SHIFT-LIKE SPIKES

            if (
                contractor
                == "Moonidih Contractor A"
                and date.day in [8, 22]
            ):
                present *= 2

            rows.append(
                {
                    "contractor": contractor,
                    "mine_id": mine_id,
                    "mine_name": mine_name,
                    "date": date.strftime(
                        "%Y-%m-%d"
                    ),
                    "present": present,
                }
            )

    df = pd.DataFrame(rows)

    df.to_csv(
        DATA_DIR / "attendance.csv",
        index=False,
    )

    print(
        f"Created {len(df)} attendance rows."
    )


# ============================================================
# 4. ENVIRONMENT DATA
# ============================================================

def generate_environment_data():

    dates = pd.date_range(
        start="2026-06-01",
        end="2026-09-21",
        freq="D",
    )

    rows = []

    for mine_id, mine_name, subsidiary, mine_type in MINES:

        for date in dates:

            pm10 = max(
                10,
                RNG.normal(55, 10),
            )

            # PLANTED PM10 SPIKES

            if (
                mine_name == "Lodna OCP"
                and date.day in [10, 20]
            ):
                pm10 = RNG.normal(150, 15)

            rows.append(
                {
                    "mine_id": mine_id,
                    "mine_name": mine_name,
                    "date": date.strftime(
                        "%Y-%m-%d"
                    ),
                    "pm10": round(
                        pm10,
                        2,
                    ),
                }
            )

    df = pd.DataFrame(rows)

    df.to_csv(
        DATA_DIR / "environment.csv",
        index=False,
    )

    print(
        f"Created {len(df)} environmental rows."
    )


# ============================================================
# 5. FINDINGS DATA
# ============================================================

def generate_findings_data():

    rows = []

    findings = [
        (
            "Kusunda OCP",
            "haul_road",
            "Coal spillage on haul road near bench 3",
        ),
        (
            "Kusunda OCP",
            "haul_road",
            "Spillage of coal observed on haul road",
        ),
        (
            "Kusunda OCP",
            "haul_road",
            "Coal spilled along the haul road",
        ),
        (
            "Kusunda OCP",
            "haul_road",
            "Coal accumulation found on haul road",
        ),
        (
            "Kusunda OCP",
            "haul_road",
            "Spilled coal creating hazard on road",
        ),
        (
            "Kusunda OCP",
            "haul_road",
            "Haul road affected by coal spillage",
        ),

        (
            "Bastacolla OCP",
            "haul_road",
            "Coal spillage observed on haul road",
        ),
        (
            "Bastacolla OCP",
            "haul_road",
            "Coal spilled near haul road turn",
        ),
        (
            "Bastacolla OCP",
            "haul_road",
            "Spillage creating slipping hazard",
        ),
        (
            "Bastacolla OCP",
            "haul_road",
            "Coal accumulation on haul roadway",
        ),

        (
            "Kusunda OCP",
            "drainage",
            "Water accumulation near ramp",
        ),
        (
            "Lodna OCP",
            "dust",
            "Excessive dust observed near crusher",
        ),
    ]

    start = pd.Timestamp("2026-07-01")

    for i, (mine_name, category, description) in enumerate(
        findings
    ):

        rows.append(
            {
                "finding_id": i + 1,
                "mine_name": mine_name,
                "category": category,
                "description": description,
                "created_at": (
                    start
                    + pd.Timedelta(
                        days=i * 4
                    )
                ).strftime(
                    "%Y-%m-%d"
                ),
            }
        )

    df = pd.DataFrame(rows)

    df.to_csv(
        DATA_DIR / "findings.csv",
        index=False,
    )

    print(
        f"Created {len(df)} findings."
    )


# ============================================================
# RUN EVERYTHING
# ============================================================

if __name__ == "__main__":

    generate_risk_data()
    generate_production_data()
    generate_attendance_data()
    generate_environment_data()
    generate_findings_data()

    print("\nAll demo AI data generated!")