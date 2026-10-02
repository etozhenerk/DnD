BEGIN;

-- Failed attempts retain their financial reserve and immutable request ID.
-- Only a currently running provider call blocks the next message in a session.
DROP INDEX advisor_one_active_turn_idx;
CREATE UNIQUE INDEX advisor_one_active_turn_idx ON advisor_turns (session_id)
    WHERE status = 'reserved';

INSERT INTO schema_migrations (version) VALUES ('000009_advisor_recovery');
COMMIT;
