# TrackFlow Data Types Documentation

This document outlines the exact data structure and event types sent by the TrackFlow tracker.

## 1. Core Event Structure

All events share this base structure:

```typescript
interface BaseEvent {
  // Core event data
  eventId: string;           // UUID v4
  eventType: string;         // See event types below
  timestamp: number;         // Unix timestamp in milliseconds
  
  // Tenant identification
  tenantId: string;          // API key provided during tracker initialization
  
  // User and session
  sessionId: string;         // Persistent session ID (stored in sessionStorage)
  userId: string | null;     // User ID if set, otherwise null
  
  // Page information
  pageUrl: string;           // Current page URL (window.location.href)
  referrer: string | null;   // Document referrer or null
  
  // Device information
  deviceInfo: {
    deviceType: string;      // 'mobile' or 'desktop'
    os: string;              // Detected OS (e.g., 'Windows', 'Mac', 'Android')
    browser: string;         // Detected browser (e.g., 'Chrome', 'Firefox')
  };
  
  // Event-specific properties (see below for each event type)
  properties: Record<string, any>;
}
```

## 2. Event Types

### 1. Page View Event
**Event Type:** `page_view`

Triggered on initial page load and subsequent history navigation events.

```typescript
interface PageViewEvent extends BaseEvent {
  eventType: 'page_view';
  properties: {
    title: string;  // Current page title (document.title)
  };
}
```

**Example:**
```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "eventType": "page_view",
  "timestamp": 1625539200000,
  "tenantId": "your-api-key",
  "sessionId": "session-123",
  "userId": "user-456",
  "pageUrl": "https://example.com",
  "referrer": "https://google.com",
  "deviceInfo": {
    "deviceType": "desktop",
    "os": "Windows",
    "browser": "Chrome"
  },
  "properties": {
    "title": "Example Page"
  }
}
```

### 2. Click Event
**Event Type:** `click`

Triggered when a user clicks anywhere on the page.

```typescript
interface ClickEvent extends BaseEvent {
  eventType: 'click';
  properties: {
    tag: string;       // HTML tag name of the clicked element (e.g., 'BUTTON')
    id: string | null; // ID of the clicked element if present
  };
}
```

**Example:**
```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440001",
  "eventType": "click",
  "timestamp": 1625539201000,
  "tenantId": "your-api-key",
  "sessionId": "session-123",
  "userId": "user-456",
  "pageUrl": "https://example.com",
  "referrer": "https://google.com",
  "deviceInfo": {
    "deviceType": "desktop",
    "os": "Windows",
    "browser": "Chrome"
  },
  "properties": {
    "tag": "BUTTON",
    "id": "submit-button"
  }
}
```

### 3. Error Event
**Event Type:** `error`

Triggered when an unhandled JavaScript error occurs.

```typescript
interface ErrorEvent extends BaseEvent {
  eventType: 'error';
  properties: {
    message: string;     // Error message
    source: string;      // URL of the script where error occurred
    line: number;        // Line number where error occurred
    col: number;         // Column number where error occurred
    stack: string | null; // Error stack trace if available
  };
}
```

**Example:**
```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440002",
  "eventType": "error",
  "timestamp": 1625539202000,
  "tenantId": "your-api-key",
  "sessionId": "session-123",
  "userId": "user-456",
  "pageUrl": "https://example.com",
  "referrer": "https://google.com",
  "deviceInfo": {
    "deviceType": "desktop",
    "os": "Windows",
    "browser": "Chrome"
  },
  "properties": {
    "message": "Cannot read property 'x' of undefined",
    "source": "https://example.com/app.js",
    "line": 42,
    "col": 15,
    "stack": "TypeError: Cannot read property 'x' of undefined\n    at doSomething (app.js:42:15)\n    at HTMLButtonElement.onclick (index.html:10:1)"
  }
}
```

### 4. Performance Event
**Event Type:** `performance`

