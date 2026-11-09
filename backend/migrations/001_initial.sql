-- SecureLog initial PostgreSQL schema (v1)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL,
 username text NOT NULL UNIQUE,
 email text UNIQUE,
 password_hash text NOT NULL,
 role text NOT NULL CHECK(role IN ('admin','supervisor','operator','viewer')),
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE recorders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL, host text NOT NULL, port integer NOT NULL CHECK(port BETWEEN 1 AND 65535),
 protocol text NOT NULL, credential_ref text,
 active boolean NOT NULL DEFAULT true, last_seen_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE cameras (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 recorder_id uuid NOT NULL REFERENCES recorders(id) ON DELETE RESTRICT,
 name text NOT NULL, channel integer NOT NULL CHECK(channel >= 0),
 active boolean NOT NULL DEFAULT true,
 UNIQUE(recorder_id,channel)
);
CREATE TABLE locations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL UNIQUE, description text,
 primary_camera_id uuid REFERENCES cameras(id) ON DELETE SET NULL,
 active boolean NOT NULL DEFAULT true
);
CREATE TABLE devices (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 serial_number text NOT NULL UNIQUE, name text NOT NULL,
 location_id uuid REFERENCES locations(id) ON DELETE RESTRICT,
 active boolean NOT NULL DEFAULT true, last_seen_at timestamptz
);
CREATE TABLE user_locations (
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
 PRIMARY KEY(user_id,location_id)
);
CREATE TABLE readings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 device_event_id text NOT NULL,
 device_id uuid NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
 user_id uuid REFERENCES users(id) ON DELETE SET NULL,
 location_id uuid NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
 camera_id uuid REFERENCES cameras(id) ON DELETE SET NULL,
 code text NOT NULL CHECK(length(trim(code)) > 0),
 occurred_at timestamptz NOT NULL,
 received_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(device_id,device_event_id)
);
CREATE INDEX readings_code_time_idx ON readings(code,occurred_at DESC);
CREATE INDEX readings_location_time_idx ON readings(location_id,occurred_at DESC);
CREATE TABLE media_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 reading_id uuid NOT NULL REFERENCES readings(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('snapshot','video')),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','ready','unavailable','failed')),
 range_start timestamptz, range_end timestamptz,
 storage_key text, error_code text,
 requested_by uuid REFERENCES users(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz,
 CHECK(range_start IS NULL OR range_end IS NULL OR range_end > range_start)
);
CREATE TABLE audit_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
 action text NOT NULL, entity_type text NOT NULL, entity_id text,
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_events_created_idx ON audit_events(created_at DESC);
