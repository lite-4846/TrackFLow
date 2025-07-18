# TrackFlow - Lightweight Event Tracker

TrackFlow is a lightweight, high-performance event tracking library for web applications. It provides automatic tracking of page views, clicks, errors, and performance metrics with minimal configuration.

## Installation

### Option 1: Using CDN (Recommended for most users)

Add this script to the `<head>` section of your HTML:

```html
<script>
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(['config', 'YOUR_API_KEY']);
</script>
<script async src="https://your-cdn-url.com/tracker.js"></script>
```
  
### Option 2: Using npm

```bash
npm install @trackflow/tracker
```

Then in your JavaScript/TypeScript file:

```javascript
import { Tracker } from '@trackflow/tracker';

// Initialize with your API key
const tracker = Tracker.init('YOUR_API_KEY');
```

## Basic Usage

### Tracking Page Views

Page views are tracked automatically. No additional code is needed.

### Tracking Custom Events

```javascript
// Track a simple event
window.track('button_click', { buttonId: 'signup' });

// Track an event with additional properties
window.track('purchase', {
  item: 'Premium Plan',
  amount: 99.99,
  currency: 'USD'
});
```

### Tracking Errors

Errors are tracked automatically. To manually track an error:

```javascript
try {
  // Your code that might throw an error
} catch (error) {
  window.track('error', {
    message: error.message,
    stack: error.stack,
    context: 'checkout_process'
  });
  throw error; // Re-throw if needed
}
```

## Configuration

You can configure the tracker by passing options when initializing:

```javascript
window.dataLayer = window.dataLayer || [];
window.dataLayer.push(['config', 'YOUR_API_KEY', {
  debug: true, // Enable debug logging
  trackClicks: true, // Enable/disable click tracking
  trackErrors: true, // Enable/disable error tracking
  trackPerformance: true // Enable/disable performance tracking
}]);
```

## Available Auto-Tracking

- **Page Views**: Automatically tracks page views and URL changes (including SPA navigation)
- **Clicks**: Tracks all click events on interactive elements
- **Errors**: Captures unhandled JavaScript errors
- **Performance**: Tracks page load performance metrics

## Manual Tracking API

### `window.track(eventName, properties)`

Track a custom event.

- `eventName` (string): Name of the event
- `properties` (object, optional): Additional properties to include with the event

## Development

### Building the Tracker

```bash
# Install dependencies
pnpm install

# Build for production
pnpm run build

# Development mode with watch
pnpm run dev
```

### Testing

```bash
pnpm test
```

## License

MIT

http-server ./dist --cors -p 8080