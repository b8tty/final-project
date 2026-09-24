-- IEBC Polling Station Operations & Incident Reporting System
-- PostgreSQL Schema

CREATE TYPE user_role AS ENUM ('clerk', 'presiding_officer', 'county_coordinator', 'admin');
CREATE TYPE report_status AS ENUM ('open', 'in_progress', 'resolved');
CREATE TYPE incident_category AS ENUM (
    'device_failure',
    'material_shortage',
    'security_incident',
    'queue_delay',
    'other'
);

-- Administrative hierarchy
CREATE TABLE counties (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE constituencies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    county_id INTEGER NOT NULL REFERENCES counties(id)
);

CREATE TABLE polling_stations (
    id SERIAL PRIMARY KEY,
    station_code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    constituency_id INTEGER NOT NULL REFERENCES constituencies(id),
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6),
    registered_voters INTEGER DEFAULT 0,
    estimated_opening_time TIMESTAMP, -- set by HQ admin, shown to voters
    estimated_closing_time TIMESTAMP  -- set by HQ admin, shown to voters
);

-- Voter register: maps a National ID to their assigned polling station.
-- Powers the public "find my polling station" lookup (no login required).
CREATE TABLE voters (
    id SERIAL PRIMARY KEY,
    national_id VARCHAR(20) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    polling_station_id INTEGER NOT NULL REFERENCES polling_stations(id)
);

-- Users (field officers, coordinators, admins)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    national_id VARCHAR(20) NOT NULL UNIQUE,
    phone_number VARCHAR(20),
    email VARCHAR(150) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    polling_station_id INTEGER REFERENCES polling_stations(id), -- null for coordinators/admins
    created_at TIMESTAMP DEFAULT NOW()
);

-- Station status reports (queue length, opening/closing times, device status)
CREATE TABLE station_reports (
    id SERIAL PRIMARY KEY,
    polling_station_id INTEGER NOT NULL REFERENCES polling_stations(id),
    submitted_by INTEGER NOT NULL REFERENCES users(id),
    queue_length INTEGER,
    kiems_status VARCHAR(50), -- e.g. 'working', 'faulty', 'offline'
    materials_status VARCHAR(50), -- e.g. 'sufficient', 'shortage'
    opening_time TIMESTAMP,
    closing_time TIMESTAMP,
    notes TEXT,
    client_uuid UUID NOT NULL, -- generated on device, used for offline dedup
    submitted_at TIMESTAMP NOT NULL, -- time recorded on device (may be offline)
    synced_at TIMESTAMP DEFAULT NOW(), -- time it hit the server
    UNIQUE (client_uuid)
);

-- Incident reports
CREATE TABLE incidents (
    id SERIAL PRIMARY KEY,
    polling_station_id INTEGER NOT NULL REFERENCES polling_stations(id),
    reported_by INTEGER NOT NULL REFERENCES users(id),
    category incident_category NOT NULL,
    description TEXT NOT NULL,
    status report_status DEFAULT 'open',
    client_uuid UUID NOT NULL,
    occurred_at TIMESTAMP NOT NULL,
    synced_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP,
    updated_by INTEGER REFERENCES users(id), -- HQ staff who last actioned this
    updated_at TIMESTAMP,
    UNIQUE (client_uuid)
);

-- Indexes for dashboard aggregation queries
CREATE INDEX idx_reports_station ON station_reports(polling_station_id);
CREATE INDEX idx_incidents_station ON incidents(polling_station_id);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_stations_constituency ON polling_stations(constituency_id);
CREATE INDEX idx_constituencies_county ON constituencies(county_id);
CREATE INDEX idx_voters_national_id ON voters(national_id);
