CREATE TABLE device_credentials (
 device_id uuid PRIMARY KEY REFERENCES devices(id) ON DELETE CASCADE,
 token_hash text NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(),
 rotated_at timestamptz
);
CREATE INDEX readings_device_time_idx ON readings(device_id,occurred_at DESC);
