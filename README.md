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

3. **ClickHouse Setup**
   - Configure `<ip>::/0` in the ClickHouse users.d folder for Windows host access

4. **Database Access**
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

## Quick Start
1. **Tracker**: `http-server ./dist --cors -p 8080`
2. **Backend**: `npm start:dev`
3. **Clickhouse Setup**: Configure `<ip>::/0` in the ClickHouse users.d folder for Windows host access
4. **Database Access**: Use beaver for database access

## Documentation
For detailed documentation, please refer to the `/docs` directory.