# TrackFlow Observability Stack

This directory contains the observability setup for TrackFlow, which helps you monitor and understand your application's performance and health metrics in real-time.

## 🌟 What is Observability?

Observability is like having x-ray vision for your application. It helps you answer questions like:
- Is my application healthy?
- How fast is it responding?
- Where are the bottlenecks?
- Are there any errors happening?
- How many users are we serving?

## 🛠️ Components

### 1. Prometheus
**What it does**:
- Collects and stores metrics from your application
- Allows querying metrics using PromQL
- Triggers alerts based on rules

**Key Metrics** (you can find in Prometheus):
- HTTP request rates and latencies
- System resource usage (CPU, memory)
- Kafka message rates
- ClickHouse query performance

### 2. Grafana
**What it does**:
- Visualizes metrics in beautiful dashboards
- Creates alerts based on metric thresholds
- Allows exploring data through graphs and tables

**Pre-configured Dashboards**:
- **TrackFlow Overview**: Main dashboard showing key metrics
- **Kafka Monitoring**: Message rates, consumer lag
- **ClickHouse Performance**: Query times, insert rates
- **System Metrics**: CPU, memory, disk usage

### 3. Kafka Exporter
**What it does**:
- Exports Kafka metrics to Prometheus
- Shows message rates per topic
- Tracks consumer lag

**Key Metrics**:
- `kafka_topic_partitions`: Number of partitions per topic
- `kafka_consumer_group_lag`: How many messages are waiting to be processed
- `kafka_broker_info`: Information about Kafka brokers

### 4. ClickHouse Exporter
**What it does**:
- Collects ClickHouse server metrics
- Tracks query performance
- Monitors table sizes and merge operations

**Key Metrics**:
- `clickhouse_query_total`: Total number of queries
- `clickhouse_query_duration_seconds`: Query execution time
- `clickhouse_table_rows`: Number of rows in tables

## 🚀 Quick Start

1. **Start the stack**:
   ```bash
   # From project root
   docker-compose -f docker-compose.observability.yml up -d
   ```

2. **Access the tools**:
   - Grafana: http://localhost:3000 (admin/admin)
   - Prometheus: http://localhost:9090
   - Kafka Exporter: http://localhost:9308/metrics
   - ClickHouse Exporter: http://localhost:9116/metrics

3. **Import Dashboards in Grafana**:
   - Go to Dashboards > Import
   - Upload the dashboard JSON from `grafana/provisioning/dashboards/`

## 📊 Understanding the Metrics

### Application Metrics
- **HTTP Requests**: 
  - `http_requests_total`: Total HTTP requests
  - `http_request_duration_seconds`: Request duration histogram

### Kafka Metrics
- **Message Rates**: 
  - `kafka_topic_messages_in`: Messages produced per second
  - `kafka_consumer_consumer_lag`: Messages waiting to be consumed

### ClickHouse Metrics
- **Query Performance**:
  - `clickhouse_query_duration_seconds`: How long queries take
  - `clickhouse_inserted_rows`: Number of rows inserted per second

### System Metrics
- **CPU/Memory**: 
  - `node_cpu_seconds_total`: CPU usage
  - `node_memory_MemTotal_bytes`: Memory usage

## 🔍 Troubleshooting

1. **No Data in Grafana?**
   - Check if Prometheus is scraping targets at http://localhost:9090/targets
   - Verify services are sending metrics to the correct endpoints

2. **High Latency?**
   - Look at `http_request_duration_seconds`
   - Check Kafka consumer lag
   - Monitor ClickHouse query performance

3. **High Error Rate?**
   - Check `http_requests_total{status_code=~"5.."}`
   - Look for Kafka consumer errors
   - Monitor ClickHouse exceptions

## 🛠️ Configuration

### Prometheus
- Config file: `prometheus.yml`
- Scrape interval: 5s
- Retention: 15 days

### Grafana
- Default credentials: admin/admin
- Dashboards are provisioned from `grafana/provisioning/dashboards/`

## 📈 Example Queries

```promql
# HTTP 5xx errors rate
rate(http_requests_total{status_code=~"5.."}[5m])

# Average request duration
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])

# Kafka consumer lag
kafka_consumer_group_lag

# ClickHouse query duration 99th percentile
histogram_quantile(0.99, sum(rate(clickhouse_query_duration_seconds_bucket[5m])) by (le))
```

## 🔗 Useful Links
- [Prometheus Documentation](https://prometheus.io/docs/introduction/overview/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Kafka Exporter](https://github.com/danielqsj/kafka_exporter)
- [ClickHouse Exporter](https://github.com/ClickHouse/clickhouse-exporter)
