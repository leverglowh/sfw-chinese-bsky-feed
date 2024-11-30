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
}

export type SubState = {
  service: string
  cursor: number
}

export type BlockedAuthors = {
  did: string
}
