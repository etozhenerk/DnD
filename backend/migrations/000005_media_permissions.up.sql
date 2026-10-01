BEGIN;

GRANT SELECT, INSERT ON character_assets TO dnd_api;

INSERT INTO schema_migrations (version) VALUES ('000005_media_permissions');

COMMIT;
