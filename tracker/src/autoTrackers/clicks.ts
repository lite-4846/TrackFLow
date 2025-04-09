import { Tracker } from "../core/tracker";

export class ClickTracker {
  private tracker: any;

  constructor(tracker: Tracker) {
    this.tracker = tracker;
  }

  handleClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    this.tracker.track(
      "click",
      {
        tag: target.tagName,
        id: target.id || null,
      },
    );
  };

  trackClicks() {
    document.addEventListener('click', this.handleClick);
  }

  init() {
    this.trackClicks();
  }
};