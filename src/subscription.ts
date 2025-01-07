import {
  OutputSchema as RepoEvent,
  isCommit,
} from './lexicon/types/com/atproto/sync/subscribeRepos'
import { koKeywords, koLabels, koTags } from './util/constants'
import { FirehoseSubscriptionBase, getOpsByType } from './util/subscription'

export class FirehoseSubscription extends FirehoseSubscriptionBase {
  async handleEvent(evt: RepoEvent) {
    if (!isCommit(evt)) return

    const ops = await getOpsByType(evt)

    // This logs the text of every post off the firehose.
    // Just for fun :)
    // Delete before actually using
    // for (const post of ops.posts.creates) {
    //   console.log(post.record.text)
    // }
    const authorsToBlock: Array<{ did : string }> = []
    const postsToDelete = ops.posts.deletes.map((del) => del.uri)
    const postsToCreate = ops.posts.creates
      .filter((create) => {
        if (!create.record.langs?.includes('zh')) return false

        if (create.record.reply !== undefined) return false

        if ((create.record.labels?.values as any[])?.some((label) => koLabels.includes(label.val))) return false

        const allKoTags = [...koTags, ...koKeywords]
        const isNSFWTag = allKoTags.some(tag => create.record.text?.includes(`#${tag}`) || create.record.tags?.includes(tag))
        if (isNSFWTag) {
          // console.log(`Blocked post with NSFW tag: ${create.record.text}, author: ${create.author}`);
          authorsToBlock.push({ did: create.author })
          return false;
        }

        if (koKeywords.some(keyw => create.record.text.includes(keyw))) return false

        // console.log(`${create.record.text} - embed = ${create.record.embed ? 1 : 0}`);
        return true;
      })
      .map((create) => {
        return {
          uri: create.uri,
          cid: create.cid,
          indexedAt: new Date().toISOString(),
          authorDid: create.author,
          hasEmbed: create.record.embed ? 1 : 0,
        }
      })

    if (postsToDelete.length > 0) {
      await this.db
        .deleteFrom('post')
        .where('uri', 'in', postsToDelete)
        .execute()
    }
    if (postsToCreate.length > 0) {
      await this.db
        .insertInto('post')
        .values(postsToCreate)
        .onConflict((oc) => oc.doNothing())
        .execute()
    }

    if (authorsToBlock.length > 0) {
      const res = await this.db
        .insertInto('blocked_authors')
        .values(authorsToBlock)
        .onConflict((oc) => oc.doNothing())
        .execute()
      console.log(`Blocked ${res[0].numInsertedOrUpdatedRows} authors`)
    }
  }
}
