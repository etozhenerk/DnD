BEGIN;

ALTER TABLE advisor_turns
    ADD COLUMN mode text NOT NULL DEFAULT 'chat'
        CHECK (mode IN ('chat','comment','suggest','fill','portrait','icon')),
    ADD COLUMN target text NOT NULL DEFAULT '' CHECK (char_length(target) <= 80),
    ADD COLUMN result_asset jsonb CHECK (result_asset IS NULL OR jsonb_typeof(result_asset) = 'object');

-- No new table privileges: runtime already has UPDATE/SELECT/INSERT on this table.
INSERT INTO schema_migrations (version) VALUES ('000008_advisor_tools');
COMMIT;
