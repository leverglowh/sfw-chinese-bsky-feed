import SqliteDb from 'better-sqlite3'
import { Kysely, Migrator, SqliteDialect } from 'kysely'
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
    await db.deleteFrom('post')
      .where('indexedAt', '<', cutoffDate.toISOString())
      .execute();
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

export type Database = Kysely<DatabaseSchema>
