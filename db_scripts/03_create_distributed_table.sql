-- Skip distributed table for local development
-- This is a placeholder for future distributed setup
-- For local development, use the regular table directly

-- To set up a distributed table in production:
-- 1. Configure clusters in config.xml
-- 2. Then create the distributed table with:
--
-- CREATE TABLE IF NOT EXISTS trackflow.events_distributed
-- AS trackflow.events
-- ENGINE = Distributed('production_cluster', 'trackflow', 'events', 
--     cityHash64(concat(toString(tenant_id), toString(session_id))));
