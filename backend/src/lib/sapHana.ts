// eslint-disable-next-line @typescript-eslint/no-require-imports
const sql = require("mssql");

export interface SapConnectionParams {
  serverUrl: string;
  companyDB: string;
  user: string;
  password: string;
}

function parseServerUrl(serverUrl: string): { server: string; port: number } {
  const clean = serverUrl.trim().replace(/^https?:\/\//, "");
  const parts = clean.split(":");
  const server = parts[0] || "localhost";
  const port = parseInt(parts[1], 10) || 1433;
  return { server, port };
}

function getConfig(params: SapConnectionParams) {
  const { server, port } = parseServerUrl(params.serverUrl);
  return {
    server,
    port,
    database: params.companyDB,
    user: params.user,
    password: params.password,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      connectTimeout: 10000,
      requestTimeout: 15000,
    },
  };
}

export async function testConnection(params: SapConnectionParams): Promise<{ success: boolean; message: string }> {
  let pool: any = null;
  try {
    pool = await sql.connect(getConfig(params));
    const result = await pool.request().query(
      `SELECT DB_NAME() AS dbName, @@VERSION AS version`
    );
    const row = result.recordset[0];
    pool.close();
    return {
      success: true,
      message: `Connexion réussie à ${row.dbName} (SQL Server)`,
    };
  } catch (error: any) {
    if (pool) pool.close().catch(() => {});
    return { success: false, message: `Échec de connexion: ${error.message}` };
  }
}

export async function executeQuery(
  params: SapConnectionParams,
  query: string
): Promise<any[]> {
  const pool = await sql.connect(getConfig(params));
  try {
    const result = await pool.request().query(query);
    return result.recordset || [];
  } finally {
    pool.close().catch(() => {});
  }
}

export function closeClient(): void {}
