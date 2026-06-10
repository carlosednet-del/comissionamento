/**
 * migrate-data.mjs
 * Copia dados da origem (Supabase / outro Postgres) para o banco alvo.
 *
 * Uso:
 *   SRC_URL="postgresql://..." DST_URL="postgresql://..." DST_SCHEMA="comissionamento" node scripts/migrate-data.mjs
 *
 * Ordem respeitando FK:
 *   1. users
 *   2. demands  (FK → users)
 *   3. demand_evidences (FK → demands, users)
 *   4. audit_logs (FK → users)
 *   5. hourly_rate_configs / combined_factor_configs / deflator_configs (sem FK)
 *
 * Estratégia: upsert (INSERT … ON CONFLICT DO UPDATE) — seguro para reexecutar.
 */

import pg from 'pg';
const { Client } = pg;

const SRC_URL    = process.env.SRC_URL    || 'postgresql://postgres.PROJ:PASS@aws-1-us-east-1.pooler.supabase.com:5432/postgres';
const DST_URL    = process.env.DST_URL    || 'postgresql://n8n:n8n_dev_pass@68.183.26.2:5432/n8n';
const DST_SCHEMA = process.env.DST_SCHEMA || 'comissionamento';

const SRC = new Client({ connectionString: SRC_URL, ssl: { rejectUnauthorized: false } });
const DST = new Client({ connectionString: DST_URL });

function log(msg) { console.log(`  ${msg}`); }

async function copyTable(srcClient, dstClient, srcTable, dstSchema, dstTable, conflictKey) {
  const { rows } = await srcClient.query(`SELECT * FROM public."${srcTable}" ORDER BY "createdAt" ASC NULLS LAST`);
  if (rows.length === 0) { log(`${dstTable}: 0 linhas (vazio na origem)`); return; }

  const cols = Object.keys(rows[0]);
  let done = 0;
  for (const row of rows) {
    const values = cols.map(c => row[c]);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
    const colList = cols.map(c => `"${c}"`).join(', ');
    const updateSet = cols.filter(c => c !== conflictKey).map(c => `"${c}" = EXCLUDED."${c}"`).join(', ');
    const sql = `INSERT INTO "${dstSchema}"."${dstTable}" (${colList}) VALUES (${placeholders}) ON CONFLICT ("${conflictKey}") DO UPDATE SET ${updateSet}`;
    await dstClient.query(sql, values).catch(e => log(`ERRO [${row[conflictKey]}]: ${e.message}`));
    done++;
  }
  log(`${dstTable}: ${done} linha(s) ✓`);
}

async function copyConfigTable(srcClient, dstClient, srcTable, dstSchema, dstTable, conflictCols) {
  const { rows } = await srcClient.query(`SELECT * FROM public."${srcTable}"`);
  if (rows.length === 0) { log(`${dstTable}: 0 linhas`); return; }
  const cols = Object.keys(rows[0]);
  let done = 0;
  for (const row of rows) {
    const values = cols.map(c => row[c]);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
    const colList = cols.map(c => `"${c}"`).join(', ');
    const updateSet = cols.filter(c => !conflictCols.includes(c)).map(c => `"${c}" = EXCLUDED."${c}"`).join(', ');
    const conflict = conflictCols.map(c => `"${c}"`).join(', ');
    const sql = `INSERT INTO "${dstSchema}"."${dstTable}" (${colList}) VALUES (${placeholders}) ON CONFLICT (${conflict}) DO UPDATE SET ${updateSet}`;
    await dstClient.query(sql, values).catch(e => log(`ERRO: ${e.message}`));
    done++;
  }
  log(`${dstTable}: ${done} linha(s) ✓`);
}

async function main() {
  console.log('\n=== Migração de dados ===\n');
  await SRC.connect(); console.log('Origem: conectado ✓');
  await DST.connect(); console.log(`Destino (${DST_SCHEMA}): conectado ✓\n`);

  console.log('► users');         await copyTable(SRC, DST, 'users',           DST_SCHEMA, 'users',           'id');
  console.log('► demands');       await copyTable(SRC, DST, 'demands',         DST_SCHEMA, 'demands',         'id');
  console.log('► demand_evidences'); await copyTable(SRC, DST, 'demand_evidences', DST_SCHEMA, 'demand_evidences', 'id');
  console.log('► audit_logs');    await copyTable(SRC, DST, 'audit_logs',      DST_SCHEMA, 'audit_logs',      'id');

  console.log('► hourly_rate_configs');
  await copyConfigTable(SRC, DST, 'hourly_rate_configs',   DST_SCHEMA, 'hourly_rate_configs',   ['profile']);
  console.log('► combined_factor_configs');
  await copyConfigTable(SRC, DST, 'combined_factor_configs', DST_SCHEMA, 'combined_factor_configs', ['complexity', 'roi']);
  console.log('► deflator_configs');
  await copyConfigTable(SRC, DST, 'deflator_configs',       DST_SCHEMA, 'deflator_configs',       ['daysLate']);

  console.log('\n─── Resumo ───');
  for (const t of ['users','demands','demand_evidences','audit_logs','hourly_rate_configs','combined_factor_configs','deflator_configs']) {
    const r = await DST.query(`SELECT COUNT(*) FROM "${DST_SCHEMA}"."${t}"`);
    console.log(`  ${t}: ${r.rows[0].count}`);
  }
  await SRC.end(); await DST.end();
  console.log('\n=== Concluído ===\n');
}

main().catch(e => { console.error('ERRO FATAL:', e.message); process.exit(1); });
