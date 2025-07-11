import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Counter, Histogram, Gauge, Registry, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleDestroy {
  private readonly registry: Registry;

  // HTTP Metrics
  public httpRequestCounter: Counter<string>;
  public httpRequestDuration: Histogram<string>;
  public httpErrorsCounter: Counter<string>;
  
  // Kafka Metrics
  public kafkaMessageCounter: Counter<string>;
  public kafkaErrorCounter: Counter<string>;
  
  // System Metrics
  public memoryUsageGauge: Gauge<string>;
  public eventProcessingTime: Histogram<string>;

  private metricsIntervals: NodeJS.Timeout[] = [];
  private static instance: MetricsService | null = null;
  private static isInitialized = false;

  private constructor() {
    if (MetricsService.isInitialized) {
      throw new Error('MetricsService is already initialized. Use MetricsService.getInstance() instead.');
    }

    this.registry = new Registry();
    
    // Initialize HTTP metrics
    this.httpRequestCounter = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
      registers: [this.registry],
    });

    this.httpErrorsCounter = new Counter({
      name: 'http_errors_total',
      help: 'Total number of HTTP errors',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    // Initialize Kafka metrics
    this.kafkaMessageCounter = new Counter({
      name: 'kafka_messages_total',
      help: 'Total number of Kafka messages produced',
      labelNames: ['topic'],
      registers: [this.registry],
    });

    this.kafkaErrorCounter = new Counter({
      name: 'kafka_errors_total',
      help: 'Total number of Kafka errors',
      labelNames: ['topic', 'error_type'],
      registers: [this.registry],
    });

    // System metrics
    this.memoryUsageGauge = new Gauge({
      name: 'process_resident_memory_bytes',
      help: 'Resident memory size in bytes',
      registers: [this.registry],
    });

    this.eventProcessingTime = new Histogram({
      name: 'event_processing_seconds',
      help: 'Time taken to process events',
      labelNames: ['event_type'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    // Register default Node.js metrics
    collectDefaultMetrics({
      register: this.registry,
      prefix: 'node_',
      gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
    });

    // Update memory usage periodically if not in test environment
    if (typeof process !== 'undefined' && process.memoryUsage && process.env.NODE_ENV !== 'test') {
      const interval = setInterval(() => {
        this.memoryUsageGauge.set(process.memoryUsage().rss);
      }, 10000);
      
      this.metricsIntervals.push(interval);
    }

    MetricsService.isInitialized = true;
  }

  // Singleton pattern to prevent multiple instances
  public static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  // Method to get metrics as a string
  async getMetrics() {
    return this.registry.metrics();
  }

  // Method to get the registry directly
  getRegistry() {
    return this.registry;
  }

  onModuleDestroy() {
    // Clear all intervals when the module is destroyed
    this.metricsIntervals.forEach(clearInterval);
    this.metricsIntervals = [];
    MetricsService.isInitialized = false;
    MetricsService.instance = null;
  }
  
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number) {
    const labels = { method, route, status_code: statusCode.toString() };
    
    this.httpRequestCounter.inc(labels);
    this.httpRequestDuration.observe(labels, duration);
    
    if (statusCode >= 400) {
      this.httpErrorsCounter.inc(labels);
    }
  }

  // Method to record Kafka message production
  recordKafkaMessage(topic: string) {
    this.kafkaMessageCounter.inc({ topic });
  }

  // Method to record Kafka errors
  recordKafkaError(topic: string, errorType: string) {
    this.kafkaErrorCounter.inc({ topic, error_type: errorType });
  }

  // Method to record event processing time
  startEventProcessingTimer(eventType: string) {
    return this.eventProcessingTime.startTimer({ event_type: eventType });
  }
}
