import "server-only";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const databaseGlobal = globalThis as typeof globalThis & {
  inhubflowDb?: Database.Database;
};

function openDatabase(): Database.Database {
  const databasePath = process.env.INHUBFLOW_DB_PATH
    ? path.resolve(/*turbopackIgnore: true*/ process.env.INHUBFLOW_DB_PATH)
    : path.join(process.cwd(), "data", "social-selling.db");
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const db = new Database(databasePath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  applyInitialSchema(db);
  ensureViralPostsSchema(db);
  ensureSignalMonitorsSchema(db);
  if (process.env.INHUBFLOW_DEMO_PERSISTENCE === "true") {
    const { seedDemoWorkspace } = require("./demo-seed") as typeof import("./demo-seed");
    seedDemoWorkspace(db);
  }
  return db;
}

function applyInitialSchema(db: Database.Database): void {
  const migration = db.prepare("SELECT version FROM app_schema_migrations WHERE version = 1").get();
  if (migration) return;

  db.transaction(() => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS workspace_members (
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('owner', 'admin', 'member')),
        PRIMARY KEY (workspace_id, user_id)
      );
      CREATE TABLE IF NOT EXISTS linkedin_accounts (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        owner_user_id TEXT NOT NULL,
        unipile_account_id TEXT,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'CONNECTING',
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (workspace_id, unipile_account_id)
      );
      CREATE TABLE IF NOT EXISTS leads (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        account_id TEXT REFERENCES linkedin_accounts(id) ON DELETE SET NULL,
        provider_id TEXT,
        profile_url TEXT,
        full_name TEXT NOT NULL,
        headline TEXT,
        source TEXT NOT NULL DEFAULT 'manual',
        stage TEXT NOT NULL DEFAULT 'captured',
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (workspace_id, provider_id)
      );
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        account_id TEXT NOT NULL REFERENCES linkedin_accounts(id) ON DELETE CASCADE,
        lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
        external_chat_id TEXT NOT NULL,
        last_message TEXT NOT NULL DEFAULT '',
        last_message_at TEXT NOT NULL DEFAULT (datetime('now')),
        unread INTEGER NOT NULL DEFAULT 0,
        UNIQUE (account_id, external_chat_id)
      );
      CREATE TABLE IF NOT EXISTS conversation_messages (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        external_message_id TEXT NOT NULL,
        direction TEXT NOT NULL CHECK(direction IN ('inbound', 'outbound')),
        sender_name TEXT,
        body TEXT NOT NULL DEFAULT '',
        sent_at TEXT NOT NULL,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        UNIQUE (workspace_id, external_message_id)
      );
      CREATE TABLE IF NOT EXISTS webhook_events (
        id TEXT PRIMARY KEY,
        workspace_id TEXT,
        provider TEXT NOT NULL,
        external_event_id TEXT,
        event_type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        result_json TEXT,
        status TEXT NOT NULL DEFAULT 'received' CHECK(status IN ('received', 'processed', 'ignored', 'failed')),
        attempts INTEGER NOT NULL DEFAULT 0,
        received_at TEXT NOT NULL DEFAULT (datetime('now')),
        processed_at TEXT,
        error_message TEXT
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_events_external_id
        ON webhook_events(provider, external_event_id) WHERE external_event_id IS NOT NULL;
      CREATE TABLE IF NOT EXISTS campaign_workflows (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        workflow_json TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS campaign_executions (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        workflow_id TEXT NOT NULL REFERENCES campaign_workflows(id) ON DELETE CASCADE,
        account_id TEXT NOT NULL REFERENCES linkedin_accounts(id) ON DELETE CASCADE,
        lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        state TEXT NOT NULL DEFAULT 'pending',
        current_node_id TEXT,
        next_step_at TEXT,
        history_json TEXT NOT NULL DEFAULT '[]',
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (workflow_id, lead_id)
      );
      CREATE TABLE IF NOT EXISTS campaign_execution_logs (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        execution_id TEXT REFERENCES campaign_executions(id) ON DELETE SET NULL,
        node_id TEXT,
        status TEXT NOT NULL,
        message TEXT NOT NULL,
        details_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS account_daily_pacing (
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        account_id TEXT NOT NULL REFERENCES linkedin_accounts(id) ON DELETE CASCADE,
        action_date TEXT NOT NULL,
        invitations_sent INTEGER NOT NULL DEFAULT 0,
        messages_sent INTEGER NOT NULL DEFAULT 0,
        profiles_visited INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (account_id, action_date)
      );
      CREATE INDEX IF NOT EXISTS idx_leads_workspace_stage ON leads(workspace_id, stage);
      CREATE INDEX IF NOT EXISTS idx_conversations_workspace_account ON conversations(workspace_id, account_id);
      CREATE INDEX IF NOT EXISTS idx_messages_conversation_time ON conversation_messages(conversation_id, sent_at);
      CREATE INDEX IF NOT EXISTS idx_webhook_workspace_received ON webhook_events(workspace_id, received_at);
      CREATE INDEX IF NOT EXISTS idx_executions_workspace_state ON campaign_executions(workspace_id, state);
    `);
    db.prepare("INSERT INTO app_schema_migrations(version) VALUES (1)").run();
  })();
}

function ensureViralPostsSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS viral_posts (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL DEFAULT 'default',
      title TEXT NOT NULL,
      format TEXT NOT NULL DEFAULT 'text',
      content TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      scheduled_at TEXT,
      published_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      target_account_id TEXT,
      target_language TEXT,
      linkedin_post_id TEXT,
      post_url TEXT,
      lead_magnet_keyword TEXT,
      auto_dm_enabled INTEGER NOT NULL DEFAULT 0,
      auto_dm_message TEXT,
      auto_like_comment INTEGER NOT NULL DEFAULT 1,
      metadata_json TEXT NOT NULL DEFAULT '{}'
    );
    CREATE INDEX IF NOT EXISTS idx_viral_posts_status_scheduled ON viral_posts(status, scheduled_at);
  `);
}

function ensureSignalMonitorsSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS signal_monitors (
      id TEXT PRIMARY KEY,
      level TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      leads_count INTEGER NOT NULL DEFAULT 0,
      last_scan_at TEXT,
      last_scan_at_iso TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      metadata_json TEXT NOT NULL DEFAULT '{}'
    );
    CREATE INDEX IF NOT EXISTS idx_signal_monitors_level_status ON signal_monitors(level, status);
  `);
}

export function getSocialSellingDb(): Database.Database {
  if (!databaseGlobal.inhubflowDb) databaseGlobal.inhubflowDb = openDatabase();
  return databaseGlobal.inhubflowDb;
}
