import { Kafka, Admin, KafkaConfig, logLevel, ITopicConfig as KafkaTopicConfig, ConfigResourceTypes } from 'kafkajs';
import { Logger } from '@nestjs/common';

export interface TopicConfig extends Omit<KafkaTopicConfig, 'topic' | 'numPartitions' | 'replicationFactor'> {
  topic: string;
  numPartitions: number;
  replicationFactor: number;
  configEntries?: Array<{
    name: string;
    value: string;
  }>;
}

export class KafkaUtils {
  private static readonly logger = new Logger('KafkaUtils');
  private static readonly DEFAULT_RETRY_ATTEMPTS = 3;
  private static readonly DEFAULT_RETRY_DELAY = 1000; // 1 second

  /**
   * Validates and ensures a Kafka topic exists with the correct configuration
   */
  static async ensureTopicExists(
    kafkaConfig: KafkaConfig,
    topicConfig: TopicConfig,
    retryAttempts = this.DEFAULT_RETRY_ATTEMPTS
  ): Promise<boolean> {
    console.log(kafkaConfig);
    const kafka = new Kafka({
      ...kafkaConfig,
      logLevel: logLevel.INFO,
    });

    const admin = kafka.admin();

    try {
      await admin.connect();
      this.logger.log(`Connected to Kafka admin`);

      // Check if topic exists
      const topics = await admin.listTopics();
      const topicExists = topics.includes(topicConfig.topic);

      if (topicExists) {
        // Verify topic configuration
        const metadata = await admin.fetchTopicMetadata({ topics: [topicConfig.topic] });
        const topicMetadata = metadata.topics.find(t => t.name === topicConfig.topic);
        
        if (!topicMetadata) {
          throw new Error(`Failed to fetch metadata for topic: ${topicConfig.topic}`);
        }

        // Check if configuration matches
        const configs = await admin.describeConfigs({
          resources: [{
            type: 2, // TOPIC
            name: topicConfig.topic,
          }],
          includeSynonyms: false
        });

        const currentConfig = configs.resources[0]?.configEntries || [];
        const configMismatch = topicConfig.configEntries?.some(requiredConfig => {
          const currentValue = currentConfig.find(c => c.configName === requiredConfig.name)?.configValue;
          return currentValue !== requiredConfig.value;
        });

        const needsUpdate = 
          topicMetadata.partitions.length !== topicConfig.numPartitions ||
          configMismatch;

        if (needsUpdate) {
          if (configMismatch) {
            this.logger.log(`Updating topic configuration for ${topicConfig.topic}`);
            await admin.alterConfigs({
              validateOnly: false,
              resources: [{
                type: 2, // TOPIC
                name: topicConfig.topic,
                configEntries: topicConfig.configEntries?.map(entry => ({
                  name: entry.name,
                  value: entry.value
                })) || []
              }]
            });
          } else {
            this.logger.warn(`Topic ${topicConfig.topic} exists but has different configuration. Recreating...`);
            await this.deleteTopic(admin, topicConfig.topic);
            return this.createTopic(admin, topicConfig);
          }
        }

        this.logger.log(`Topic ${topicConfig.topic} exists with correct configuration`);
        return true;
      }

      // Create topic if it doesn't exist
      return this.createTopic(admin, topicConfig);
    } catch (error: any) {
      this.logger.error(`Error ensuring topic ${topicConfig.topic}: ${error.message}`);
      
      if (retryAttempts > 0) {
        this.logger.log(`Retrying topic validation (${retryAttempts} attempts remaining)...`);
        await new Promise(resolve => setTimeout(resolve, this.DEFAULT_RETRY_DELAY));
        return this.ensureTopicExists(kafkaConfig, topicConfig, retryAttempts - 1);
      }
      
      throw error;
    } finally {
      await admin.disconnect().catch(error => 
        this.logger.error(`Error disconnecting admin client: ${error.message}`)
      );
    }
  }

  private static async createTopic(admin: Admin, topicConfig: TopicConfig): Promise<boolean> {
    try {
      this.logger.log(`Creating topic: ${topicConfig.topic}`);
      
      await admin.createTopics({
        topics: [{
          topic: topicConfig.topic,
          numPartitions: topicConfig.numPartitions,
          replicationFactor: topicConfig.replicationFactor,
          configEntries: topicConfig.configEntries?.map(entry => ({
            name: entry.name,
            value: String(entry.value) // Ensure value is a string
          })) || []
        }],
        waitForLeaders: true,
        timeout: 30000, // 30 seconds
      });

      this.logger.log(`Successfully created topic: ${topicConfig.topic}`);
      return true;
    } catch (error: any) {
      if (error.type === 'TOPIC_ALREADY_EXISTS' || error.message?.includes('already exists')) {
        this.logger.warn(`Topic ${topicConfig.topic} was created by another process`);
        return true;
      }
      this.logger.error(`Error creating topic ${topicConfig.topic}:`, error);
      throw error;
    }
  }

  private static async deleteTopic(admin: Admin, topicName: string): Promise<void> {
    try {
      this.logger.warn(`Deleting topic: ${topicName}`);
      await admin.deleteTopics({
        topics: [topicName],
        timeout: 30000, // 30 seconds
      });
      // Small delay to ensure topic deletion is propagated
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error: any) {
      if (error.type === 'UNKNOWN_TOPIC_OR_PARTITION') {
        this.logger.warn(`Topic ${topicName} does not exist, nothing to delete`);
        return;
      }
      throw error;
    }
  }

  /**
   * Validates if the broker is reachable and healthy
   */
  static async validateBrokerConnection(kafkaConfig: KafkaConfig): Promise<boolean> {
    const kafka = new Kafka(kafkaConfig);
    const admin = kafka.admin();

    console.log("config", kafkaConfig);
    try {
      await admin.connect();
      await admin.describeCluster();
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to connect to Kafka broker: ${error.message}`);
      return false;
    } finally {
      await admin.disconnect().catch(() => {});
    }
  }
}

export const TRACKING_EVENTS_TOPIC: TopicConfig = {
  topic: 'tracking-events',
  numPartitions: 3,
  replicationFactor: 1,
  configEntries: [
    { name: 'min.insync.replicas', value: '1' },
    { name: 'retention.ms', value: '604800000' } // 7 days
  ]
};
