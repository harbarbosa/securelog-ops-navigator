ALTER TABLE recorders
  ADD COLUMN sdk_port integer NOT NULL DEFAULT 0
  CHECK(sdk_port BETWEEN 0 AND 65535);

UPDATE recorders
SET sdk_port = 37777
WHERE name = 'DVR Alfa'
  AND host = '192.168.0.100';
