import { createClient, type ClickHouseClient } from '@clickhouse/client';
import {
  TrackEvent,
  PageViewEvent,
  ClickEvent,
  ErrorEvent as TrackerErrorEvent,
  PerformanceEvent,
} from '../types/events';
import { setTimeout } from 'timers/promises';
import config from '../config';

export class ClickHouseService {
  private client: ClickHouseClient;
  private batch: TrackEvent[] = [];
  private readonly config: typeof config.clickhouse;
  private isProcessing: boolean = false;
  private isShuttingDown: boolean = false;
  private processBatchesPromise: Promise<void> | null = null;

  constructor() {
    this.config = config.clickhouse;

    // Configuration for @clickhouse/client v1.11.2 using URL
    const clickhouseConfig = {
      // Connection URL with credentials
      url: this.config.url,
      database: this.config.database,

      // Request timeout in milliseconds
      request_timeout: 60000,

      // ClickHouse server settings with correct types
      clickhouse_settings: {
        // Performance settings
        async_insert: 1 as const,
        wait_for_async_insert: 1 as const,

        // Execution settings
        max_threads: 8,
        max_execution_time: 120,

        // HTTP settings
        enable_http_compression: 1 as const,

        // Data handling
        join_use_nulls: 1 as const,
        use_uncompressed_cache: 1 as const,

        // Network timeouts (in seconds)
        send_timeout: 300,
        receive_timeout: 300,
        connect_timeout: 10,

        // Memory settings (must be string for ClickHouse)
        max_memory_usage: '10000000000',
      },

      // Disable logging to avoid type issues
      log: undefined,
    };

    console.log('ClickHouse config:', clickhouseConfig);

    this.client = createClient(clickhouseConfig);

    // Log connection status
    console.log('Initializing ClickHouse client with config:', {
      url: this.config.url
    });

    // Start batch processing loop
    this.processBatchesPromise = this.processBatches();
  }

  async addToBatch(event: TrackEvent) {
    this.batch.push(event);

    // Process batch if size threshold is reached
    if (this.batch.length >= this.config.batchSize) {
      await this.processBatch();
    }
  }

  private async processBatches() {
    while (!this.isShuttingDown) {
      try {
        if (this.batch.length > 0) {
          await this.processBatch();
        }
        await setTimeout(this.config.batchTimeoutMs);
      } catch (error) {
        console.error('Error in batch processing loop:', error);
        // Add a small delay before continuing the loop after an error
        await setTimeout(1000);
      }
    }
  }

  private async processBatch() {
    if (this.isProcessing || this.batch.length === 0) return;

    this.isProcessing = true;
    const batchToProcess = [...this.batch];
    this.batch = [];

    try {
      await this.withRetry({
        fn: () => this.insertBatch(batchToProcess),
        operation: 'insertBatch',
        batchSize: batchToProcess.length,
      });
      console.log(
        `Successfully processed batch of ${batchToProcess.length} events`
      );
    } catch (error) {
      console.error('Failed to process batch:', error);
      // Re-add failed events to the beginning of the batch
      this.batch.unshift(...batchToProcess);
    } finally {
      this.isProcessing = false;
    }
  }

  private async insertBatch(events: TrackEvent[]) {
    if (events.length === 0) return;

    const formattedEvents = events.map((event) => this.formatEvent(event));

    await this.client.insert({
      table: 'events',
      values: formattedEvents,
      format: 'JSONEachRow',
    });
  }

  private formatEvent(event: TrackEvent) {
    // Convert timestamp to ClickHouse DateTime64 format
    console.log('Processing event:', event); 
    const eventTime = new Date(event.timestamp);
    const eventTimeStr = eventTime
      .toISOString()
      .replace('T', ' ')
      .replace('Z', '');

    // Get device info with defaults
    const deviceInfo = event.deviceInfo || {
      deviceType: 'desktop',
      os: 'unknown',
      browser: 'unknown',
    };

    // Base event with only the fields that exist in the ClickHouse schema
    const baseEvent = {
      // Core identifiers
      event_id: event.eventId,
      event_type: event.eventType,
      tenant_id: event.tenantId,
      user_id: event.userId,
      session_id: event.sessionId,

      // Timestamps
      timestamp: eventTimeStr,

      // Page information
      page_url: event.pageUrl || '',
      referrer: event.referrer,

      // Device information
      device_type: deviceInfo.deviceType,
      os: deviceInfo.os,
      browser: deviceInfo.browser,

      // Event properties as JSON string
      properties: JSON.stringify(event.properties || {}),
    };

    // Handle event-type specific fields
    switch (event.eventType) {
      case 'page_view':
        return baseEvent; // No additional fields needed for page_view

      case 'click':
        return baseEvent; // No additional fields needed for click

      case 'error': {
        const errorEvent = event as TrackerErrorEvent;
        return {
          ...baseEvent,
          // Add error-specific fields to properties
          properties: JSON.stringify({
            ...event.properties,
            error_type: 'Error',
            error_stack: errorEvent.properties.stack,
          }),
        };
      }

      case 'performance':
        return baseEvent; // No additional fields needed for performance

      default:
        return baseEvent;
    }
  }

  private async withRetry<T>({
    fn,
    operation,
    batchSize,
    attempt = 1,
  }: {
    fn: () => Promise<T>;
    operation: string;
    batchSize: number;
    attempt?: number;
  }): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= this.config.maxRetries) {
        console.error(
          `[${operation}] Max retries (${this.config.maxRetries}) exceeded for batch of ${batchSize} events`
        );
        throw error;
      }

      const delay = this.config.retryDelayMs * attempt;
      console.log(
        `[${operation}] Retry ${attempt}/${this.config.maxRetries} after ${delay}ms...`
      );

      await setTimeout(delay);
      return this.withRetry({ fn, operation, batchSize, attempt: attempt + 1 });
    }
  }

  // For testing or manual flush
  async flush() {
    await this.processBatch();
  }

  async close() {
    try {
      console.log('Closing ClickHouse service...');
      this.isShuttingDown = true;

      // Wait for the current batch to complete processing
      if (this.processBatchesPromise) {
        await this.processBatchesPromise;
      }

      // Flush any remaining events
      await this.flush();

      // Close the ClickHouse client
      await this.client.close();
      console.log('ClickHouse service closed successfully');
    } catch (error) {
      console.error('Error during ClickHouse service shutdown:', error);
      throw error;
    }
  }
}
