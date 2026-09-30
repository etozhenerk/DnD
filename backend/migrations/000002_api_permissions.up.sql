BEGIN;

GRANT CONNECT ON DATABASE dnd TO dnd_api;
GRANT USAGE ON SCHEMA public TO dnd_api;
GRANT SELECT, INSERT, UPDATE, DELETE ON character_drafts TO dnd_api;
GRANT SELECT, INSERT ON characters, character_abilities, character_items TO dnd_api;

INSERT INTO schema_migrations (version) VALUES ('000002_api_permissions');

COMMIT;
