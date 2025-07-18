import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config({ path: '.env' });

interface Config {
  kafka: {
    brokers: string[];
    groupId: string;
    topic: string;
    clientId: string;
  };
  clickhouse: {
    url: string;
    database: string;
    batchSize: number;
    batchTimeoutMs: number;
    maxRetries: number;
    retryDelayMs: number;
  };
  env: string;
}

const config: Config = {
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    groupId: process.env.KAFKA_GROUP_ID || 'trackflow-group',
    topic: process.env.KAFKA_TOPIC || 'tracking-events',
    clientId: process.env.KAFKA_CLIENT_ID || 'trackflow-consumer',
  },
  clickhouse: {
    url: process.env.CLICKHOUSE_URL || 'http://default:superman@clickhouse:8123',
    database: process.env.CLICKHOUSE_DB || 'trackflow',
    batchSize: parseInt(process.env.BATCH_SIZE || '100', 10),
    batchTimeoutMs: parseInt(process.env.BATCH_TIMEOUT_MS || '5000', 10),
    maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
    retryDelayMs: parseInt(process.env.RETRY_DELAY_MS || '1000', 10),
  },
  env: process.env.NODE_ENV || 'development',
};

export default config;
