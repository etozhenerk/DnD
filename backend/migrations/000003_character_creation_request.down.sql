BEGIN;

ALTER TABLE characters DROP COLUMN creation_request_hash;
DELETE FROM schema_migrations WHERE version = '000003_character_creation_request';

COMMIT;
