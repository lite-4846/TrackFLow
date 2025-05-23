import { Kafka } from 'kafkajs';
// import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

type EventData = {
  events: {
    eventId: string;
    tenantId: string;
    eventType: string;
    properties: string | null;
    sessionId: string;
    userId: string;
    timestamp: Date;
    pageUrl: string;
    referrer: string | null;
    deviceInfo: string;
  }[];
};

async function startConsumer() {
  const kafka = new Kafka({
    clientId: 'trackflow',
    brokers: ['localhost:9092'],
  });

  const consumer = kafka.consumer({ groupId: 'trackflow-group' });

  await consumer.connect();
  await consumer.subscribe({ topic: 'tracking-events', fromBeginning: true });

  let batch: EventData[] = [];
  let batchTimer: NodeJS.Timeout | null = null;

  await consumer.run({
    eachMessage: async ({ message }) => {
      const eventData = JSON.parse(
        message.value?.toString() || '',
      ) as EventData;
      
      batch.push(eventData);

      if (!batchTimer) {
        batchTimer = setTimeout(() => {
          flushBatch().catch(console.error);
        }, 3000);
      }

      if (batch.length >= 10000) {
        await flushBatch().catch(console.error);
      }
    },
  });

  async function flushBatch() {
    if (batch.length === 0) return;

    const filePath = path.resolve(__dirname, 'tempEvents.json');
    await fs.appendFile(filePath, JSON.stringify(batch, null, 2) + ',\n');

    for (const entry of batch) {
      const { events } = entry;
      for (const event of events) {
        // const {
        //   eventId,
        //   tenantId,
        //   eventType,
        //   properties,
        //   sessionId,
        //   userId,
        //   timestamp,
        //   pageUrl,
        //   referrer,
        //   deviceInfo,
        // } = event;

        console.log('Each Event:\n' + JSON.stringify(event, null, 2));
      }
    }

    // INSERTS

    // await axios.get('http://localhost:3838');

    // for (const sql of queries) {
    //   try {
    //     await axios.post(
    //       'http://localhost:8123/?user=default&password=superman',
    //       sql,
    //       {
    //         headers: { 'Content-Type': 'text/plain' },
    //       },
    //     );
    //   } catch (err) {
    //     console.error('Insert failed:', err);
    //   }
    // }

    batch = [];
    clearTimeout(batchTimer!);
    batchTimer = null;
  }
}

startConsumer().catch((err) => console.log(err));
