SET allow_experimental_object_type = 1;
CREATE TABLE events
(
    event_id UUID DEFAULT generateUUIDv4(),
    tenant_id UUID,
    user_id UUID,
    session_id UUID,
    event_name LowCardinality(String),
    event_time DateTime('UTC'),

    -- Common analytics fields
    page_url String,	
    page_title String,
    referrer_url String,
    device_type LowCardinality(String),
    browser LowCardinality(String),
    os LowCardinality(String),
    country LowCardinality(String),

    -- Event-specific high usage fields
    tag LowCardinality(String),
    element_id String,
    load_time UInt32,
    dom_content_loaded_time UInt32,

    -- Flexible rare fields
    event_properties Object('json'),

    ingestion_time DateTime DEFAULT now()
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(event_time)
ORDER BY (tenant_id, user_id, session_id, event_time)
TTL event_time + INTERVAL 6 MONTH
SETTINGS index_granularity = 8192;
