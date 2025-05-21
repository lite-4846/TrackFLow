// page.ts

import { Tracker } from '../core/tracker';

export class PageTracker {
  private tracker: Tracker;

  constructor(tracker: Tracker) {
    this.tracker = tracker;
  }

  trackPageView() {
    this.tracker.track('page_view', {
      title: document.title,
    });
  }

  listenForNavigation() {
    window.addEventListener('popstate', () => this.trackPageView());
  }

  init() {
    this.trackPageView();
    this.listenForNavigation();
  }
}
