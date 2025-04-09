import { Tracker } from './core/tracker';

// // Export Tracker for npm users
// export { Tracker };

declare global {
  interface Window {
    dataLayer?: any[];
    track?: (eventName: string, properties?: Record<string, any>) => void;
    Tracker?: any;
  }
}

(function () {
  let API_KEY = 'NOT_FOUND';
  let args = window.dataLayer || [];
  if (args?.length > 1 && args[1][0] === 'config' && args[1][1])
    API_KEY = args[1][1]; // Store API Key
  const tracker = Tracker.init(API_KEY, window.dataLayer);
  window.track = tracker.track;
})();
