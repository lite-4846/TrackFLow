import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { config } from 'dotenv';

// Load environment variables
config();

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000';
const TRACK_ENDPOINT = `${API_BASE_URL}/tracking/events`;
const API_KEY = process.env.API_KEY || 'test-api-key';

// Helper function to generate a random string
function randomString(length: number): string {
  return Math.random().toString(36).substring(2, 2 + length);
}

// Helper function to generate a random number between min and max
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate a random IP address
function randomIp(): string {
  return `${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(0, 255)}`;
}

// Generate a random user agent
function randomUserAgent(): string {
  const browsers = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59',
  ];
  return browsers[Math.floor(Math.random() * browsers.length)];
}

// Generate a random referrer
function randomReferrer(): string {
  const referrers = [
    'https://google.com',
    'https://bing.com',
    'https://duckduckgo.com',
    'https://youtube.com',
    'https://github.com',
    'https://stackoverflow.com',
    'https://medium.com',
    'https://dev.to',
    '', // Direct traffic
  ];
  return referrers[Math.floor(Math.random() * referrers.length)];
}

// Generate a random page URL
function randomPageUrl(): string {
  const paths = ['', 'about', 'pricing', 'features', 'blog', 'contact', 'docs', 'api'];
  const path = paths[Math.floor(Math.random() * paths.length)];
  return `https://example.com/${path}`;
}

// Generate a random event type
function randomEventType(): 'page_view' | 'click' | 'error' | 'performance' {
  const types: Array<'page_view' | 'click' | 'error' | 'performance'> = [
    'page_view',
    'click',
    'error',
    'performance',
  ];
  return types[Math.floor(Math.random() * types.length)];
}

// Generate a random event payload based on event type
function generateEventPayload(eventType: string): any {
  const basePayload = {
    eventId: uuidv4(),
    eventType,
    timestamp: new Date().toISOString(),
    pageUrl: randomPageUrl(),
    sessionId: uuidv4(),
    userId: `user_${randomString(8)}`,
    properties: {
      // Common properties
      user_agent: randomUserAgent(),
      ip: randomIp(),
      viewport_width: randomInt(320, 3840),
      viewport_height: randomInt(568, 2160),
      screen_width: randomInt(1024, 7680),
      screen_height: randomInt(768, 4320),
      device_pixel_ratio: randomInt(1, 3),
      language: 'en-US',
      timezone: 'UTC',
    },
  };

  switch (eventType) {
    case 'page_view':
      return {
        ...basePayload,
        event: {
          ...basePayload.properties,
          title: `Page ${randomString(5)}`,
          referrer: randomReferrer()
        }
      };

    case 'click':
      return {
        ...basePayload,
        event: {
          ...basePayload.properties,
          tag: ['button', 'a', 'div', 'span'][Math.floor(Math.random() * 4)],
          id: `elem-${randomString(4)}`,
          text: `Click me ${randomString(3)}`,
          className: `btn btn-${['primary', 'secondary', 'success', 'danger'][Math.floor(Math.random() * 4)]}`,
        },
      };

    case 'error':
      const errorTypes = ['TypeError', 'ReferenceError', 'SyntaxError', 'RangeError'];
      const errorType = errorTypes[Math.floor(Math.random() * errorTypes.length)];
      return {
        ...basePayload,
        event: {
          ...basePayload.properties,
          name: errorType,
          message: `${errorType}: Something went wrong at ${randomString(8)}`,
          stack: `Error: ${errorType}: Something went wrong\n    at ${randomString(8)} (${randomPageUrl()}:${randomInt(1, 1000)}:${randomInt(1, 100)})\n    at ${randomString(8)} (${randomPageUrl()}:${randomInt(1, 1000)}:${randomInt(1, 100)})`,
          source: randomPageUrl(),
          line: randomInt(1, 1000),
          col: randomInt(1, 100)
        },
      };

    case 'performance':
      return {
        ...basePayload,
        event: {
          ...basePayload.properties,
          loadTime: randomInt(500, 5000),
          domContentLoaded: randomInt(100, 2000),
          firstContentfulPaint: randomInt(500, 4000),
          timeToInteractive: randomInt(1000, 8000),
          domComplete: randomInt(1000, 6000),
          redirectCount: randomInt(0, 3),
          navigationType: ['navigate', 'reload', 'back_forward', 'prerender'][Math.floor(Math.random() * 4)],
        },
      };

    default:
      return basePayload;
  }
}

// Send a single event to the tracking endpoint
async function sendEvent(event: any): Promise<void> {
  try {
    // Transform the event to match the backend's expected format
    const backendEvent = {
      eventType: event.event_type,
      properties: {
        ...event,
        // Remove fields that are not part of properties
        event_type: undefined,
        event_id: undefined,
        timestamp: undefined,
        session_id: undefined,
        user_id: undefined
      },
      sessionId: event.session_id,
      userId: event.user_id,
      pageUrl: event.url,
      timestamp: event.timestamp
    };

    // Remove undefined values
    Object.keys(backendEvent.properties).forEach(key => 
      backendEvent.properties[key] === undefined && delete backendEvent.properties[key]
    );

    const response = await axios.post(TRACK_ENDPOINT, backendEvent, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      timeout: 5000,
    });
    console.log(`Event sent successfully: ${JSON.stringify(event.event_id || event.session_id)} - Status: ${response.status}`);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(
        `Error sending event: ${error.response?.status || error.code} - ${error.message}`,
        error.response?.data
      );
    } else {
      console.error('Unexpected error sending event:', error);
    }
  }
}

// Generate and send test events
async function generateTestEvents(count: number): Promise<void> {
  console.log(`Generating ${count} test events...`);
  
  for (let i = 0; i < count; i++) {
    const eventType = randomEventType();
    const event = {
      event_id: uuidv4(),
      ...generateEventPayload(eventType),
    };
    
    console.log(`Sending event ${i + 1}/${count}: ${eventType}`);
    await sendEvent(event);
    
    // Add a small delay between events to simulate real traffic
    await new Promise(resolve => setTimeout(resolve, randomInt(50, 500)));
  }
  
  console.log('Test event generation complete!');
}

// Run the test
const EVENT_COUNT = 10;
generateTestEvents(EVENT_COUNT)
  .then(() => {
    console.log('All test events have been sent.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error generating test events:', error);
    process.exit(1);
  });
