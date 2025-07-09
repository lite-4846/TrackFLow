# 🏰 Kafka Mastery Notes (Levels 1–4)

---

## 📘 Level 1: High-Level Overview — What is Kafka?

**Apache Kafka** is a **distributed event streaming platform** used to:
- Publish
- Subscribe
- Store
- Process data streams **in real-time**

### 🔧 Kafka Use-Cases:
- Event-driven microservices
- Real-time analytics
- Log aggregation
- Data pipeline between services

### ⚙️ Kafka Core Components:
- **Producer** → sends data
- **Broker** → stores and manages data
- **Consumer** → reads data
- **Topic** → logical channel for messages

---

## 📘 Level 2: Kafka Ecosystem Components

### 1. **Topic**
- A named **logical stream** of messages.
- Think of it like a "category" of events.
- Example: `order_events`

### 2. **Partition**
- Topics are **split into partitions** for scalability.
- Each partition is an **append-only log**.
- Events are **hashed or round-robin distributed**.

### 3. **Broker**
- A Kafka server.
- Each broker **manages a set of partitions**.

### 4. **Producer**
- Sends messages to topics.
- Can specify **partition key** or use default balancing.

### 5. **Consumer**
- Reads messages from topics (via partitions).
- Each consumer belongs to a **consumer group**.

### 6. **Consumer Group**
- Group of consumers sharing the load.
- Each partition is read by **one consumer per group**.
- **Multiple groups** can read **same events independently**.

### 📊 Example Diagram: E-Commerce Order Flow

```
                        +---------------------+
                        |  Order Service      |  ---> Order Placed
                        +---------------------+
                                 |
                                 v
                        +---------------------+
                        | Kafka Topic:        |
                        |  order_events       |
                        +---------------------+
                                 |
    +----------------------------+----------------------------+
    |                             |                            |
    v                             v                            v
+-----------+             +---------------+           +----------------+
| Inventory |             | Payment       |           | Notification   |
| Service   |             | Service       |           | Service        |
+-----------+             +---------------+           +----------------+
    |                           |                           |
    v                           v                           v
Update stock           Process payment             Send Email/SMS
```

---

## 📘 Level 3: Kafka Internals

### 🔢 1. Offset
- Each message in a partition has a unique **offset**.
- Kafka tracks offsets **per consumer group** (not per consumer).
- Enables **resuming**, **retrying**, and **reprocessing**.

### 🛡 2. Replication
- Each partition is replicated across **multiple brokers**.
- One is **Leader**, others are **Followers**.
- Kafka writes to **Leader only**.

### 👑 3. Leader & Follower Mechanics
- **Leader** handles all read/write operations.
- **Followers** replicate data passively.
- Kafka auto-elects new leader if current one fails.

### 🧾 4. Retention & Log Segments
- Kafka stores data for a configured time (e.g., 7 days).
- Logs are broken into **segments** for efficient cleanup.
- Data is **not deleted immediately after consumption**.

### 🧠 5. ZooKeeper vs KRaft

| Feature            | ZooKeeper Mode        | KRaft Mode (new)         |
|--------------------|------------------------|---------------------------|
| External Service   | Yes                    | No                        |
| Controller         | ZooKeeper              | Kafka's built-in Raft     |
| Simpler Setup      | ❌                     | ✅                        |
| Recommended Future | ❌                     | ✅ (default going forward) |

---

## 📘 Level 4: Real-World Design Patterns & Best Practices

### 🧱 1. Event-Driven Microservices
- Services communicate via **events**, not direct calls.
- Kafka acts as a central **event backbone**.

```
User Service → user_registered → Kafka
     |
     |-- Email Service
     |-- Billing Service
     |-- Analytics Service
```

### ⚰️ 2. Dead Letter Queue (DLQ)
- Failed messages are moved to a **DLQ topic**.
- Allows retry, review, or alerting without system crash.

### 📜 3. Schema Registry & Data Contracts
- Define message structure using **Avro/JSON/Protobuf**
- Enforces **validation** and **compatibility**
- Example schema:
```json
{
  "type": "record",
  "name": "Order",
  "fields": [
    { "name": "id", "type": "string" },
    { "name": "status", "type": "string" }
  ]
}
```

### 🎯 4. Exactly-Once Semantics
- Kafka can ensure **exactly-once delivery** using:
  - Idempotent producers
  - Transactions
  - Offset commits tied to writes

### 📈 5. Monitoring & Metrics

**Tools:**
- Prometheus + Grafana
- Confluent Control Center
- Burrow
- Kafka Manager

**Key Metrics:**
- Broker throughput
- Consumer lag
- Under-replicated partitions
- Message/error rates