# TrackFlow - Web Analytics Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

TrackFlow is a high-performance, self-hosted web analytics platform that gives you complete ownership and control over your analytics data. Built with scalability in mind, it can handle up to 10,000 events per second on modest hardware (6GB RAM, 6 cores).

> **Note:** TrackFlow is currently in Alpha. It's fully functional but was primarily built for learning purposes. Many features are still evolving.

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- 6GB+ RAM recommended for production workloads

### Running with Docker

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/TrackFLow.git
   cd TrackFLow
   ```

2. **Start the services**
   ```bash
   docker-compose up -d
   ```

   **Note for Linux users:** If you encounter a mount error, run:
   ```bash
   sudo mount --make-shared /
   ```
   Then try the docker-compose command again.

3. **Access the services**
   - **Frontend:** http://localhost:3000
   - **Backend API:** http://localhost:8000
   - **ClickHouse UI:** http://localhost:8123
   - **Kafka UI:** http://localhost:8080

## 🏗️ Project Structure

```
trackflow/
├── backend/      # NestJS backend service
├── consumer/     # Kafka consumer service
├── tracker/      # Client-side tracking library
├── docs/         # Documentation
└── docker-compose.yml  # Development environment setup
```

## 📊 Performance

- **Throughput:** 10,000 events/second
- **Request Rate:** 500 requests/second
- **Recommended Hardware:** 6GB RAM, 6 CPU cores

## 🔌 Integration

### Browser Integration

Add this script to your website's `<head>`:

```html
<script async src="http://your-domain.com/tracker.js"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function track() { window.dataLayer.push(arguments); }
  track('init', 'YOUR_WEBSITE_ID');
  track('pageview');
</script>
```

### Available Tracking Methods

```javascript
// Page view tracking
track('pageview');

// Custom event tracking
track('event', 'button_click', {
  button_id: 'cta-button',
  page_url: window.location.href
});

// E-commerce tracking
track('ecommerce', 'purchase', {
  transaction_id: '12345',
  revenue: 29.99,
  items: [{
    sku: 'PROD001',
    name: 'Premium Plan',
    price: 29.99,
    quantity: 1
  }]
});
```

## 🔧 Development

1. **Environment Setup**
   ```bash
   # Install dependencies
   pnpm install
   
   # Start development servers
   pnpm run dev
   ```

2. **Building for Production**
   ```bash
   pnpm run build
   docker-compose -f docker-compose.prod.yml up -d
   ```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
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