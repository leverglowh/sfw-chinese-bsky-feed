export type DatabaseSchema = {
  post: Post
  sub_state: SubState
  blocked_authors: BlockedAuthors
}

export type Post = {
  uri: string
  cid: string
  indexedAt: string
  authorDid: string
  hasEmbed: number
}

export type SubState = {
  service: string
  cursor: number
}

export type BlockedAuthors = {
  did: string
}
