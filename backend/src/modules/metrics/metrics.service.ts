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
  private httpRequestCounter: Counter<string>;
  private httpRequestDuration: Histogram<string>;
  private httpErrorsCounter: Counter<string>;
  
  // Kafka Metrics
  private kafkaEventCounter: Counter<string>;
  private kafkaErrorCounter: Counter<string>;
  private kafkaQueueSizeGauge: Gauge<string>;
  private kafkaProcessingTimeHistogram: Histogram<string>;
  
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
  }

  private initializeHttpMetrics(): void {
    // HTTP Request Counter
    this.httpRequestCounter = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    // HTTP Request Duration Histogram
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.1, 0.3, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    // HTTP Errors Counter
    this.httpErrorsCounter = new Counter({
      name: 'http_errors_total',
      help: 'Total number of HTTP errors',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });
  }

  private initializeKafkaMetrics(): void {
    // Kafka Event Counter
    this.kafkaEventCounter = new Counter({
      name: 'kafka_events_total',
      help: 'Total number of Kafka events processed',
      labelNames: ['topic'],
      registers: [this.registry],
    });

    // Kafka Error Counter
    this.kafkaErrorCounter = new Counter({
      name: 'kafka_errors_total',
      help: 'Total number of Kafka processing errors',
      labelNames: ['topic', 'error_type'],
      registers: [this.registry],
    });

    // Kafka Queue Size Gauge
    this.kafkaQueueSizeGauge = new Gauge({
      name: 'kafka_queue_size',
      help: 'Current size of the Kafka processing queue',
      labelNames: ['topic'],
      registers: [this.registry],
    });

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
    this.httpRequestCounter.inc({
      method: method.toLowerCase(),
      route,
      status_code: statusCode.toString(),
    });

    if (statusCode >= 400) {
      this.httpErrorsCounter.inc({
        method: method.toLowerCase(),
        route,
        status_code: statusCode.toString(),
      });
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

  // Kafka Metrics Methods
  public recordKafkaEvent(topic: string): void {
    this.kafkaEventCounter.inc({ topic });
  }

  // Alias for backward compatibility
  public trackKafkaEvent(topic: string, status: 'success' | 'failed'): void {
    if (status === 'success') {
      this.recordKafkaEvent(topic);
    } else {
      this.recordKafkaError(topic, 'processing_error');
    }
  }

  public recordKafkaError(topic: string, errorType: string): void {
    this.kafkaErrorCounter.inc({ topic, error_type: errorType });
  }

  public updateKafkaQueueSize(topic: string, size: number): void {
    this.kafkaQueueSizeGauge.set({ topic }, size);
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
