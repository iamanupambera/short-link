export interface ClickEvent {
  linkId: number;
  ip: string;
  userAgent: string;
  referrer: string;
  country?: string;
  timestamp: string;
}
