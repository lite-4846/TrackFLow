-- Drop and recreate the database to ensure clean slate
DROP DATABASE IF EXISTS trackflow;
CREATE DATABASE trackflow;

-- Switch to the trackflow database
USE trackflow;

-- Create the events table with schema matching tracker types
CREATE TABLE IF NOT EXISTS trackflow.events (
    -- Core identifiers
    event_id String,
    event_type Enum8('click' = 1, 'page_view' = 2, 'error' = 3, 'performance' = 4),
    tenant_id String,
    user_id Nullable(String),
    session_id String,
    
    -- Timestamps
    timestamp DateTime64(3, 'UTC') CODEC(Delta, ZSTD(1)),
    
    -- Page information
    page_url String,
    referrer Nullable(String),
    
    -- Device information
    device_type Enum8('mobile' = 1, 'desktop' = 2),
    os String,
    browser String,
    
    -- Event-specific properties (stored as JSON string)
    properties String,
    
    -- Materialized columns for common properties
    title String MATERIALIZED JSONExtractString(properties, 'title'),
    element_tag String MATERIALIZED JSONExtractString(properties, 'tag'),
    element_id String MATERIALIZED JSONExtractString(properties, 'id'),
    error_message String MATERIALIZED JSONExtractString(properties, 'message'),
    error_source String MATERIALIZED JSONExtractString(properties, 'source'),
    load_time UInt32 MATERIALIZED toUInt32(JSONExtractFloat(properties, 'loadTime') * 1000),
    
    -- System fields
    _ingested_at DateTime64(3, 'UTC') DEFAULT now64(3)
) ENGINE = MergeTree()
ORDER BY (tenant_id, toDate(timestamp), event_type, cityHash64(session_id))
TTL toDate(timestamp) + INTERVAL 90 DAY
SETTINGS index_granularity = 8192;