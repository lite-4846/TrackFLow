import { EventQueue } from '../tracker/src/core/eventQueue';
import { v4 as uuidv4 } from 'uuid';
import { 
  PageViewEvent, 
  ClickEvent, 
  ErrorEvent, 
  PerformanceEvent 
} from '../tracker/src/types/events';

// Configuration
const API_KEY = 'test-api-key';
const API_URL = 'http://localhost:3000/api/track';

// Create a new event queue
const eventQueue = new EventQueue(API_URL, API_KEY);

// Helper to generate random string
const randomString = (length: number): string => {
  return Math.random().toString(36).substring(2, 2 + length);
};

// Generate a random event of different types
function generateRandomEvent(): PageViewEvent | ClickEvent | ErrorEvent | PerformanceEvent {
  const baseEvent = {
    eventId: uuidv4(),
    timestamp: Date.now(),
    tenantId: API_KEY,
    sessionId: uuidv4(),
    userId: `user_${randomString(8)}`,
    pageUrl: `https://example.com/${randomString(8)}`,
    referrer: 'https://google.com',
    deviceInfo: {
      deviceType: Math.random() > 0.5 ? 'mobile' : 'desktop',
      os: ['Windows', 'Mac', 'Linux', 'Android', 'iOS'][Math.floor(Math.random() * 5)],
      browser: ['Chrome', 'Firefox', 'Safari', 'Edge', 'Opera'][Math.floor(Math.random() * 5)]
    }
  };

  const eventType = Math.floor(Math.random() * 4);
  
  switch (eventType) {
    case 0: // PageView
      return {
        ...baseEvent,
        eventType: 'page_view',
        properties: {
          title: `Page ${randomString(5)}`
        }
      } as PageViewEvent;
      
    case 1: // Click
      return {
        ...baseEvent,
        eventType: 'click',
        properties: {
          tag: ['BUTTON', 'A', 'DIV', 'SPAN'][Math.floor(Math.random() * 4)],
          id: `element-${randomString(4)}`,
          text: `Click me ${randomString(3)}`
        }
      } as ClickEvent;
      
    case 2: // Error
      return {
        ...baseEvent,
        eventType: 'error',
        properties: {
          message: `Error: Something went wrong with ${randomString(5)}`,
          source: `https://example.com/js/${randomString(8)}.js`,
          line: Math.floor(Math.random() * 1000) + 1,
          col: Math.floor(Math.random() * 50) + 1,
          stack: `Error: Something went wrong\n    at function${Math.floor(Math.random() * 5)} (https://example.com/js/${randomString(8)}.js:${Math.floor(Math.random() * 100)}:${Math.floor(Math.random() * 50)})\n    at function${Math.floor(Math.random() * 5)} (https://example.com/js/${randomString(8)}.js:${Math.floor(Math.random() * 100)}:${Math.floor(Math.random() * 50)})`
        }
      } as ErrorEvent;
      
    case 3: // Performance
    default:
      return {
        ...baseEvent,
        eventType: 'performance',
        properties: {
          loadTime: Math.floor(Math.random() * 5000) + 1000,
          domContentLoaded: Math.floor(Math.random() * 2000) + 500
        }
      } as PerformanceEvent;
  }
}

// Generate and send batch of events
async function sendBatchOfEvents(count: number) {
  console.log(`Generating ${count} test events...`);
  
  const events = Array.from({ length: count }, () => generateRandomEvent());
  
  console.log('Sending batch of events...');
  
  try {
    // Using the event queue to send events
    for (const event of events) {
      eventQueue.addEvent(event);
    }
    
    // Force flush to send immediately
    await eventQueue['flushEvents']();
    
    console.log(`Successfully sent ${count} events!`);
  } catch (error) {
    console.error('Error sending batch of events:', error);
  }
}

// Run the test
sendBatchOfEvents(10).catch(console.error);
