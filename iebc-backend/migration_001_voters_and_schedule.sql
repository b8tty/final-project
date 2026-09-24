-- Migration: adds voter lookup + HQ-managed station schedule
-- Run this against your EXISTING database (no need to drop/recreate anything)

-- Voter register: maps a National ID to their assigned polling station.
-- This is what powers the public "find my polling station" lookup.
CREATE TABLE voters (
    id SERIAL PRIMARY KEY,
    national_id VARCHAR(20) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    polling_station_id INTEGER NOT NULL REFERENCES polling_stations(id)
);

CREATE INDEX idx_voters_national_id ON voters(national_id);

-- HQ-managed schedule: the estimated opening/closing times an admin sets
-- for a station, shown to voters. This is separate from the ACTUAL times
-- officers report via station_reports (opening_time/closing_time), which
-- reflect what really happened on the ground.
ALTER TABLE polling_stations
    ADD COLUMN estimated_opening_time TIMESTAMP,
    ADD COLUMN estimated_closing_time TIMESTAMP;

-- Lets HQ mark an incident as being actively worked on / resolved,
-- and track who last updated it and when.
ALTER TABLE incidents
    ADD COLUMN updated_by INTEGER REFERENCES users(id),
    ADD COLUMN updated_at TIMESTAMP;
