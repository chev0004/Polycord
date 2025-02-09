export type Notification = {
  id: string;
  message: string;
  timestamp: string;
  iconUrl?: string;
};

export type Notifications = Notification[];
