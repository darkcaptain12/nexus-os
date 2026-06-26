export interface CrawlerWorkerConfig {
  maxConcurrency: number;
  requestDelay: number;
  timeout: number;
  userAgent: string;
}

export interface CrawlJob {
  id: string;
  url: string;
  type: 'scrape' | 'monitor' | 'extract';
  selectors?: Record<string, string>;
  schedule?: string;
  createdAt: string;
}
