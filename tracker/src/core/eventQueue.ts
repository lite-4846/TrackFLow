import { Config } from './config';

export class EventQueue {
  private queue: any[] = [];
  private endpoint: string;
  private apiKey: string;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(endpoint: string, apiKey: string, prevQueue?: any[]) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
    this.queue = prevQueue || [];
    this.startFlushTimer();
  }

  /**
   * Adds an event to the queue and sends if batch size is reached.
   */
  addEvent(event: any) {
    this.queue.push(event);

    if (this.queue.length >= Config.BATCH_SIZE) {
      this.flushEvents();
    }
  }

  /**
   * Starts a timer to flush events at regular intervals.
   */
  private startFlushTimer() {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = setInterval(
      () => this.flushEvents(),
      Config.FLUSH_INTERVAL
    );
  }

  /**
   * Sends the queued events in a batch request.
   */
  private async flushEvents() {
    if (this.queue.length === 0) return;

    const eventsToSend = [...this.queue];
    this.queue = []; // Clear queue before sending

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ events: eventsToSend }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send events: ${response.statusText}`);
      }

      console.log(`Successfully sent ${eventsToSend.length} events`);
    } catch (error) {
      console.error('Event flush failed:', error);
      this.retryFailedEvents(eventsToSend);
    }
  }

  /**
   * Retries failed event batches.
   */
  private retryFailedEvents(events: any[], attempt = 1) {
    if (attempt > Config.MAX_RETRIES) {
      console.warn('Max retry attempts reached. Dropping events.');
      return;
    }

    setTimeout(async () => {
      console.log(`Retrying batch (Attempt ${attempt})`);

      try {
        const response = await fetch(this.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({ events }),
        });

        if (!response.ok) {
          throw new Error(`Failed to send events: ${response.statusText}`);
        }

        console.log(`Successfully retried ${events.length} events`);
      } catch (error) {
        console.error(`Retry attempt ${attempt} failed:`, error);
        this.retryFailedEvents(events, attempt + 1); // Increment attempt
      }
    }, 2000 * attempt); // Exponential backoff (2s, 4s, 6s, etc.)
  }
}
