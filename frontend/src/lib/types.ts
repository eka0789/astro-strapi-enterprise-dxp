export interface Project {
  id: string;
  title: string;
  slug: string;
  client: string;
  tagline: string;
  description: string;
  category: string;
  techStack: string[];
  metrics: {
    latency?: string;
    uptime?: string;
    requestsPerDay?: string;
    dataProcessed?: string;
    costReduction?: string;
    querySpeedup?: string;
    auditScore?: string;
    activeUsers?: string;
    ttfb?: string;
    [key: string]: string | undefined;
  };
  featured: boolean;
  coverUrl: string;
  externalUrl?: string;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  author: string;
  readingTime: string;
  tags: string[];
  coverUrl: string;
  featured: boolean;
  publishedAt?: string;
}

export interface Service {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  icon: string;
  deliverables: string[];
  order: number;
}

export interface SystemMetric {
  label: string;
  value: string;
  description: string;
  badge: string;
  trend: string;
}
