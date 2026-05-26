export interface NotificationPayload {
  title: string;
  body: string;
  booli_id?: string; // when set, Discord thread ID is saved for reaction tracking
}

export interface Notifier {
  notify(payload: NotificationPayload): Promise<void>;
}
