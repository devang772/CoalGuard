from __future__ import annotations

from sqlalchemy import text

from app.db import engine


def save_rules(
    rules: list[dict],
) -> int:

    if not rules:
        return 0

    query = text(
        """
        INSERT INTO regulatory_rules (
            rule_id,
            source_document,
            source_page,
            law_ref,
            title,
            obligation_text,
            category,
            frequency,
            responsible_role,
            mine_types,
            inspection_types,
            evidence_needed,
            severity,
            source_text,
            status,
            created_by_ai
        )
        VALUES (
            :rule_id,
            :source_document,
            :source_page,
            :law_ref,
            :title,
            :obligation_text,
            :category,
            :frequency,
            :responsible_role,
            CAST(:mine_types AS jsonb),
            CAST(:inspection_types AS jsonb),
            CAST(:evidence_needed AS jsonb),
            :severity,
            :source_text,
            :status,
            :created_by_ai
        )
        ON CONFLICT (rule_id)
        DO NOTHING
        """
    )

    import json

    rows = []

    for rule in rules:

        rows.append(
            {
                **rule,

                "mine_types": json.dumps(
                    rule["mine_types"]
                ),

                "inspection_types": json.dumps(
                    rule["inspection_types"]
                ),

                "evidence_needed": json.dumps(
                    rule["evidence_needed"]
                ),
            }
        )

    with engine.begin() as connection:

        connection.execute(
            query,
            rows,
        )

    return len(rows)
