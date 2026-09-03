-- ==============================================================================
-- SIH26054 Digital Twin - PostgreSQL Relational Production Schema
-- Compatible with PostgreSQL 13+, AWS RDS, Supabase, TimescaleDB, and Local PostgreSQL
-- ==============================================================================

-- 1. Flights Master Table
CREATE TABLE IF NOT EXISTS flights (
    flight_id VARCHAR(64) PRIMARY KEY,
    engine_id VARCHAR(64) NOT NULL DEFAULT 'engine_001',
    profile VARCHAR(32) NOT NULL DEFAULT 'patrol',
    duration_s NUMERIC(10, 2) NOT NULL DEFAULT 600.0,
    num_samples INTEGER NOT NULL DEFAULT 600,
    status VARCHAR(32) NOT NULL DEFAULT 'completed',
    created_at VARCHAR(64) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_flights_created ON flights (created_at DESC);

-- 2. Telemetry Log Records (15-Channel Engine Vector)
CREATE TABLE IF NOT EXISTS telemetry_logs (
    id SERIAL PRIMARY KEY,
    flight_id VARCHAR(64) NOT NULL REFERENCES flights(flight_id) ON DELETE CASCADE,
    timestamp_s NUMERIC(10, 3) NOT NULL,
    rpm NUMERIC(8, 2) NOT NULL DEFAULT 2400.0,
    health_score NUMERIC(5, 2) NOT NULL DEFAULT 100.0,
    stage1_anomaly BOOLEAN NOT NULL DEFAULT FALSE,
    stage2_fault VARCHAR(64) NOT NULL DEFAULT 'normal',
    channels_json TEXT NOT NULL DEFAULT '{}',
    created_at VARCHAR(64) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_telemetry_flight_ts ON telemetry_logs (flight_id, timestamp_s);

-- 3. FMEA Alerts & Automated Decision Auditing
CREATE TABLE IF NOT EXISTS alerts (
    alert_id VARCHAR(64) PRIMARY KEY,
    flight_id VARCHAR(64) NOT NULL REFERENCES flights(flight_id) ON DELETE CASCADE,
    timestamp_s NUMERIC(10, 3) NOT NULL,
    fault_type VARCHAR(64) NOT NULL,
    confidence NUMERIC(6, 4) NOT NULL DEFAULT 0.95,
    severity VARCHAR(32) NOT NULL DEFAULT 'warning',
    auto_action_eligible BOOLEAN NOT NULL DEFAULT FALSE,
    key_sensors_json TEXT NOT NULL DEFAULT '[]',
    report_text TEXT,
    created_at VARCHAR(64) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_alerts_flight_created ON alerts (flight_id, created_at DESC);

-- 4. Operator Human-in-the-Loop Feedback Records
CREATE TABLE IF NOT EXISTS operator_feedback (
    id SERIAL PRIMARY KEY,
    alert_id VARCHAR(64) NOT NULL,
    verdict VARCHAR(32) NOT NULL,
    created_at VARCHAR(64) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feedback_alert ON operator_feedback (alert_id);

-- 5. Federated Fleet Learning Communication Rounds
CREATE TABLE IF NOT EXISTS fleet_rounds (
    round_num INTEGER PRIMARY KEY,
    num_clients INTEGER NOT NULL DEFAULT 5,
    global_f1 NUMERIC(6, 4) NOT NULL,
    summary_json TEXT NOT NULL DEFAULT '{}',
    created_at VARCHAR(64) NOT NULL
);

-- 6. MAVLink / Autopilot Raw Ingestion Logs
CREATE TABLE IF NOT EXISTS mavlink_logs (
    id SERIAL PRIMARY KEY,
    packet_type VARCHAR(64) NOT NULL DEFAULT 'MAVLink',
    raw_payload_json TEXT NOT NULL DEFAULT '{}',
    snapshot_json TEXT NOT NULL DEFAULT '{}',
    created_at VARCHAR(64) NOT NULL
);
