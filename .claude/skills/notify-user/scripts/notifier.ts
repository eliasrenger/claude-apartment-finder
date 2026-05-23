export interface NotificationPayload {
  title: string;
  body: string;
}

export interface Notifier {
  notify(payload: NotificationPayload): Promise<void>;
}
