import { generateUUID } from "../utils/uuid";
import { Storage } from "../utils/storage";
import { Config } from "../core/config";

type DeviceInfo = {
  deviceType: string | undefined,
  os: string | undefined,
  browser: string | undefined
}

export class Session {
  private static SESSION_KEY = "trackflow_session";
  private static USER_KEY = "trackflow_user";
  private static DEVICE_KEY = "trackflow_device";

  sessionId: string;
  userId: string;
  sessionStart: number;
  deviceInfo: DeviceInfo;

  constructor() {
    this.sessionId = this.getSessionId();
    this.userId = this.getUserId();
    this.sessionStart = Date.now();
    this.deviceInfo = this.getDeviceInfo();
  }

  /** Retrieves or creates a session ID (stored in sessionStorage) */
  private getSessionId(): string {
    let session = Storage.getItem<string>(Session.SESSION_KEY, true); 
    if (!session) {
      session = generateUUID();
      Storage.setItem(Session.SESSION_KEY, session, Config.SESSION_TIMEOUT, true);
    }
    return session;
  }
  
  /** Retrieves or assigns a user ID (stored in localStorage) */
  private getUserId(): string {
    let userId = Storage.getItem<string>(Session.USER_KEY);
    if(!userId) {
      userId = generateUUID();
      this.setUserId(userId);
    }
    return userId;
  }

  /** Associates a user ID with the session */
  setUserId(userId: string) {
    this.userId = userId;
    Storage.setItem(Session.USER_KEY, userId, 365 * 24 * 60 * 60 * 1000); // 1 year
  }

  /** Refreshes the session (used for session renewal) */
  refreshSession() {
    this.sessionId = generateUUID();
    this.sessionStart = Date.now();
    Storage.setItem(Session.SESSION_KEY, this.sessionId, Config.SESSION_TIMEOUT, true);
  }

  /** Retrieves device information (mobile vs. desktop) */
  private getDeviceInfo(): DeviceInfo {
    let device : DeviceInfo = JSON.parse(Storage.getItem<string>(Session.DEVICE_KEY) ?? '{}');
    if (!device || Object.keys(device).length === 0) {
      device = {
        deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
        os: navigator.userAgent.match(/Windows|Mac|Linux|Android|iPhone|iPad/)?.[0] || 'unknown',
        browser: navigator.userAgent.match(/Chrome|Firefox|Safari|Edge|Opera/)?.[0] || 'unknown',
      };
      Storage.setItem(Session.DEVICE_KEY, JSON.stringify(device), Config.SESSION_TIMEOUT, true);
    }
    return device;
  }
}
