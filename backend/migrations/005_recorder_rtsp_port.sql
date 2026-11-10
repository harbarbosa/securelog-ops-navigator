ALTER TABLE recorders
  ADD COLUMN rtsp_port integer NOT NULL DEFAULT 554
  CHECK(rtsp_port BETWEEN 1 AND 65535);
