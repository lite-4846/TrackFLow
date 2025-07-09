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
  let apiKey = 'NOT_FOUND';
  let args = window.dataLayer || [];
  console.log(args);
  if (args?.length > 0 && args[0][0] === 'config' && args[0][1]) {
    apiKey = args[0][1]; // Store API Key
    const tracker = Tracker.init(apiKey, window.dataLayer);
    window.track = tracker.track;
  } else {
    console.error('API_KEY Not found');
  }
})();
