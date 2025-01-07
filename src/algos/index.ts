import { AppContext } from '../config'
import {
  QueryParams,
  OutputSchema as AlgoOutput,
} from '../lexicon/types/app/bsky/feed/getFeedSkeleton'
import * as chineseSfw from './chinese-sfw'
import * as chineseText from './chinese-text'

type AlgoHandler = (ctx: AppContext, params: QueryParams) => Promise<AlgoOutput>

const algos: Record<string, AlgoHandler> = {
  [chineseSfw.shortname]: chineseSfw.handler,
  [chineseText.shortname]: chineseText.handler,
}

export default algos
