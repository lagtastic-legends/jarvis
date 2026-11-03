-- ==============================================================================
-- JARVIS SEED DATA (Local Development & Initial Setup)
-- ==============================================================================

-- 1. Insert default user profile (assumes auth user exists or for standalone testing)
-- Replace '00000000-0000-0000-0000-000000000000' with actual auth.uid() when linked to Auth
DO $$
DECLARE
    default_user_id UUID := '00000000-0000-0000-0000-000000000000';
BEGIN
    -- Only insert if dummy user or testing profile table directly
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = default_user_id) THEN
        INSERT INTO public.profiles (id, callsign, specialist_mode, voice_enabled, telemetry_enabled)
        VALUES (default_user_id, 'Sir', 'general', true, true)
        ON CONFLICT (id) DO NOTHING;

        -- 2. Insert Initial Seed Memories
        INSERT INTO public.memories (user_id, category, content, is_active, metadata)
        VALUES 
            (default_user_id, 'preference', 'User prefers concise direct briefings, priority alerts on thermal power surges, and automatic flight path calibrations.', true, '{"confidence": "99.9%"}'::jsonb),
            (default_user_id, 'project', 'Active design initiative: Mark 85 Titanium composite outer carapace. Requires thermal shielding test in cryogenic environment.', true, '{"confidence": "98.4%"}'::jsonb),
            (default_user_id, 'instruction', 'Auto-engage perimeter defense sweeps every 60 minutes when user is away from Malibu lab.', true, '{"confidence": "99.2%"}'::jsonb),
            (default_user_id, 'fact', 'Arc Reactor Mark VII core output threshold calibrated at 3.0 gigajoules/sec.', true, '{"confidence": "100%"}'::jsonb);

        -- 3. Insert Initial Action Queue Items
        INSERT INTO public.action_queue (user_id, action_type, target_resource, payload, status, risk_level)
        VALUES
            (default_user_id, 'OVERRIDE_POWER_ROUTING', 'Sector 4 Sub-Station', '{"route": "Arc Reactor Backup", "targetGrid": "Perimeter Defense"}'::jsonb, 'pending', 'high'),
            (default_user_id, 'PURGE_LOGS_ARCHIVE', 'Telemetry Historical Cluster', '{"ageThresholdDays": 90, "force": false}'::jsonb, 'pending', 'medium');

        -- 4. Insert Initial Operational Tasks
        INSERT INTO public.tasks (user_id, title, description, priority, status, due_date)
        VALUES
            (default_user_id, 'Orbital satellite communication alignment', 'Synchronize quantum communications relay with Stark Industries constellation.', 'high', 'completed', NOW() + INTERVAL '2 hours'),
            (default_user_id, 'Compile flight dynamics report for Stark Industries Board', 'Assemble thermal dispersion and Mach 3.4 cruise data.', 'critical', 'in_progress', NOW() + INTERVAL '4 hours'),
            (default_user_id, 'Run quantum encryption salt refresh on server nodes', 'Re-key cryptographic entropy on all secondary intelligence nodes.', 'medium', 'pending', NOW() + INTERVAL '1 day');
    END IF;
END $$;
