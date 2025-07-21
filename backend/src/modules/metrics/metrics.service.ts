import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Counter, register } from 'prom-client';
import { EventTypes } from '../../constants/event-types.constants';

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
  private metricsIntervals: NodeJS.Timeout[] = [];
  
  // Event Tracking Metrics
  private eventsReceivedCounter: Counter<string>;
  private eventsProducedCounter: Counter<string>;
  // private eventsPendingCounter: Counter<string>;
  private eventsAbortedCounter: Counter<string>;

  private static instance: MetricsService | null = null;
  private static isInitialized = false;

  private constructor() {
    if (MetricsService.isInitialized) {
      throw new Error('MetricsService is already initialized. Use MetricsService.getInstance() instead.');
    }

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
    this.initializeEventTrackingMetrics();
  }

  // private initializeSystemMetrics(): void {
  //   // Collect default Node.js metrics using the default registry
  //   collectDefaultMetrics();
  // }

  // Event Tracking Methods
  private initializeEventTrackingMetrics(): void {
    // Events Received Counter
    this.eventsReceivedCounter = new Counter({
      name: 'events_received_total',
      help: 'Total number of events received by the system',
      labelNames: ['type']
    });

    // Events Produced Counter
    this.eventsProducedCounter = new Counter({
      name: 'events_produced_total',
      help: 'Total number of events successfully produced',
      labelNames: ['type']
    });

    // Events Pending Counter
    // this.eventsPendingCounter = new Counter({
    //   name: 'events_pending',
    //   help: 'Current number of pending events',
    //   labelNames: ['type']
    // });

    // Events Aborted Counter
    this.eventsAbortedCounter = new Counter({
      name: 'events_aborted_total',
      help: 'Total number of events aborted during processing',
      labelNames: ['type', 'reason', 'method', 'route']
    });
  }

  // Public methods to update event metrics
  public recordEventReceived(
    eventType: string = EventTypes.EVENTS.RECEIVED
  ): void {
    this.eventsReceivedCounter.inc({ 
      type: eventType
    });
  }

  public recordEventProduced(eventType: string = EventTypes.EVENTS.PRODUCED): void {
    this.eventsProducedCounter.inc({ type: eventType });
  }

  public recordEventAborted(
    reason: string, 
    eventType: string = EventTypes.EVENTS.ABORTED,
    labels: Record<string, string> = {}
  ): void {
    this.eventsAbortedCounter.inc({ 
      type: eventType, 
      reason,
      method: labels.method || '',
      route: labels.route || ''
    });
  }

  // Utility Methods
  public async getMetrics(): Promise<string> {
    return register.metrics();
  }
}
