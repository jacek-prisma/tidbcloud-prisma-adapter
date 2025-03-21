// src/tidbcloud.ts
import { Debug } from "@prisma/driver-adapter-utils";

// src/conversion.ts
import { ColumnTypeEnum } from "@prisma/driver-adapter-utils";
function fieldToColumnType(field) {
  switch (field) {
    case "TINYINT":
    case "UNSIGNED TINYINT":
    case "SMALLINT":
    case "UNSIGNED SMALLINT":
    case "MEDIUMINT":
    case "UNSIGNED MEDIUMINT":
    case "INT":
    case "YEAR":
      return ColumnTypeEnum.Int32;
    case "UNSIGNED INT":
    case "BIGINT":
    case "UNSIGNED BIGINT":
      return ColumnTypeEnum.Int64;
    case "FLOAT":
      return ColumnTypeEnum.Float;
    case "DOUBLE":
      return ColumnTypeEnum.Double;
    case "TIMESTAMP":
    case "DATETIME":
      return ColumnTypeEnum.DateTime;
    case "DATE":
      return ColumnTypeEnum.Date;
    case "TIME":
      return ColumnTypeEnum.Time;
    case "DECIMAL":
      return ColumnTypeEnum.Numeric;
    case "CHAR":
    case "TINYTEXT":
    case "TEXT":
    case "MEDIUMTEXT":
    case "LONGTEXT":
    case "VARCHAR":
      return ColumnTypeEnum.Text;
    case "JSON":
      return ColumnTypeEnum.Json;
    case "TINYBLOB":
    case "BLOB":
    case "MEDIUMBLOB":
    case "LONGBLOB":
    case "BINARY":
    case "VARBINARY":
    case "BIT":
      return ColumnTypeEnum.Bytes;
    case "SET":
      return ColumnTypeEnum.Set;
    case "ENUM":
      return ColumnTypeEnum.Enum;
    case "NULL":
      return ColumnTypeEnum.Int32;
    default:
      throw new Error(`Unsupported column type: ${field}`);
  }
}
var customDecoder = {
  BINARY: (value) => Array.from(hexToUint8Array(value)),
  VARBINARY: (value) => Array.from(hexToUint8Array(value)),
  BLOB: (value) => Array.from(hexToUint8Array(value)),
  LONGBLOB: (value) => Array.from(hexToUint8Array(value)),
  TINYBLOB: (value) => Array.from(hexToUint8Array(value)),
  MEDIUMBLOB: (value) => Array.from(hexToUint8Array(value)),
  BIT: (value) => Array.from(hexToUint8Array(value))
};
function hexToUint8Array(hexString) {
  const uint8Array = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < hexString.length; i += 2) {
    uint8Array[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
  }
  return uint8Array;
}

// package.json
var name = "@tidbcloud/prisma-adapter";

// src/tidbcloud.ts
import { connect } from "@tidbcloud/serverless";
var debug = Debug("prisma:driver-adapter:tidbcloud");
var defaultDatabase = "test";
var TiDBCloudQueryable = class {
  constructor(client) {
    this.client = client;
  }
  provider = "mysql";
  adapterName = name;
  /**
   * Execute a query given as SQL, interpolating the given parameters.
   */
  async queryRaw(query) {
    const tag = "[js::query_raw]";
    debug(`${tag} %O`, query);
    const result = await this.performIO(query);
    const fields = result.types;
    const rows = result.rows;
    const lastInsertId = result.lastInsertId?.toString();
    const columnNames = Object.keys(fields);
    const columnRawTypes = Object.values(fields);
    const resultSet = {
      columnNames,
      columnTypes: columnRawTypes.map(
        (field) => fieldToColumnType(field)
      ),
      rows,
      lastInsertId
    };
    return resultSet;
  }
  /**
   * Execute a query given as SQL, interpolating the given parameters and
   * returning the number of affected rows.
   * Note: Queryable expects a u64, but napi.rs only supports u32.
   */
  async executeRaw(query) {
    const tag = "[js::execute_raw]";
    debug(`${tag} %O`, query);
    const result = await this.performIO(query);
    const rowsAffected = result.rowsAffected;
    return rowsAffected;
  }
  /**
   * Run a query against the database, returning the result set.
   * Should the query fail due to a connection error, the connection is
   * marked as unhealthy.
   */
  async performIO(query) {
    const { sql, args: values } = query;
    try {
      const result = await this.client.execute(sql, values, {
        arrayMode: true,
        fullResult: true,
        decoders: customDecoder
      });
      return result;
    } catch (e) {
      const error = e;
      debug("Error in performIO: %O", error);
      throw error;
    }
  }
};
var TiDBCloudTransaction = class extends TiDBCloudQueryable {
  constructor(tx, options) {
    super(tx);
    this.options = options;
  }
  finished = false;
  async commit() {
    debug(`[js::commit]`);
    this.finished = true;
    await this.client.commit();
  }
  async rollback() {
    debug(`[js::rollback]`);
    this.finished = true;
    await this.client.rollback();
  }
  dispose() {
    if (!this.finished) {
      this.rollback().catch(console.error);
    }
  }
};
var PrismaTiDBCloudAdapter = class extends TiDBCloudQueryable {
  constructor(client) {
    super(client);
  }
  async executeScript(script) {
    try {
      await this.client.execute(script);
    } catch (e) {
      const error = e;
      debug("Error in executeScript: %O", error);
      throw error;
    }
  }
  getConnectionInfo() {
    const config = this.client.getConfig();
    const dbName = config.database ? config.database : defaultDatabase;
    return {
      schemaName: dbName
    };
  }
  async startTransaction() {
    const options = {
      usePhantomQuery: true
    };
    const tag = "[js::startTransaction]";
    debug("%s option: %O", tag, options);
    const tx = await this.client.begin();
    return new TiDBCloudTransaction(tx, options);
  }
  async dispose() {
  }
};
var PrismaTiDBCloudAdapterFactory = class {
  constructor(config) {
    this.config = config;
  }
  provider = "mysql";
  adapterName = name;
  connect() {
    return Promise.resolve(new PrismaTiDBCloudAdapter(connect(this.config)));
  }
};
export {
  PrismaTiDBCloudAdapterFactory as PrismaTiDBCloud
};
