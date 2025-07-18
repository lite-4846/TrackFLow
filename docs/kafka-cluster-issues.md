# Kafka Cluster Issues: Topic ID Mismatch

## Root Cause

Kafka's topic ID mismatch occurs when there's an inconsistency between the metadata stored in the Kafka brokers and the actual topic state. This typically happens when:

1. **Improper Topic Recreation**: Deleting and recreating a topic with the same name without proper cleanup
2. **ZooKeeper Inconsistencies**: Metadata corruption in ZooKeeper
3. **Broker Failures**: During broker restarts or network partitions
4. **Manual Intervention**: Direct modifications to Kafka's data directories

## Symptoms

- `NOT_LEADER_FOR_PARTITION` errors
- `Topic ID in memory does not match` errors in broker logs
- Producers/consumers failing to connect or process messages
- Inconsistent topic metadata across brokers

## Prevention

### 1. Proper Topic Management

```bash
# Always use --if-exists flag when deleting topics
kafka-topics --bootstrap-server localhost:9092 --delete --topic my-topic --if-exists

# Wait before recreating
sleep 10

# Create with explicit configuration
kafka-topics --bootstrap-server localhost:9092 \
  --create \
  --topic my-topic \
  --partitions 3 \
  --replication-factor 1 \
  --config min.insync.replicas=1
```

### 2. Application-Level Validation

Implement topic validation in both producers and consumers:

```typescript
async function ensureTopicExists(admin: Admin, topicConfig: TopicConfig) {
  try {
    await admin.connect();
    
    // Check if topic exists
    const topics = await admin.listTopics();
    if (topics.includes(topicConfig.topic)) {
      // Verify topic configuration
      const metadata = await admin.fetchTopicMetadata({ topics: [topicConfig.topic] });
      const topicMetadata = metadata.topics[0];
      
      if (topicMetadata.partitions.length !== topicConfig.numPartitions) {
        throw new Error(`Topic ${topicConfig.topic} has incorrect number of partitions`);
      }
      
      return;
    }
    
    // Create topic if it doesn't exist
    await admin.createTopics({
      waitForLeaders: true,
      topics: [topicConfig]
    });
  } finally {
    await admin.disconnect();
  }
}
```

### 3. Infrastructure as Code

Define topics in version control using tools like:
- Terraform with Kafka provider
- Kubernetes Custom Resource Definitions (CRDs)
- Ansible playbooks

## Recovery

### When Issue is Detected

1. **Stop Affected Services**: Prevent further data corruption
2. **Backup Topic Data**: If possible, export important data
3. **Delete Corrupted Topic**: 
   ```bash
   kafka-topics --bootstrap-server localhost:9092 --delete --topic problem-topic
   ```
4. **Clean ZooKeeper Metadata** (if needed):
   ```bash
   zookeeper-shell localhost:2181 rmr /brokers/topics/problem-topic
   zookeeper-shell localhost:2181 rmr /admin/delete_topics/problem-topic
   ```
5. **Recreate Topic**: With proper configuration
6. **Restart Services**: In the correct order

## Best Practices

1. **Use Topic Naming Conventions**: Include environment prefixes (e.g., `dev-`, `prod-`)
2. **Implement Health Checks**: Monitor topic health and configuration
3. **Automate Recovery**: Create runbooks for common failure scenarios
4. **Regular Backups**: Of both data and configurations
5. **Monitoring**: Set up alerts for topic metadata inconsistencies

## References

- [Kafka Documentation - Topic Operations](https://kafka.apache.org/documentation/#basic_ops_modify_topic)
- [Confluent - Kafka Best Practices](https://developer.confluent.io/learn-kafka/apache-kafka/best-practices/)
- [Uber Engineering - Kafka at Scale](https://eng.uber.com/kafka/)

## Troubleshooting Commands

```bash
# List all topics
kafka-topics --bootstrap-server localhost:9092 --list

# Describe topic configuration
kafka-topics --bootstrap-server localhost:9092 --describe --topic my-topic

# Check consumer groups
kafka-consumer-groups --bootstrap-server localhost:9092 --list

# Check broker logs
docker-compose logs kafka | grep -i error
```

## Monitoring Metrics

Key metrics to monitor:
- `kafka.server:type=BrokerTopicMetrics,name=MessagesInPerSec`
- `kafka.server:type=ReplicaManager,name=UnderReplicatedPartitions`
- `kafka.controller:type=KafkaController,name=OfflinePartitionsCount`
- `kafka.server:type=ReplicaManager,name=PartitionCount`

## Conclusion

Topic ID mismatches can be prevented with proper topic management practices, application-level validation, and monitoring. Always test topic operations in a non-production environment first and have a rollback plan in place.
