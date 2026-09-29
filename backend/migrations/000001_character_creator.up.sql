BEGIN;

CREATE TABLE schema_migrations (
    version text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider text NOT NULL CHECK (btrim(provider) <> ''),
    provider_subject text NOT NULL CHECK (btrim(provider_subject) <> ''),
    display_name text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT users_provider_subject_key UNIQUE (provider, provider_subject)
);

CREATE TABLE character_drafts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_user_id uuid REFERENCES users (id),
    form_data jsonb NOT NULL DEFAULT '{}'::jsonb
        CHECK (jsonb_typeof(form_data) = 'object'),
    draft_token_hash bytea NOT NULL UNIQUE
        CHECK (octet_length(draft_token_hash) = 32),
    ruleset_id text NOT NULL CHECK (btrim(ruleset_id) <> ''),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT character_drafts_updated_after_created_check
        CHECK (updated_at >= created_at)
);

CREATE TABLE characters (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_user_id uuid REFERENCES users (id),
    display_name text NOT NULL CHECK (btrim(display_name) <> ''),
    pronouns text,
    role_label text,
    race_id text NOT NULL
        CHECK (race_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    class_id text NOT NULL
        CHECK (class_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    story text,
    motivation text,
    appearance text,
    personality text[] NOT NULL DEFAULT '{}',
    strength smallint NOT NULL,
    dexterity smallint NOT NULL,
    constitution smallint NOT NULL,
    wisdom smallint NOT NULL,
    intelligence smallint NOT NULL,
    charisma smallint NOT NULL,
    max_hp smallint NOT NULL CHECK (max_hp >= 0),
    base_ac smallint NOT NULL CHECK (base_ac >= 0),
    portrait_asset_id uuid,
    ruleset_id text NOT NULL CHECK (btrim(ruleset_id) <> ''),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE character_abilities (
    character_id uuid NOT NULL REFERENCES characters (id),
    ability_id text NOT NULL
        CHECK (ability_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    position integer NOT NULL CHECK (position > 0),
    name text NOT NULL CHECK (btrim(name) <> ''),
    description text NOT NULL,
    effect_text text NOT NULL,
    trigger text NOT NULL CHECK (btrim(trigger) <> ''),
    automation_mode text NOT NULL CHECK (btrim(automation_mode) <> ''),
    effects jsonb NOT NULL DEFAULT '[]'::jsonb
        CHECK (jsonb_typeof(effects) = 'array'),
    uses_scope text,
    uses_max integer,
    icon_asset_id uuid,
    PRIMARY KEY (character_id, ability_id),
    CONSTRAINT character_abilities_position_key UNIQUE (character_id, position),
    CONSTRAINT character_abilities_uses_check CHECK (
        (uses_scope IS NULL AND uses_max IS NULL)
        OR (
            uses_scope IS NOT NULL AND uses_max IS NOT NULL
            AND
            uses_scope IN ('turn', 'round', 'battle', 'location', 'campaign')
            AND uses_max > 0
        )
    )
);

CREATE TABLE character_items (
    character_id uuid NOT NULL REFERENCES characters (id),
    item_id text NOT NULL
        CHECK (item_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    position integer NOT NULL CHECK (position > 0),
    name text NOT NULL CHECK (btrim(name) <> ''),
    description text NOT NULL,
    effect_text text NOT NULL,
    effects jsonb NOT NULL DEFAULT '[]'::jsonb
        CHECK (jsonb_typeof(effects) = 'array'),
    charges_scope text,
    charges_max integer,
    PRIMARY KEY (character_id, item_id),
    CONSTRAINT character_items_position_key UNIQUE (character_id, position),
    CONSTRAINT character_items_charges_check CHECK (
        (charges_scope IS NULL AND charges_max IS NULL)
        OR (
            charges_scope IS NOT NULL AND charges_max IS NOT NULL
            AND
            charges_scope IN ('turn', 'round', 'battle', 'location', 'campaign')
            AND charges_max > 0
        )
    )
);

CREATE TABLE character_assets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    draft_id uuid REFERENCES character_drafts (id),
    character_id uuid REFERENCES characters (id),
    kind text NOT NULL CHECK (kind IN ('portrait', 'ability_icon')),
    object_key text NOT NULL UNIQUE CHECK (btrim(object_key) <> ''),
    mime_type text NOT NULL CHECK (btrim(mime_type) <> ''),
    size_bytes bigint NOT NULL CHECK (size_bytes > 0),
    sha256 text NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
    status text NOT NULL DEFAULT 'uploaded'
        CHECK (status IN ('uploaded', 'verified', 'rejected')),
    created_at timestamptz NOT NULL DEFAULT now(),
    verified_at timestamptz,
    CONSTRAINT character_assets_owner_check
        CHECK ((draft_id IS NULL) <> (character_id IS NULL)),
    CONSTRAINT character_assets_verification_check
        CHECK ((status = 'verified') = (verified_at IS NOT NULL))
);

ALTER TABLE characters
    ADD CONSTRAINT characters_portrait_asset_id_fkey
    FOREIGN KEY (portrait_asset_id) REFERENCES character_assets (id);

ALTER TABLE character_abilities
    ADD CONSTRAINT character_abilities_icon_asset_id_fkey
    FOREIGN KEY (icon_asset_id) REFERENCES character_assets (id);

CREATE INDEX character_drafts_updated_at_idx
    ON character_drafts (updated_at);
CREATE INDEX characters_created_at_idx
    ON characters (created_at DESC, id DESC);
CREATE INDEX characters_creator_created_at_idx
    ON characters (creator_user_id, created_at DESC, id DESC);
CREATE INDEX character_assets_draft_id_idx
    ON character_assets (draft_id) WHERE draft_id IS NOT NULL;
CREATE INDEX character_assets_character_id_idx
    ON character_assets (character_id) WHERE character_id IS NOT NULL;

INSERT INTO schema_migrations (version) VALUES ('000001_character_creator');

COMMIT;
