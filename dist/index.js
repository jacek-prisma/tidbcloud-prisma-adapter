"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  PrismaTiDBCloud: () => PrismaTiDBCloud
});
module.exports = __toCommonJS(src_exports);

// src/tidbcloud.ts
var import_driver_adapter_utils2 = require("@prisma/driver-adapter-utils");

// src/conversion.ts
var import_driver_adapter_utils = require("@prisma/driver-adapter-utils");
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
      return import_driver_adapter_utils.ColumnTypeEnum.Int32;
    case "UNSIGNED INT":
    case "BIGINT":
    case "UNSIGNED BIGINT":
      return import_driver_adapter_utils.ColumnTypeEnum.Int64;
    case "FLOAT":
      return import_driver_adapter_utils.ColumnTypeEnum.Float;
    case "DOUBLE":
      return import_driver_adapter_utils.ColumnTypeEnum.Double;
    case "TIMESTAMP":
    case "DATETIME":
      return import_driver_adapter_utils.ColumnTypeEnum.DateTime;
    case "DATE":
      return import_driver_adapter_utils.ColumnTypeEnum.Date;
    case "TIME":
      return import_driver_adapter_utils.ColumnTypeEnum.Time;
    case "DECIMAL":
      return import_driver_adapter_utils.ColumnTypeEnum.Numeric;
    case "CHAR":
    case "TINYTEXT":
    case "TEXT":
    case "MEDIUMTEXT":
    case "LONGTEXT":
    case "VARCHAR":
      return import_driver_adapter_utils.ColumnTypeEnum.Text;
    case "JSON":
      return import_driver_adapter_utils.ColumnTypeEnum.Json;
    case "TINYBLOB":
    case "BLOB":
    case "MEDIUMBLOB":
    case "LONGBLOB":
    case "BINARY":
    case "VARBINARY":
    case "BIT":
      return import_driver_adapter_utils.ColumnTypeEnum.Bytes;
    case "SET":
      return import_driver_adapter_utils.ColumnTypeEnum.Set;
    case "ENUM":
      return import_driver_adapter_utils.ColumnTypeEnum.Enum;
    case "NULL":
      return import_driver_adapter_utils.ColumnTypeEnum.Int32;
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
var debug = (0, import_driver_adapter_utils2.Debug)("prisma:driver-adapter:tidbcloud");
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
var TiDBCloudTransactionContext = class extends TiDBCloudQueryable {
  constructor(connect) {
    super(connect);
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
};
var PrismaTiDBCloud = class extends TiDBCloudQueryable {
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
  async transactionContext() {
    return new TiDBCloudTransactionContext(this.client);
  }
  async dispose() {
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  PrismaTiDBCloud
});
