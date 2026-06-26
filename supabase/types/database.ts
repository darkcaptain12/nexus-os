export type UserRole = 'owner' | 'admin' | 'member' | 'viewer' | 'agent' | 'system';
export type EntityStatus = 'active' | 'inactive' | 'archived' | 'deleted';
export type PriorityLevel = 'critical' | 'high' | 'normal' | 'low' | 'background';
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';
export type MemoryType = 'working' | 'short' | 'long' | 'semantic' | 'conversation' | 'knowledge' | 'project' | 'document' | 'relationship';
export type MemoryPrivacy = 'public' | 'private' | 'system';
export type GoalStatus = 'active' | 'completed' | 'abandoned' | 'paused';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'failed' | 'blocked';
export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type NotificationChannel = 'push' | 'email' | 'sms' | 'desktop' | 'webhook' | 'in_app';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TradeDirection = 'long' | 'short';
export type TradeStatus = 'open' | 'closed' | 'cancelled' | 'pending' | 'liquidated';
export type OrderSide = 'buy' | 'sell';
export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop';
export type CommerceOrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded' | 'returned';
export type TransactionType = 'income' | 'expense' | 'transfer' | 'investment' | 'refund';
export type AgentType = 'single' | 'planner' | 'executor' | 'reviewer' | 'coordinator';
export type TriggerType = 'schedule' | 'event' | 'webhook' | 'manual' | 'condition';
export type ActionType = 'api_call' | 'notification' | 'data_transform' | 'ai_task' | 'script' | 'delay' | 'branch';
export type WorkflowNodeType = 'action' | 'decision' | 'loop' | 'parallel' | 'sequential' | 'wait' | 'checkpoint' | 'compensation';

export interface DbTimestamps {
  created_at: string;
  updated_at: string;
}

export interface DbSoftDelete {
  deleted_at: string | null;
}

export interface DbUser extends DbTimestamps, DbSoftDelete {
  id: string;
  auth_id: string | null;
  email: string;
  name: string;
  avatar_url: string | null;
  role: UserRole;
  status: EntityStatus;
  email_verified: boolean;
  last_login_at: string | null;
  created_by: string | null;
}

export interface DbAgent extends DbTimestamps, DbSoftDelete {
  id: string;
  name: string;
  description: string;
  type: AgentType;
  version: string;
  system_prompt: string;
  model: string | null;
  provider: string | null;
  capabilities: string[];
  permissions: string[];
  tool_access: string[];
  priority: PriorityLevel;
  cost_limit: number;
  timeout: number;
  status: EntityStatus;
  owner_id: string | null;
  config: Record<string, unknown>;
  tags: string[];
  total_runs: number;
  success_rate: number;
  created_by: string | null;
}

export interface DbAgentRun {
  id: string;
  agent_id: string;
  status: ExecutionStatus;
  input: string;
  output: string | null;
  reasoning: Record<string, unknown> | null;
  error: Record<string, unknown> | null;
  model: string | null;
  provider: string | null;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost: number;
  latency_ms: number | null;
  parent_run_id: string | null;
  correlation_id: string | null;
  user_id: string | null;
  metadata: Record<string, unknown>;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface DbMemory extends DbTimestamps, DbSoftDelete {
  id: string;
  type: MemoryType;
  content: string;
  summary: string | null;
  source: string;
  owner_id: string | null;
  agent_id: string | null;
  privacy: MemoryPrivacy;
  importance: number;
  tags: string[];
  access_count: number;
  last_accessed_at: string | null;
  expires_at: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
}

export interface DbPosition extends DbTimestamps {
  id: string;
  portfolio_id: string;
  symbol: string;
  direction: TradeDirection;
  status: TradeStatus;
  entry_price: number;
  exit_price: number | null;
  quantity: number;
  leverage: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  pnl: number | null;
  pnl_percentage: number | null;
  fees: number;
  strategy: string | null;
  signal_id: string | null;
  notes: string | null;
  opened_at: string;
  closed_at: string | null;
  metadata: Record<string, unknown>;
}

export interface DbCommerceOrder extends DbTimestamps {
  id: string;
  shop_id: string;
  customer_id: string | null;
  external_id: string | null;
  order_number: string;
  status: CommerceOrderStatus;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  currency: string;
  items: Record<string, unknown>[];
  shipping_address: Record<string, unknown> | null;
  billing_address: Record<string, unknown> | null;
  notes: string | null;
  metadata: Record<string, unknown>;
}

export interface DbNotification {
  id: string;
  user_id: string;
  channel: NotificationChannel;
  priority: NotificationPriority;
  title: string;
  body: string;
  action_url: string | null;
  read: boolean;
  read_at: string | null;
  source: string | null;
  source_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  deleted_at: string | null;
  created_by: string | null;
}
