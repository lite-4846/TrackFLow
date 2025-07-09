import { Tracker } from "../core/tracker";

function initializeTracker() {
  if (window.Tracker) {
    const tracker = window.Tracker.init(
      'Anime-attire',
      window.trackflowQueue
    );
    console.log('Tracker Instance Initialized', tracker);
    // Process buffered events
    window.trackflowQueue?.forEach(({ eventName, properties }) => {
      tracker.track(eventName, properties);
    });

    // Clear queue after processing
    window.trackflowQueue = [];

    // Overwrite temporary track function with actual SDK method
    window.track = function (
      eventName: string,
      properties: Record<string, any> = {}
    ) {
      tracker.track(eventName, properties);
    };
  } else {
    console.log('Failed to initialize Tracker Instance');
  }
}

// Attach Tracker to the global window object for CDN users
if (typeof window !== "undefined") {
  (window as any).Tracker = Tracker;
  initializeTracker();
  console.log('Tracker Initialized');
}