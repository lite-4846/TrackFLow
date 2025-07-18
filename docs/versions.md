# Trackflow Dependency Versions

This document outlines the specific versions of all dependencies used in the Trackflow project. Using specific versions ensures consistency and reproducibility across different environments.

## Docker Images Reference

| Service | Image | Version | Purpose |
|---------|-------|---------|----------|
| Backend | Custom build | Node 20 | Application backend API |
| Consumer | Custom build | Node 20 | Event processing service |
| Kafka | confluentinc/cp-kafka | 7.6.0 | Message broker |
| Zookeeper | confluentinc/cp-zookeeper | 7.6.0 | Service discovery and configuration |
| ClickHouse | clickhouse/clickhouse-server | latest | Analytics database |
| Prometheus | prom/prometheus | latest | Metrics collection |
| Grafana | grafana/grafana | latest | Metrics visualization |
| Kafka Exporter | danielqsj/kafka-exporter | latest | Kafka metrics exporter |
| Zookeeper Exporter | elkozmon/zoonavigator | latest | Zookeeper management UI |
| ClickHouse Exporter | f1yegor/clickhouse-exporter | latest | ClickHouse metrics exporter |

> **Note**: Using `latest` tag is not recommended for production. Always pin to specific versions in production environments.

## Health Check Configuration

Some services require health checks for proper orchestration. Here's the current status:

- ✅ Backend: Health check configured at `/health`
- ✅ Consumer: Health check configured at `/health`
- ❌ ClickHouse: Missing health check (causing orchestration issues)
- ✅ Kafka: Health check configured
- ✅ Zookeeper: Health check configured

To fix the ClickHouse health check, add this to your docker-compose.yml:

```yaml
clickhouse:
  # ... existing configuration ...
  healthcheck:
    test: ["CMD", "wget", "--spider", "-q", "http://localhost:8123/ping"]
    interval: 10s
    timeout: 5s
    retries: 3
    start_period: 20s
```

## Core Services

### Backend
- **Node.js**: 20.x (LTS)
- **NestJS**: ^11.0.1
- **TypeScript**: ^5.7.3
- **pnpm**: 8.15.4 (pinned in Dockerfile)

### Consumer
- **Node.js**: 20.x (LTS)
- **Fastify**: ^5.0.0
- **TypeScript**: ^5.8.3
- **pnpm**: 8.15.4 (pinned in Dockerfile)

## Database

### ClickHouse
- **Version**: latest (23.3+ recommended)
- **Ports**:
  - 8123: HTTP API
  - 9000: Native protocol

### PostgreSQL (if used)
- **Version**: 15.x (LTS)
- **Port**: 5432

## Message Queue

### Kafka
- **Version**: 7.6.0 (Confluent Platform)
- **Ports**:
  - 9092: External client access
  - 9093: Internal broker communication

### Zookeeper
- **Version**: 7.6.0 (Confluent Platform)
- **Ports**:
  - 2181: Client port
  - 2888: Follower port
  - 3888: Election port

## Monitoring & Observability

### Prometheus
- **Version**: latest (v2.47+ recommended)
- **Port**: 9090

### Grafana
- **Version**: latest (v10.2+ recommended)
- **Port**: 3000

### Exporters
- **Kafka Exporter**: latest (v1.7+ recommended)
  - Port: 9308
- **ClickHouse Exporter**: latest (v0.3+ recommended)
  - Port: 9116
- **Node Exporter**: latest (v1.6+ recommended)
  - Port: 9100

## Development Tools

### Docker
- **Docker Compose**: 3.8+
- **BuildKit**: Enabled (recommended)

### Linting & Formatting
- **ESLint**: ^9.18.0
- **Prettier**: ^3.4.2
- **TypeScript ESLint**: ^8.20.0

## Versioning Policy

1. **Production Services**: Always use specific versions (e.g., `image: clickhouse/clickhouse-server:23.3`)
2. **Development Dependencies**: Use caret (^) for patch/minor updates (e.g., `^1.2.3`)
3. **Breaking Changes**: Use fixed versions and update explicitly

## Updating Dependencies

1. Update the version in the respective configuration file
2. Test thoroughly in a development environment
3. Update this document
4. Create a versioned release

## Security Notes

- Regularly update dependencies to include security patches
- Use Dependabot or similar tools for automated dependency updates
- Review release notes for breaking changes before updating

## Version Locking

All production dependencies should be locked using:
- `pnpm-lock.yaml` for Node.js dependencies
- Specific image tags in Dockerfiles
- Version constraints in package.json

## Backward Compatibility

When updating major versions:
1. Check for breaking changes in the changelog
2. Update configuration files as needed
3. Test all dependent services
4. Document any required migration steps
