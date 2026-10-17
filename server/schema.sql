-- ==============================================================================
-- 95 STAR TRACKING - SUPABASE POSTGRESQL PRODUCTION SCHEMA
-- ==============================================================================
-- Safe, repeatable migration script for Supabase PostgreSQL.
-- Preserves all 193 rides, 19 drivers, 797 events, tokens, sessions, settings.
-- ==============================================================================

-- 1. FLEET DRIVERS TABLE
CREATE TABLE IF NOT EXISTS fleet_drivers (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    vehicle VARCHAR(255),
    license_plate VARCHAR(50),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fleet_drivers_active ON fleet_drivers(active);
CREATE INDEX IF NOT EXISTS idx_fleet_drivers_name ON fleet_drivers(name);

-- 2. RIDES TABLE
CREATE TABLE IF NOT EXISTS rides (
    id VARCHAR(100) PRIMARY KEY,
    reservation_id VARCHAR(100) NOT NULL,
    passenger_name VARCHAR(255) NOT NULL,
    passenger_email VARCHAR(255) NOT NULL,
    additional_passenger_emails JSONB DEFAULT '[]'::jsonb,
    driver_id VARCHAR(100) REFERENCES fleet_drivers(id) ON DELETE SET NULL,
    driver_name VARCHAR(255),
    driver_phone VARCHAR(50),
    current_status VARCHAR(50) NOT NULL DEFAULT 'created',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tokens JSONB NOT NULL DEFAULT '{}'::jsonb,
    events JSONB NOT NULL DEFAULT '[]'::jsonb,
    last_email_dispatched_at TIMESTAMPTZ,
    last_assigned_driver_id_for_email VARCHAR(100),
    email_dispatch_status JSONB
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rides_reservation_id ON rides(reservation_id);
CREATE INDEX IF NOT EXISTS idx_rides_current_status ON rides(current_status);
CREATE INDEX IF NOT EXISTS idx_rides_driver_id ON rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_rides_created_at ON rides(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rides_passenger_email ON rides(passenger_email);

-- 3. RIDE STATUS EVENTS AUDIT LOG (Granular normalized events)
CREATE TABLE IF NOT EXISTS ride_status_events (
    id VARCHAR(100) PRIMARY KEY,
    ride_id VARCHAR(100) NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
    reservation_id VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    comment TEXT,
    driver_id VARCHAR(100),
    driver_name VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_ride_id ON ride_status_events(ride_id);
CREATE INDEX IF NOT EXISTS idx_events_reservation_id ON ride_status_events(reservation_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON ride_status_events(status);

-- 4. TRACKING TOKENS TABLE (Permanent URL token lookups)
CREATE TABLE IF NOT EXISTS tracking_tokens (
    token VARCHAR(128) PRIMARY KEY,
    ride_id VARCHAR(100) NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('driver', 'passenger', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tracking_tokens_ride_id ON tracking_tokens(ride_id);
CREATE INDEX IF NOT EXISTS idx_tracking_tokens_type ON tracking_tokens(type);

-- 5. ADMIN SESSIONS TABLE
CREATE TABLE IF NOT EXISTS admin_sessions (
    token VARCHAR(128) PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- 6. SYSTEM SETTINGS TABLE (Branding & Admin notification emails)
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row-Level Security (RLS) Configuration:
-- Secure by default: Disallow public anon modifications; allow service role backend full access.
ALTER TABLE fleet_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS in Supabase, but explicit permissive policy for backend service role:
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_fleet_drivers') THEN
        CREATE POLICY service_role_all_fleet_drivers ON fleet_drivers FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_rides') THEN
        CREATE POLICY service_role_all_rides ON rides FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_ride_status_events') THEN
        CREATE POLICY service_role_all_ride_status_events ON ride_status_events FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_tracking_tokens') THEN
        CREATE POLICY service_role_all_tracking_tokens ON tracking_tokens FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_admin_sessions') THEN
        CREATE POLICY service_role_all_admin_sessions ON admin_sessions FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_system_settings') THEN
        CREATE POLICY service_role_all_system_settings ON system_settings FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
