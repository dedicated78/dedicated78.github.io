import type { ItemStatus, MetricKey, Platform } from './types';

export interface PlatformMeta {
  id: Platform;
  label: string;
  short: string;
  /** Categorical data-viz slot (validated first-three set). Identity is never color-only: labels always accompany. */
  color: string;
  bodyLimit: number;
  guidance: string;
  formats: string[];
  specialist: string;
}

export const PLATFORM_META: Record<Platform, PlatformMeta> = {
  instagram: {
    id: 'instagram',
    label: 'Instagram',
    short: 'IG',
    color: 'var(--series-ig)',
    bodyLimit: 2200,
    guidance: 'First 125 characters show before “more”. Up to 30 hashtags; 3–8 focused tags usually read cleaner.',
    formats: ['Carousel', 'Reel', 'Single image', 'Story'],
    specialist: 'Instagram Specialist',
  },
  linkedin: {
    id: 'linkedin',
    label: 'LinkedIn',
    short: 'in',
    color: 'var(--series-li)',
    bodyLimit: 3000,
    guidance: 'About 210 characters show before “see more”. Lead with the hook; keep hashtags to 3 or fewer.',
    formats: ['Text post', 'Document carousel', 'Image post', 'Poll', 'Article'],
    specialist: 'LinkedIn Specialist',
  },
  x: {
    id: 'x',
    label: 'X',
    short: 'X',
    color: 'var(--series-x)',
    bodyLimit: 280,
    guidance: '280 characters per post on standard accounts. Threads: each post should stand on its own.',
    formats: ['Single post', 'Thread', 'Poll', 'Image post'],
    specialist: 'X Content Specialist',
  },
};

export const STATUS_META: Record<ItemStatus, { label: string; hint: string }> = {
  idea: { label: 'Idea', hint: 'Concept without a completed draft' },
  draft: { label: 'Draft', hint: 'Generated or edited content' },
  ready: { label: 'Ready', hint: 'Internally approved for manual publishing' },
  archived: { label: 'Archived', hint: 'No longer active' },
};

export const METRIC_LABELS: Record<MetricKey, string> = {
  impressions: 'Impressions',
  reach: 'Reach',
  engagements: 'Engagements',
  likes: 'Likes',
  comments: 'Comments',
  shares: 'Shares / reposts',
  saves: 'Saves / bookmarks',
  clicks: 'Link clicks',
};
