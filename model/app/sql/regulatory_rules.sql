CREATE TABLE IF NOT EXISTS regulatory_rules (
    id SERIAL PRIMARY KEY,

    rule_id VARCHAR(100) UNIQUE NOT NULL,

    source_document TEXT NOT NULL,
    source_page INTEGER,

    law_ref TEXT,

    title TEXT NOT NULL,
    obligation_text TEXT NOT NULL,

    category VARCHAR(30),
    frequency VARCHAR(30),

    responsible_role TEXT,

    mine_types JSONB NOT NULL DEFAULT '[]'::jsonb,
    inspection_types JSONB NOT NULL DEFAULT '[]'::jsonb,

    evidence_needed JSONB NOT NULL DEFAULT '[]'::jsonb,

    severity VARCHAR(20),

    source_text TEXT NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'draft',

    created_by_ai BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by INTEGER
);

CREATE INDEX IF NOT EXISTS idx_reg_rules_status
ON regulatory_rules(status);

CREATE INDEX IF NOT EXISTS idx_reg_rules_source
ON regulatory_rules(source_document);
