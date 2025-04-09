import { Tracker } from "../core/tracker";

// errors.ts
export class ErrorTracker {
  private tracker: Tracker;

  constructor(tracker: Tracker) {
    this.tracker = tracker;
  }

  handleError = (event: ErrorEvent) => {
    this.tracker.track(
      "error",
      {
        message: event.message,
        source: event.filename,
        line: event.lineno,
        col: event.colno,
        stack: event.error?.stack || null,
      },
    );
  };

  init() {
    window.addEventListener("error", this.handleError);
  }
}
