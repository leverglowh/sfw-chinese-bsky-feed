import SqliteDb from 'better-sqlite3'
import { Kysely, Migrator, SqliteDialect } from 'kysely'
import { DatabaseSchema } from './schema'
import { migrationProvider } from './migrations'
import { BskyAgent } from '@atproto/api'

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
    console.log(`Deleted ${res.length} old records`);
    countPosts(db);
  } catch (error) {
    console.error('Error deleting old records:', error);
  }
}

export const countPosts = async (db: Database) => {
  try {
    const count = await db.selectFrom('post')
      .select(db.fn.countAll().as('count'))
      .executeTakeFirstOrThrow();
    console.log('Posts in DB count: ', count.count);
    return count.count;
  } catch (error) {
    console.error('Error counting posts:', error);
  }
}

export const refreshBlockedUserList = async (db: Database) => {
  if (!process.env.HANDLE || !process.env.PASSWORD || !process.env.BLOCK_LIST_URI) {
    console.error('Missing environment variables for blocklist refresh');
    return;
  }

  const agent = new BskyAgent({ service: 'https://bsky.social' })
  await agent.login({ identifier: process.env.HANDLE, password: process.env.PASSWORD })
  
  const blocklistRes = await agent.app.bsky.graph.getList({
    list: process.env.BLOCK_LIST_URI
  })
  const blockedUsers = blocklistRes.data.items.map(i => i.subject.did);

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
