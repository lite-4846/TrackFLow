import { Tracker } from '../core/tracker';

export class PerformanceTracker {
  private tracker: any;

  constructor(tracker: Tracker) {
    this.tracker = tracker;
  }

  trackPerformance() {
    window.addEventListener('load', () => {
      const [navTiming] = performance.getEntriesByType(
        'navigation'
      ) as PerformanceNavigationTiming[];

      if (navTiming) {
        this.tracker.track('performance', {
          loadTime: navTiming.loadEventEnd - navTiming.startTime,
          domContentLoaded:
            navTiming.domContentLoadedEventEnd - navTiming.startTime,
        });
      }
    });
  }

  init() {
    window.addEventListener('load', () => this.trackPerformance());
  }
}
