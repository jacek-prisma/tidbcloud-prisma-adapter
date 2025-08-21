import * as TiDBCloud from '@tidbcloud/serverless';
import { SqlDriverAdapterFactory, SqlDriverAdapter } from '@prisma/driver-adapter-utils';

declare class PrismaTiDBCloudAdapterFactory implements SqlDriverAdapterFactory {
    private readonly config;
    readonly provider = "mysql";
    readonly adapterName: string;
    constructor(config: TiDBCloud.Config);
    connect(): Promise<SqlDriverAdapter>;
}

export { PrismaTiDBCloudAdapterFactory as PrismaTiDBCloud };
