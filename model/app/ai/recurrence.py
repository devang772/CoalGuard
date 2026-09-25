from pathlib import Path
import re

import numpy as np
import pandas as pd

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import AgglomerativeClustering


BASE_DIR = Path(__file__).resolve().parents[2]

DATA_FILE = (
    BASE_DIR
    / "ai_data"
    / "findings.csv"
)


# ============================================================
# TEXT CLEANING
# ============================================================

def clean_text(text):

    text = str(text).lower()

    # Remove numbers
    text = re.sub(
        r"\d+",
        " ",
        text,
    )

    # Remove punctuation
    text = re.sub(
        r"[^a-z\s]",
        " ",
        text,
    )

    # Remove extra spaces
    text = re.sub(
        r"\s+",
        " ",
        text,
    )

    return text.strip()


# ============================================================
# GENERATE CLUSTER LABEL
# ============================================================

def make_label(
    vectorizer,
    matrix,
    indices,
):

    cluster_matrix = (
        matrix[
            indices
        ].mean(axis=0)
    )

    scores = np.asarray(
        cluster_matrix
    ).ravel()

    feature_names = (
        vectorizer.get_feature_names_out()
    )

    top_indices = scores.argsort()[
        ::-1
    ][:4]

    words = [
        feature_names[i]
        for i in top_indices
    ]

    return " ".join(words)


# ============================================================
# MAIN FUNCTION
# ============================================================

def detect_recurring_violations(
    days=60,
):

    df = pd.read_csv(
        DATA_FILE
    )

    df["created_at"] = pd.to_datetime(
        df["created_at"]
    )

    # --------------------------------------------------------
    # Last N days
    # --------------------------------------------------------

    latest_date = df[
        "created_at"
    ].max()

    cutoff = (
        latest_date
        - pd.Timedelta(days=days)
    )

    df = df[
        df["created_at"] >= cutoff
    ].copy()

    # --------------------------------------------------------
    # Clean text
    # --------------------------------------------------------

    df["clean_text"] = (
        df["description"]
        .apply(clean_text)
    )

    results = []

    cluster_counter = 1

    # --------------------------------------------------------
    # Cluster within category.
    #
    # This is important because "electrical failure"
    # and "coal spillage" should not be grouped together.
    # --------------------------------------------------------

    for category, group in df.groupby(
        "category"
    ):

        group = group.reset_index(
            drop=True
        )

        if len(group) < 3:
            continue

        vectorizer = TfidfVectorizer(
            ngram_range=(1, 2),
            min_df=1,
            stop_words="english",
        )

        matrix = vectorizer.fit_transform(
            group["clean_text"]
        )

        if matrix.shape[0] < 3:
            continue

        # ----------------------------------------------------
        # Clustering
        # ----------------------------------------------------

        try:

            model = AgglomerativeClustering(
                metric="cosine",
                linkage="average",
                distance_threshold=0.8,
                n_clusters=None,
            )

        except TypeError:

            # Older sklearn
            model = AgglomerativeClustering(
                affinity="cosine",
                linkage="average",
                distance_threshold=0.6,
                n_clusters=None,
            )

        labels = model.fit_predict(
            matrix.toarray()
        )

        group["cluster"] = labels

        # ----------------------------------------------------
        # Create result for every cluster
        # ----------------------------------------------------

        for cluster_id in sorted(
            group["cluster"].unique()
        ):

            cluster = group[
                group["cluster"]
                == cluster_id
            ]

            count = len(cluster)

            if count < 3:
                continue

            indices = cluster.index.tolist()

            label = make_label(
                vectorizer,
                matrix,
                indices,
            )

            first_date = cluster[
                "created_at"
            ].min()

            last_date = cluster[
                "created_at"
            ].max()

            days_span = (
                last_date
                - first_date
            ).days

            results.append(
                {
                    "cluster_id":
                        cluster_counter,

                    "label":
                        label,

                    "count":
                        count,

                    "days_span":
                        days_span,

                    "mines":
                        sorted(
                            cluster[
                                "mine_name"
                            ].unique()
                            .tolist()
                        ),

                    "sample_findings":
                        cluster[
                            "description"
                        ]
                        .head(3)
                        .tolist(),
                }
            )

            cluster_counter += 1

    results.sort(
        key=lambda x: x["count"],
        reverse=True,
    )

    return results


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":

    results = detect_recurring_violations()

    print(
        f"\nFound {len(results)} recurring "
        f"violation groups.\n"
    )

    for item in results:

        print(
            f"{item['label']}"
        )

        print(
            f"Occurrences: "
            f"{item['count']}"
        )

        print(
            f"Time span: "
            f"{item['days_span']} days"
        )

        print(
            f"Mines: "
            f"{', '.join(item['mines'])}"
        )

        print(
            "Examples:"
        )

        for finding in item[
            "sample_findings"
        ]:

            print(
                f"  - {finding}"
            )

        print(
            "-" * 60
        )