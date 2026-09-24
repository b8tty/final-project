-- Seed data for local testing — safe to run more than once.
--
-- Officer logins (mobile app):
--   12345678 / Password123   → Westlands Primary School (Nairobi)
--   12121212 / Password123   → Kasarani Stadium Grounds (Nairobi)
--   00000000 / Password123   → Mvita Primary School (Mombasa)
--
-- HQ admin login (admin dashboard):
--   90000000 / AdminPass123
--
-- Voter lookups (public, no login):
--   87654321 → Westlands Primary School
--   11223344 → Kasarani Stadium Grounds
--   22334455 → Mvita Primary School
--   33445566 → Kisumu Central Social Hall

-- ---- Counties ----
INSERT INTO counties (name) VALUES ('Nairobi') ON CONFLICT (name) DO NOTHING;
INSERT INTO counties (name) VALUES ('Mombasa') ON CONFLICT (name) DO NOTHING;
INSERT INTO counties (name) VALUES ('Kisumu') ON CONFLICT (name) DO NOTHING;

-- ---- Constituencies ----
-- (constituencies has no unique constraint on name, so we guard with
-- WHERE NOT EXISTS instead of ON CONFLICT — safe to run repeatedly)
INSERT INTO constituencies (name, county_id)
SELECT 'Westlands', (SELECT id FROM counties WHERE name = 'Nairobi' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM constituencies WHERE name = 'Westlands');

INSERT INTO constituencies (name, county_id)
SELECT 'Kasarani', (SELECT id FROM counties WHERE name = 'Nairobi' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM constituencies WHERE name = 'Kasarani');

INSERT INTO constituencies (name, county_id)
SELECT 'Mvita', (SELECT id FROM counties WHERE name = 'Mombasa' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM constituencies WHERE name = 'Mvita');

INSERT INTO constituencies (name, county_id)
SELECT 'Kisumu Central', (SELECT id FROM counties WHERE name = 'Kisumu' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM constituencies WHERE name = 'Kisumu Central');

-- ---- Polling stations (4 total, spread across 3 counties for the map/comparison views) ----
INSERT INTO polling_stations (station_code, name, constituency_id, registered_voters, latitude, longitude)
VALUES ('PS001', 'Westlands Primary School', (SELECT id FROM constituencies WHERE name = 'Westlands' LIMIT 1), 450, -1.2647, 36.8121)
ON CONFLICT (station_code) DO UPDATE SET latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude;

INSERT INTO polling_stations (station_code, name, constituency_id, registered_voters, latitude, longitude)
VALUES ('PS002', 'Kasarani Stadium Grounds', (SELECT id FROM constituencies WHERE name = 'Kasarani' LIMIT 1), 620, -1.2210, 36.8968)
ON CONFLICT (station_code) DO UPDATE SET latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude;

INSERT INTO polling_stations (station_code, name, constituency_id, registered_voters, latitude, longitude)
VALUES ('PS003', 'Mvita Primary School', (SELECT id FROM constituencies WHERE name = 'Mvita' LIMIT 1), 380, -4.0435, 39.6682)
ON CONFLICT (station_code) DO UPDATE SET latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude;

INSERT INTO polling_stations (station_code, name, constituency_id, registered_voters, latitude, longitude)
VALUES ('PS004', 'Kisumu Central Social Hall', (SELECT id FROM constituencies WHERE name = 'Kisumu Central' LIMIT 1), 410, -0.1022, 34.7617)
ON CONFLICT (station_code) DO UPDATE SET latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude;

-- ---- Estimated schedules (HQ-set, shown to voters) ----
UPDATE polling_stations SET estimated_opening_time = '2026-08-31 06:00:00', estimated_closing_time = '2026-08-31 17:00:00' WHERE station_code = 'PS001';
UPDATE polling_stations SET estimated_opening_time = '2026-08-31 06:00:00', estimated_closing_time = '2026-08-31 17:00:00' WHERE station_code = 'PS002';
UPDATE polling_stations SET estimated_opening_time = '2026-08-31 06:30:00', estimated_closing_time = '2026-08-31 17:00:00' WHERE station_code = 'PS003';
UPDATE polling_stations SET estimated_opening_time = '2026-08-31 06:00:00', estimated_closing_time = '2026-08-31 17:30:00' WHERE station_code = 'PS004';

-- ---- Officer accounts (mobile app) ----
-- Password hash below corresponds to the plaintext password "Password123"
-- (bcrypt, 10 salt rounds — matches what routes/auth.js expects)
INSERT INTO users (full_name, national_id, phone_number, email, password_hash, role, polling_station_id)
SELECT 'Officer Westlands', '12345678', '0700000000', 'officer.westlands@example.com',
       '$2b$10$84cDKOHwVHiq6HwGqeTySOS3LFRPNs3Uv5.dFn.4NhD/4RAz93/AS',
       'presiding_officer', ps.id
FROM polling_stations ps WHERE ps.station_code = 'PS001'
ON CONFLICT (national_id) DO NOTHING;

INSERT INTO users (full_name, national_id, phone_number, email, password_hash, role, polling_station_id)
SELECT 'Officer Kasarani', '12121212', '0700000001', 'officer.kasarani@example.com',
       '$2b$10$84cDKOHwVHiq6HwGqeTySOS3LFRPNs3Uv5.dFn.4NhD/4RAz93/AS',
       'presiding_officer', ps.id
FROM polling_stations ps WHERE ps.station_code = 'PS002'
ON CONFLICT (national_id) DO NOTHING;

INSERT INTO users (full_name, national_id, phone_number, email, password_hash, role, polling_station_id)
SELECT 'Officer Mvita', '00000000', '0700000002', 'officer.mvita@example.com',
       '$2b$10$84cDKOHwVHiq6HwGqeTySOS3LFRPNs3Uv5.dFn.4NhD/4RAz93/AS',
       'presiding_officer', ps.id
FROM polling_stations ps WHERE ps.station_code = 'PS003'
ON CONFLICT (national_id) DO NOTHING;

-- ---- HQ admin account (admin dashboard) — not tied to a specific station ----
INSERT INTO users (full_name, national_id, phone_number, email, password_hash, role, polling_station_id)
VALUES (
  'HQ Admin', '90000000', '0711111111', 'admin@example.com',
  '$2b$10$WA6h1uQ2YXoLv5RnUPWnyOtbtH4QvDMGVvcztx/tHauiUUbf74qZ2',
  'admin', NULL
)
ON CONFLICT (national_id) DO NOTHING;

-- ---- Voter records (citizen portal lookup, no login) ----
INSERT INTO voters (national_id, full_name, polling_station_id)
SELECT '87654321', 'Jane Voter', ps.id FROM polling_stations ps WHERE ps.station_code = 'PS001'
ON CONFLICT (national_id) DO NOTHING;

INSERT INTO voters (national_id, full_name, polling_station_id)
SELECT '11223344', 'Peter Mwangi', ps.id FROM polling_stations ps WHERE ps.station_code = 'PS002'
ON CONFLICT (national_id) DO NOTHING;

INSERT INTO voters (national_id, full_name, polling_station_id)
SELECT '22334455', 'Amina Hassan', ps.id FROM polling_stations ps WHERE ps.station_code = 'PS003'
ON CONFLICT (national_id) DO NOTHING;

INSERT INTO voters (national_id, full_name, polling_station_id)
SELECT '33445566', 'Brian Otieno', ps.id FROM polling_stations ps WHERE ps.station_code = 'PS004'
ON CONFLICT (national_id) DO NOTHING;
