"""Fixed values used across the app. Stored as plain strings in the database."""


class Role:
    WORKER = "worker"
    SUPERVISOR = "supervisor"
    SAFETY_OFFICER = "safety_officer"
    MINE_MANAGER = "mine_manager"
    AREA_GM = "area_gm"
    SUBSIDIARY_ADMIN = "subsidiary_admin"
    CIL_ADMIN = "cil_admin"
    REGULATOR = "regulator"
    CONTRACTOR_ADMIN = "contractor_admin"

    ALL = [WORKER, SUPERVISOR, SAFETY_OFFICER, MINE_MANAGER, AREA_GM,
           SUBSIDIARY_ADMIN, CIL_ADMIN, REGULATOR, CONTRACTOR_ADMIN]
    # People who work at a mine and record things in the field
    FIELD_OFFICERS = [SUPERVISOR, SAFETY_OFFICER, MINE_MANAGER]
    # People who can approve / manage (not read-only)
    MANAGERS = [MINE_MANAGER, AREA_GM, SUBSIDIARY_ADMIN, CIL_ADMIN]
    ADMINS = [SUBSIDIARY_ADMIN, CIL_ADMIN]


class OrgType:
    CIL = "cil"
    SUBSIDIARY = "subsidiary"
    AREA = "area"
    MINE = "mine"

    ALL = [CIL, SUBSIDIARY, AREA, MINE]


class Severity:
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

    ALL = [LOW, MEDIUM, HIGH, CRITICAL]


class Category:
    SAFETY = "safety"
    ENVIRONMENT = "environment"
    LABOUR = "labour"
    PRODUCTION = "production"

    ALL = [SAFETY, ENVIRONMENT, LABOUR, PRODUCTION]


class Frequency:
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"

    ALL = [DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY]


LANGUAGES = ["en", "hi", "bn", "or"]
