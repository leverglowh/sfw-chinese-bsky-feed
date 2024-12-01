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
        const isChinese = create.record.langs?.includes('zh');
        if (!isChinese) return false;

        const isReply = create.record.reply !== undefined;
        if (isReply) return false;

        const isLabeledNSFW = (create.record.labels?.values as any[])?.some((label) => koLabels.includes(label.val))
        if (isLabeledNSFW) return false;

        const isNSFWContent =
          koKeywords.some(keyw => create.record.text.includes(keyw)) ||
          koTags.some(tag => create.record.text?.includes(`#${tag}`)) ||
          koTags.some(tag => create.record.tags?.includes(tag))
        if (isNSFWContent) {
          authorsToBlock.push({ did: create.author })
          return false;
        }

        // const isAccepted = isChinese && !isLabeledNSFW && !isNSFWContent && !isReply;
        // if (isAccepted) {
        //   console.log(create.record.text)
        // }
        return true;
      })
      .map((create) => {
        // map alf-related posts to a db row
        return {
          uri: create.uri,
          cid: create.cid,
          indexedAt: new Date().toISOString(),
          authorDid: create.author,
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
