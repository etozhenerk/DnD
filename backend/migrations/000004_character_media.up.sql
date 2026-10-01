BEGIN;

ALTER TABLE characters ALTER CONSTRAINT characters_portrait_asset_id_fkey
    DEFERRABLE INITIALLY DEFERRED;

INSERT INTO schema_migrations (version) VALUES ('000004_character_media');

COMMIT;
