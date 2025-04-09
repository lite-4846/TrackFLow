export const Config = {
  API_URL: 'http://localhost:8000/tracking/events', // Replace with your actual backend API URL
  BATCH_SIZE: 20, // Number of events to send in a batch
  FLUSH_INTERVAL: 10000, // Send events every 10 seconds if batch size is not reached
  MAX_RETRIES: 3, // Maximum retry attempts for failed requests
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 mins
};
