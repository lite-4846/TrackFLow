# Trackflow Ports Documentation

This document outlines all the ports used by Trackflow services in different environments.

## Main Application Ports

| Service       | Port  | Protocol | Description                            | Exposed |
|---------------|-------|----------|----------------------------------------|---------|
| Backend API   | 8000  | HTTP     | Main backend service                   | Yes     |
| Consumer      | 8002  | HTTP     | Event consumer service                 | Yes     |
| Frontend      | 3000  | HTTP     | Web interface (if applicable)          | Yes     |
| Tracker SDK   | 8080  | HTTP     | Client-side tracking script            | Yes     |

## Database Ports

| Service       | Port  | Protocol | Description                    | Exposed |
|---------------|-------|----------|--------------------------------|---------|
| ClickHouse    | 8123  | HTTP     | ClickHouse HTTP API            | No      |
| ClickHouse    | 9000  | Native   | ClickHouse native protocol     | No      |
| ClickHouse    | 9009  | HTTP     | ClickHouse replication         | No      |
| PostgreSQL    | 5432  | TCP      | PostgreSQL database            | No      |

## Message Queue Ports

| Service       | Port  | Protocol | Description                    | Exposed |
|---------------|-------|----------|--------------------------------|---------|
| Kafka         | 9092  | TCP      | Kafka broker (external)        | No      |
| Kafka         | 9093  | TCP      | Kafka broker (internal)        | No      |
| Zookeeper     | 2181  | TCP      | Zookeeper client port          | No      |
| Zookeeper     | 2888  | TCP      | Zookeeper follower port        | No      |
| Zookeeper     | 3888  | TCP      | Zookeeper election port        | No      |

## Monitoring & Observability

| Service       | Port  | Protocol | Description                    | Exposed |
|---------------|-------|----------|--------------------------------|---------|
| Prometheus    | 9090  | HTTP     | Metrics collection             | Yes     |
| Grafana       | 3000  | HTTP     | Metrics visualization          | Yes     |
| Node Exporter | 9100  | HTTP     | Host metrics                   | No      |
| Kafka Exporter| 9308  | HTTP     | Kafka metrics                  | No      |
| ClickHouse Exp| 9116  | HTTP     | ClickHouse metrics             | No      |

## Development Ports

| Service       | Port  | Protocol | Description                    | Exposed |
|---------------|-------|----------|--------------------------------|---------|
| PgAdmin       | 5050  | HTTP     | PostgreSQL admin interface     | Yes     |
| Kafka UI      | 8080  | HTTP     | Kafka management interface     | Yes     |
| ClickHouse UI | 8123  | HTTP     | ClickHouse web interface       | Yes     |

## Port Exposure Notes

- **Exposed**: Ports marked as "Yes" are exposed to the host machine and can be accessed from localhost.
- **Internal**: Ports marked as "No" are only accessible within the Docker network.
- **Development**: Some ports are only exposed in development environments.

## Security Considerations

1. Only necessary ports should be exposed to the host machine.
2. In production, consider using a reverse proxy (like Nginx) to expose only required endpoints.
3. Use environment-specific configurations to limit port exposure.
4. Consider using VPN or SSH tunnels for accessing internal services in production.

## Updating Ports

To update ports:

1. Modify the corresponding service in the appropriate `docker-compose*.yml` file.
2. Update this document to reflect the changes.
3. Test the changes in a non-production environment first.

## Troubleshooting

If a service is not accessible:
1. Verify the container is running: `docker ps`
2. Check container logs: `docker logs <container_name>`
3. Verify port mapping: `docker port <container_name>`
4. Check if the port is in use: `netstat -tuln | grep <port>`
