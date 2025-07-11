import { Registry, collectDefaultMetrics, Gauge, Counter, Histogram } from 'prom-client';

export class MetricsService {
  private register: Registry;
  private messageCounter: Counter;
  private errorCounter: Counter;
  private processingTime: Histogram;
  private queueSize: Gauge;
  private isCollectingMetrics: boolean;

  constructor() {
    this.register = new Registry();
    this.isCollectingMetrics = false;

    // Enable default metrics (CPU, memory, etc.)
    collectDefaultMetrics({ register: this.register });

    // Custom metrics
    this.messageCounter = new Counter({
      name: 'consumer_messages_processed_total',
      help: 'Total number of messages processed',
      labelNames: ['status'], // success, error
      registers: [this.register],
    });

    this.errorCounter = new Counter({
      name: 'consumer_errors_total',
      help: 'Total number of processing errors',
      labelNames: ['type'],
      registers: [this.register],
    });

    this.processingTime = new Histogram({
      name: 'consumer_message_processing_seconds',
      help: 'Time spent processing messages',
      buckets: [0.1, 0.5, 1, 2, 5],
      registers: [this.register],
    });

    this.queueSize = new Gauge({
      name: 'consumer_queue_size',
      help: 'Current size of the processing queue',
      registers: [this.register],
    });
  }

  public getMetrics() {
    return this.register.metrics();
  }

  public getContentType() {
    return this.register.contentType;
  }

  public async getMetricsAsString() {
    return this.register.metrics();
  }

  public incrementMessageCounter(status: 'success' | 'error') {
    this.messageCounter.inc({ status });
  }

  public incrementErrorCounter(type: string) {
    this.errorCounter.inc({ type });
  }

  public startTimer() {
    return this.processingTime.startTimer();
  }

  public setQueueSize(size: number) {
    this.queueSize.set(size);
  }
}
