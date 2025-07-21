/**
 * Constants for event types used in metrics and tracking
 */

export const EventTypes = {
  // Kafka-related events
  KAFKA: {
    PRODUCE: 'kafka_produce',
    CONNECTION: 'kafka_connection',
    BROKER_UNAVAILABLE: 'broker_unavailable',
    PRODUCER_ERROR: 'kafka_producer_error',
    PRODUCER_CONNECT: 'kafka_producer_connect',
    PRODUCER_DISCONNECT: 'kafka_producer_disconnect',
  },
  
  // HTTP-related events (to be used when implementing HTTP metrics)
  HTTP: {
    REQUEST: 'http_request',
    RESPONSE: 'http_response',
    ERROR: 'http_error',
  },

  EVENTS: {
    RECEIVED: 'event_received',
    PRODUCED: 'event_produced',
    ABORTED: 'event_aborted',
    PENDING: 'event_pending'
  },
  
  // System events
  SYSTEM: {
    STARTUP: 'system_startup',
    SHUTDOWN: 'system_shutdown',
    ERROR: 'system_error',
  },
  
  // Default fallback
  DEFAULT: 'default',
} as const;

// Export type for type safety
export type EventType = typeof EventTypes[keyof typeof EventTypes][keyof typeof EventTypes[keyof typeof EventTypes]];
