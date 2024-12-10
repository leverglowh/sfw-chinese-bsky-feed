import SqliteDb from 'better-sqlite3'
import { Kysely, Migrator, SqliteDialect, TableExpression } from 'kysely'
import { DatabaseSchema } from './schema'
import { migrationProvider } from './migrations'

export const createDb = (location: string): Database => {
  return new Kysely<DatabaseSchema>({
    dialect: new SqliteDialect({
      database: new SqliteDb(location),
    }),
  })
}

export const migrateToLatest = async (db: Database) => {
  const migrator = new Migrator({ db, provider: migrationProvider })
  const { error } = await migrator.migrateToLatest()
  if (error) throw error
}

export const deleteOldRecords = async (db: Database) => {
  // Delete posts older than 48 hours
  const cutoffDate = new Date(new Date().valueOf() - (48 * 24 * 3600 * 1000));

  try {
    const res = await db.deleteFrom('post')
      .where('indexedAt', '<', cutoffDate.toISOString())
      .execute();
    console.log(`Deleted ${res[0].numDeletedRows} old records`);
    countTable(db, 'post');
  } catch (error) {
    console.error('Error deleting old records:', error);
  }
}

export const countTable = async (db: Database, table: TableExpression<DatabaseSchema, never>) => {
  try {
    const count = await db.selectFrom(table)
      .select(db.fn.countAll().as('count'))
      .executeTakeFirstOrThrow();
    console.log('Posts in DB count: ', count.count);
    return count.count;
  } catch (error) {
    console.error('Error counting posts:', error);
  }
}

export const refreshBlockedUserList = async (db: Database) => {
  const blocklistRes: any = await fetch(`https://api.bsky.app/xrpc/app.bsky.graph.getList?list=${process.env.BLOCK_LIST_URI}`).then(res => res.json());
  const blockedUsers = blocklistRes?.items?.map((item: any) => item.subject.did);
  if (!blockedUsers) {
    console.error('Error fetching blocked users list');
    return
  }
  const res = await saveBlockedAuthors(db, blockedUsers)
  console.log(`Blocked users list refreshed, inserted ${res?.[0]?.numInsertedOrUpdatedRows}`);
}


export const saveBlockedAuthors = async (db: Database, dids: string[]) => {
  try {
    return await db.insertInto('blocked_authors')
      .values(dids.map(did => ({ did })))
      .onConflict((oc) => oc.doNothing())
      .execute();
  } catch (error) {
    console.error('Error saving blocked authors:', error);
  }
}

export type Database = Kysely<DatabaseSchema>
