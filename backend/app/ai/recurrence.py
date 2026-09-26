"""Recurring violations: the same problem found again and again, from the live `findings` table.

Findings of the caller's mines from the last `days` days are grouped by category, turned into TF-IDF vectors and
clustered (agglomerative, cosine distance). A cluster with 3 or more findings is a recurring violation.
"""
from __future__ import annotations

import re
from datetime import timedelta

import numpy as np
import pandas as pd
from sklearn.cluster import AgglomerativeClustering
from sklearn.feature_extraction.text import TfidfVectorizer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Finding, OrgUnit
from app.utils import utcnow

MIN_REPEATS = 3
DISTANCE_THRESHOLD = 0.8


def clean_text(text: str) -> str:
    text = re.sub(r"\d+", " ", str(text).lower())
    text = re.sub(r"[^a-z\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _describe(vectorizer: TfidfVectorizer, matrix, indices: list[int], texts: list[str]) -> tuple[str, list[str]]:
    """Label = the finding closest to the cluster centre (a real sentence); keywords = its strongest single words."""
    rows = matrix[indices]
    centre = np.asarray(rows.mean(axis=0)).ravel()
    closest = int(np.argmax(rows @ centre))
    words = vectorizer.get_feature_names_out()
    keywords = [words[i] for i in centre.argsort()[::-1] if " " not in words[i]][:4]
    return texts[closest], keywords


def detect_recurring_violations(db: Session, mine_ids: list[int], days: int = 60) -> list[dict]:
    if not mine_ids:
        return []
    rows = db.execute(select(Finding.id, Finding.mine_id, OrgUnit.name, Finding.category, Finding.severity,
                             Finding.description, Finding.created_at)
                      .join(OrgUnit, OrgUnit.id == Finding.mine_id)
                      .where(Finding.mine_id.in_(mine_ids), Finding.created_at >= utcnow() - timedelta(days=days),
                             Finding.created_at <= utcnow())
                      .order_by(Finding.created_at)).all()
    df = pd.DataFrame(rows, columns=["id", "mine_id", "mine_name", "category", "severity", "description",
                                     "created_at"])
    if df.empty:
        return []
    df["created_at"] = pd.to_datetime(df["created_at"], utc=True)
    df["clean"] = df["description"].map(clean_text)
    results = []
    for category, group in df.groupby("category"):
        group = group[group["clean"] != ""].reset_index(drop=True)
        if len(group) < MIN_REPEATS:
            continue
        vectorizer = TfidfVectorizer(ngram_range=(1, 2), stop_words="english")
        try:
            matrix = vectorizer.fit_transform(group["clean"])
        except ValueError:          # only stop words
            continue
        labels = AgglomerativeClustering(metric="cosine", linkage="average", n_clusters=None,
                                         distance_threshold=DISTANCE_THRESHOLD).fit_predict(matrix.toarray())
        group["cluster"] = labels
        for _, cluster in group.groupby("cluster"):
            if len(cluster) < MIN_REPEATS:
                continue
            first, last = cluster["created_at"].min(), cluster["created_at"].max()
            by_mine = cluster.groupby(["mine_id", "mine_name"]).size().sort_values(ascending=False)
            label, keywords = _describe(vectorizer, matrix, cluster.index.tolist(), cluster["description"].tolist())
            results.append({
                "label": label,
                "keywords": keywords,
                "category": category,
                "count": int(len(cluster)),
                "days_span": int((last - first).days),
                "first_seen": first.isoformat(),
                "last_seen": last.isoformat(),
                "mines": [name for (_, name) in by_mine.index],
                "by_mine": [{"mine_id": int(mid), "mine_name": name, "count": int(n)}
                            for (mid, name), n in by_mine.items()],
                "severities": {k: int(v) for k, v in cluster["severity"].value_counts().items()},
                "finding_ids": [int(i) for i in cluster["id"]],
                "sample_findings": cluster["description"].tail(3).tolist(),
            })
    results.sort(key=lambda item: (item["count"], item["last_seen"]), reverse=True)
    for number, item in enumerate(results, start=1):
        item["cluster_id"] = number
    return results
