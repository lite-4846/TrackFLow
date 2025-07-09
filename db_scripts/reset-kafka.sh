#!/bin/bash
echo "Stopping Docker containers..."
docker compose down

echo "Removing Kafka and Zookeeper volumes..."
docker volume rm $(docker volume ls -q --filter name=kafka-data)
docker volume rm $(docker volume ls -q --filter name=zookeeper-data)

# echo "Removing ClickHouse data (optional)..."
# docker volume rm $(docker volume ls -q --filter name=clickhouse-data)

echo "Cleanup complete. Starting fresh..."
docker compose up -d