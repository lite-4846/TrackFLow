# TrackFlow - Real-time Event Tracking System

TrackFlow is a distributed event tracking system designed to handle high-throughput, real-time event data processing. The system is built with a microservices architecture, leveraging Kafka for event streaming and providing robust event processing capabilities.

## 🚀 Quick Start

### Prerequisites
- Node.js
- Docker (for Kafka and ClickHouse)
- Beaver (for database access)

### Running the Applications

1. **Start Tracker**
   ```bash
   http-server ./dist --cors -p 8080
   ```

2. **Start Backend**
   ```bash
   npm start:dev
   ```

3. **Database Access**
   ```bash
   # Use beaver for database access
   beaver
   ```

## Key Features
- Real-time event ingestion and processing
- Scalable architecture using Kafka
- TypeScript-based services
- Modular design for easy extension

## Project Structure
- `/backend`: Core backend services and event processors
- `/plans`: Project plans and roadmaps
- `/docs`: Technical documentation and architecture decisions

## Service Ports

| Service     | Port  | Description                     |
|-------------|-------|---------------------------------|
| Backend     | 8000  | Main API and metrics endpoint   |
| Tracker.js  | 8080  | Client-side tracking library    |
| ClickHouse  | 8123  | HTTP interface                 |
| Kafka       | 9092  | Message broker                 |
| Zookeeper   | 2181  | Kafka dependency               |

## Quick Start
1. **Tracker**: `http-server ./dist --cors -p 8080`
2. **Backend**: `npm start:dev`
3. **Database Access**: Use beaver for database access

## 📱 Integration

### For Next.js Applications

1. **Install Required Dependencies**
   ```bash
   npm install next-script
   ```

2. **Add TrackFlow Script to `_app.js` or `_app.tsx`**
   ```jsx
   import Script from 'next/script';
   
   function MyApp({ Component, pageProps }) {
     return (
       <>
         <Script async src="http://localhost:8080/tracker.js" />
         <Script
           id="trackflow"
           strategy="afterInteractive"
           dangerouslySetInnerHTML={{
             __html: `
               window.dataLayer = window.dataLayer || [];
               function track() {
                 window.dataLayer.push(arguments);
               }
               track('config', 'YOUR_API_KEY'); // Replace with your actual API key
             `,
           }}
         />
         <Component {...pageProps} />
       </>
     );
   }
   
   export default MyApp;
   ```

### For React App (Vite)

1. **Add TrackFlow Script to `public/index.html`**
   Add this just before the closing `</head>` tag:
   ```html
   <script async src="http://localhost:8080/tracker.js"></script>
   <script>
     window.dataLayer = window.dataLayer || [];
     function track() {
       window.dataLayer.push(arguments);
     }
     track('config', 'YOUR_API_KEY'); // Replace with your actual API key
   </script>
   ```

## Available Tracking Methods

### Page View Tracking
```javascript
track('pageView', {
  title: document.title,
  url: window.location.href
});
```

### Click Tracking
```javascript
// Example: Add this to your button click handler
document.querySelector('button').addEventListener('click', (e) => {
  track('click', {
    tag: e.target.tagName,
    id: e.target.id || null,
    text: e.target.textContent.trim()
  });
});
```

### Error Tracking
```javascript
window.addEventListener('error', (event) => {
  track('error', {
    message: event.message,
    source: event.filename,
    line: event.lineno,
    col: event.colno,
    stack: event.error?.stack
  });
});
```

## Configuration Options

You can configure the tracker with these options when initializing:

```javascript
track('config', 'YOUR_API_KEY', {
  autoTrackPageViews: true,  // Auto track page views (default: true)
  autoTrackClicks: true,     // Auto track clicks (default: true)
  autoTrackErrors: true,     // Auto track errors (default: true)
  environment: 'production'  // Set environment (default: 'development')
});
```

## Development

For local development, make sure to:
1. Start the tracker service: `http-server ./dist --cors -p 8080`
2. Update the script source to `http://localhost:8080/tracker.js`
3. Use `YOUR_API_KEY` for testing (no authentication in development)

## Documentation
For detailed documentation, please refer to the `/docs` directory.