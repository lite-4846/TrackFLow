// Core event types for TrackFlow tracker
export interface BaseEvent {
  eventId: string;
  eventType: string;
  timestamp: number;
  tenantId: string;
  sessionId: string;
  userId: string | null;
  pageUrl: string;
  referrer: string | null;
  deviceInfo: DeviceInfo;
  properties: Record<string, any>;
}

export interface DeviceInfo {
  deviceType: 'mobile' | 'desktop';
  os: string;
  browser: string;
}

export interface PageViewEvent extends BaseEvent {
  eventType: 'page_view';
  properties: {
    title: string;
  };
}

export interface ClickEvent extends BaseEvent {
  eventType: 'click';
  properties: {
    tag: string;
    id: string | null;
    text?: string;
  };
}

export interface ErrorEvent extends BaseEvent {
  eventType: 'error';
  properties: {
    message: string;
    source?: string;
    line?: number;
    col?: number;
    stack?: string | null;
  };
}

export interface PerformanceEvent extends BaseEvent {
  eventType: 'performance';
  properties: {
    loadTime: number;
    domContentLoaded: number;
  };
}

export type TrackEvent = 
  | PageViewEvent 
  | ClickEvent 
  | ErrorEvent 
  | PerformanceEvent;
