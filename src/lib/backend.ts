import type {
  AgentResult,
  AnalyticsSnapshot,
  CalendarRequest,
  FindingsRequest,
  GeneratedFinding,
  GeneratedItem,
  Platform,
  Session,
  SocialConnection,
  StrategyContent,
  StrategyRequest,
  TableName,
  Variant,
  VariantRequest,
} from './types';

export type Filters = Record<string, string | number | boolean | null>;

export interface Db {
  list<T>(table: TableName, filters?: Filters, order?: { column: string; ascending?: boolean }): Promise<T[]>;
  get<T>(table: TableName, id: string): Promise<T | null>;
  insert<T>(table: TableName, row: Partial<T>): Promise<T>;
  insertMany<T>(table: TableName, rows: Partial<T>[]): Promise<T[]>;
  update<T>(table: TableName, id: string, patch: Partial<T>): Promise<T>;
  remove(table: TableName, id: string): Promise<void>;
}

export interface Auth {
  getSession(): Promise<Session | null>;
  signUp(email: string, password: string): Promise<{ session: Session | null; needsConfirmation: boolean }>;
  signIn(email: string, password: string): Promise<Session>;
  signOut(): Promise<void>;
  onChange(cb: (s: Session | null) => void): () => void;
}

/**
 * Social Strategy Director + channel specialists.
 * Every method returns drafts/data only. There is intentionally no publish, schedule,
 * comment, reply, message, follow or delete method anywhere in this interface.
 */
export interface Copilot {
  strategy(req: StrategyRequest): Promise<AgentResult<{ title: string; content: StrategyContent }>>;
  calendar(req: CalendarRequest): Promise<AgentResult<GeneratedItem[]>>;
  variants(req: VariantRequest): Promise<AgentResult<Partial<Record<Platform, Variant>>>>;
  findings(req: FindingsRequest): Promise<AgentResult<GeneratedFinding[]>>;
}

/** Read-only social access. Connect = OAuth hand-off; sync = read content + insights. */
export interface SocialReader {
  connect(workspaceId: string, platform: Platform): Promise<{ connection: SocialConnection; redirectUrl: string | null }>;
  refreshStatus(connectionId: string): Promise<SocialConnection>;
  sync(connectionId: string, days: number): Promise<AnalyticsSnapshot>;
  disconnect(connectionId: string): Promise<SocialConnection>;
}

export interface Backend {
  mode: 'demo' | 'live';
  auth: Auth;
  db: Db;
  copilot: Copilot;
  social: SocialReader;
  deleteAccount(): Promise<void>;
}
