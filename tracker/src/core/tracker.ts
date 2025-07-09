import { ClickTracker } from '../autoTrackers/clicks';
import { ErrorTracker } from '../autoTrackers/errors';
import { PageTracker } from '../autoTrackers/page';
import { PerformanceTracker } from '../autoTrackers/performance';
import { Config } from './config';
import { EventQueue } from './eventQueue';
import { Session } from './session';

export class Tracker {
  private static instance: Tracker;
  private apiKey: string;
  private queue: EventQueue;
  private endpoint: string;
  private session: Session;

  constructor(apiKey: string, prevQueue?: any[]) {
    this.apiKey = apiKey;
    this.endpoint = Config.API_URL;
    this.queue = new EventQueue(this.endpoint, this.apiKey, prevQueue);
    this.session = new Session();
  }

  generateUUID(): string {
    return [...Array(16)]
      .map(() => Math.floor(Math.random() * 16).toString(16))
      .join('');
  }

  /**
   * Initializes the tracker as a singleton.
   */
  static init(apiKey: string, prevQueue?: any[]): Tracker {
    if (!Tracker.instance) {
      Tracker.instance = new Tracker(apiKey, prevQueue);
      console.log('TrackFlow initialized with API key:', apiKey);
    }
    new PageTracker(Tracker.instance).init();
    new ClickTracker(Tracker.instance).init();
    new PerformanceTracker(Tracker.instance).init();
    new ErrorTracker(Tracker.instance).init();
    return Tracker.instance;
  }

  /**
   * Tracks an event with custom properties.
   */
  track(eventName: string, properties: Record<string, any> = {}) {
    if (!Tracker.instance) {
      console.warn(
        'TrackFlow is not initialized. Call Tracker.init(apiKey) first.'
      );
      return;
    }

    const eventData = {
      eventId: this.generateUUID(),
      eventType: eventName,
      tenantId: this.apiKey,

      properties,

      sessionId: this.session.sessionId,
      userId: this.session.userId,
      timestamp: Date.now(),

      pageUrl: window.location.href,
      referrer: document.referrer || null,

      deviceInfo: this.session.deviceInfo,
    };

    console.log('Tracking event:', eventData);
    this.queue.addEvent(eventData);
  }
}

// // Make tracker accessible globally in the browser
// if (typeof window !== "undefined") {
//   (window as any).trackFlow = Tracker;
// }
