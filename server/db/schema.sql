PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL DEFAULT 'miro',
  mode TEXT NOT NULL DEFAULT 'demo',
  status TEXT NOT NULL DEFAULT 'connected',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS integration_credentials (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'miro',
  credential_label TEXT NOT NULL,
  scopes_json TEXT NOT NULL DEFAULT '[]',
  expires_at TEXT,
  status TEXT NOT NULL DEFAULT 'connected',
  from_oauth_device_flow INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS boards (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider_board_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  view_link TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  last_synced_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workflow_templates (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  outcome TEXT NOT NULL,
  default_board_id TEXT NOT NULL REFERENCES boards(id),
  estimated_minutes INTEGER NOT NULL DEFAULT 10,
  steps_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workflow_runs (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES workflow_templates(id),
  board_id TEXT NOT NULL REFERENCES boards(id),
  status TEXT NOT NULL,
  triggered_by TEXT NOT NULL,
  summary TEXT NOT NULL,
  metrics_json TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT
);

CREATE TABLE IF NOT EXISTS board_items (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  provider_item_id TEXT NOT NULL,
  item_type TEXT NOT NULL,
  title TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  run_id TEXT REFERENCES workflow_runs(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_boards_workspace ON boards(workspace_id);
CREATE INDEX IF NOT EXISTS idx_runs_template ON workflow_runs(template_id);
CREATE INDEX IF NOT EXISTS idx_runs_board ON workflow_runs(board_id);
CREATE INDEX IF NOT EXISTS idx_items_run ON board_items(run_id);
CREATE INDEX IF NOT EXISTS idx_audit_workspace ON audit_events(workspace_id);

-- ---------------------------------------------------------------------------
-- Auth tables (v1.1 production wall).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS auth_tokens (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  prefix TEXT NOT NULL,
  digest TEXT NOT NULL,
  scopes_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  last_used_at TEXT,
  revoked_at TEXT,
  created_by TEXT NOT NULL DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS idx_tokens_prefix ON auth_tokens(prefix);
CREATE INDEX IF NOT EXISTS idx_tokens_workspace ON auth_tokens(workspace_id);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  external_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  received_at TEXT NOT NULL,
  processed_at TEXT,
  status TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  UNIQUE(source, external_id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_workspace ON webhook_deliveries(workspace_id);

-- v1.1: OAuth device-flow in-flight sessions.
CREATE TABLE IF NOT EXISTS oauth_device_flows (
  id              TEXT PRIMARY KEY,
  workspace_id    TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  client_id       TEXT NOT NULL,
  device_code     TEXT NOT NULL,
  user_code       TEXT NOT NULL,
  verification_uri TEXT NOT NULL,
  expires_at      TEXT NOT NULL,
  interval_sec    INTEGER NOT NULL DEFAULT 5,
  status         TEXT NOT NULL DEFAULT 'pending',
  credential_id  TEXT REFERENCES integration_credentials(id) ON DELETE SET NULL,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  last_polled_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_oauthflow_workspace ON oauth_device_flows(workspace_id);
