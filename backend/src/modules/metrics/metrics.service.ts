import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Registry, collectDefaultMetrics, Counter, Gauge, Histogram } from 'prom-client';

export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

export interface MetricDefinition {
  type: MetricType;
  name: string;
  help: string;
  labelNames?: string[];
  buckets?: number[];
}

@Injectable()
export class MetricsService implements OnModuleDestroy {
  private readonly registry: Registry;
  private metricsIntervals: NodeJS.Timeout[] = [];
  
  // HTTP Metrics
  private httpRequestDuration: Histogram<string>;
  
  // Kafka Metrics
  private kafkaProcessingTimeHistogram: Histogram<string>;
  
  // Event Tracking Metrics (Consolidated)
  private eventsReceivedCounter: Counter<string>;  // Replaces http_requests_total
  private eventsProducedCounter: Counter<string>;  // Replaces kafka_events_total
  private eventsPendingGauge: Gauge<string>;
  private eventsAbortedCounter: Counter<string>;   // Replaces kafka_errors_total
  
  // DB Metrics
  private dbQueryDurationHistogram: Histogram<string>;
  private dbQueryErrorsCounter: Counter<string>;
  
  private static instance: MetricsService | null = null;
  private static isInitialized = false;

  private constructor() {
    if (MetricsService.isInitialized) {
      throw new Error('MetricsService is already initialized. Use MetricsService.getInstance() instead.');
    }

    this.registry = new Registry();
    this.initializeMetrics();
    MetricsService.isInitialized = true;
  }

  public static getInstance(): MetricsService {
    if (!this.instance) {
      this.instance = new MetricsService();
    }
    return this.instance;
  }

  public onModuleDestroy() {
    this.metricsIntervals.forEach(clearInterval);
    this.metricsIntervals = [];
    MetricsService.instance = null;
    MetricsService.isInitialized = false;
  }

  private initializeMetrics(): void {
    this.initializeHttpMetrics();
    this.initializeKafkaMetrics();
    this.initializeDbMetrics();
    this.initializeSystemMetrics();
    this.initializeEventTrackingMetrics();
  }

  private initializeHttpMetrics(): void {
    // HTTP Request Duration Histogram (kept for performance monitoring)
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.1, 0.3, 0.5, 1, 2, 5],
      registers: [this.registry],
    });
  }

  private initializeKafkaMetrics(): void {

    // Kafka Processing Time Histogram
    this.kafkaProcessingTimeHistogram = new Histogram({
      name: 'kafka_processing_time_seconds',
      help: 'Time taken to process Kafka messages',
      labelNames: ['topic'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
      registers: [this.registry],
    });
  }

  private initializeDbMetrics(): void {
    // DB Query Duration Histogram
    this.dbQueryDurationHistogram = new Histogram({
      name: 'db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
      registers: [this.registry],
    });

    // DB Query Errors Counter
    this.dbQueryErrorsCounter = new Counter({
      name: 'db_query_errors_total',
      help: 'Total number of database query errors',
      labelNames: ['operation', 'table', 'error_type'],
      registers: [this.registry],
    });
  }

  private initializeSystemMetrics(): void {
    // Collect default Node.js metrics
    collectDefaultMetrics({
      register: this.registry,
      prefix: 'node_',
      gcDurationBuckets: [0.1, 1, 2, 5],
    });
  }

  // HTTP Metrics Methods
  public recordHttpRequest(method: string, route: string, statusCode: number): void {
    // Record all HTTP requests as received events
    this.recordEventReceived('http_request');
    
    // Record failed requests as aborted events
    if (statusCode >= 400) {
      this.recordEventAborted(
        `http_${statusCode}`, 
        'http_request',
        { method: method.toLowerCase(), route }
      );
    }
  }

  public recordHttpRequestDuration(
    method: string,
    route: string,
    statusCode: number,
    duration: number
  ): void {
    this.httpRequestDuration
      .labels({
        method: method.toLowerCase(),
        route,
        status: statusCode.toString(),
      })
      .observe(duration);
  }

  // Kafka Metrics Methods - Updated to use event tracking metrics
  public recordKafkaEvent(topic: string): void {
    this.recordEventProduced(topic);
  }

  // Event Tracking Methods
  private initializeEventTrackingMetrics(): void {
    // Events Received Counter (replaces http_requests_total)
    this.eventsReceivedCounter = new Counter({
      name: 'events_received_total',
      help: 'Total number of events received by the system',
      labelNames: ['type', 'method', 'route'],  // Added HTTP-specific labels
      registers: [this.registry],
    });

    // Events Produced Counter (replaces kafka_events_total)
    this.eventsProducedCounter = new Counter({
      name: 'events_produced_total',
      help: 'Total number of events successfully produced to Kafka',
      labelNames: ['topic'],
      registers: [this.registry],
    });

    // Events Pending Gauge
    this.eventsPendingGauge = new Gauge({
      name: 'events_pending',
      help: 'Current number of events pending processing',
      labelNames: ['type'],
      registers: [this.registry],
    });

    // Events Aborted Counter (replaces kafka_errors_total and http_errors_total)
    this.eventsAbortedCounter = new Counter({
      name: 'events_aborted_total',
      help: 'Total number of events aborted during processing',
      labelNames: ['type', 'reason', 'method', 'route'],  // Added HTTP-specific labels
      registers: [this.registry],
    });
  }

  // Public methods to update event metrics
  public recordEventReceived(
    eventType: string = 'default', 
    labels: Record<string, string> = {}
  ): void {
    this.eventsReceivedCounter.inc({ 
      type: eventType,
      method: labels.method || '',
      route: labels.route || ''
    });
  }

  public recordEventProduced(topic: string): void {
    this.eventsProducedCounter.inc({ topic });
  }

  public updatePendingEvents(count: number, eventType: string = 'default'): void {
    this.eventsPendingGauge.set({ type: eventType }, count);
  }

  public recordEventAborted(
    reason: string, 
    eventType: string = 'default',
    labels: Record<string, string> = {}
  ): void {
    this.eventsAbortedCounter.inc({ 
      type: eventType, 
      reason,
      method: labels.method || '',
      route: labels.route || ''
    });
  }

  public trackKafkaEvent(topic: string, status: 'success' | 'failed'): void {
    if (status === 'success') {
      this.recordEventProduced(topic);
    } else {
      this.recordEventAborted('kafka_error', 'kafka_event', { topic });
    }
  }

  public recordKafkaProcessingTime<T>(
    topic: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const end = this.kafkaProcessingTimeHistogram.startTimer({ topic });
    return operation().finally(() => end());
  }

  // DB Metrics Methods
  public recordDbQuery(
    operation: string,
    table: string,
    duration: number,
    success: boolean = true,
    errorType?: string
  ): void {
    this.dbQueryDurationHistogram.observe(
      { operation, table },
      duration
    );

    if (!success && errorType) {
      this.dbQueryErrorsCounter.inc({
        operation,
        table,
        error_type: errorType,
      });
    }
  }

  // Utility Methods
  public async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  public getRegistry(): Registry {
    return this.registry;
  }
}
