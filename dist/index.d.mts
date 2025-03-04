import TiDBCloud from '@tidbcloud/serverless';
import { SqlConnection, ConnectionInfo, TransactionContext, SqlQueryable, SqlQuery, SqlResultSet } from '@prisma/driver-adapter-utils';

declare class TiDBCloudQueryable<ClientT extends TiDBCloud.Connection | TiDBCloud.Tx> implements SqlQueryable {
    protected client: ClientT;
    readonly provider = "mysql";
    readonly adapterName: string;
    constructor(client: ClientT);
    /**
     * Execute a query given as SQL, interpolating the given parameters.
     */
    queryRaw(query: SqlQuery): Promise<SqlResultSet>;
    /**
     * Execute a query given as SQL, interpolating the given parameters and
     * returning the number of affected rows.
     * Note: Queryable expects a u64, but napi.rs only supports u32.
     */
    executeRaw(query: SqlQuery): Promise<number>;
    /**
     * Run a query against the database, returning the result set.
     * Should the query fail due to a connection error, the connection is
     * marked as unhealthy.
     */
    private performIO;
}
declare class PrismaTiDBCloud extends TiDBCloudQueryable<TiDBCloud.Connection> implements SqlConnection {
    constructor(client: TiDBCloud.Connection);
    executeScript(script: string): Promise<void>;
    getConnectionInfo(): ConnectionInfo;
    transactionContext(): Promise<TransactionContext>;
    dispose(): Promise<void>;
}

export { PrismaTiDBCloud };
