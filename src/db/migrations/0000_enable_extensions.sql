-- citext: case-insensitive text, used for users.email.
-- pgcrypto: gen_random_uuid(), used as the default for every primary key.
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
