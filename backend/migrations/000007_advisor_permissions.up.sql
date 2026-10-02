BEGIN;
GRANT SELECT, INSERT, UPDATE ON advisor_sessions, advisor_months, advisor_turns TO dnd_api;
INSERT INTO schema_migrations (version) VALUES ('000007_advisor_permissions');
COMMIT;
