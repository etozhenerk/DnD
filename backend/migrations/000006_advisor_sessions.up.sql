BEGIN;

-- No character form, owner identity or raw bearer token is persisted here.
CREATE TABLE advisor_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash bytea NOT NULL UNIQUE CHECK (octet_length(token_hash) = 32),
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours',
    accounted_micro_rub bigint NOT NULL DEFAULT 0 CHECK (accounted_micro_rub >= 0),
    CHECK (expires_at > created_at)
);

CREATE TABLE advisor_months (
    month date PRIMARY KEY,
    accounted_micro_rub bigint NOT NULL DEFAULT 0 CHECK (accounted_micro_rub >= 0),
    blocked boolean NOT NULL DEFAULT false
);

CREATE TABLE advisor_turns (
    session_id uuid NOT NULL REFERENCES advisor_sessions (id),
    request_id uuid NOT NULL,
    request_hash bytea NOT NULL CHECK (octet_length(request_hash) = 32),
    month date NOT NULL REFERENCES advisor_months (month),
    message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 2000),
    reply text NOT NULL DEFAULT '' CHECK (char_length(reply) <= 16000),
    status text NOT NULL DEFAULT 'reserved'
        CHECK (status IN ('reserved', 'succeeded', 'uncertain')),
    reserved_micro_rub bigint NOT NULL CHECK (reserved_micro_rub > 0),
    accounted_micro_rub bigint NOT NULL CHECK (accounted_micro_rub >= 0),
    input_tokens integer,
    output_tokens integer,
    cached_tokens integer,
    model text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (session_id, request_id),
    CHECK ((status = 'succeeded') = (input_tokens IS NOT NULL)),
    CHECK (status <> 'succeeded' OR btrim(reply) <> ''),
    CHECK ((input_tokens IS NULL AND output_tokens IS NULL AND cached_tokens IS NULL) OR
        (input_tokens IS NOT NULL AND output_tokens IS NOT NULL AND cached_tokens IS NOT NULL
            AND input_tokens >= 0 AND output_tokens >= 0 AND cached_tokens BETWEEN 0 AND input_tokens))
);

-- Also prevents two workers from submitting different requests in one dialogue.
CREATE UNIQUE INDEX advisor_one_active_turn_idx ON advisor_turns (session_id)
    WHERE status IN ('reserved', 'uncertain');
CREATE INDEX advisor_sessions_created_idx ON advisor_sessions (created_at);
CREATE INDEX advisor_turns_created_idx ON advisor_turns (created_at);
CREATE INDEX advisor_turns_month_status_idx ON advisor_turns (month, status);

INSERT INTO schema_migrations (version) VALUES ('000006_advisor_sessions');
COMMIT;
