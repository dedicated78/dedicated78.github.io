export type Platform = 'instagram' | 'linkedin' | 'x';
export const PLATFORMS: Platform[] = ['instagram', 'linkedin', 'x'];

export type ItemStatus = 'idea' | 'draft' | 'ready' | 'archived';
export const STATUSES: ItemStatus[] = ['idea', 'draft', 'ready', 'archived'];

export interface Session {
  userId: string;
  email: string;
}

export interface Row {
  id: string;
  owner_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface Workspace extends Row {
  name: string;
}

export interface BrandProfile extends Row {
  workspace_id: string;
  brand_name: string;
  industry: string;
  voice: string;
  audience: string;
  goals: string;
  offers: string;
  vocabulary: string;
  prohibited_topics: string[];
}

export type ConnectionState = 'pending' | 'connected' | 'error' | 'disconnected';

export interface SocialConnection extends Row {
  workspace_id: string;
  platform: Platform;
  account_label: string;
  state: ConnectionState;
  last_synced_at: string | null;
  last_error: string | null;
}

export interface StrategyContent {
  objective: string;
  audience: string;
  brandMessage: string;
  pillars: { name: string; description: string }[];
  channelRoles: { platform: Platform; role: string; formats: string }[];
  cadence: { platform: Platform; postsPerWeek: number; bestTimes: string; notes: string }[];
  themes: { title: string; angles: string }[];
  successMetrics: { platform: Platform | 'all'; metric: string; target: string }[];
  risks: string[];
  assumptions: string[];
  prohibitedTopics: string[];
  experiments: { platform: Platform | 'all'; hypothesis: string; test: string; metric: string }[];
}

export interface Strategy extends Row {
  workspace_id: string;
  title: string;
  brief: string;
  platforms: Platform[];
  start_date: string;
  end_date: string;
  status: 'draft' | 'saved' | 'archived';
  content: StrategyContent;
  source_recommendation_ids: string[];
  ai_provenance: Provenance | null;
}

export interface Campaign extends Row {
  workspace_id: string;
  strategy_id: string | null;
  name: string;
  objective: string;
  start_date: string;
  end_date: string;
}

export interface CalendarItem extends Row {
  workspace_id: string;
  campaign_id: string | null;
  strategy_id: string | null;
  planned_at: string;
  platform: Platform;
  title: string;
  pillar: string;
  format: string;
  objective: string;
  notes: string;
  status: ItemStatus;
}

export interface Variant {
  body: string;
  cta: string;
  hashtags: string[];
  thread: string[];
  visual_concept: string;
  ai_generated: boolean;
}

export interface Provenance {
  generated_by: string;
  agents: string[];
  model: string;
  mode: 'demo' | 'live';
  generated_at: string;
  edited_by_user?: boolean;
}

export interface Draft extends Row {
  workspace_id: string;
  calendar_item_id: string;
  body: string;
  cta: string;
  hashtags: string[];
  variants: Partial<Record<Platform, Variant>>;
  ai_provenance: Provenance | null;
  current_version: number;
}

export interface DraftVersion extends Row {
  workspace_id: string;
  draft_id: string;
  version: number;
  source: 'ai' | 'user';
  snapshot: Pick<Draft, 'body' | 'cta' | 'hashtags' | 'variants'>;
  note: string;
}

export type MetricKey =
  | 'impressions'
  | 'reach'
  | 'engagements'
  | 'likes'
  | 'comments'
  | 'shares'
  | 'saves'
  | 'clicks';
export const METRIC_KEYS: MetricKey[] = ['impressions', 'reach', 'engagements', 'likes', 'comments', 'shares', 'saves', 'clicks'];

/** null = the platform connection did not expose this metric. Never estimated. */
export type MetricValues = Record<MetricKey, number | null>;

export interface PostMetric {
  id: string;
  published_at: string;
  format: string;
  pillar: string;
  text: string;
  url: string | null;
  metrics: MetricValues;
}

export interface AnalyticsSnapshot extends Row {
  workspace_id: string;
  platform: Platform;
  account_label: string;
  period_start: string;
  period_end: string;
  followers: number | null;
  posts: PostMetric[];
  source: string;
  retrieved_at: string;
  notes: string[];
}

export interface Evidence {
  ref: string;
  platform: Platform;
  metric: string;
  value: string;
  comparison: string;
  period_start: string;
  period_end: string;
  retrieved_at: string;
  snapshot_id: string;
  source: string;
}

export interface Recommendation extends Row {
  workspace_id: string;
  platform: Platform | 'all';
  finding: string;
  proposed_action: string;
  evidence: Evidence[];
  status: 'new' | 'selected' | 'applied' | 'dismissed';
  ai_provenance: Provenance | null;
}

export type TableName =
  | 'workspaces'
  | 'brand_profiles'
  | 'social_connections'
  | 'strategies'
  | 'campaigns'
  | 'calendar_items'
  | 'drafts'
  | 'draft_versions'
  | 'analytics_snapshots'
  | 'recommendations';

/* ---------- Copilot contracts (identical for demo and live agents) ---------- */

export interface StrategyRequest {
  brief: string;
  platforms: Platform[];
  start_date: string;
  end_date: string;
  brand: BrandProfile;
  channel_context: Partial<Record<Platform, ChannelContext>>;
  recommendations: Pick<Recommendation, 'finding' | 'proposed_action' | 'platform'>[];
}

/** Read-only, pre-aggregated social context. Agents never receive credentials or tools. */
export interface ChannelContext {
  platform: Platform;
  period: string;
  retrieved_at: string;
  summary: string;
}

export interface GeneratedItem {
  platform: Platform;
  planned_at: string;
  title: string;
  pillar: string;
  format: string;
  objective: string;
  notes: string;
  variant: Variant;
}

export interface CalendarRequest {
  strategy: StrategyContent;
  platforms: Platform[];
  start_date: string;
  end_date: string;
  brand: BrandProfile;
}

export interface VariantRequest {
  source_platform: Platform;
  source: Variant;
  title: string;
  pillar: string;
  targets: Platform[];
  brand: BrandProfile;
}

export interface FindingsRequest {
  brand: BrandProfile;
  evidence: Evidence[];
  aggregates: string;
}

export interface GeneratedFinding {
  platform: Platform | 'all';
  finding: string;
  proposed_action: string;
  evidence_refs: string[];
}

export interface AgentResult<T> {
  data: T;
  provenance: Provenance;
}
