import { EventEmitter } from 'events';

export interface MockRow {
  [key: string]: any;
}

export class MockPgClient extends EventEmitter {
  public inTransaction = false;
  public transactionAborted = false;
  public tenantContext: string | null = null;
  public queryLog: Array<{ sql: string; params?: any[] }> = [];

  constructor(private tables: Map<string, MockRow[]>) {
    super();
  }

  async query(sql: string, params?: any[]): Promise<{ rows: MockRow[]; rowCount: number }> {
    this.queryLog.push({ sql, params });
    const trimmed = sql.trim().toUpperCase();

    if (trimmed.startsWith('BEGIN')) {
      this.inTransaction = true;
      this.transactionAborted = false;
      return { rows: [], rowCount: 0 };
    }

    if (trimmed.startsWith('COMMIT')) {
      if (this.transactionAborted) {
        throw new Error('current transaction is aborted, commands ignored until end of transaction block');
      }
      this.inTransaction = false;
      return { rows: [], rowCount: 0 };
    }

    if (trimmed.startsWith('ROLLBACK')) {
      this.inTransaction = false;
      this.transactionAborted = false;
      return { rows: [], rowCount: 0 };
    }

    if (trimmed.includes("SET_CONFIG('APP.CURRENT_TENANT'")) {
      this.tenantContext = params && params[0] ? String(params[0]) : null;
      return { rows: [{ set_config: this.tenantContext }], rowCount: 1 };
    }

    if (trimmed.includes("CURRENT_SETTING('APP.CURRENT_TENANT'")) {
      return { rows: [{ current_setting: this.tenantContext, tenant_id: this.tenantContext }], rowCount: 1 };
    }

    // Simple table lookup matching for mocks
    for (const [tableName, rows] of this.tables.entries()) {
      if (sql.toLowerCase().includes(tableName.toLowerCase())) {
        let filtered = [...rows];
        // Apply mock RLS if tenantContext is set and table has tenant_id
        if (this.tenantContext && filtered.length > 0 && 'tenant_id' in filtered[0]) {
          filtered = filtered.filter((r) => r.tenant_id === this.tenantContext);
        }
        return { rows: filtered, rowCount: filtered.length };
      }
    }

    return { rows: [], rowCount: 0 };
  }

  release(destroy?: boolean): void {
    // client released back to pool
  }
}

export class MockPgPool extends EventEmitter {
  public tables = new Map<string, MockRow[]>();
  public client = new MockPgClient(this.tables);
  public isEnded = false;

  constructor(initialData: Record<string, MockRow[]> = {}) {
    super();
    for (const [table, rows] of Object.entries(initialData)) {
      this.tables.set(table, [...rows]);
    }
  }

  setTableData(table: string, rows: MockRow[]): void {
    this.tables.set(table, [...rows]);
  }

  async connect(): Promise<MockPgClient> {
    return this.client;
  }

  async query(sql: string, params?: any[]): Promise<{ rows: MockRow[]; rowCount: number }> {
    return this.client.query(sql, params);
  }

  async end(): Promise<void> {
    this.isEnded = true;
  }
}

