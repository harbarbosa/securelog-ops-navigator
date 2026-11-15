ALTER TABLE device_credentials ADD COLUMN IF NOT EXISTS token_ciphertext text;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS pairing_code text UNIQUE;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS paired_at timestamptz;
