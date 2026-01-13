-- RoadGuard Database Schema for Neon (Postgres)
-- This schema is used for caching on-chain events for fast geo-queries

-- Reports cache table
CREATE TABLE IF NOT EXISTS reports_cache (
    id SERIAL PRIMARY KEY,
    chain_report_id BIGINT UNIQUE NOT NULL,
    reporter_commitment VARCHAR(66) NOT NULL,
    location_lat DECIMAL(10, 8) NOT NULL,
    location_lng DECIMAL(11, 8) NOT NULL,
    event_type SMALLINT NOT NULL CHECK (event_type >= 0 AND event_type <= 5),
    status SMALLINT NOT NULL DEFAULT 0 CHECK (status >= 0 AND status <= 3),
    -- 0 = ACTIVE, 1 = CONFIRMED, 2 = EXPIRED, 3 = SLASHED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    total_regards DECIMAL(36, 18) NOT NULL DEFAULT 0,
    confirmation_count INTEGER NOT NULL DEFAULT 0,
    tx_hash VARCHAR(66) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient geo-queries
CREATE INDEX IF NOT EXISTS idx_reports_geo ON reports_cache (location_lat, location_lng);
CREATE INDEX IF NOT EXISTS idx_reports_time ON reports_cache (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports_cache (status);
CREATE INDEX IF NOT EXISTS idx_reports_expires ON reports_cache (expires_at);
CREATE INDEX IF NOT EXISTS idx_reports_commitment ON reports_cache (reporter_commitment);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_reports_cache_updated_at ON reports_cache;
CREATE TRIGGER update_reports_cache_updated_at
    BEFORE UPDATE ON reports_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Confirmations table (tracks who confirmed what)
CREATE TABLE IF NOT EXISTS confirmations (
    id SERIAL PRIMARY KEY,
    chain_report_id BIGINT NOT NULL REFERENCES reports_cache(chain_report_id),
    confirmer_address VARCHAR(42) NOT NULL,
    tx_hash VARCHAR(66) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(chain_report_id, confirmer_address)
);

CREATE INDEX IF NOT EXISTS idx_confirmations_report ON confirmations (chain_report_id);

-- Regards (tips) table
CREATE TABLE IF NOT EXISTS regards (
    id SERIAL PRIMARY KEY,
    chain_report_id BIGINT NOT NULL REFERENCES reports_cache(chain_report_id),
    sender_address VARCHAR(42) NOT NULL,
    amount DECIMAL(36, 18) NOT NULL,
    tx_hash VARCHAR(66) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_regards_report ON regards (chain_report_id);
CREATE INDEX IF NOT EXISTS idx_regards_sender ON regards (sender_address);

-- View for active reports with aggregated data
CREATE OR REPLACE VIEW active_reports AS
SELECT
    rc.id,
    rc.chain_report_id,
    rc.location_lat,
    rc.location_lng,
    rc.event_type,
    rc.status,
    rc.confirmation_count,
    rc.total_regards,
    rc.created_at,
    rc.expires_at,
    CASE
        WHEN rc.event_type = 0 THEN 'Accident'
        WHEN rc.event_type = 1 THEN 'Road Closure'
        WHEN rc.event_type = 2 THEN 'Protest'
        WHEN rc.event_type = 3 THEN 'Police Activity'
        WHEN rc.event_type = 4 THEN 'Hazard'
        WHEN rc.event_type = 5 THEN 'Traffic Jam'
    END as event_type_label
FROM reports_cache rc
WHERE rc.status IN (0, 1)  -- Active or Confirmed
  AND rc.expires_at > NOW();

-- Sample data for demo purposes
-- INSERT INTO reports_cache (chain_report_id, reporter_commitment, location_lat, location_lng, event_type, expires_at, tx_hash)
-- VALUES
--     (1, '0x1234...', 40.71280000, -74.00600000, 2, NOW() + INTERVAL '24 hours', '0xabc...'),
--     (2, '0x5678...', 40.75890000, -73.98510000, 0, NOW() + INTERVAL '24 hours', '0xdef...');
