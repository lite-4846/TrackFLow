import { Kafka } from 'kafkajs';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

type EventData = {
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
        }, 10000);
      }

      if (batch.length >= 10000) {
        await flushBatch();
      }
    },
  });

  async function flushBatch() {
    if (batch.length === 0) return;

    const mainRows: string[] = [];
    const pageLoadRows: string[] = [];
    const clickRows: string[] = [];
    const errorRows: string[] = [];
    const pageViewRows: string[] = [];

    for (const event of batch) {
      const {
        eventId,
        tenantId,
        eventType,
        properties,
        sessionId,
        userId,
        timestamp,
        pageUrl,
        referrer,
        deviceInfo,
      } = event;

      const ts = new Date(timestamp).toISOString();

      mainRows.push(
        `('${eventId}', '${tenantId}', '${eventType}', ${properties ? `'${JSON.stringify(properties)}'` : 'NULL'}, ` +
          `'${sessionId}', '${userId}', '${ts}', '${pageUrl}', ` +
          `${referrer ? `'${referrer}'` : 'NULL'}, ${deviceInfo ? `'${JSON.stringify(deviceInfo)}'` : 'NULL'})`,
      );

      type PageLoadProps = { loadTime?: number; domContentLoaded?: number };
      type ClickProps = { tag: string; id?: string };
      type ErrorProps = {
        message: string;
        source: string;
        line: number;
        col: number;
        stack?: string;
      };
      type PageViewProps = { url: string; title: string };

      const props : unknown = properties ? JSON.parse(properties) : {};

      switch (eventType) {
        case 'performance': {
          const pageProps = props as PageLoadProps;
          pageLoadRows.push(
            `('${eventId}', ${pageProps.loadTime ?? null}, ${pageProps.domContentLoaded})`,
          );
          break;
        }
        case 'click': {
          const clickProps = props as ClickProps;
          clickRows.push(
            `('${eventId}', '${clickProps.tag}', ${clickProps.id ? `'${clickProps.id}'` : 'NULL'})`,
          );
          break;
        }
        case 'error': {
          const errorProps = props as ErrorProps;
          errorRows.push(
            `('${eventId}', '${errorProps.message}', '${errorProps.source}', ${errorProps.line}, ${errorProps.col}, ${errorProps.stack ? `'${errorProps.stack}'` : 'NULL'})`,
          );
          break;
        }
        case 'page_view': {
          const pageViewProps = props as PageViewProps;
          pageViewRows.push(
            `('${eventId}', '${pageViewProps.url}', '${pageViewProps.title}')`,
          );
          break;
        }
      }
    }

    // INSERTS
    const queries = [
      `INSERT INTO trackflow.events (...) VALUES ${mainRows.join(', ')}`,
      pageLoadRows.length
        ? `INSERT INTO trackflow.event_performance VALUES ${pageLoadRows.join(', ')}`
        : null,
      clickRows.length
        ? `INSERT INTO trackflow.event_clicks VALUES ${clickRows.join(', ')}`
        : null,
      errorRows.length
        ? `INSERT INTO trackflow.event_errors VALUES ${errorRows.join(', ')}`
        : null,
        pageViewRows.length
        ? `INSERT INTO trackflow.event_pageviews VALUES ${pageViewRows.join(', ')}`
        : null,
    ].filter(Boolean);

    for (const sql of queries) {
      try {
        await axios.post(
          'http://localhost:8123/?user=default&password=superman',
          sql,
          {
            headers: { 'Content-Type': 'text/plain' },
          },
        );
      } catch (err) {
        console.error('Insert failed:', err);
      }
    }

    batch = [];
    clearTimeout(batchTimer!);
    batchTimer = null;
  }
}

startConsumer().catch((err) => console.log(err));
