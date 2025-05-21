  export {};

  declare global {
    interface Window {
      trackflowQueue?: { eventName: string; properties: Record<string, any> }[];
      track?: (eventName: string, properties?: Record<string, any>) => void;
      Tracker?: any;
    }
  }

  (function () {
    // Ensure trackflowQueue exists on the global window object

    if (!window.trackflowQueue) {
      window.trackflowQueue = [];
    }

    /** Temporary track function to queue events before SDK loads */
    window.track = function (
      eventName: string,
      properties: Record<string, any> = {}
    ) {
      window.trackflowQueue!.push({ eventName, properties });
    };

    /** Load the SDK script dynamically */
    function loadSDK() {
      console.log('Loading TrackFlow SDK...');
      const script = document.createElement('script');
      script.src = 'http://localhost:8080/index.esm.js'; // Replace with actual SDK URL
      script.async = true;
      script.type = 'module';
      script.onload = function () {
        console.log('TrackFlow SDK Loaded there');
        initializeTracker();
      };
      document.head.appendChild(script);
    }

    /** Process queued events once SDK is ready */
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
    loadSDK();
  })();
