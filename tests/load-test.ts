import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { config } from 'dotenv';
import { performance } from 'perf_hooks';

// Load environment variables
config();

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000';
const TRACK_ENDPOINT = `${API_BASE_URL}/tracking/events`;
const API_KEY = process.env.API_KEY || 'YOUR_API_KEY';

// Event generator configuration
type EventType = 'page_view' | 'click' | 'error' | 'performance';
type DeviceType = 'desktop' | 'mobile';

const EVENT_TYPES: EventType[] = ['page_view', 'click', 'error', 'performance'];
const DEVICE_TYPES: DeviceType[] = ['desktop', 'mobile'];
const OS_VERSIONS = ['Windows', 'macOS', 'Linux', 'iOS', 'Android'] as const;
const BROWSERS = ['Chrome', 'Firefox', 'Safari', 'Edge', 'Samsung Internet'] as const;

// Helper functions
const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;
const randomElement = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Generate a random event based on the example structure
function generateEvent(): any {
  const eventType = randomElement(EVENT_TYPES);
  const timestamp = Date.now() - randomInt(0, 1000 * 60 * 60 * 24 * 7); // Random time in last 7 days
  const sessionId = uuidv4();
  const userId = `user_${randomInt(1, 10000)}`;
  
  const baseEvent = {
    eventId: uuidv4(),
    eventType,
    tenantId: API_KEY,
    sessionId,
    userId: Math.random() > 0.3 ? userId : null, // 30% chance of null userId
    timestamp,
    pageUrl: `https://example.com/products/${randomInt(1, 1000)}`,
    referrer: Math.random() > 0.7 ? `https://${randomElement(['google', 'bing', 'duckduckgo'])}.com` : null,
    deviceInfo: {
      deviceType: randomElement(DEVICE_TYPES),
      os: randomElement(OS_VERSIONS),
      browser: randomElement(BROWSERS)
    },
    properties: {}
  };

  // Add event-specific properties
  switch (eventType) {
    case 'page_view':
      baseEvent.properties = {
        title: `Product Page ${randomInt(1, 1000)}`,
        url: baseEvent.pageUrl,
        referrer: baseEvent.referrer || ''
      };
      break;
      
    case 'click':
      const elements = ['BUTTON', 'A', 'DIV', 'SPAN', 'IMG', 'INPUT'];
      baseEvent.properties = {
        tag: randomElement(elements),
        id: Math.random() > 0.5 ? `element-${randomInt(1, 1000)}` : null,
        text: Math.random() > 0.3 ? `Click me ${randomInt(1, 100)}` : undefined,
        className: `btn-${randomElement(['primary', 'secondary', 'success', 'danger'])}`
      };
      break;
      
    case 'error':
      baseEvent.properties = {
        message: `Error: Something went wrong at ${new Date(timestamp).toISOString()}`,
        source: 'https://example.com/static/js/main.js',
        line: randomInt(1, 1000),
        col: randomInt(1, 100),
        stack: `Error: Something went wrong\n    at Function.<anonymous> (https://example.com/static/js/main.js:${randomInt(1, 1000)}:${randomInt(1, 100)})\n    at Generator.next (<anonymous>)`
      };
      break;
      
    case 'performance':
      baseEvent.properties = {
        loadTime: randomInt(500, 5000),
        domContentLoaded: randomInt(100, 2000),
        firstContentfulPaint: randomInt(1000, 4000),
        timeToInteractive: randomInt(2000, 8000)
      };
      break;
  }

  return baseEvent;
}

// Send events in batches with concurrency control
async function sendEvents(events: any[], batchSize: number = 100, concurrency: number = 10): Promise<void> {
  const batches = [];
  for (let i = 0; i < events.length; i += batchSize) {
    batches.push(events.slice(i, i + batchSize));
  }

  let successCount = 0;
  let errorCount = 0;
  let processed = 0;
  const total = batches.length;

  console.log(`Sending ${events.length} events in ${total} batches...`);
  
  const startTime = performance.now();
  
  // Process batches with concurrency control
  const processBatch = async (batch: any[], index: number) => {
    try {
      const response = await axios.post(TRACK_ENDPOINT, { events: batch }, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        timeout: 30000
      });
      
      successCount += batch.length;
      processed++;
      
      if (index % 10 === 0 || processed === total) {
        const progress = ((processed / total) * 100).toFixed(1);
        console.log(`Progress: ${progress}% (${processed}/${total} batches, ${successCount} events)`);
      }
      
      return response.data;
    } catch (error: unknown) {
      errorCount += batch.length;
      processed++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error in batch ${index + 1}:`, errorMessage);
      return null;
    }
  };

  // Process batches with concurrency control
  const concurrencyLimit = concurrency;
  const batchesCopy = [...batches];
  const workers = [];
  
  for (let i = 0; i < concurrencyLimit; i++) {
    workers.push(
      (async () => {
        while (batchesCopy.length > 0) {
          const batch = batchesCopy.shift();
          if (batch) {
            await processBatch(batch, total - batchesCopy.length - 1);
          }
        }
      })()
    );
  }

  await Promise.all(workers);
  
  const endTime = performance.now();
  const totalTime = (endTime - startTime) / 1000; // in seconds
  const eventsPerSecond = events.length / totalTime;
  
  console.log('\n--- Load Test Results ---');
  console.log(`Total events: ${events.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${errorCount}`);
  console.log(`Time taken: ${totalTime.toFixed(2)} seconds`);
  console.log(`Throughput: ${eventsPerSecond.toFixed(2)} events/second`);
  console.log('------------------------');
}

// Run load test with specified parameters
async function runLoadTest(totalEvents: number, batchSize: number = 100, concurrency: number = 10) {
  console.log(`\n=== Starting load test: ${totalEvents} events ===`);
  console.log(`Batch size: ${batchSize}, Concurrency: ${concurrency}\n`);
  
  // Generate all events first
  const events = Array.from({ length: totalEvents }, () => generateEvent());
  
  // Send events
  await sendEvents(events, batchSize, concurrency);
}

// Command line arguments
const [totalEvents, batchSize, concurrency] = process.argv.slice(2).map(Number);

// Run with default values if not specified
const defaultEvents = 1000;
const defaultBatchSize = 100;
const defaultConcurrency = 10;

runLoadTest(
  totalEvents || defaultEvents,
  batchSize || defaultBatchSize,
  concurrency || defaultConcurrency
).catch(console.error);
