import { Kafka } from 'kafkajs';
import axios from 'axios';

type EventData = {
  eventId: string;
  eventType: string;
  properties: string | null;
  sessionId: string;
  userId: string;
  timestamp: Date;
  pageUrl: string;
  referrer: string | null;
  deviceInfo: string;
};

async function startConsumer() {
  const kafka = new Kafka({
    clientId: 'trackflow',
    brokers: ['localhost:9092'],
  });

  const consumer = kafka.consumer({ groupId: 'trackflow-group' });

  await consumer.connect();
  await consumer.subscribe({ topic: 'tracking-events', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const eventData = JSON.parse(
        message.value ? message.value.toString() : '',
      ) as unknown;

      console.log('Received event from Kafka', eventData);

      try {
        await axios
          .post('http://localhost:8123/', eventData, {
            headers: {
              'Content-Type': 'application/json',
            },
          })
          .then((response) => {
            console.log('Event sent to backend successfully', response.data);
          });
      } catch (error) {
        console.error('Error sending event to backend', error);
      }
    },
  });

  let batch: EventData[] = [];

  await consumer.run({
    eachMessage: async ({ message }) => {
      const eventData = JSON.parse(
        message.value ? message.value.toString() : '',
      ) as EventData;

      batch.push(eventData);

      // Batch size limit
      if (batch.length >= 10) {
        // adjust based on your needs
        const sqlQuery = `INSERT INTO your_table (eventType, eventData) VALUES ${batch
          .map(
            (event) =>
              `('${event.eventType}', '${JSON.stringify(event)}')`,
          )
          .join(', ')}`;

        try {
          await axios.post('http://localhost:8123/', sqlQuery, {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          });
          console.log('Batch of events sent to backend successfully');
          batch = []; // Reset the batch after sending
        } catch (error) {
          console.error('Error sending batch of events to backend', error);
        }
      }
    },
  });
}

startConsumer().catch((err) => console.log(err));