Triggered when the page finishes loading, containing performance metrics.

```typescript
interface PerformanceEvent extends BaseEvent {
  eventType: 'performance';
  properties: {
    loadTime: number;           // Total page load time in milliseconds
    domContentLoaded: number;   // Time until DOMContentLoaded in milliseconds
  };
}
```

**Example:**
```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440003",
  "eventType": "performance",
  "timestamp": 1625539203000,
  "tenantId": "your-api-key",
  "sessionId": "session-123",
  "userId": "user-456",
  "pageUrl": "https://example.com",
  "referrer": "https://google.com",
  "deviceInfo": {
    "deviceType": "desktop",
    "os": "Windows",
    "browser": "Chrome"
  },
  "properties": {
    "loadTime": 2450,
    "domContentLoaded": 1200
  }
}
```
```

#### Error Event
```typescript
interface ErrorEvent extends BaseEvent {
  eventType: 'error';
  name: string;              // Error name/type
  message: string;           // Error message
  stack?: string;            // Error stack trace if available
  source?: string;           // Source file URL
  line?: number;             // Line number
  col?: number;              // Column number
}
```

## 3. Backend Processing

The backend receives a batch of events in the following format:

```typescript
{
  events: Array<PageViewEvent | ClickEvent | ErrorEvent | PerformanceEvent>;
}
```

### Backend Responsibilities:
1. **Validation**
   - Verify required fields are present
   - Validate API key (tenantId)
   - Sanitize input data

2. **Enrichment**
   - Add `received_at` timestamp
   - Extract and store client IP from request headers
   - Optionally add GeoIP data based on IP
   - Add any server-side context

3. **Processing**
   - Batch events for efficient storage
   - Forward to Kafka for async processing

## 4. Event Storage (ClickHouse)

### Schema Design

```sql
CREATE TABLE IF NOT EXISTS events (
    -- Core event data
    event_id UUID,
    event_type Enum8(
        'page_view' = 1,
        'click' = 2,
        'error' = 3,
        'performance' = 4
    ),
    timestamp DateTime64(3, 'UTC'),
    
    -- Tenant and user context
    tenant_id String,
    session_id String,
    user_id Nullable(String),
    
    -- Page context
    page_url String,
    referrer Nullable(String),
    
    -- Device information
    device_type String,
    os String,
    browser String,
    
    -- Server-side enrichment
    ip_address Nullable(String),
    country Nullable(String),
    region Nullable(String),
    city Nullable(String),
    
    -- Event-specific properties (stored as JSON)
    properties JSON,
    
    -- Metadata
    received_at DateTime64(3, 'UTC') DEFAULT now(),
    
    -- Indexes for common query patterns
    INDEX idx_tenant_type_time (tenant_id, event_type, timestamp) TYPE minmax,
    INDEX idx_session (session_id) TYPE bloom_filter,
    INDEX idx_user (user_id) TYPE bloom_filter,
    INDEX idx_error_type (event_type) TYPE set(10) WHERE event_type = 'error',
    INDEX idx_performance (event_type) TYPE set(10) WHERE event_type = 'performance'
) 
ENGINE = MergeTree()
ORDER BY (tenant_id, toStartOfHour(timestamp), event_type, event_id)
PARTITION BY toYYYYMM(timestamp)
TTL timestamp + INTERVAL 1 YEAR
SETTINGS index_granularity = 8192;
```

### Data Flow

1. **Tracker**
   - Captures browser events with all context
   - Batching for efficiency
   - Automatic retry on failure

2. **Backend**
   - Receives batched events via HTTP
   - Validates and enriches with server context
   - Forwards to Kafka

3. **Consumer**
   - Processes events from Kafka
   - Maps to ClickHouse schema
   - Handles batching and retries
   - Implements backoff strategy

4. **ClickHouse**
   - Efficient columnar storage
   - Fast analytical queries
   - Automatic data retention
   - Optimized for time-series data
