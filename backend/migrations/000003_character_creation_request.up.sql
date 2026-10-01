BEGIN;

ALTER TABLE characters
    ADD COLUMN creation_request_hash bytea,
    ADD CONSTRAINT characters_creation_request_hash_check
        CHECK (creation_request_hash IS NULL OR octet_length(creation_request_hash) = 32);

INSERT INTO schema_migrations (version) VALUES ('000003_character_creation_request');

COMMIT;
