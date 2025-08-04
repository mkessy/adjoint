This file is a merged representation of the entire codebase, combined into a single document by Repomix.

================================================================
File Summary
================================================================

## Purpose:

This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format:

The content is organized as follows:

1. This summary section
2. Repository information
3. Directory structure
4. Multiple file entries, each consisting of:
   a. A separator line (================)
   b. The file path (File: path/to/file)
   c. Another separator line
   d. The full contents of the file
   e. A blank line

## Usage Guidelines:

- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes:

- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded

## Additional Info:

================================================================
Directory Structure
================================================================
.github/
workflows/
main.yml
src/
Domain/
Quality.ts
QualityGroup.ts
SourceStream.ts
VideoQuery.ts
Sources/
1337x.ts
All.ts
Eztv.ts
Nyaa.ts
Rargb.ts
Tpb.ts
Yts.ts
Addon.ts
Cinemeta.ts
main.ts
Persistence.ts
RealDebrid.ts
Sources.ts
Stremio.ts
TorrentMeta.ts
Tracing.ts
Tvdb.ts
Utils.ts
.dockerignore
.envrc
.gitignore
.prettierrc.json
Dockerfile
flake.lock
flake.nix
LICENSE
package.json
README.md
tsconfig.json
tsup.config.ts

================================================================
Files
================================================================

================
File: .github/workflows/main.yml
================
name: Docker

on:
push:
branches: - main

jobs:
build:
runs-on: ubuntu-latest
steps: - uses: actions/checkout@v2

      - name: Docker Login
        uses: docker/login-action@v1.10.0
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Docker Metadata action
        uses: docker/metadata-action@v3.5.0
        id: meta
        with:
          images: timsmart/stremio-effect

      - name: Build and push Docker images
        uses: docker/build-push-action@v2.7.0
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}

================
File: src/Domain/Quality.ts
================
import { Order as Order\_ } from "effect/data"

const priorities = [
["3D", 0],
["2160p HDR", 1],
["2160p", 2],
["1080p", 3],
["720p", 4],
["480p", 5],
] as const

const priority = (quality: string) =>
priorities.find(([q]) => quality.startsWith(q))?.[1] ?? priorities.length

export const Order = Order\_.make<string>((a, b) => {
const aPriority = priority(a)
const bPriority = priority(b)
return aPriority < bPriority ? -1 : aPriority > bPriority ? 1 : 0
})

================
File: src/Domain/QualityGroup.ts
================
import { SourceStream } from "./SourceStream.js"

export interface QualityGroup extends Record<string, Array<SourceStream>> {}

export const empty = (): QualityGroup => ({
"3D": [],
"2160p HDR": [],
"2160p": [],
"1080p": [],
"720p": [],
"480p": [],
})

export const unsafeAdd = (
self: QualityGroup,
stream: SourceStream,
): QualityGroup => {
if (self[stream.quality] === undefined) {
self[stream.quality] = [stream]
} else if (self[stream.quality].length < 3) {
self[stream.quality].push(stream)
}
return self
}

export const hasEnough = (self: QualityGroup): boolean => {
return (
(self["2160p HDR"].length >= 2 &&
self["2160p"].length >= 3 &&
self["1080p"].length >= 3) ||
Object.values(self).flat().length >= 9
)
}

================
File: src/Domain/SourceStream.ts
================
import type _ as Stremio from "stremio-addon-sdk"
import { bytesToSize, qualityFromTitle } from "../Utils.js"
import _ as Quality from "./Quality.js"
import { Schema } from "effect/schema"
import { Data, Order } from "effect/data"

export class SourceStream extends Schema.Class<SourceStream>("SourceStream")({
\_tag: Schema.tag("SourceStream"),
source: Schema.String,
title: Schema.String,
infoHash: Schema.String,
magnetUri: Schema.String,
quality: Schema.String,
seeds: Schema.Number,
peers: Schema.Number,
sizeBytes: Schema.optional(Schema.Number),
sizeDisplay: Schema.optional(Schema.String),
url: Schema.optional(Schema.String),
verified: Schema.optional(Schema.Boolean),
}) {
static Array = Schema.Array(this)

static Order = Order.struct({
quality: Quality.Order,
seeds: Order.reverse(Order.number),
})

get sizeFormatted() {
if (this.sizeBytes) {
return bytesToSize(this.sizeBytes)
} else if (this.sizeDisplay) {
return this.sizeDisplay
}
return "0B"
}

get qualityFormatted() {
switch (this.quality) {
case "2160p HDR":
return "4K HDR"
case "2160p":
return "4K"
default:
return this.quality
}
}

get asStremio(): Stremio.Stream {
return {
url: this.url,
infoHash: this.infoHash,
title: `${this.sizeFormatted}  ⬆️ ${this.seeds}`,
name: `${this.qualityFormatted}${this.url ? ` ✨` : ""}`,
behaviorHints: {
bingeGroup: `effect-${this.quality}`,
} as any,
}
}
}

export class SourceStreamWithFile extends SourceStream.extend<SourceStreamWithFile>(
"SourceStreamWithFile",
)({
fileNumber: Schema.Number,
}) {}

export class SourceSeason extends Data.TaggedClass("SourceSeason")<{
source: string
title: string
infoHash: string
magnetUri: string
seeds: number
peers: number
verified?: boolean
}> {
readonly quality = qualityFromTitle(this.title)
}

================
File: src/Domain/VideoQuery.ts
================
import { Exit } from "effect"
import { Data, Option, Predicate } from "effect/data"
import { PrimaryKey } from "effect/interfaces"

export class SeriesQuery extends Data.TaggedClass("SeriesQuery")<{
readonly title: string
readonly season: number
readonly episode: number
}> {
get titleMatcher() {
return Option.some(
episodeTitleMatcher(formatEpisode(this.season, this.episode)),
)
}
get asQuery() {
return `${this.title} ${formatEpisode(this.season, this.episode)}`
}
}

export class AbsoluteSeriesQuery extends Data.TaggedClass(
"AbsoluteSeriesQuery",
)<{
readonly title: string
readonly number: number
}> {
timeToLive(exit: Exit.Exit<ReadonlyArray<any>, any>) {
if (exit.\_tag === "Failure") return "1 minute"
return exit.value.length > 0 ? "1 day" : "1 hour"
}
get numberPadded() {
return this.number.toString().padStart(2, "0")
}
get titleMatcher() {
return Option.some(episodeTitleMatcher(this.numberPadded))
}
get asQuery() {
return `${this.title} ${this.numberPadded}`
}
[PrimaryKey.symbol]() {
return `${this.title}/${this.number}`
}
// get [Schema.symbolWithResult]() {
// return {
// success: SourceStream.Array,
// failure: Schema.Never,
// }
// }
}

export class ImdbSeriesQuery extends Data.TaggedClass("ImdbSeriesQuery")<{
readonly imdbId: string
readonly season: number
readonly episode: number
}> {
get titleMatcher() {
return Option.some(
episodeTitleMatcher(formatEpisode(this.season, this.episode)),
)
}
get asQuery() {
return this.imdbId
}
}

export class ImdbAbsoluteSeriesQuery extends Data.TaggedClass(
"ImdbAbsoluteSeriesQuery",
)<{
readonly imdbId: string
readonly number: number
}> {
get titleMatcher() {
return Option.some(episodeTitleMatcher(this.number.toString()))
}
get asQuery() {
return this.imdbId
}
}

export class SeasonQuery extends Data.TaggedClass("SeasonQuery")<{
readonly title: string
readonly season: number
readonly episode: number
readonly seasonString: string
}> {
static variants = (props: {
readonly title: string
readonly season: number
readonly episode: number
}) => [
new SeasonQuery({
...props,
seasonString: seasonString(props.season),
}),
new SeasonQuery({
...props,
seasonString: `Season ${props.season}`,
}),
new SeasonQuery({
...props,
seasonString: "Complete",
}),
]

get asQuery() {
return `${this.title} ${this.seasonString}`
}
get titleMatcher() {
return Option.some(episodeTitleMatcher(this.seasonString))
}
get seriesQuery() {
return new SeriesQuery({
title: this.title,
season: this.season,
episode: this.episode,
})
}
}

export class ImdbSeasonQuery extends Data.TaggedClass("ImdbSeasonQuery")<{
readonly imdbId: string
readonly season: number
readonly episode: number
}> {
get titleMatcher() {
return Option.some(seasonTitleMatcher(this.season))
}
get asQuery() {
return this.imdbId
}
get seriesQuery() {
return new ImdbSeriesQuery({
imdbId: this.imdbId,
season: this.season,
episode: this.episode,
})
}
}

export class MovieQuery extends Data.TaggedClass("MovieQuery")<{
readonly title: string
}> {
get asQuery() {
return this.title
}
get titleMatcher() {
return Option.none()
}
}

export class ImdbMovieQuery extends Data.TaggedClass("ImbdMovieQuery")<{
readonly imdbId: string
}> {
get asQuery() {
return this.imdbId
}
get titleMatcher() {
return Option.none()
}
}

export class ChannelQuery extends Data.TaggedClass("ChannelQuery")<{
readonly id: string
}> {
get asQuery() {
return this.id
}
get titleMatcher() {
return Option.none()
}
}

export class ImdbTvQuery extends Data.TaggedClass("TvQuery")<{
readonly imdbId: string
}> {
get asQuery() {
return this.imdbId
}
get titleMatcher() {
return Option.none()
}
}

export type VideoQuery =
| AbsoluteSeriesQuery
| ChannelQuery
| MovieQuery
| SeasonQuery
| SeriesQuery
| ImdbTvQuery
| ImdbAbsoluteSeriesQuery
| ImdbMovieQuery
| ImdbSeasonQuery
| ImdbSeriesQuery

export type AllSeasonQuery = SeasonQuery | ImdbSeasonQuery
export type TitleVideoQuery =
| MovieQuery
| SeriesQuery
| SeasonQuery
| AbsoluteSeriesQuery
export type ImdbVideoQuery =
| ImdbMovieQuery
| ImdbSeasonQuery
| ImdbSeriesQuery
| ImdbAbsoluteSeriesQuery

// helpers

const episodeTitleMatcher = (query: string) => {
const regex = new RegExp(`(?:^|[^A-z0-9-])${query}(?:$|[^A-z0-9-])`, "i")
return (title: string) => regex.test(title)
}

const seasonTitleMatcher = (season: number) =>
Predicate.or(
episodeTitleMatcher(seasonString(season)),
episodeTitleMatcher(`Season ${season}`),
)

const seasonString = (season: number) => {
return `S${season.toString().padStart(2, "0")}`
}

export const formatEpisode = (season: number, episode: number) =>
`S${season.toString().padStart(2, "0")}E${episode.toString().padStart(2, "0")}`

export const isSeasonQuery = (query: VideoQuery): query is AllSeasonQuery =>
query.\_tag === "SeasonQuery" || query.\_tag === "ImdbSeasonQuery"

export const nonSeasonQuery = (query: VideoQuery) =>
isSeasonQuery(query) ? query.seriesQuery : query

================
File: src/Sources/1337x.ts
================
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import \* as Cheerio from "cheerio"
import { Effect, Layer, pipe, Schedule } from "effect"
import { SourceSeason, SourceStream } from "../Domain/SourceStream.js"
import { TitleVideoQuery, VideoQuery } from "../Domain/VideoQuery.js"
import { Sources } from "../Sources.js"
import { infoHashFromMagnet, qualityFromTitle } from "../Utils.js"
import { Schema } from "effect/schema"
import { Stream } from "effect/stream"
import { Match } from "effect/match"
import { Cache } from "effect/caching"
import { Data } from "effect/data"

export const Source1337xLive = Effect.gen(function* () {
const client = (yield* HttpClient.HttpClient).pipe(
HttpClient.filterStatusOk,
HttpClient.mapRequest(HttpClientRequest.prependUrl("https://1337x.to")),
HttpClient.retryTransient({
times: 5,
schedule: Schedule.spaced(5000),
}),
)

const parseResults = (html: string) => {
const $ = Cheerio.load(html)
const table = $("table.table-list")
const streams: Array<SearchResult> = []
table.find("> tbody > tr").each((_, row) => {
const $row = $(row)
const cells = $row.find("> td")
const link = cells.eq(0).find("a").eq(1)
streams.push(
new SearchResult({
url: link.attr("href")!,
title: link.text().trim(),
size: cells
.eq(4)[0]
.children.filter((_) => _.type === "text")
.map((_) => \_.data)
.join(" ")
.trim(),
seeds: +cells.eq(1).text(),
peers: +cells.eq(2).text(),
}),
)
})
return streams
}

class SearchRequest extends Data.Class<{
query: string
category: "Movies" | "TV"
}> {
// [PrimaryKey.symbol]() {
// return `${this.category}/${this.query}`
// }
// get [Schema.symbolWithResult]() {
// return {
// success: SearchResult.Array,
// failure: Schema.Never,
// }
// }
}

const searchCache = yield\* Cache.makeWith({
// storeId: "Source.1337x.search",
lookup: (request: SearchRequest) =>
pipe(
client.get(
`/sort-category-search/${encodeURIComponent(request.query)}/${request.category}/seeders/desc/1/`,
),
Effect.flatMap((r) => r.text),
Effect.map(parseResults),
Effect.orDie,
Effect.withSpan("Source.1337x.search", {
attributes: { ...request },
}),
),
timeToLive: (exit) => {
if (exit.\_tag === "Failure") return "1 minute"
return exit.value.length > 5 ? "3 days" : "3 hours"
},
capacity: 1024,
})

const searchStream = (request: TitleVideoQuery) =>
pipe(
Cache.get(
searchCache,
new SearchRequest({
query: request.asQuery,
category: request.\_tag === "MovieQuery" ? "Movies" : "TV",
}),
),
Stream.fromIterableEffect,
Stream.take(30),
Stream.flatMap(
(result) =>
Cache.get(
magnetLink,
new MagnetLinkRequest({ url: result.url }),
).pipe(
Effect.map((magnet) =>
request.\_tag === "SeasonQuery"
? new SourceSeason({
source: "1337x",
title: result.title,
infoHash: infoHashFromMagnet(magnet),
magnetUri: magnet,
seeds: result.seeds,
peers: result.peers,
})
: new SourceStream({
source: "1337x",
title: result.title,
infoHash: infoHashFromMagnet(magnet),
magnetUri: magnet,
quality: qualityFromTitle(result.title),
seeds: result.seeds,
peers: result.peers,
sizeDisplay: result.size,
}),
),
Effect.withSpan("Source.1337x.magnetLink", {
attributes: { url: result.url, title: result.title },
}),
Stream.fromEffect,
Stream.ignoreCause,
),
{ concurrency: "unbounded" },
),
)

class MagnetLinkRequest extends Data.Class<{ url: string }> {
// [PrimaryKey.symbol]() {
// return Hash.hash(this).toString()
// }
// get [Schema.symbolWithResult]() {
// return {
// success: Schema.String,
// failure: Schema.Never,
// }
// }
}
const magnetLink = yield\* Cache.makeWith({
// storeId: "Source.1337x.magnetLink",
lookup: ({ url }: MagnetLinkRequest) =>
client.get(url).pipe(
Effect.flatMap((r) => r.text),
Effect.flatMap((html) => {
const $ = Cheerio.load(html)
return Effect.fromNullable(
$("div.torrent-detail-page a[href^='magnet:']").attr("href"),
)
}),
),
timeToLive: (exit) => (exit.\_tag === "Success" ? "3 weeks" : "5 minutes"),
capacity: 512,
})

const sources = yield* Sources
yield* sources.register({
name: "1337x",
list: Match.type<VideoQuery>().pipe(
Match.tag(
"AbsoluteSeriesQuery",
"MovieQuery",
"SeriesQuery",
"SeasonQuery",
(query) =>
searchStream(query).pipe(
Stream.catchCause((cause) =>
Effect.logDebug(cause).pipe(
Effect.annotateLogs({
service: "Source.1337x",
method: "list",
query,
}),
Stream.fromEffect,
Stream.drain,
),
),
Stream.withSpan("Source.1337x.list", { attributes: { query } }),
),
),
Match.orElse(() => Stream.empty),
),
})
}).pipe(Layer.effectDiscard, Layer.provide(Sources.layer))

class SearchResult extends Schema.Class<SearchResult>("SearchResult")({
url: Schema.String,
title: Schema.String,
size: Schema.String,
seeds: Schema.Number,
peers: Schema.Number,
}) {
static Array = Schema.Array(this)
}

================
File: src/Sources/All.ts
================
import { Layer } from "effect"
import { SourceYtsLive } from "./Yts.js"
import { RealDebridLayer } from "../RealDebrid.js"
import { SourceEztvLive } from "./Eztv.js"
import { SourceTpbLive } from "./Tpb.js"
import { SourceRargbLive } from "./Rargb.js"
import { SourceNyaaLive } from "./Nyaa.js"
import { Source1337xLive } from "./1337x.js"

export const AllSources = Layer.mergeAll(
Source1337xLive,
SourceEztvLive,
SourceNyaaLive,
SourceRargbLive,
SourceTpbLive,
SourceYtsLive,
)

export const AllSourcesDebrid = Layer.mergeAll(AllSources, RealDebridLayer)

================
File: src/Sources/Eztv.ts
================
import {
HttpClient,
HttpClientRequest,
HttpClientResponse,
} from "effect/unstable/http"
import { Effect, Layer, pipe, Schedule } from "effect"
import { SourceStream } from "../Domain/SourceStream.js"
import { VideoQuery } from "../Domain/VideoQuery.js"
import { Sources } from "../Sources.js"
import { qualityFromTitle } from "../Utils.js"
import { TorrentMeta } from "../TorrentMeta.js"
import { Schema as S } from "effect/schema"
import { Data, Filter, Option } from "effect/data"
import { Cache } from "effect/caching"
import { Stream } from "effect/stream"
import { Match } from "effect/match"

export const SourceEztvLive = Effect.gen(function* () {
const torrentMeta = yield* TorrentMeta
const sources = yield* Sources
const defaultClient = (yield* HttpClient.HttpClient).pipe(
HttpClient.filterStatusOk,
HttpClient.retryTransient({
times: 5,
schedule: Schedule.exponential(100),
}),
)
const client = defaultClient.pipe(
HttpClient.mapRequest(HttpClientRequest.prependUrl("https://eztvx.to/api")),
)

class GetPage extends Data.Class<{
imdbId: string
page: number
}> {
// [PrimaryKey.symbol]() {
// return Hash.hash(this).toString()
// }
}
const getPageCache = yield\* Cache.makeWith({
// storeId: "Source.Eztv.getPage",
lookup: (_: GetPage) =>
pipe(
client.get("/get-torrents", {
urlParams: {
page: _.page,
limit: "100",
imdb*id: *.imdbId.replace("tt", ""),
},
}),
Effect.flatMap(GetTorrents.decodeResponse),
Effect.orDie,
),
timeToLive: (exit) => {
if (exit.\_tag === "Failure") return "1 minute"
return exit.value.torrents.length > 0 ? "12 hours" : "3 hours"
},
capacity: 512,
})

const stream = (imdbId: string) =>
Stream.paginateArrayEffect(1, (page) =>
pipe(
Cache.get(getPageCache, new GetPage({ imdbId, page })),
Effect.map((_) => [
_.torrents,
Option.some(page + 1).pipe(
Option.filter(() => _.torrents.length < _.limit),
),
]),
),
).pipe(Stream.ignoreCause)

const seasonSources = (torrent: Torrent) =>
defaultClient.get(torrent.torrent_url).pipe(
Effect.flatMap((res) => res.arrayBuffer),
Effect.flatMap((buffer) => torrentMeta.parse(buffer)),
Effect.map((meta) =>
meta.streams({
source: "EZTV",
seeds: torrent.seeds,
peers: torrent.peers,
}),
),
Effect.withSpan("Source.Eztv.seasonSources", {
attributes: { title: torrent.title, hash: torrent.hash },
}),
Stream.fromArrayEffect,
Stream.ignoreCause,
)

yield\* sources.register({
name: "Eztv",
list: Match.type<VideoQuery>().pipe(
Match.tag("ImdbSeasonQuery", ({ imdbId, season }) =>
stream(imdbId).pipe(
Stream.filter((torrent) =>
torrent.season === season && torrent.episode === 0
? torrent
: Filter.fail(torrent),
),
Stream.flatMap((torrent) => seasonSources(torrent)),
Stream.catchCause((cause) =>
Effect.logDebug(cause).pipe(
Effect.annotateLogs({
service: "Source.Eztv.Season",
imdbId,
season,
}),
Stream.fromEffect,
Stream.drain,
),
),
Stream.withSpan("Source.Eztv.list season", {
attributes: { imdbId, season },
}),
),
),
Match.tag("ImdbSeriesQuery", ({ imdbId, season, episode }) =>
stream(imdbId).pipe(
Stream.filter((torrent) =>
torrent.season === season && torrent.episode === episode
? torrent
: Filter.fail(torrent),
),
Stream.map((torrent) => torrent.asStream),
Stream.catchCause((cause) =>
Effect.logDebug(cause).pipe(
Effect.annotateLogs({
service: "Source.Eztv.Series",
imdbId,
season,
episode,
}),
Stream.fromEffect,
Stream.drain,
),
),
Stream.withSpan("Source.Eztv.list", {
attributes: { imdbId, season, episode },
}),
),
),
Match.orElse(() => Stream.empty),
),
})
}).pipe(Layer.effectDiscard, Layer.provide([Sources.layer, TorrentMeta.layer]))

// schemas

export class Torrent extends S.Class<Torrent>("Torrent")({
id: S.Number,
hash: S.String,
filename: S.String,
torrent_url: S.String,
magnet_url: S.String,
title: S.String,
imdb_id: S.String,
season: S.FiniteFromString,
episode: S.FiniteFromString,
small_screenshot: S.String,
large_screenshot: S.String,
seeds: S.Number,
peers: S.Number,
date_released_unix: S.Number,
size_bytes: S.FiniteFromString,
}) {
get asStream() {
return new SourceStream({
source: "EZTV",
title: this.title,
infoHash: this.hash,
quality: qualityFromTitle(this.title),
seeds: this.seeds,
peers: this.peers,
magnetUri: this.magnet_url,
sizeBytes: this.size_bytes,
verified: true,
})
}
}

export class GetTorrents extends S.Class<GetTorrents>("GetTorrents")({
torrents_count: S.Number,
limit: S.Number,
page: S.Number,
torrents: S.Array(Torrent),
}) {
static decodeResponse = HttpClientResponse.schemaBodyJson(this)
}

================
File: src/Sources/Nyaa.ts
================
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import \* as Cheerio from "cheerio"
import { Effect, Layer, pipe, Schedule } from "effect"
import { SourceStream } from "../Domain/SourceStream.js"
import { AbsoluteSeriesQuery, VideoQuery } from "../Domain/VideoQuery.js"
import { Sources } from "../Sources.js"
import { infoHashFromMagnet, qualityFromTitle } from "../Utils.js"
import { Cache } from "effect/caching"
import { Array } from "effect/collections"
import { Match } from "effect/match"
import { Stream } from "effect/stream"

export const SourceNyaaLive = Effect.gen(function* () {
const client = (yield* HttpClient.HttpClient).pipe(
HttpClient.filterStatusOk,
HttpClient.mapRequest(HttpClientRequest.prependUrl("https://nyaa.si")),
HttpClient.retryTransient({
times: 5,
schedule: Schedule.exponential(100),
}),
)

const searchCache = yield\* Cache.makeWith({
// storeId: "Source.Nyaa.search",
lookup: (request: AbsoluteSeriesQuery) =>
pipe(
client.get("/", {
urlParams: {
f: 1,
c: "1_2",
s: "seeders",
o: "desc",
q: request.asQuery,
},
}),
Effect.flatMap((r) => r.text),
Effect.map((html) =>
pipe(
parseResults(html),
Array.map(
(result) =>
new SourceStream({
source: "Nyaa",
infoHash: infoHashFromMagnet(result.magnet),
title: result.title,
magnetUri: result.magnet,
quality: qualityFromTitle(result.title),
seeds: result.seeds,
peers: result.peers,
sizeDisplay: result.size,
}),
),
),
),
Effect.orDie,
Effect.withSpan("Source.Nyaa.search", { attributes: { ...request } }),
),
timeToLive: (exit, req) => req.timeToLive(exit),
capacity: 128,
})

const parseResults = (html: string) => {
const $ = Cheerio.load(html)
const table = $("table.torrent-list")
const streams: Array<{
readonly title: string
readonly size: string
readonly seeds: number
readonly peers: number
readonly magnet: string
}> = []
table.find("> tbody > tr").each((\_, row) => {
const $row = $(row)
const cells = $row.find("> td")
streams.push({
title: cells.eq(1).text().trim(),
size: cells.eq(3).text(),
seeds: +cells.eq(5).text(),
peers: +cells.eq(6).text(),
magnet: cells.eq(2).find("a[href^='magnet:']").attr("href")!,
})
})
return streams
}

const sources = yield* Sources
yield* sources.register({
name: "Nyaa",
list: Match.type<VideoQuery>().pipe(
Match.tag("AbsoluteSeriesQuery", (query) =>
Cache.get(searchCache, query).pipe(
Effect.tapCause(Effect.logDebug),
Effect.orElseSucceed(() => []),
Effect.withSpan("Source.Nyaa.Series", {
attributes: { query },
}),
Effect.annotateLogs({ service: "Source.Nyaa", query }),
Stream.fromIterableEffect,
),
),
Match.orElse(() => Stream.empty),
),
})
}).pipe(Layer.effectDiscard, Layer.provide(Sources.layer))

================
File: src/Sources/Rargb.ts
================
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import \* as Cheerio from "cheerio"
import { Effect, Layer, pipe, Schedule } from "effect"
import { SourceSeason, SourceStream } from "../Domain/SourceStream.js"
import { TitleVideoQuery, VideoQuery } from "../Domain/VideoQuery.js"
import { Sources } from "../Sources.js"
import { infoHashFromMagnet, qualityFromTitle } from "../Utils.js"
import { Schema } from "effect/schema"
import { Stream } from "effect/stream"
import { Match } from "effect/match"
import { Cache } from "effect/caching"
import { Data } from "effect/data"

export const SourceRargbLive = Effect.gen(function* () {
const client = (yield* HttpClient.HttpClient).pipe(
HttpClient.filterStatusOk,
HttpClient.mapRequest(HttpClientRequest.prependUrl("https://rargb.to")),
HttpClient.retryTransient({
times: 5,
schedule: Schedule.spaced(500),
}),
)

const parseResults = (html: string) => {
const $ = Cheerio.load(html)
const table = $("table.lista2t")
const streams: Array<SearchResult> = []
table.find("tr.lista2").each((\_, row) => {
const $row = $(row)
const cells = $row.find("> td")
const link = cells.eq(1).find("a")
streams.push(
new SearchResult({
url: link.attr("href")!,
title: link.attr("title")!,
size: cells.eq(4).text(),
seeds: +cells.eq(5).text(),
peers: +cells.eq(6).text(),
}),
)
})
return streams
}

class SearchRequest extends Data.Class<{
query: string
category: "movies" | "series"
}> {
// [PrimaryKey.symbol]() {
// return `${this.category}/${this.query}`
// }
// get [Schema.symbolWithResult]() {
// return {
// success: SearchResult.Array,
// failure: Schema.Never,
// }
// }
}

const searchCache = yield\* Cache.makeWith({
// storeId: "Source.Rarbg.search",
lookup: (request: SearchRequest) =>
pipe(
client.get("/search/", {
urlParams: {
search: request.query,
"category[]":
request.category === "movies" ? ["movies"] : ["tv", "anime"],
},
}),
Effect.flatMap((r) => r.text),
Effect.scoped,
Effect.map(parseResults),
Effect.orDie,
Effect.withSpan("Source.Rarbg.search", { attributes: { ...request } }),
),
timeToLive: (exit) => {
if (exit.\_tag === "Failure") return "5 minutes"
return exit.value.length > 5 ? "3 days" : "3 hours"
},
capacity: 128,
})

const searchStream = (request: TitleVideoQuery) =>
pipe(
Cache.get(
searchCache,
new SearchRequest({
query: request.asQuery,
category: request.\_tag === "MovieQuery" ? "movies" : "series",
}),
),
Stream.fromArrayEffect,
Stream.take(30),
Stream.flatMap(
(result) =>
Cache.get(
magnetLink,
new MagnetLinkRequest({ url: result.url }),
).pipe(
Effect.map((magnet) =>
request.\_tag === "SeasonQuery"
? new SourceSeason({
source: "Rarbg",
title: result.title,
infoHash: infoHashFromMagnet(magnet),
magnetUri: magnet,
seeds: result.seeds,
peers: result.peers,
})
: new SourceStream({
source: "Rarbg",
title: result.title,
infoHash: infoHashFromMagnet(magnet),
magnetUri: magnet,
quality: qualityFromTitle(result.title),
seeds: result.seeds,
peers: result.peers,
sizeDisplay: result.size,
}),
),
Stream.fromEffect,
Stream.ignoreCause,
),
{ concurrency: "unbounded" },
),
)

class MagnetLinkRequest extends Data.Class<{ url: string }> {
// [PrimaryKey.symbol]() {
// return Hash.hash(this).toString()
// }
// get [Schema.symbolWithResult]() {
// return {
// success: Schema.String,
// failure: Schema.Never,
// }
// }
}
const magnetLink = yield\* Cache.makeWith({
// storeId: "Source.Rarbg.magnetLink",
lookup: ({ url }: MagnetLinkRequest) =>
client.get(url).pipe(
Effect.flatMap((r) => r.text),
Effect.flatMap((html) => {
const $ = Cheerio.load(html)
return Effect.fromNullable(
$("td.lista a[href^='magnet:']").attr("href"),
)
}),
Effect.orDie,
),
timeToLive: (exit) => (exit.\_tag === "Success" ? "3 weeks" : "5 minutes"),
capacity: 512,
})

const sources = yield* Sources
yield* sources.register({
name: "Rarbg",
list: Match.type<VideoQuery>().pipe(
Match.tag(
"AbsoluteSeriesQuery",
"MovieQuery",
"SeriesQuery",
"SeasonQuery",
(query) =>
searchStream(query).pipe(
Stream.catchCause((cause) =>
Effect.logDebug(cause).pipe(
Effect.annotateLogs({
service: "Source.Rarbg",
method: "list",
query,
}),
Stream.fromEffect,
Stream.drain,
),
),
Stream.withSpan("Source.Rarbg.list", { attributes: { query } }),
),
),
Match.orElse(() => Stream.empty),
),
})
}).pipe(Layer.effectDiscard, Layer.provide(Sources.layer))

class SearchResult extends Schema.Class<SearchResult>("SearchResult")({
url: Schema.String,
title: Schema.String,
size: Schema.String,
seeds: Schema.Number,
peers: Schema.Number,
}) {
static Array = Schema.Array(this)
}

================
File: src/Sources/Tpb.ts
================
import {
HttpClient,
HttpClientRequest,
HttpClientResponse,
} from "effect/unstable/http"
import { Effect, Layer, pipe, Schedule } from "effect"
import {
SourceSeason,
SourceStream,
SourceStreamWithFile,
} from "../Domain/SourceStream.js"
import { VideoQuery } from "../Domain/VideoQuery.js"
import { Sources } from "../Sources.js"
import { magnetFromHash, qualityFromTitle } from "../Utils.js"
import { Schema as S } from "effect/schema"
import { Data, Option } from "effect/data"
import { Cache } from "effect/caching"
import { Match } from "effect/match"
import { Array } from "effect/collections"
import { Stream } from "effect/stream"

export const SourceTpbLive = Effect.gen(function* () {
const sources = yield* Sources
const defaultClient = (yield\* HttpClient.HttpClient).pipe(
HttpClient.filterStatusOk,
HttpClient.retryTransient({
times: 5,
schedule: Schedule.exponential(100),
}),
)
const client = defaultClient.pipe(
HttpClient.mapRequest(HttpClientRequest.prependUrl("https://apibay.org")),
)

class SearchRequest extends Data.Class<{ imdbId: string }> {
// [PrimaryKey.symbol]() {
// return Hash.hash(this).toString()
// }
}

const search = yield\* Cache.makeWith({
// storeId: "Source.Tpb.search",
lookup: ({ imdbId }: SearchRequest) =>
client.get("/q.php", { urlParams: { q: imdbId } }).pipe(
Effect.flatMap(SearchResult.decodeResponse),
Effect.orDie,
Effect.map((results) => (results[0].id === "0" ? [] : results)),
Effect.withSpan("Source.Tpb.search", {
attributes: { imdbId },
}),
),
timeToLive: (exit) => {
if (exit.\_tag === "Failure") return "5 minutes"
return exit.value.length > 0 ? "3 days" : "6 hours"
},
capacity: 128,
})

class FilesRequest extends Data.Class<{ id: string }> {
// [PrimaryKey.symbol]() {
// return Hash.hash(this).toString()
// }
}

const files = yield\* Cache.makeWith({
// storeId: "Source.Tpb.files",
lookup: ({ id }: FilesRequest) =>
client.get("/f.php", { urlParams: { id } }).pipe(
Effect.flatMap(HttpClientResponse.schemaBodyJson(File.Array)),
Effect.orElseSucceed(() => []),
Effect.withSpan("Source.Tpb.files", {
attributes: { id },
}),
),
timeToLive: (exit) => (exit.\_tag === "Failure" ? "5 minutes" : "3 days"),
capacity: 128,
})

yield\* sources.register({
name: "Tpb",
list: Match.type<VideoQuery>().pipe(
Match.tag("ImdbSeasonQuery", (query) => {
if (Option.isNone(query.titleMatcher)) return Stream.empty
const titleMatcher = query.titleMatcher.value
return Cache.get(
search,
new SearchRequest({ imdbId: query.imdbId }),
).pipe(
Effect.map(Array.filter((_) => titleMatcher(_.name))),
Stream.fromIterableEffect,
Stream.flatMap(
(result) =>
pipe(
Cache.get(files, new FilesRequest({ id: result.id })),
Effect.map(
(files): Stream.Stream<SourceSeason | SourceStreamWithFile> =>
Array.match(files, {
onEmpty: () => Stream.make(result.asSeason),
onNonEmpty: (files) =>
pipe(
Array.map(
files,
(file, index) =>
new SourceStreamWithFile({
source: "TPB",
title: file.name[0],
infoHash: result.info_hash,
magnetUri: magnetFromHash(result.info_hash),
quality: qualityFromTitle(file.name[0]),
seeds: result.seeders,
peers: result.leechers,
sizeBytes: file.size[0],
fileNumber: index,
}),
),
Stream.fromIterable,
),
}),
),
Stream.unwrap,
),
{ concurrency: "unbounded" },
),
Stream.orDie,
Stream.withSpan("Source.Tpb.Imdb season", { attributes: { query } }),
)
}),
Match.tag("ImbdMovieQuery", "ImdbSeriesQuery", (query) =>
Cache.get(search, new SearchRequest({ imdbId: query.imdbId })).pipe(
Effect.map(Array.map((result) => result.asStream)),
Effect.tapCause(Effect.logDebug),
Effect.orElseSucceed(() => []),
Effect.withSpan("Source.Tpb.Imdb", { attributes: { query } }),
Effect.annotateLogs({
service: "Source.Tpb",
method: "list",
kind: "Imdb",
}),
Stream.fromIterableEffect,
),
),
Match.orElse(() => Stream.empty),
),
})
}).pipe(Layer.effectDiscard, Layer.provide(Sources.layer))

// schemas

export class SearchResult extends S.Class<SearchResult>("SearchResult")({
id: S.String,
name: S.String,
info_hash: S.String,
leechers: S.FiniteFromString,
seeders: S.FiniteFromString,
num_files: S.String,
size: S.FiniteFromString,
username: S.String,
added: S.String,
category: S.String,
imdb: S.String,
}) {
static decodeResponse = HttpClientResponse.schemaBodyJson(S.Array(this))

get asStream() {
return new SourceStream({
source: "TPB",
title: this.name,
infoHash: this.info_hash,
magnetUri: magnetFromHash(this.info_hash),
quality: qualityFromTitle(this.name),
seeds: this.seeders,
peers: this.leechers,
sizeBytes: this.size,
})
}

get asSeason() {
return new SourceSeason({
source: "TPB",
title: this.name,
infoHash: this.info_hash,
magnetUri: magnetFromHash(this.info_hash),
seeds: this.seeders,
peers: this.leechers,
})
}
}
class File extends S.Class<File>("File")({
name: S.NonEmptyArray(S.String),
size: S.NonEmptyArray(S.Number),
}) {
static Array = S.Array(File)
}

================
File: src/Sources/Yts.ts
================
import {
HttpClient,
HttpClientRequest,
HttpClientResponse,
} from "effect/unstable/http"
import { Effect, Layer, pipe, Schedule } from "effect"
import { SourceStream } from "../Domain/SourceStream.js"
import { VideoQuery } from "../Domain/VideoQuery.js"
import { Sources } from "../Sources.js"
import { magnetFromHash } from "../Utils.js"
import { Schema as S } from "effect/schema"
import { Data } from "effect/data"
import { Cache } from "effect/caching"
import { Match } from "effect/match"
import { Stream } from "effect/stream"

export const SourceYtsLive = Effect.gen(function* () {
const sources = yield* Sources
const client = (yield\* HttpClient.HttpClient).pipe(
HttpClient.filterStatusOk,
HttpClient.mapRequest(
HttpClientRequest.prependUrl("https://yts.mx/api/v2"),
),
HttpClient.retryTransient({
times: 5,
schedule: Schedule.exponential(100),
}),
)

class DetailsRequest extends Data.Class<{ imdbId: string }> {
// [PrimaryKey.symbol]() {
// return this.imdbId
// }
}

const details = yield\* Cache.makeWith({
// storeId: "Source.Yts.details",
lookup: ({ imdbId }: DetailsRequest) =>
pipe(
client.get("/movie*details.json", { urlParams: { imdb_id: imdbId } }),
Effect.flatMap(MovieDetails.decodeResponse),
Effect.orDie,
Effect.map((*) => \_.data.movie),
Effect.withSpan("Source.Yts.details", { attributes: { imdbId } }),
),
timeToLive: (exit) => {
if (exit.\_tag === "Failure") return "5 minutes"
return "3 days"
},
capacity: 128,
})

yield\* sources.register({
name: "YTS",
list: Match.type<VideoQuery>().pipe(
Match.tag("ImbdMovieQuery", ({ imdbId }) =>
Cache.get(details, new DetailsRequest({ imdbId })).pipe(
Effect.map((_) => _.streams),
Effect.tapCause(Effect.logDebug),
Effect.orElseSucceed(() => []),
Effect.withSpan("Source.Yts.Imdb", { attributes: { imdbId } }),
Effect.annotateLogs({
service: "Source.Yts",
method: "list",
kind: "Imdb",
}),
Stream.fromIterableEffect,
),
),
Match.orElse(() => Stream.empty),
),
})
}).pipe(Layer.effectDiscard, Layer.provide(Sources.layer))

// schema

export const Quality = S.Literals([
"480p",
"720p",
"1080p",
"1080p.x265",
"2160p",
"3D",
])
export type Quality = S.Schema.Type<typeof Quality>

export class Torrent extends S.Class<Torrent>("Torrent")({
url: S.String,
hash: S.String,
quality: Quality,
is_repack: S.String,
bit_depth: S.String,
audio_channels: S.String,
seeds: S.Number,
peers: S.Number,
size: S.String,
size_bytes: S.Number,
date_uploaded: S.String,
date_uploaded_unix: S.Number,
}) {}

export class Movie extends S.Class<Movie>("Movie")({
id: S.Number,
url: S.String,
imdb_code: S.String,
title: S.NullOr(S.String),
title_english: S.NullOr(S.String),
title_long: S.String,
slug: S.NullOr(S.String),
year: S.Number,
rating: S.Number,
runtime: S.Number,
torrents: S.optional(S.NullOr(S.Array(Torrent))),
}) {
get streams(): SourceStream[] {
if (!this.torrents) {
return []
}
return this.torrents.map(
(tor) =>
new SourceStream({
source: "YTS",
title: this.title || this.title_long,
infoHash: tor.hash,
magnetUri: magnetFromHash(tor.hash),
quality: tor.quality,
seeds: tor.seeds,
peers: tor.peers,
sizeBytes: tor.size_bytes,
}),
)
}
}

export class MovieDetailsData extends S.Class<MovieDetailsData>(
"MovieDetailsData",
)({
movie: Movie,
}) {}

export class ListMoviesData extends S.Class<ListMoviesData>("ListMoviesData")({
movie_count: S.Number,
limit: S.Number,
page_number: S.Number,
movies: S.Array(Movie),
}) {}

export class MovieDetails extends S.Class<MovieDetails>("MovieDetails")({
status_message: S.String,
data: MovieDetailsData,
}) {
static decodeResponse = HttpClientResponse.schemaBodyJson(this)
}

================
File: src/Addon.ts
================
import \* as Stremio from "./Stremio.js"
import { Layer } from "effect"
import { HttpMiddleware, HttpRouter } from "effect/unstable/http"
import { AllSourcesDebrid } from "./Sources/All.js"

export const AddonLive = Stremio.StremioManifest.addon({
id: "co.timsmart.stremio.sources",
name: "Stremio Sources",
version: "0.0.1",
description: "Stream results from various sources",
catalogs: [],
resources: ["stream"],
types: ["movie", "tv", "series"],
}).pipe(
Layer.provide(AllSourcesDebrid),
HttpRouter.serve,
Layer.provide(HttpMiddleware.layerTracerDisabledForUrls(["/health"])),
)

================
File: src/Cinemeta.ts
================
import { Effect, Layer, Schedule, ServiceMap } from "effect"
import { Cache } from "effect/caching"
import {
AbsoluteSeriesQuery,
ImdbAbsoluteSeriesQuery,
MovieQuery,
SeasonQuery,
SeriesQuery,
} from "./Domain/VideoQuery.js"
import { EpisodeData, Tvdb } from "./Tvdb.js"
import {
HttpClient,
HttpClientRequest,
HttpClientResponse,
} from "effect/unstable/http"
import { Data, Option } from "effect/data"
import { Schema as S } from "effect/schema"
import { Array } from "effect/collections"

export class Cinemeta extends ServiceMap.Key<Cinemeta>()("Cinemeta", {
make: Effect.gen(function* () {
const client = (yield* HttpClient.HttpClient).pipe(
HttpClient.mapRequest(
HttpClientRequest.prependUrl("https://v3-cinemeta.strem.io/meta"),
),
HttpClient.followRedirects(),
HttpClient.filterStatusOk,
HttpClient.retryTransient({
times: 5,
schedule: Schedule.exponential(100),
}),
)

    const lookupMovieCache = yield* Cache.makeWith({
      lookup: (imdbId: string) =>
        client.get(`/movie/${imdbId}.json`).pipe(
          Effect.flatMap(Movie.decodeResponse),
          Effect.map((_) => _.meta),
          Effect.orDie,
          Effect.withSpan("Cinemeta.lookupMovie", { attributes: { imdbId } }),
        ),
      capacity: 1024,
      timeToLive: (exit) => (exit._tag === "Success" ? "1 week" : "5 minutes"),
    })
    const lookupMovie = (imdbID: string) => Cache.get(lookupMovieCache, imdbID)

    const lookupSeriesCache = yield* Cache.makeWith({
      lookup: (imdbID: string) =>
        client.get(`/series/${imdbID}.json`).pipe(
          Effect.flatMap(Series.decodeResponse),
          Effect.map((_) => _.meta),
          Effect.orDie,
          Effect.withSpan("Cinemeta.lookupSeries", { attributes: { imdbID } }),
        ),
      timeToLive: (exit) =>
        exit._tag === "Success" ? "12 hours" : "5 minutes",
      capacity: 1024,
    })
    const lookupSeries = (imdbID: string) =>
      Cache.get(lookupSeriesCache, imdbID)

    const tvdb = yield* Tvdb
    const lookupEpisode = Effect.fnUntraced(
      function* (imdbID: string, season: number, episode: number) {
        const series = yield* lookupSeries(imdbID)
        if (series.videos[0]?.episode === undefined) {
          return [
            new GeneralEpisodeResult({
              series,
              season,
              episode,
            }),
            new AnimationEpisodeResult({
              series,
              season,
              episode,
              info: Option.none(),
            }),
          ]
        } else if (!series.genres?.includes("Animation")) {
          return [
            new GeneralEpisodeResult({
              series,
              season,
              episode,
            }),
          ]
        }
        const info = yield* series
          .findEpisode(season, episode)
          .asEffect()
          .pipe(
            Effect.flatMap((_) => Effect.fromNullable(_.tvdb_id)),
            Effect.flatMap(tvdb.lookupEpisode),
            Effect.option,
          )
        return [
          new AnimationEpisodeResult({
            series,
            season,
            episode,
            info,
          }),
        ]
      },
      (effect, imdbID, season, episode) =>
        Effect.withSpan(effect, "Cinemeta.lookupEpisode", {
          attributes: { imdbID, season, episode },
        }),
    )

    return { lookupMovie, lookupSeries, lookupEpisode } as const

}),
}) {
static layer = Layer.effect(this)(this.make).pipe(Layer.provide(Tvdb.layer))
}

export class Video extends S.Class<Video>("Video")({
season: S.Number,
number: S.Number,
tvdb_id: S.optional(S.Union([S.Number, S.FiniteFromString, S.Null])),
id: S.String,
episode: S.optional(S.Number),
}) {
get episodeOrNumber() {
return this.episode ?? this.number
}
}

export class MovieMeta extends S.Class<MovieMeta>("MovieMeta")({
id: S.String,
imdb_id: S.String,
name: S.String,
}) {
get queries() {
return [new MovieQuery({ title: this.name })]
}
}

export class Movie extends S.Class<Movie>("Movie")({
meta: MovieMeta,
}) {
static decodeResponse = HttpClientResponse.schemaBodyJson(this)
}

export class SeriesMeta extends S.Class<SeriesMeta>("SeriesMeta")({
imdb*id: S.optional(S.String),
name: S.String,
tvdb_id: S.optional(S.Union([S.Number, S.FiniteFromString, S.Null])),
id: S.String,
genres: S.Array(S.String).pipe(S.optionalKey),
videos: S.Array(Video),
}) {
findEpisode(season: number, episode: number) {
return Array.findFirst(
this.videos,
(*) => _.season === season && _.episodeOrNumber === episode,
)
}
absoluteQueries(
season: number,
episode: number,
): Option.Option<Array<AbsoluteSeriesQuery | ImdbAbsoluteSeriesQuery>> {
const index = this.videos
.filter((_) => _.season > 0)
.findIndex((_) => _.season === season && \_.episodeOrNumber === episode)
return index >= 0
? Option.some([
new AbsoluteSeriesQuery({ title: this.name, number: index + 1 }),
...(this.imdb_id
? [
new ImdbAbsoluteSeriesQuery({
imdbId: this.imdb_id,
number: index + 1,
}),
]
: []),
])
: Option.none()
}
}

export class Series extends S.Class<Series>("Series")({
meta: SeriesMeta,
}) {
static decodeResponse = HttpClientResponse.schemaBodyJson(this)
}

// episode result

export class AnimationEpisodeResult extends Data.TaggedClass(
"AnimationEpisodeResult",
)<{
series: SeriesMeta
season: number
episode: number
info: Option.Option<EpisodeData>
}> {
get absoluteQueries() {
return this.info.pipe(
Option.map((info) => [
new AbsoluteSeriesQuery({
title: this.series.name,
number: info.absoluteNumber,
}),
...(this.series.imdb_id
? [
new ImdbAbsoluteSeriesQuery({
imdbId: this.series.imdb_id,
number: info.absoluteNumber,
}),
]
: []),
]),
Option.orElse(() =>
this.series.absoluteQueries(this.season, this.episode),
),
)
}
get queries() {
const series = new SeriesQuery({
title: this.series.name,
season: this.season,
episode: this.episode,
})
const seasons = SeasonQuery.variants({
title: this.series.name,
season: this.season,
episode: this.episode,
})
return Option.match(this.absoluteQueries, {
onNone: () => [series, ...seasons],
onSome: (absolute) => [...absolute, series, ...seasons],
})
}
}

export class GeneralEpisodeResult extends Data.TaggedClass(
"GeneralEpisodeResult",
)<{
series: SeriesMeta
season: number
episode: number
}> {
get queries() {
return [
new SeriesQuery({
title: this.series.name,
season: this.season,
episode: this.episode,
}),
...SeasonQuery.variants({
title: this.series.name,
season: this.season,
episode: this.episode,
}),
]
}
}

export type EpisodeResult = AnimationEpisodeResult | GeneralEpisodeResult

================
File: src/main.ts
================
import {
NodeHttpClient,
NodeHttpServer,
NodeRuntime,
} from "@effect/platform-node"
import { Layer } from "effect"
import { TracingLayer } from "./Tracing.js"
import { createServer } from "node:http"
import \* as Net from "node:net"
import { AddonLive } from "./Addon.js"
import { Config } from "effect/config"
import { MinimumLogLevel } from "effect/References"

// Fixes issues with timeouts
Net.setDefaultAutoSelectFamily(false)

const MainLive = AddonLive.pipe(
Layer.provide([
NodeHttpServer.layerConfig(createServer, {
port: Config.Port("PORT").pipe(Config.withDefault(8000)),
}),
NodeHttpClient.layerUndici,
]),
Layer.provide(TracingLayer),
Layer.provide(Layer.succeed(MinimumLogLevel)("All")),
)

NodeRuntime.runMain(Layer.launch(MainLive))

================
File: src/Persistence.ts
================
// import _ as Persistence from "@effect/experimental/Persistence"
// import _ as PersistenceRedis from "@effect/experimental/Persistence/Redis"
// import { NodeKeyValueStore } from "@effect/platform-node"
// import { Config, Effect, Layer, Option } from "effect"
//
// export const PersistenceLive = Layer.unwrapEffect(
// Effect.gen(function* () {
// const redis = yield* Config.all({
// host: Config.string("HOST"),
// port: Config.integer("PORT").pipe(Config.withDefault(6379)),
// }).pipe(Config.nested("REDIS"), Config.option)
//
// if (Option.isSome(redis)) {
// return PersistenceRedis.layerResult({
// host: redis.value.host,
// port: redis.value.port,
// })
// }
//
// return Persistence.layerResultKeyValueStore.pipe(
// Layer.provide(NodeKeyValueStore.layerFileSystem("data/persistence")),
// )
// }),
// )

================
File: src/RealDebrid.ts
================
import {
HttpClient,
HttpClientRequest,
HttpClientResponse,
HttpRouter,
HttpServerResponse,
} from "effect/unstable/http"
import { Request } from "effect/batching"
import { Config, ConfigProvider } from "effect/config"
import { Effect, flow, Layer, pipe, Schedule } from "effect"
import { SourceStream, SourceStreamWithFile } from "./Domain/SourceStream.js"
import { Sources } from "./Sources.js"
import { StremioRouter } from "./Stremio.js"
import { configProviderNested, magnetFromHash } from "./Utils.js"
import { Schema } from "effect/schema"
import { Array } from "effect/collections"
import { Cache } from "effect/caching"
import { Option, Order } from "effect/data"

export const RealDebridLayer = Effect.gen(function* () {
const sources = yield* Sources
const apiKey = yield\* Config.Redacted("apiKey")

const client = (yield\* HttpClient.HttpClient).pipe(
HttpClient.mapRequest(
flow(
HttpClientRequest.prependUrl("https://api.real-debrid.com/rest/1.0"),
HttpClientRequest.bearerToken(apiKey),
),
),
HttpClient.filterStatusOk,
HttpClient.retryTransient({
times: 5,
schedule: Schedule.exponential(100),
}),
)

const user = yield\* client.get("/user").pipe(
Effect.flatMap(
HttpClientResponse.schemaBodyJson(
Schema.Struct({
type: Schema.Literals(["premium", "free"]),
}),
),
),
Effect.tapCause(Effect.log),
Effect.cachedWithTTL("1 hour"),
)
const userIsPremium = user.pipe(
Effect.map((_) => _.type === "premium"),
Effect.orElseSucceed(() => false),
)

const addMagnet = (hash: string) =>
pipe(
HttpClientRequest.post("/torrents/addMagnet"),
HttpClientRequest.bodyUrlParams({ magnet: magnetFromHash(hash) }),
client.execute,
Effect.flatMap(decodeAddMagnetResponse),
)

const getTorrentInfo = (id: string) =>
client.get(`/torrents/info/${id}`).pipe(
Effect.flatMap(decodeTorrentInfo),
Effect.tapCause(Effect.log),
Effect.retry({
while: (err) => err.\_tag === "SchemaError",
schedule: Schedule.spaced(3000).pipe(
Schedule.both(Schedule.during("5 minutes")),
),
}),
)

const selectFiles = (id: string, files: ReadonlyArray<string>) =>
HttpClientRequest.post(`/torrents/selectFiles/${id}`).pipe(
HttpClientRequest.bodyUrlParams({ files: files.join(",") }),
client.execute,
)

const selectLargestFile = Effect.fnUntraced(function* (id: string) {
const info = yield* getTorrentInfo(id)
const largestFile = Array.max(info.files, FileSizeOrder)
yield\* selectFiles(id, [String(largestFile.id)])
})

const unrestrictLink = (link: string) =>
HttpClientRequest.post("/unrestrict/link").pipe(
HttpClientRequest.bodyUrlParams({ link }),
client.execute,
Effect.flatMap(decodeUnrestrictLinkResponse),
)

class ResolveRequest extends Request.TaggedClass("ResolveRequest")<
{
infoHash: string
file: string
},
typeof UnrestrictLinkResponse.Type

> {}
> // "ResolveRequest",
> // {
> // failure: Schema.Never,
> // success: UnrestrictLinkResponse,
> // payload: {
> // infoHash: Schema.String,
> // file: Schema.String,
> // },
> // },
> // ) {
> // [PrimaryKey.symbol]() {
> // return Hash.hash(this).toString()
> // }
> // }
> const resolve = yield\* Cache.makeWith<

    ResolveRequest,
    { readonly download: string }

> ({

    // storeId: "RealDebrid.resolve",
    lookup: Effect.fnUntraced(
      function* (request) {
        const torrent = yield* addMagnet(request.infoHash)
        if (request.file === "-1") {
          yield* selectLargestFile(torrent.id)
        } else {
          yield* selectFiles(torrent.id, [request.file])
        }
        const info = yield* getTorrentInfo(torrent.id)
        const link = yield* Effect.fromNullable(info.links[0])
        return yield* unrestrictLink(link)
      },
      Effect.tapCause(Effect.log),
      Effect.orDie,
      (effect, request) =>
        Effect.withSpan(effect, "RealDebrid.resolve", {
          attributes: { request },
        }),
    ),
    timeToLive: (exit) => (exit._tag === "Success" ? "1 hour" : "5 minutes"),
    capacity: 1024,

})

yield\* sources.registerEmbellisher({
transform: (stream, baseUrl) =>
Effect.succeed(
"fileNumber" in stream
? new SourceStreamWithFile({
...stream,
url: new URL(
`${baseUrl.pathname}/real-debrid/${stream.infoHash}/${stream.fileNumber + 1}`,
baseUrl,
).toString(),
})
: new SourceStream({
...stream,
url: new URL(
`${baseUrl.pathname}/real-debrid/${stream.infoHash}/-1`,
baseUrl,
).toString(),
}),
).pipe(
Effect.when(userIsPremium),
Effect.map(Option.getOrElse(() => stream)),
Effect.withSpan("RealDebrid.transform", {
attributes: { infoHash: stream.infoHash },
}),
),
})

const router = yield* StremioRouter
const resolveParams = HttpRouter.schemaPathParams(
Schema.Struct({
hash: Schema.String,
file: Schema.String,
}),
)
yield* router.add(
"GET",
"/real-debrid/:hash/:file",
resolveParams.pipe(
Effect.flatMap(({ hash: infoHash, file }) =>
Cache.get(resolve, new ResolveRequest({ infoHash, file })),
),
Effect.map((url) =>
HttpServerResponse.empty({ status: 302 }).pipe(
HttpServerResponse.setHeader("Location", url.download),
),
),
Effect.catchTag("SchemaError", () =>
Effect.succeed(HttpServerResponse.empty({ status: 404 })),
),
Effect.annotateLogs({
service: "RealDebrid",
method: "http",
}),
),
)
}).pipe(
Effect.provideService(
ConfigProvider.ConfigProvider,
configProviderNested("realDebrid"),
),
Effect.annotateLogs({
service: "RealDebrid",
}),
Layer.effectDiscard,
Layer.provide([Sources.layer, StremioRouter.layer]),
)

const AddMagnetResponse = Schema.Struct({
id: Schema.String,
uri: Schema.String,
})
const decodeAddMagnetResponse =
HttpClientResponse.schemaBodyJson(AddMagnetResponse)

class TorrentInfo extends Schema.Class<TorrentInfo>("TorrentInfo")({
links: Schema.Array(Schema.String),
files: Schema.NonEmptyArray(
Schema.Struct({
id: Schema.Number,
path: Schema.String,
bytes: Schema.Number,
selected: Schema.Number,
}),
),
}) {}
const decodeTorrentInfo = HttpClientResponse.schemaBodyJson(TorrentInfo)

const UnrestrictLinkResponse = Schema.Struct({
download: Schema.String,
})
const decodeUnrestrictLinkResponse = HttpClientResponse.schemaBodyJson(
UnrestrictLinkResponse,
)

const FileSizeOrder = Order.struct({
bytes: Order.number,
})

================
File: src/Sources.ts
================
import { Effect, Layer, pipe, ServiceMap } from "effect"
import { Cinemeta } from "./Cinemeta.js"
import \* as QualityGroup from "./Domain/QualityGroup.js"
import {
SourceSeason,
SourceStream,
SourceStreamWithFile,
} from "./Domain/SourceStream.js"
import {
ChannelQuery,
ImdbMovieQuery,
ImdbSeasonQuery,
ImdbSeriesQuery,
ImdbTvQuery,
nonSeasonQuery,
VideoQuery,
} from "./Domain/VideoQuery.js"
import { StreamRequest, streamRequestId } from "./Stremio.js"
import { TorrentMeta } from "./TorrentMeta.js"
import { Stream } from "effect/stream"
import { Data, Filter, Option } from "effect/data"
import { Equal, Hash, PrimaryKey } from "effect/interfaces"
import { Cache } from "effect/caching"
import { Array, Iterable } from "effect/collections"

export class Sources extends ServiceMap.Key<Sources>()("stremio/Sources", {
make: Effect.gen(function* () {
const sources = new Set<Source>()
const embellishers = new Set<Embellisher>()
const torrentMeta = yield* TorrentMeta

    const register = (source: Source) =>
      Effect.acquireRelease(
        Effect.sync(() => {
          sources.add(source)
        }),
        () => Effect.sync(() => sources.delete(source)),
      )

    const registerEmbellisher = (embellisher: Embellisher) =>
      Effect.acquireRelease(
        Effect.sync(() => {
          embellishers.add(embellisher)
        }),
        () => Effect.sync(() => embellishers.delete(embellisher)),
      )

    const cinemeta = yield* Cinemeta
    const queriesFromRequest: (
      request: StreamRequest,
    ) => Stream.Stream<VideoQuery> = StreamRequest.$match({
      Channel: ({ id }) => Stream.make(new ChannelQuery({ id })),
      Movie: ({ imdbId }) =>
        Stream.make(new ImdbMovieQuery({ imdbId })).pipe(
          Stream.concat(
            cinemeta.lookupMovie(imdbId).pipe(
              Effect.map((_) => _.queries),
              Effect.tapCause(Effect.logDebug),
              Effect.orElseSucceed(() => []),
              Effect.withSpan("Sources.queriesFromRequest Movie", {
                attributes: { imdbId },
              }),
              Effect.annotateLogs({
                service: "Sources",
                method: "queriesFromRequest",
                kind: "Movie",
              }),
              Stream.fromIterableEffect,
            ),
          ),
        ),
      Series: ({ imdbId, season, episode }) =>
        Stream.make(
          new ImdbSeriesQuery({ imdbId, season, episode }),
          new ImdbSeasonQuery({ imdbId, season, episode }),
        ).pipe(
          Stream.concat(
            cinemeta.lookupEpisode(imdbId, season, episode).pipe(
              Effect.map((_) => _.flatMap((_) => _.queries)),
              Effect.tapCause(Effect.logDebug),
              Effect.orElseSucceed(() => []),
              Effect.withSpan("Sources.queriesFromRequest Series", {
                attributes: { imdbId, season, episode },
              }),
              Effect.annotateLogs({
                service: "Sources",
                method: "queriesFromRequest",
                kind: "Series",
              }),
              Stream.fromIterableEffect,
            ),
          ),
        ),
      Tv: ({ imdbId }) => Stream.make(new ImdbTvQuery({ imdbId })),
    })

    const listUncached = (request: StreamRequest, baseUrl: URL) => {
      const embellisher =
        embellishers.size > 0 ? Iterable.unsafeHead(embellishers) : undefined

      // map request to queries
      return queriesFromRequest(request).pipe(
        Stream.bindTo("query"),
        Stream.let("nonSeasonQuery", ({ query }) => nonSeasonQuery(query)),
        // for each soucre run the queries
        Stream.bind("source", () => Stream.fromIterable(sources)),
        Stream.bind(
          "sourceResult",
          ({ source, query }) =>
            pipe(
              source.list(query),
              Stream.flatMap(
                (result): Stream.Stream<SourceStream | SourceStreamWithFile> =>
                  result._tag === "SourceStream"
                    ? Stream.make(result)
                    : streamsFromSeason(result),
                { concurrency: "unbounded" },
              ),
            ),
          { concurrency: "unbounded" },
        ),
        // filter out non matches
        Stream.filter(
          Filter.fromPredicate(({ sourceResult, nonSeasonQuery }) => {
            if (
              sourceResult.quality === "480p" ||
              sourceResult.quality === "N/A"
            ) {
              return false
            } else if (sourceResult.verified) {
              return true
            }
            return nonSeasonQuery.titleMatcher._tag === "Some"
              ? nonSeasonQuery.titleMatcher.value(sourceResult.title)
              : true
          }),
        ),
        // embellish the results
        embellisher
          ? Stream.bindEffect(
              "result",
              ({ sourceResult }) =>
                embellisher.transform(sourceResult, baseUrl),
              { concurrency: "unbounded" },
            )
          : Stream.filter((item) =>
              item.sourceResult._tag === "SourceStream"
                ? { ...item, result: item.sourceResult }
                : Filter.fail(null),
            ),
        // filter out non matches
        Stream.filter(
          Filter.fromPredicate(({ nonSeasonQuery, result }) => {
            if (result.verified) {
              return true
            }
            return nonSeasonQuery.titleMatcher._tag === "Some"
              ? nonSeasonQuery.titleMatcher.value(result.title)
              : true
          }),
        ),
        // only keep unique results
        Stream.chunks,
        Stream.mapAccum(
          () => new Set<string>(),
          (hashes, chunk) => {
            const filtered = chunk.filter(({ result }) => {
              const hash = result.infoHash.toLowerCase()
              if (hashes.has(hash)) {
                return false
              }
              hashes.add(hash)
              return true
            })
            return [hashes, filtered]
          },
        ),
        // group by quality and return
        Stream.map((_) => _.result),
        Stream.scan(QualityGroup.empty(), QualityGroup.unsafeAdd),
        Stream.takeUntil(QualityGroup.hasEnough),
        Stream.runLast,
        Effect.map(
          Option.match({
            onNone: () => Array.empty<SourceStream>(),
            onSome: (acc) => Object.values(acc).flat(),
          }),
        ),
        Effect.map(Array.sort(SourceStream.Order)),
      )
    }

    const streamsFromSeason = (season: SourceSeason) =>
      pipe(
        torrentMeta.fromMagnet(season.magnetUri),
        Effect.map((result) => result.streams(season)),
        Effect.withSpan("Sources.streamsFromSeason", {
          attributes: { title: season.title, infoHash: season.infoHash },
        }),
        Stream.fromArrayEffect,
        Stream.ignoreCause,
      )

    class ListRequest extends Data.Class<{
      readonly request: StreamRequest
      readonly baseUrl: URL
    }> {
      [Equal.symbol](that: ListRequest): boolean {
        return Equal.equals(this.request, that.request)
      }
      [Hash.symbol]() {
        return Hash.hash(this.request)
      }
      [PrimaryKey.symbol]() {
        return streamRequestId(this.request)
      }
      // get [Schema.symbolWithResult]() {
      //   return {
      //     success: SourceStream.Array,
      //     failure: Schema.String,
      //   }
      // }
    }
    const listCache = yield* Cache.makeWith({
      // storeId: "Sources.listCache",
      lookup: (request: ListRequest) =>
        listUncached(request.request, request.baseUrl),
      timeToLive: (exit) => {
        if (exit._tag === "Failure") return "1 minute"
        return exit.value.length > 5 ? "3 days" : "6 hours"
      },
      capacity: 1024,
    })
    const list = (request: StreamRequest, baseUrl: URL) =>
      Cache.get(listCache, new ListRequest({ request, baseUrl }))

    return { list, register, registerEmbellisher } as const

}),
}) {
static layer = Layer.effect(this)(this.make).pipe(
Layer.provide([TorrentMeta.layer, Cinemeta.layer]),
)
}

// domain

export interface Source {
readonly name: string
readonly list: (
query: VideoQuery,
) => Stream.Stream<SourceStream | SourceStreamWithFile | SourceSeason>
}

export interface Embellisher {
readonly transform: (
stream: SourceStream | SourceStreamWithFile,
baseUrl: URL,
) => Effect.Effect<SourceStream | SourceStreamWithFile>
}

================
File: src/Stremio.ts
================
import { Effect, Layer, pipe, ServiceMap } from "effect"
import {
HttpRouter,
HttpServerRequest,
HttpServerResponse,
} from "effect/unstable/http"
import type \* as Stremio from "stremio-addon-sdk"
import { Sources } from "./Sources.js"
import { configProviderNested } from "./Utils.js"
import { ExtractTag } from "effect/types/Types"
import { Cinemeta } from "./Cinemeta.js"
import { Data, Option, Redacted } from "effect/data"
import { Config, ConfigProvider } from "effect/config"
import { Match } from "effect/match"

export interface AddonConfig {
readonly manifest: Stremio.Manifest
}

const streamParams = HttpRouter.params as Effect.Effect<{
readonly type: Stremio.ContentType
readonly id: string
}>

export type StreamRequest = Data.TaggedEnum<{
Channel: { readonly id: string }
Movie: { readonly imdbId: string }
Series: {
readonly imdbId: string
readonly season: number
readonly episode: number
}
Tv: { readonly imdbId: string }
}>
export declare namespace StreamRequest {
export interface Series extends ExtractTag<StreamRequest, "Series"> {}
}
export const StreamRequest = Data.taggedEnum<StreamRequest>()
export const streamRequestId = StreamRequest.$match({
  Channel: ({ id }) => `Channel:${id}`,
  Movie: ({ imdbId }) => `Movie:${imdbId}`,
  Series: ({ imdbId, season, episode }) =>
    `Series:${imdbId}:${season}:${episode}`,
  Tv: ({ imdbId }) => `Tv:${imdbId}`,
})

export class StremioRouter extends ServiceMap.Key<
StremioRouter,
HttpRouter.HttpRouter

> ()("stremio/StremioRouter") {
> static layer = Layer.effect(StremioRouter)(

    Effect.gen(function* () {
      const router = yield* HttpRouter.HttpRouter
      const token = yield* Config.Redacted("token")

      return router.prefixed(`/${Redacted.value(token)}`)
    }).pipe(
      Effect.provideService(
        ConfigProvider.ConfigProvider,
        configProviderNested("addon"),
      ),
    ),

)
}

const ApiRoutes = Effect.gen(function* () {
const router = yield* StremioRouter
const sources = yield* Sources
const manifest = yield* StremioManifest
const cinemeta = yield* Cinemeta
const baseUrl = yield* Config.String("baseUrl").pipe(
Config.map((url) => new URL(url)),
Config.option,
)
const token = yield* Config.Redacted("token")
const scope = yield* Effect.scope

yield* router.addAll([
HttpRouter.route(
"GET",
"/manifest.json",
Effect.succeed(HttpServerResponse.unsafeJson(manifest)),
),
HttpRouter.route(
"GET",
"/stream/:type/:id.json",
Effect.fnUntraced(function* (request) {
const { type, id } = yield* streamParams
const streamRequest = Match.value(type).pipe(
Match.withReturnType<StreamRequest>(),
Match.when("channel", () => StreamRequest.Channel({ id })),
Match.when("movie", () => StreamRequest.Movie({ imdbId: id })),
Match.when("series", () => {
const [imdbId, season, episode] = id.split(":")
return StreamRequest.Series({
imdbId,
season: +season,
episode: +episode,
})
}),
Match.when("tv", () => StreamRequest.Tv({ imdbId: id })),
Match.exhaustive,
)
yield* Effect.log("StreamRequest", streamRequest)
const url = baseUrl.pipe(
Option.orElse(() => HttpServerRequest.toURL(request)),
Option.getOrElse(() => new URL("http://localhost:8000")),
(url) => {
url.pathname = Redacted.value(token)
return url
},
)
const list = sources.list(streamRequest, url)
const streams =
streamRequest.\_tag === "Series"
? yield* Effect.tap(list, preloadNextEpisode(streamRequest, url))
: yield* list

        return HttpServerResponse.unsafeJson({
          streams: streams.map((_) => _.asStremio),
        })
      }),
    ),

])

const preloadNextEpisode = (current: StreamRequest.Series, baseUrl: URL) =>
pipe(
cinemeta.lookupSeries(current.imdbId),
Effect.flatMap((series) =>
series.findEpisode(current.season, current.episode + 1).asEffect(),
),
Effect.flatMap((video) =>
sources.list(
StreamRequest.Series({
...current,
episode: video.episodeOrNumber,
}),
baseUrl,
),
),
Effect.ignore,
Effect.withSpan("Stremio.preloadNextEpisode", {
attributes: { current },
}),
Effect.forkIn(scope),
)
}).pipe(
Effect.provideService(
ConfigProvider.ConfigProvider,
configProviderNested("addon"),
),
Effect.annotateLogs({ service: "Stremio" }),
Layer.effectDiscard,
Layer.provide([Cinemeta.layer, Sources.layer, StremioRouter.layer]),
)

const HealthRoute = HttpRouter.add(
"GET",
"/health",
HttpServerResponse.text("OK"),
).pipe(Layer.provide(HttpRouter.disableLogger))

const AllRoutes = Layer.mergeAll(ApiRoutes, HealthRoute).pipe(
Layer.provide(HttpRouter.cors()),
)

export class StremioManifest extends ServiceMap.Key<
StremioManifest,
Stremio.Manifest

> ()("stremio/StremioManifest") {
> static layer = (manifest: Stremio.Manifest) => Layer.succeed(this)(manifest)
> static addon = (manifest: Stremio.Manifest) =>

    AllRoutes.pipe(Layer.provide(this.layer(manifest)))

}

================
File: src/TorrentMeta.ts
================
import {
infoHashFromMagnet,
magnetFromHash,
qualityFromTitle,
} from "./Utils.js"
import { SourceStreamWithFile } from "./Domain/SourceStream.js"
import ParseTorrent from "parse-torrent"
import { Effect, Layer, pipe, ServiceMap } from "effect"
import { HttpClient, HttpClientRequest } from "effect/unstable/http"
import { Cache } from "effect/caching"
import { Schema } from "effect/schema"

export class TorrentMeta extends ServiceMap.Key<TorrentMeta>()("TorrentMeta", {
make: Effect.gen(function* () {
const client = (yield* HttpClient.HttpClient).pipe(
HttpClient.mapRequest(
HttpClientRequest.prependUrl("https://itorrents.org/torrent"),
),
HttpClient.filterStatusOk,
)

    const fromHashCache = yield* Cache.makeWith({
      // storeId: "TorrentMeta.fromHash",
      lookup: (infoHash: string) =>
        client.get(`/${infoHash}.torrent`).pipe(
          Effect.flatMap((_) => _.arrayBuffer),
          Effect.flatMap((buffer) =>
            Effect.promise(() => ParseTorrent(new Uint8Array(buffer)) as any),
          ),
          Effect.flatMap(Schema.decodeUnknownEffect(TorrentMetadata)),
          Effect.orDie,
        ),
      timeToLive: (exit) => (exit._tag === "Failure" ? "1 minute" : "3 days"),
      capacity: 512,
    })

    const parse = (buffer: ArrayBuffer) =>
      Effect.promise(() => ParseTorrent(new Uint8Array(buffer)) as any).pipe(
        Effect.flatMap(Schema.decodeUnknownEffect(TorrentMetadata)),
        Effect.orDie,
      )

    const fromMagnet = (magnet: string) =>
      fromHash(infoHashFromMagnet(magnet)).pipe(
        Effect.withSpan("TorrentMeta.fromMagnet", { attributes: { magnet } }),
      )

    const fromHash = (hash: string) =>
      pipe(
        Cache.get(fromHashCache, hash),
        Effect.timeout(5000),
        Effect.withSpan("TorrentMeta.fromHash", { attributes: { hash } }),
      )

    return { fromMagnet, fromHash, parse } as const

}),
}) {
static layer = Layer.effect(this)(this.make)
}

export class TorrentFile extends Schema.Class<TorrentFile>("TorrentFile")({
name: Schema.String,
length: Schema.Number,
path: Schema.String,
}) {}

export class TorrentMetadata extends Schema.Class<TorrentMetadata>(
"TorrentMeta/TorrentMetadata",
)({
name: Schema.String,
infoHash: Schema.String,
files: Schema.NonEmptyArray(TorrentFile),
}) {
streams(options: {
readonly source: string
readonly seeds: number
readonly peers: number
}): Array<SourceStreamWithFile> {
return this.files
.filter((_) => /\.(mp4|mkv|avi)$/.test(_.name))
.map(
(file, index) =>
new SourceStreamWithFile({
source: options.source,
title: file.name,
infoHash: this.infoHash,
magnetUri: magnetFromHash(this.infoHash),
quality: qualityFromTitle(file.name),
seeds: options.seeds,
peers: options.peers,
sizeBytes: file.length,
fileNumber: index,
}),
)
}
}

================
File: src/Tracing.ts
================
import { OtlpTracer } from "effect/unstable/tracing"
import { NodeHttpClient } from "@effect/platform-node"
import { Effect, Layer } from "effect"
import { Config } from "effect/config"
import { Redacted } from "effect/data"

export const TracingLayer = Layer.unwrap(
Effect.gen(function* () {
const apiKey = yield* Config.option(Config.Redacted("HONEYCOMB_API_KEY"))
const dataset = yield* Config.withDefault(
Config.String("HONEYCOMB_DATASET"),
"stremio-effect",
)
if (apiKey.\_tag === "None") {
const endpoint = yield* Config.option(
Config.String("OTEL_EXPORTER_OTLP_ENDPOINT"),
)
if (endpoint.\_tag === "None") {
return Layer.empty
}
return OtlpTracer.layer({
resource: {
serviceName: dataset,
},
url: `${endpoint.value}/v1/traces`,
})
}

    const headers = {
      "X-Honeycomb-Team": Redacted.value(apiKey.value),
      "X-Honeycomb-Dataset": dataset,
    }

    return OtlpTracer.layer({
      resource: {
        serviceName: dataset,
      },
      url: "https://api.honeycomb.io/v1/traces",
      headers,
    })

}),
).pipe(Layer.provide(NodeHttpClient.layerUndici))

================
File: src/Tvdb.ts
================
import {
HttpClient,
HttpClientRequest,
HttpClientResponse,
} from "effect/unstable/http"
import { Effect, Layer, Schedule, ServiceMap } from "effect"
import { configProviderNested } from "./Utils.js"
import { Config, ConfigProvider } from "effect/config"
import { Cache } from "effect/caching"
import { Schema as S, Schema } from "effect/schema"
import { Redacted } from "effect/data"

export class Tvdb extends ServiceMap.Key<Tvdb>()("Tvdb", {
make: Effect.gen(function* () {
const apiKey = yield* Config.Redacted("apiKey")
const client = (yield\* HttpClient.HttpClient).pipe(
HttpClient.mapRequest(
HttpClientRequest.prependUrl("https://api4.thetvdb.com/v4"),
),
HttpClient.filterStatusOk,
HttpClient.retryTransient({
times: 5,
schedule: Schedule.exponential(100),
}),
)

    const apiToken = yield* HttpClientRequest.post("/login").pipe(
      HttpClientRequest.bodyUnsafeJson({
        apikey: Redacted.value(apiKey),
      }),
      client.execute,
      Effect.flatMap(
        HttpClientResponse.schemaBodyJson(
          Schema.Struct({
            data: Schema.Struct({
              token: Schema.String,
            }),
          }),
        ),
      ),
      Effect.scoped,
    )

    const clientWithToken = client.pipe(
      HttpClient.mapRequest(HttpClientRequest.bearerToken(apiToken.data.token)),
    )

    const lookupEpisodeCache = yield* Cache.makeWith({
      // storeId: "Tvdb.lookupEpisode",
      lookup: (id: number) =>
        clientWithToken.get(`/episodes/${id}`).pipe(
          Effect.flatMap(Episode.decodeResponse),
          Effect.scoped,
          Effect.orDie,
          Effect.map((_) => _.data),
          Effect.withSpan("Tvdb.lookupEpisode", { attributes: { id } }),
        ),
      timeToLive: (exit) => (exit._tag === "Success" ? "1 week" : "1 hour"),
      capacity: 512,
    })
    const lookupEpisode = (id: number) => Cache.get(lookupEpisodeCache, id)

    return { lookupEpisode } as const

}).pipe(
Effect.provideService(
ConfigProvider.ConfigProvider,
configProviderNested("tvdb"),
),
),
}) {
static layer = Layer.effect(this)(this.make)
}

export class Season extends S.Class<Season>("Season")({
id: S.Number,
seriesId: S.Number,
number: S.Number,
lastUpdated: S.String,
}) {}

export class EpisodeData extends S.Class<EpisodeData>("Data")({
id: S.Number,
seriesId: S.Number,
isMovie: S.Number,
seasons: S.Array(Season),
number: S.Number,
absoluteNumber: S.Number,
seasonNumber: S.Number,
year: S.String,
}) {}

export class Episode extends S.Class<Episode>("Episode")({
status: S.String,
data: EpisodeData,
}) {
static decodeResponse = HttpClientResponse.schemaBodyJson(this)
}

================
File: src/Utils.ts
================
import { ConfigProvider } from "effect/config"

export const magnetFromHash = (hash: string) =>
`magnet:?xt=urn:btih:${hash}&${trackers}`

const trackers =
"tr=" +
[
"udp://glotorrents.pw:6969/announce",
"udp://tracker.opentrackr.org:1337/announce",
"udp://torrent.gresille.org:80/announce",
"udp://tracker.openbittorrent.com:80",
"udp://tracker.coppersurfer.tk:6969",
"udp://tracker.leechers-paradise.org:6969",
"udp://p4p.arenabg.ch:1337",
"udp://tracker.internetwarriors.net:1337",
]
.map(encodeURIComponent)
.join("&tr=")

export const bytesToSize = (bytes: number) => {
const sizes = ["B", "KB", "MB", "GB", "TB"]
if (bytes === 0) return "0B"
const i = Math.floor(Math.log(bytes) / Math.log(1024))
return `${(bytes / Math.pow(1024, i)).toFixed(2)}${sizes[i]}`
}

export const infoHashFromMagnet = (magnet: string) => {
const match = magnet.match(/urn:btih:([^&]+)/)
return match ? match[1] : ""
}

export const qualityFromTitle = (title: string) => {
const match = title.match(/\d{3,4}p/)
const isHdr = title.includes("HDR")
if (!match) {
return "N/A"
} else if (match[0] === "2160p" && isHdr) {
return "2160p HDR"
}
return match[0]
}

export const configProviderNested = (prefix: string) =>
ConfigProvider.fromEnv().pipe(
ConfigProvider.nested(prefix),
ConfigProvider.constantCase,
)

================
File: .dockerignore
================
.env
.direnv/
node_modules/
\*.tsbuildinfo
data/
dist/

================
File: .envrc
================
use flake
dotenv

================
File: .gitignore
================
.env
.direnv/
node_modules/
\*.tsbuildinfo
data/
dist/

================
File: .prettierrc.json
================
{
"semi": false,
"trailingComma": "all"
}

================
File: Dockerfile
================
FROM node:alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack pnpm install --frozen-lockfile
COPY . .
RUN corepack pnpm build
RUN corepack pnpm prune --prod

FROM node:alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY package.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

CMD ["node", "dist/main.cjs"]

================
File: flake.lock
================
{
"nodes": {
"flake-parts": {
"inputs": {
"nixpkgs-lib": "nixpkgs-lib"
},
"locked": {
"lastModified": 1751413152,
"narHash": "sha256-Tyw1RjYEsp5scoigs1384gIg6e0GoBVjms4aXFfRssQ=",
"owner": "hercules-ci",
"repo": "flake-parts",
"rev": "77826244401ea9de6e3bac47c2db46005e1f30b5",
"type": "github"
},
"original": {
"owner": "hercules-ci",
"repo": "flake-parts",
"type": "github"
}
},
"nixpkgs": {
"locked": {
"lastModified": 1751852175,
"narHash": "sha256-+MLlfTCCOvz4K6AcSPbaPiFM9MYi7fA2Wr1ibmRwIlM=",
"owner": "nixos",
"repo": "nixpkgs",
"rev": "2defa37146df235ef62f566cde69930a86f14df1",
"type": "github"
},
"original": {
"owner": "nixos",
"ref": "nixpkgs-unstable",
"repo": "nixpkgs",
"type": "github"
}
},
"nixpkgs-lib": {
"locked": {
"lastModified": 1751159883,
"narHash": "sha256-urW/Ylk9FIfvXfliA1ywh75yszAbiTEVgpPeinFyVZo=",
"owner": "nix-community",
"repo": "nixpkgs.lib",
"rev": "14a40a1d7fb9afa4739275ac642ed7301a9ba1ab",
"type": "github"
},
"original": {
"owner": "nix-community",
"repo": "nixpkgs.lib",
"type": "github"
}
},
"process-compose-flake": {
"locked": {
"lastModified": 1749418557,
"narHash": "sha256-wJHHckWz4Gvj8HXtM5WVJzSKXAEPvskQANVoRiu2w1w=",
"owner": "Platonic-Systems",
"repo": "process-compose-flake",
"rev": "91dcc48a6298e47e2441ec76df711f4e38eab94e",
"type": "github"
},
"original": {
"owner": "Platonic-Systems",
"repo": "process-compose-flake",
"type": "github"
}
},
"root": {
"inputs": {
"flake-parts": "flake-parts",
"nixpkgs": "nixpkgs",
"process-compose-flake": "process-compose-flake",
"services-flake": "services-flake"
}
},
"services-flake": {
"locked": {
"lastModified": 1751762497,
"narHash": "sha256-GD9n0vKsepwk93i3k6qDskIsaL7Cg5YYgHwdsMfmb2E=",
"owner": "juspay",
"repo": "services-flake",
"rev": "0577b791952b95184770628aae38ce82e2a89223",
"type": "github"
},
"original": {
"owner": "juspay",
"repo": "services-flake",
"type": "github"
}
}
},
"root": "root",
"version": 7
}

================
File: flake.nix
================
{
inputs = {
nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
flake-parts.url = "github:hercules-ci/flake-parts";
process-compose-flake.url = "github:Platonic-Systems/process-compose-flake";
services-flake.url = "github:juspay/services-flake";
};
outputs = inputs @ {flake-parts, ...}:
flake-parts.lib.mkFlake {inherit inputs;} {
systems = inputs.nixpkgs.lib.systems.flakeExposed;
imports = [
inputs.process-compose-flake.flakeModule
];
perSystem = {pkgs, ...}: {
devShells.default = pkgs.mkShell {
nativeBuildInputs = with pkgs; [
bun
corepack
nodejs
];
};

        process-compose."default" = {config, ...}: {
          imports = [
            inputs.services-flake.processComposeModules.default
          ];

          services.redis.redis.enable = true;
          settings.processes.tsx = {
            command = "tsx --watch src/main.ts";
          };
          # settings.processes.bun = {
          #   command = "bun run --smol --watch src/main-bun.ts";
          # };
        };
      };
    };

}

================
File: LICENSE
================
Copyright 2024 Tim Smart

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

================
File: package.json
================
{
"name": "stremio-effect",
"version": "1.0.0",
"type": "module",
"description": "",
"packageManager": "pnpm@9.12.2",
"scripts": {
"test": "echo \"Error: no test specified\" && exit 1",
"build": "tsup"
},
"keywords": [],
"author": "",
"license": "ISC",
"devDependencies": {
"@effect/platform-bun": "https://pkg.pr.new/Effect-TS/effect-smol/@effect/platform-bun@4f156c0",
"@effect/platform-node": "https://pkg.pr.new/Effect-TS/effect-smol/@effect/platform-node@4f156c0",
"@types/parse-torrent": "^5.8.7",
"@types/stremio-addon-sdk": "^1.6.12",
"bun-types": "^1.2.18",
"cheerio": "1.1.0",
"effect": "https://pkg.pr.new/Effect-TS/effect-smol/effect@4f156c0",
"parse-torrent": "^11.0.18",
"prettier": "^3.6.2",
"stremio-addon-sdk": "^1.6.10",
"tsup": "^8.5.0",
"tsx": "^4.20.3",
"typescript": "^5.8.3"
},
"dependencies": {}
}

================
File: README.md
================

# stremio-effect

An educational project to learn how to create a Stremio add-on using Effect.

<a class="thetvdbattribution" style="" href="https://thetvdb.com/subscribe">
  <img src="https://www.thetvdb.com/images/attribution/logo2.png" height="45">
  Metadata provided by TheTVDB.
</a>

## License

MIT

================
File: tsconfig.json
================
{
"compilerOptions": {
"outDir": "dist",
"resolveJsonModule": true,
"skipLibCheck": true,
"moduleResolution": "NodeNext",
"module": "NodeNext",
"allowSyntheticDefaultImports": true,
"noErrorTruncation": true,
"lib": ["ESNext", "DOM"],
"sourceMap": true,
"strict": true,
"strictNullChecks": true,
"target": "ESNext",
"incremental": true,
"plugins": [{ "name": "@effect/language-service" }],
"tsBuildInfoFile": "./tsconfig.tsbuildinfo",
"types": ["bun-types"]
},
"include": ["src/**/*"]
}

================
File: tsup.config.ts
================
import { defineConfig } from "tsup"

export default defineConfig({
entry: ["src/main.ts"],
clean: true,
treeshake: "smallest",
})

================================================================
End of Codebase

================================================================

This file is a merged representation of the entire codebase, combined into a single document by Repomix.

================================================================
File Summary
================================================================

## Purpose:

This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format:

The content is organized as follows:

1. This summary section
2. Repository information
3. Directory structure
4. Multiple file entries, each consisting of:
   a. A separator line (================)
   b. The file path (File: path/to/file)
   c. Another separator line
   d. The full contents of the file
   e. A blank line

## Usage Guidelines:

- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes:

- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded

## Additional Info:

================================================================
Directory Structure
================================================================
public/
vite.svg
src/
App.tsx
index.css
main.tsx
rx.ts
vite-env.d.ts
.gitignore
bun.lock
eslint.config.js
index.html
package.json
README.md
tsconfig.app.json
tsconfig.json
tsconfig.node.json
vite.config.ts

================================================================
Files
================================================================

================
File: public/vite.svg
================
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--logos" width="31.88" height="32" preserveAspectRatio="xMidYMid meet" viewBox="0 0 256 257"><defs><linearGradient id="IconifyId1813088fe1fbc01fb466" x1="-.828%" x2="57.636%" y1="7.652%" y2="78.411%"><stop offset="0%" stop-color="#41D1FF"></stop><stop offset="100%" stop-color="#BD34FE"></stop></linearGradient><linearGradient id="IconifyId1813088fe1fbc01fb467" x1="43.376%" x2="50.316%" y1="2.242%" y2="89.03%"><stop offset="0%" stop-color="#FFEA83"></stop><stop offset="8.333%" stop-color="#FFDD35"></stop><stop offset="100%" stop-color="#FFA800"></stop></linearGradient></defs><path fill="url(#IconifyId1813088fe1fbc01fb466)" d="M255.153 37.938L134.897 252.976c-2.483 4.44-8.862 4.466-11.382.048L.875 37.958c-2.746-4.814 1.371-10.646 6.827-9.67l120.385 21.517a6.537 6.537 0 0 0 2.322-.004l117.867-21.483c5.438-.991 9.574 4.796 6.877 9.62Z"></path><path fill="url(#IconifyId1813088fe1fbc01fb467)" d="M185.432.063L96.44 17.501a3.268 3.268 0 0 0-2.634 3.014l-5.474 92.456a3.268 3.268 0 0 0 3.997 3.378l24.777-5.718c2.318-.535 4.413 1.507 3.936 3.838l-7.361 36.047c-.495 2.426 1.782 4.5 4.151 3.78l15.304-4.649c2.372-.72 4.652 1.36 4.15 3.788l-11.698 56.621c-.732 3.542 3.979 5.473 5.943 2.437l1.313-2.028l72.516-144.72c1.215-2.423-.88-5.186-3.54-4.672l-25.505 4.922c-2.396.462-4.435-1.77-3.759-4.114l16.646-57.705c.677-2.35-1.37-4.583-3.769-4.113Z"></path></svg>

================
File: src/App.tsx
================
import { useRx, useRxRefresh, useRxSet, useRxValue } from "@effect-rx/rx-react";
import {
updateFailsRx,
addTodoRx,
removeTodoRx,
optimisticAddTodosRx,
optimisticRemoveTodosRx,
todosRx,
optimisticTodosRx,
} from "./rx";
import { useState } from "react";

export default function App() {
const [updateFails, setUpdateFails] = useRx(updateFailsRx);
const [input, setInput] = useState("");
const trueTodos = useRxValue(todosRx);
const optimisticTodos = useRxValue(optimisticTodosRx);
const addTodo = useRxSet(optimisticAddTodosRx);
const addTodoState = useRxValue(addTodoRx);

const manuallyRefresh = useRxRefresh(todosRx);

return (
<div className="p-4 max-w-lg mx-auto space-y-4">
<div className="">
<p className="text-lg mb-2">Will fail: {updateFails.toString()}</p>
<button
type="button"
onClick={() => setUpdateFails(!updateFails)}
className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded" >
Toggle update fails
</button>
</div>
<button
type="button"
onClick={() => manuallyRefresh()}
className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded" >
Manually refresh
</button>
<pre>{JSON.stringify(addTodoState, null, 2)}</pre>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={() => addTodo(input)}
          // disabled={addTodoState.waiting}
          className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded disabled:opacity-50"
        >
          {addTodoState.waiting ? "Adding..." : "Add"}
        </button>
      </div>

      <h1>Optimistic Todos</h1>
      <div className="space-y-4">
        {optimisticTodos.map((todo) => (
          <TodoItem key={todo.id} todo={todo} />
        ))}
      </div>

      <h1>True Todos</h1>
      <div className="space-y-4">
        {trueTodos.map((todo) => (
          <TodoItem key={todo.id} todo={todo} />
        ))}
      </div>
    </div>

);
}

function TodoItem({ todo }: { todo: { id: number; text: string } }) {
const removeTodo = useRxSet(optimisticRemoveTodosRx);
const removeTodoState = useRxValue(removeTodoRx);
return (
<div
      key={todo.id}
      className="flex items-center justify-between p-4 bg-gray-100 rounded"
    >
<p className="text-gray-800">
{todo.id}: {todo.text}
</p>
<button
type="button"
onClick={() => removeTodo(todo.id)}
disabled={removeTodoState.waiting}
className="bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-3 rounded disabled:opacity-50" >
{removeTodoState.waiting ? "Removing..." : "Remove"}
</button>
</div>
);
}

================
File: src/index.css
================
@import "tailwindcss";

================
File: src/main.tsx
================
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
<StrictMode>
<App />
</StrictMode>
);

================
File: src/rx.ts
================
import { Effect } from "effect";
import { Rx } from "@effect-rx/rx-react";

export const updateFailsRx = Rx.make(false);

let id = 0;
let todos: {
id: number;
text: string;
}[] = [];
export const todosRx = Rx.make<{ id: number; text: string }[]>(() => {
console.log("todosRx", todos);
return todos;
});
export const optimisticTodosRx = Rx.optimistic(todosRx);

export const addTodoRx = Rx.fn(
Effect.fnUntraced(function* (todo: string, get: Rx.FnContext) {
console.log("addTodoRx", todo);
yield* Effect.sleep("1 second");
if (get(updateFailsRx)) {
yield\* Effect.fail("Update failed");
}

    todos.push({ id: id++, text: todo });

})
);

export const optimisticAddTodosRx = optimisticTodosRx.pipe(
Rx.optimisticFn({
updateToValue: (todo: string, current: { id: number; text: string }[]) => {
console.log("optimisticAddTodosRx", todo);
return [...current, { id: id++, text: todo }];
},
fn: addTodoRx,
})
);

export const removeTodoRx = Rx.fn(
Effect.fnUntraced(function* (id: number, get: Rx.FnContext) {
console.log("removeTodoRx", id);
yield* Effect.sleep("1 second");
if (get(updateFailsRx)) {
yield\* Effect.fail("Update failed");
}
console.log("before", todos);
todos = todos.filter((t) => t.id !== id);
console.log("after", todos);
})
);

export const optimisticRemoveTodosRx = optimisticTodosRx.pipe(
Rx.optimisticFn({
updateToValue: (id: number, current: { id: number; text: string }[]) => {
console.log("optimisticRemoveTodosRx", id);
return current.filter((t) => t.id !== id);
},
fn: removeTodoRx,
})
);

================
File: src/vite-env.d.ts
================
/// <reference types="vite/client" />

================
File: .gitignore
================

# Logs

logs
_.log
npm-debug.log_
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
\*.local

# Editor directories and files

.vscode/_
!.vscode/extensions.json
.idea
.DS_Store
_.suo
_.ntvs_
_.njsproj
_.sln
\*.sw?

================
File: bun.lock
================
{
"lockfileVersion": 1,
"workspaces": {
"": {
"name": "vite-project",
"dependencies": {
"@effect-rx/rx": "0.47.1",
"@effect-rx/rx-react": "^0.40.5",
"@effect/platform-browser": "^0.70.0",
"@tailwindcss/vite": "^4.1.11",
"react": "^19.1.1",
"react-dom": "^19.1.1",
"tailwindcss": "^4.1.11",
"zustand": "^5.0.6",
},
"devDependencies": {
"@eslint/js": "^9.32.0",
"@types/react": "^19.1.9",
"@types/react-dom": "^19.1.7",
"@vitejs/plugin-react": "^4.7.0",
"eslint": "^9.32.0",
"eslint-plugin-react-hooks": "^5.2.0",
"eslint-plugin-react-refresh": "^0.4.20",
"globals": "^16.3.0",
"typescript": "~5.8.3",
"typescript-eslint": "^8.38.0",
"vite": "^7.0.6",
},
},
},
"packages": {
"@ampproject/remapping": ["@ampproject/remapping@2.3.0", "", { "dependencies": { "@jridgewell/gen-mapping": "^0.3.5", "@jridgewell/trace-mapping": "^0.3.24" } }, "sha512-30iZtAPgz+LTIYoeivqYo853f02jBYSd5uGnGpkFV0M3xOt9aN73erkgYAmZU43x4VfqcnLxW9Kpg3R5LC4YYw=="],

    "@babel/code-frame": ["@babel/code-frame@7.27.1", "", { "dependencies": { "@babel/helper-validator-identifier": "^7.27.1", "js-tokens": "^4.0.0", "picocolors": "^1.1.1" } }, "sha512-cjQ7ZlQ0Mv3b47hABuTevyTuYN4i+loJKGeV9flcCgIK37cCXRh+L1bd3iBHlynerhQ7BhCkn2BPbQUL+rGqFg=="],

    "@babel/compat-data": ["@babel/compat-data@7.28.0", "", {}, "sha512-60X7qkglvrap8mn1lh2ebxXdZYtUcpd7gsmy9kLaBJ4i/WdY8PqTSdxyA8qraikqKQK5C1KRBKXqznrVapyNaw=="],

    "@babel/core": ["@babel/core@7.28.0", "", { "dependencies": { "@ampproject/remapping": "^2.2.0", "@babel/code-frame": "^7.27.1", "@babel/generator": "^7.28.0", "@babel/helper-compilation-targets": "^7.27.2", "@babel/helper-module-transforms": "^7.27.3", "@babel/helpers": "^7.27.6", "@babel/parser": "^7.28.0", "@babel/template": "^7.27.2", "@babel/traverse": "^7.28.0", "@babel/types": "^7.28.0", "convert-source-map": "^2.0.0", "debug": "^4.1.0", "gensync": "^1.0.0-beta.2", "json5": "^2.2.3", "semver": "^6.3.1" } }, "sha512-UlLAnTPrFdNGoFtbSXwcGFQBtQZJCNjaN6hQNP3UPvuNXT1i82N26KL3dZeIpNalWywr9IuQuncaAfUaS1g6sQ=="],

    "@babel/generator": ["@babel/generator@7.28.0", "", { "dependencies": { "@babel/parser": "^7.28.0", "@babel/types": "^7.28.0", "@jridgewell/gen-mapping": "^0.3.12", "@jridgewell/trace-mapping": "^0.3.28", "jsesc": "^3.0.2" } }, "sha512-lJjzvrbEeWrhB4P3QBsH7tey117PjLZnDbLiQEKjQ/fNJTjuq4HSqgFA+UNSwZT8D7dxxbnuSBMsa1lrWzKlQg=="],

    "@babel/helper-compilation-targets": ["@babel/helper-compilation-targets@7.27.2", "", { "dependencies": { "@babel/compat-data": "^7.27.2", "@babel/helper-validator-option": "^7.27.1", "browserslist": "^4.24.0", "lru-cache": "^5.1.1", "semver": "^6.3.1" } }, "sha512-2+1thGUUWWjLTYTHZWK1n8Yga0ijBz1XAhUXcKy81rd5g6yh7hGqMp45v7cadSbEHc9G3OTv45SyneRN3ps4DQ=="],

    "@babel/helper-globals": ["@babel/helper-globals@7.28.0", "", {}, "sha512-+W6cISkXFa1jXsDEdYA8HeevQT/FULhxzR99pxphltZcVaugps53THCeiWA8SguxxpSp3gKPiuYfSWopkLQ4hw=="],

    "@babel/helper-module-imports": ["@babel/helper-module-imports@7.27.1", "", { "dependencies": { "@babel/traverse": "^7.27.1", "@babel/types": "^7.27.1" } }, "sha512-0gSFWUPNXNopqtIPQvlD5WgXYI5GY2kP2cCvoT8kczjbfcfuIljTbcWrulD1CIPIX2gt1wghbDy08yE1p+/r3w=="],

    "@babel/helper-module-transforms": ["@babel/helper-module-transforms@7.27.3", "", { "dependencies": { "@babel/helper-module-imports": "^7.27.1", "@babel/helper-validator-identifier": "^7.27.1", "@babel/traverse": "^7.27.3" }, "peerDependencies": { "@babel/core": "^7.0.0" } }, "sha512-dSOvYwvyLsWBeIRyOeHXp5vPj5l1I011r52FM1+r1jCERv+aFXYk4whgQccYEGYxK2H3ZAIA8nuPkQ0HaUo3qg=="],

    "@babel/helper-plugin-utils": ["@babel/helper-plugin-utils@7.27.1", "", {}, "sha512-1gn1Up5YXka3YYAHGKpbideQ5Yjf1tDa9qYcgysz+cNCXukyLl6DjPXhD3VRwSb8c0J9tA4b2+rHEZtc6R0tlw=="],

    "@babel/helper-string-parser": ["@babel/helper-string-parser@7.27.1", "", {}, "sha512-qMlSxKbpRlAridDExk92nSobyDdpPijUq2DW6oDnUqd0iOGxmQjyqhMIihI9+zv4LPyZdRje2cavWPbCbWm3eA=="],

    "@babel/helper-validator-identifier": ["@babel/helper-validator-identifier@7.27.1", "", {}, "sha512-D2hP9eA+Sqx1kBZgzxZh0y1trbuU+JoDkiEwqhQ36nodYqJwyEIhPSdMNd7lOm/4io72luTPWH20Yda0xOuUow=="],

    "@babel/helper-validator-option": ["@babel/helper-validator-option@7.27.1", "", {}, "sha512-YvjJow9FxbhFFKDSuFnVCe2WxXk1zWc22fFePVNEaWJEu8IrZVlda6N0uHwzZrUM1il7NC9Mlp4MaJYbYd9JSg=="],

    "@babel/helpers": ["@babel/helpers@7.28.2", "", { "dependencies": { "@babel/template": "^7.27.2", "@babel/types": "^7.28.2" } }, "sha512-/V9771t+EgXz62aCcyofnQhGM8DQACbRhvzKFsXKC9QM+5MadF8ZmIm0crDMaz3+o0h0zXfJnd4EhbYbxsrcFw=="],

    "@babel/parser": ["@babel/parser@7.28.0", "", { "dependencies": { "@babel/types": "^7.28.0" }, "bin": "./bin/babel-parser.js" }, "sha512-jVZGvOxOuNSsuQuLRTh13nU0AogFlw32w/MT+LV6D3sP5WdbW61E77RnkbaO2dUvmPAYrBDJXGn5gGS6tH4j8g=="],

    "@babel/plugin-transform-react-jsx-self": ["@babel/plugin-transform-react-jsx-self@7.27.1", "", { "dependencies": { "@babel/helper-plugin-utils": "^7.27.1" }, "peerDependencies": { "@babel/core": "^7.0.0-0" } }, "sha512-6UzkCs+ejGdZ5mFFC/OCUrv028ab2fp1znZmCZjAOBKiBK2jXD1O+BPSfX8X2qjJ75fZBMSnQn3Rq2mrBJK2mw=="],

    "@babel/plugin-transform-react-jsx-source": ["@babel/plugin-transform-react-jsx-source@7.27.1", "", { "dependencies": { "@babel/helper-plugin-utils": "^7.27.1" }, "peerDependencies": { "@babel/core": "^7.0.0-0" } }, "sha512-zbwoTsBruTeKB9hSq73ha66iFeJHuaFkUbwvqElnygoNbj/jHRsSeokowZFN3CZ64IvEqcmmkVe89OPXc7ldAw=="],

    "@babel/template": ["@babel/template@7.27.2", "", { "dependencies": { "@babel/code-frame": "^7.27.1", "@babel/parser": "^7.27.2", "@babel/types": "^7.27.1" } }, "sha512-LPDZ85aEJyYSd18/DkjNh4/y1ntkE5KwUHWTiqgRxruuZL2F1yuHligVHLvcHY2vMHXttKFpJn6LwfI7cw7ODw=="],

    "@babel/traverse": ["@babel/traverse@7.28.0", "", { "dependencies": { "@babel/code-frame": "^7.27.1", "@babel/generator": "^7.28.0", "@babel/helper-globals": "^7.28.0", "@babel/parser": "^7.28.0", "@babel/template": "^7.27.2", "@babel/types": "^7.28.0", "debug": "^4.3.1" } }, "sha512-mGe7UK5wWyh0bKRfupsUchrQGqvDbZDbKJw+kcRGSmdHVYrv+ltd0pnpDTVpiTqnaBru9iEvA8pz8W46v0Amwg=="],

    "@babel/types": ["@babel/types@7.28.2", "", { "dependencies": { "@babel/helper-string-parser": "^7.27.1", "@babel/helper-validator-identifier": "^7.27.1" } }, "sha512-ruv7Ae4J5dUYULmeXw1gmb7rYRz57OWCPM57pHojnLq/3Z1CK2lNSLTCVjxVk1F/TZHwOZZrOWi0ur95BbLxNQ=="],

    "@effect-rx/rx": ["@effect-rx/rx@0.47.1", "", { "peerDependencies": { "@effect/platform": "^0.90.0", "effect": "^3.17.0" } }, "sha512-RgH1ZDR5M8cOvU7OfgwDbTak+JMzXpJ9j5M++mDK7qLt6lv427WiTFCEP7bcECmsVNwF0J5Xcc9Myvm7VuVC+A=="],

    "@effect-rx/rx-react": ["@effect-rx/rx-react@0.40.5", "", { "dependencies": { "@effect-rx/rx": "^0.47.0" }, "peerDependencies": { "effect": "^3.17", "react": ">=18 <20", "scheduler": "*" } }, "sha512-c4mBfhwdyvNhJaZ1uZYgxwPwJ9o5hwJ4PwTFlLYZGPkQ7BYeSVKEpJYOGP/4+XyLFjUB9GZPn4biDIpv6vI7TQ=="],

    "@effect/platform": ["@effect/platform@0.90.0", "", { "dependencies": { "@opentelemetry/semantic-conventions": "^1.33.0", "find-my-way-ts": "^0.1.6", "msgpackr": "^1.11.4", "multipasta": "^0.2.7" }, "peerDependencies": { "effect": "^3.17.0" } }, "sha512-F26RZO8qVyCLH43EF9BvJwrhtFsZL2Xv66Jxxjj/sBIes8TOVpyebaysQ7Tz33xALobwU1eNgm8vh18VkJiWnQ=="],

    "@effect/platform-browser": ["@effect/platform-browser@0.70.0", "", { "dependencies": { "multipasta": "^0.2.7" }, "peerDependencies": { "@effect/platform": "^0.90.0", "effect": "^3.17.0" } }, "sha512-dq2ukUralavQIipSsQVuIOLLxBlFWL5Mkg1Fnr8esYPuPv0BXAI39nwNNi75X2tPAgak8OCSD0qh9qhmNj2gPA=="],

    "@esbuild/aix-ppc64": ["@esbuild/aix-ppc64@0.25.8", "", { "os": "aix", "cpu": "ppc64" }, "sha512-urAvrUedIqEiFR3FYSLTWQgLu5tb+m0qZw0NBEasUeo6wuqatkMDaRT+1uABiGXEu5vqgPd7FGE1BhsAIy9QVA=="],

    "@esbuild/android-arm": ["@esbuild/android-arm@0.25.8", "", { "os": "android", "cpu": "arm" }, "sha512-RONsAvGCz5oWyePVnLdZY/HHwA++nxYWIX1atInlaW6SEkwq6XkP3+cb825EUcRs5Vss/lGh/2YxAb5xqc07Uw=="],

    "@esbuild/android-arm64": ["@esbuild/android-arm64@0.25.8", "", { "os": "android", "cpu": "arm64" }, "sha512-OD3p7LYzWpLhZEyATcTSJ67qB5D+20vbtr6vHlHWSQYhKtzUYrETuWThmzFpZtFsBIxRvhO07+UgVA9m0i/O1w=="],

    "@esbuild/android-x64": ["@esbuild/android-x64@0.25.8", "", { "os": "android", "cpu": "x64" }, "sha512-yJAVPklM5+4+9dTeKwHOaA+LQkmrKFX96BM0A/2zQrbS6ENCmxc4OVoBs5dPkCCak2roAD+jKCdnmOqKszPkjA=="],

    "@esbuild/darwin-arm64": ["@esbuild/darwin-arm64@0.25.8", "", { "os": "darwin", "cpu": "arm64" }, "sha512-Jw0mxgIaYX6R8ODrdkLLPwBqHTtYHJSmzzd+QeytSugzQ0Vg4c5rDky5VgkoowbZQahCbsv1rT1KW72MPIkevw=="],

    "@esbuild/darwin-x64": ["@esbuild/darwin-x64@0.25.8", "", { "os": "darwin", "cpu": "x64" }, "sha512-Vh2gLxxHnuoQ+GjPNvDSDRpoBCUzY4Pu0kBqMBDlK4fuWbKgGtmDIeEC081xi26PPjn+1tct+Bh8FjyLlw1Zlg=="],

    "@esbuild/freebsd-arm64": ["@esbuild/freebsd-arm64@0.25.8", "", { "os": "freebsd", "cpu": "arm64" }, "sha512-YPJ7hDQ9DnNe5vxOm6jaie9QsTwcKedPvizTVlqWG9GBSq+BuyWEDazlGaDTC5NGU4QJd666V0yqCBL2oWKPfA=="],

    "@esbuild/freebsd-x64": ["@esbuild/freebsd-x64@0.25.8", "", { "os": "freebsd", "cpu": "x64" }, "sha512-MmaEXxQRdXNFsRN/KcIimLnSJrk2r5H8v+WVafRWz5xdSVmWLoITZQXcgehI2ZE6gioE6HirAEToM/RvFBeuhw=="],

    "@esbuild/linux-arm": ["@esbuild/linux-arm@0.25.8", "", { "os": "linux", "cpu": "arm" }, "sha512-FuzEP9BixzZohl1kLf76KEVOsxtIBFwCaLupVuk4eFVnOZfU+Wsn+x5Ryam7nILV2pkq2TqQM9EZPsOBuMC+kg=="],

    "@esbuild/linux-arm64": ["@esbuild/linux-arm64@0.25.8", "", { "os": "linux", "cpu": "arm64" }, "sha512-WIgg00ARWv/uYLU7lsuDK00d/hHSfES5BzdWAdAig1ioV5kaFNrtK8EqGcUBJhYqotlUByUKz5Qo6u8tt7iD/w=="],

    "@esbuild/linux-ia32": ["@esbuild/linux-ia32@0.25.8", "", { "os": "linux", "cpu": "ia32" }, "sha512-A1D9YzRX1i+1AJZuFFUMP1E9fMaYY+GnSQil9Tlw05utlE86EKTUA7RjwHDkEitmLYiFsRd9HwKBPEftNdBfjg=="],

    "@esbuild/linux-loong64": ["@esbuild/linux-loong64@0.25.8", "", { "os": "linux", "cpu": "none" }, "sha512-O7k1J/dwHkY1RMVvglFHl1HzutGEFFZ3kNiDMSOyUrB7WcoHGf96Sh+64nTRT26l3GMbCW01Ekh/ThKM5iI7hQ=="],

    "@esbuild/linux-mips64el": ["@esbuild/linux-mips64el@0.25.8", "", { "os": "linux", "cpu": "none" }, "sha512-uv+dqfRazte3BzfMp8PAQXmdGHQt2oC/y2ovwpTteqrMx2lwaksiFZ/bdkXJC19ttTvNXBuWH53zy/aTj1FgGw=="],

    "@esbuild/linux-ppc64": ["@esbuild/linux-ppc64@0.25.8", "", { "os": "linux", "cpu": "ppc64" }, "sha512-GyG0KcMi1GBavP5JgAkkstMGyMholMDybAf8wF5A70CALlDM2p/f7YFE7H92eDeH/VBtFJA5MT4nRPDGg4JuzQ=="],

    "@esbuild/linux-riscv64": ["@esbuild/linux-riscv64@0.25.8", "", { "os": "linux", "cpu": "none" }, "sha512-rAqDYFv3yzMrq7GIcen3XP7TUEG/4LK86LUPMIz6RT8A6pRIDn0sDcvjudVZBiiTcZCY9y2SgYX2lgK3AF+1eg=="],

    "@esbuild/linux-s390x": ["@esbuild/linux-s390x@0.25.8", "", { "os": "linux", "cpu": "s390x" }, "sha512-Xutvh6VjlbcHpsIIbwY8GVRbwoviWT19tFhgdA7DlenLGC/mbc3lBoVb7jxj9Z+eyGqvcnSyIltYUrkKzWqSvg=="],

    "@esbuild/linux-x64": ["@esbuild/linux-x64@0.25.8", "", { "os": "linux", "cpu": "x64" }, "sha512-ASFQhgY4ElXh3nDcOMTkQero4b1lgubskNlhIfJrsH5OKZXDpUAKBlNS0Kx81jwOBp+HCeZqmoJuihTv57/jvQ=="],

    "@esbuild/netbsd-arm64": ["@esbuild/netbsd-arm64@0.25.8", "", { "os": "none", "cpu": "arm64" }, "sha512-d1KfruIeohqAi6SA+gENMuObDbEjn22olAR7egqnkCD9DGBG0wsEARotkLgXDu6c4ncgWTZJtN5vcgxzWRMzcw=="],

    "@esbuild/netbsd-x64": ["@esbuild/netbsd-x64@0.25.8", "", { "os": "none", "cpu": "x64" }, "sha512-nVDCkrvx2ua+XQNyfrujIG38+YGyuy2Ru9kKVNyh5jAys6n+l44tTtToqHjino2My8VAY6Lw9H7RI73XFi66Cg=="],

    "@esbuild/openbsd-arm64": ["@esbuild/openbsd-arm64@0.25.8", "", { "os": "openbsd", "cpu": "arm64" }, "sha512-j8HgrDuSJFAujkivSMSfPQSAa5Fxbvk4rgNAS5i3K+r8s1X0p1uOO2Hl2xNsGFppOeHOLAVgYwDVlmxhq5h+SQ=="],

    "@esbuild/openbsd-x64": ["@esbuild/openbsd-x64@0.25.8", "", { "os": "openbsd", "cpu": "x64" }, "sha512-1h8MUAwa0VhNCDp6Af0HToI2TJFAn1uqT9Al6DJVzdIBAd21m/G0Yfc77KDM3uF3T/YaOgQq3qTJHPbTOInaIQ=="],

    "@esbuild/openharmony-arm64": ["@esbuild/openharmony-arm64@0.25.8", "", { "os": "none", "cpu": "arm64" }, "sha512-r2nVa5SIK9tSWd0kJd9HCffnDHKchTGikb//9c7HX+r+wHYCpQrSgxhlY6KWV1nFo1l4KFbsMlHk+L6fekLsUg=="],

    "@esbuild/sunos-x64": ["@esbuild/sunos-x64@0.25.8", "", { "os": "sunos", "cpu": "x64" }, "sha512-zUlaP2S12YhQ2UzUfcCuMDHQFJyKABkAjvO5YSndMiIkMimPmxA+BYSBikWgsRpvyxuRnow4nS5NPnf9fpv41w=="],

    "@esbuild/win32-arm64": ["@esbuild/win32-arm64@0.25.8", "", { "os": "win32", "cpu": "arm64" }, "sha512-YEGFFWESlPva8hGL+zvj2z/SaK+pH0SwOM0Nc/d+rVnW7GSTFlLBGzZkuSU9kFIGIo8q9X3ucpZhu8PDN5A2sQ=="],

    "@esbuild/win32-ia32": ["@esbuild/win32-ia32@0.25.8", "", { "os": "win32", "cpu": "ia32" }, "sha512-hiGgGC6KZ5LZz58OL/+qVVoZiuZlUYlYHNAmczOm7bs2oE1XriPFi5ZHHrS8ACpV5EjySrnoCKmcbQMN+ojnHg=="],

    "@esbuild/win32-x64": ["@esbuild/win32-x64@0.25.8", "", { "os": "win32", "cpu": "x64" }, "sha512-cn3Yr7+OaaZq1c+2pe+8yxC8E144SReCQjN6/2ynubzYjvyqZjTXfQJpAcQpsdJq3My7XADANiYGHoFC69pLQw=="],

    "@eslint-community/eslint-utils": ["@eslint-community/eslint-utils@4.7.0", "", { "dependencies": { "eslint-visitor-keys": "^3.4.3" }, "peerDependencies": { "eslint": "^6.0.0 || ^7.0.0 || >=8.0.0" } }, "sha512-dyybb3AcajC7uha6CvhdVRJqaKyn7w2YKqKyAN37NKYgZT36w+iRb0Dymmc5qEJ549c/S31cMMSFd75bteCpCw=="],

    "@eslint-community/regexpp": ["@eslint-community/regexpp@4.12.1", "", {}, "sha512-CCZCDJuduB9OUkFkY2IgppNZMi2lBQgD2qzwXkEia16cge2pijY/aXi96CJMquDMn3nJdlPV1A5KrJEXwfLNzQ=="],

    "@eslint/config-array": ["@eslint/config-array@0.21.0", "", { "dependencies": { "@eslint/object-schema": "^2.1.6", "debug": "^4.3.1", "minimatch": "^3.1.2" } }, "sha512-ENIdc4iLu0d93HeYirvKmrzshzofPw6VkZRKQGe9Nv46ZnWUzcF1xV01dcvEg/1wXUR61OmmlSfyeyO7EvjLxQ=="],

    "@eslint/config-helpers": ["@eslint/config-helpers@0.3.0", "", {}, "sha512-ViuymvFmcJi04qdZeDc2whTHryouGcDlaxPqarTD0ZE10ISpxGUVZGZDx4w01upyIynL3iu6IXH2bS1NhclQMw=="],

    "@eslint/core": ["@eslint/core@0.15.1", "", { "dependencies": { "@types/json-schema": "^7.0.15" } }, "sha512-bkOp+iumZCCbt1K1CmWf0R9pM5yKpDv+ZXtvSyQpudrI9kuFLp+bM2WOPXImuD/ceQuaa8f5pj93Y7zyECIGNA=="],

    "@eslint/eslintrc": ["@eslint/eslintrc@3.3.1", "", { "dependencies": { "ajv": "^6.12.4", "debug": "^4.3.2", "espree": "^10.0.1", "globals": "^14.0.0", "ignore": "^5.2.0", "import-fresh": "^3.2.1", "js-yaml": "^4.1.0", "minimatch": "^3.1.2", "strip-json-comments": "^3.1.1" } }, "sha512-gtF186CXhIl1p4pJNGZw8Yc6RlshoePRvE0X91oPGb3vZ8pM3qOS9W9NGPat9LziaBV7XrJWGylNQXkGcnM3IQ=="],

    "@eslint/js": ["@eslint/js@9.32.0", "", {}, "sha512-BBpRFZK3eX6uMLKz8WxFOBIFFcGFJ/g8XuwjTHCqHROSIsopI+ddn/d5Cfh36+7+e5edVS8dbSHnBNhrLEX0zg=="],

    "@eslint/object-schema": ["@eslint/object-schema@2.1.6", "", {}, "sha512-RBMg5FRL0I0gs51M/guSAj5/e14VQ4tpZnQNWwuDT66P14I43ItmPfIZRhO9fUVIPOAQXU47atlywZ/czoqFPA=="],

    "@eslint/plugin-kit": ["@eslint/plugin-kit@0.3.4", "", { "dependencies": { "@eslint/core": "^0.15.1", "levn": "^0.4.1" } }, "sha512-Ul5l+lHEcw3L5+k8POx6r74mxEYKG5kOb6Xpy2gCRW6zweT6TEhAf8vhxGgjhqrd/VO/Dirhsb+1hNpD1ue9hw=="],

    "@humanfs/core": ["@humanfs/core@0.19.1", "", {}, "sha512-5DyQ4+1JEUzejeK1JGICcideyfUbGixgS9jNgex5nqkW+cY7WZhxBigmieN5Qnw9ZosSNVC9KQKyb+GUaGyKUA=="],

    "@humanfs/node": ["@humanfs/node@0.16.6", "", { "dependencies": { "@humanfs/core": "^0.19.1", "@humanwhocodes/retry": "^0.3.0" } }, "sha512-YuI2ZHQL78Q5HbhDiBA1X4LmYdXCKCMQIfw0pw7piHJwyREFebJUvrQN4cMssyES6x+vfUbx1CIpaQUKYdQZOw=="],

    "@humanwhocodes/module-importer": ["@humanwhocodes/module-importer@1.0.1", "", {}, "sha512-bxveV4V8v5Yb4ncFTT3rPSgZBOpCkjfK0y4oVVVJwIuDVBRMDXrPyXRL988i5ap9m9bnyEEjWfm5WkBmtffLfA=="],

    "@humanwhocodes/retry": ["@humanwhocodes/retry@0.4.3", "", {}, "sha512-bV0Tgo9K4hfPCek+aMAn81RppFKv2ySDQeMoSZuvTASywNTnVJCArCZE2FWqpvIatKu7VMRLWlR1EazvVhDyhQ=="],

    "@isaacs/fs-minipass": ["@isaacs/fs-minipass@4.0.1", "", { "dependencies": { "minipass": "^7.0.4" } }, "sha512-wgm9Ehl2jpeqP3zw/7mo3kRHFp5MEDhqAdwy1fTGkHAwnkGOVsgpvQhL8B5n1qlb01jV3n/bI0ZfZp5lWA1k4w=="],

    "@jridgewell/gen-mapping": ["@jridgewell/gen-mapping@0.3.12", "", { "dependencies": { "@jridgewell/sourcemap-codec": "^1.5.0", "@jridgewell/trace-mapping": "^0.3.24" } }, "sha512-OuLGC46TjB5BbN1dH8JULVVZY4WTdkF7tV9Ys6wLL1rubZnCMstOhNHueU5bLCrnRuDhKPDM4g6sw4Bel5Gzqg=="],

    "@jridgewell/resolve-uri": ["@jridgewell/resolve-uri@3.1.2", "", {}, "sha512-bRISgCIjP20/tbWSPWMEi54QVPRZExkuD9lJL+UIxUKtwVJA8wW1Trb1jMs1RFXo1CBTNZ/5hpC9QvmKWdopKw=="],

    "@jridgewell/sourcemap-codec": ["@jridgewell/sourcemap-codec@1.5.4", "", {}, "sha512-VT2+G1VQs/9oz078bLrYbecdZKs912zQlkelYpuf+SXF+QvZDYJlbx/LSx+meSAwdDFnF8FVXW92AVjjkVmgFw=="],

    "@jridgewell/trace-mapping": ["@jridgewell/trace-mapping@0.3.29", "", { "dependencies": { "@jridgewell/resolve-uri": "^3.1.0", "@jridgewell/sourcemap-codec": "^1.4.14" } }, "sha512-uw6guiW/gcAGPDhLmd77/6lW8QLeiV5RUTsAX46Db6oLhGaVj4lhnPwb184s1bkc8kdVg/+h988dro8GRDpmYQ=="],

    "@msgpackr-extract/msgpackr-extract-darwin-arm64": ["@msgpackr-extract/msgpackr-extract-darwin-arm64@3.0.3", "", { "os": "darwin", "cpu": "arm64" }, "sha512-QZHtlVgbAdy2zAqNA9Gu1UpIuI8Xvsd1v8ic6B2pZmeFnFcMWiPLfWXh7TVw4eGEZ/C9TH281KwhVoeQUKbyjw=="],

    "@msgpackr-extract/msgpackr-extract-darwin-x64": ["@msgpackr-extract/msgpackr-extract-darwin-x64@3.0.3", "", { "os": "darwin", "cpu": "x64" }, "sha512-mdzd3AVzYKuUmiWOQ8GNhl64/IoFGol569zNRdkLReh6LRLHOXxU4U8eq0JwaD8iFHdVGqSy4IjFL4reoWCDFw=="],

    "@msgpackr-extract/msgpackr-extract-linux-arm": ["@msgpackr-extract/msgpackr-extract-linux-arm@3.0.3", "", { "os": "linux", "cpu": "arm" }, "sha512-fg0uy/dG/nZEXfYilKoRe7yALaNmHoYeIoJuJ7KJ+YyU2bvY8vPv27f7UKhGRpY6euFYqEVhxCFZgAUNQBM3nw=="],

    "@msgpackr-extract/msgpackr-extract-linux-arm64": ["@msgpackr-extract/msgpackr-extract-linux-arm64@3.0.3", "", { "os": "linux", "cpu": "arm64" }, "sha512-YxQL+ax0XqBJDZiKimS2XQaf+2wDGVa1enVRGzEvLLVFeqa5kx2bWbtcSXgsxjQB7nRqqIGFIcLteF/sHeVtQg=="],

    "@msgpackr-extract/msgpackr-extract-linux-x64": ["@msgpackr-extract/msgpackr-extract-linux-x64@3.0.3", "", { "os": "linux", "cpu": "x64" }, "sha512-cvwNfbP07pKUfq1uH+S6KJ7dT9K8WOE4ZiAcsrSes+UY55E/0jLYc+vq+DO7jlmqRb5zAggExKm0H7O/CBaesg=="],

    "@msgpackr-extract/msgpackr-extract-win32-x64": ["@msgpackr-extract/msgpackr-extract-win32-x64@3.0.3", "", { "os": "win32", "cpu": "x64" }, "sha512-x0fWaQtYp4E6sktbsdAqnehxDgEc/VwM7uLsRCYWaiGu0ykYdZPiS8zCWdnjHwyiumousxfBm4SO31eXqwEZhQ=="],

    "@nodelib/fs.scandir": ["@nodelib/fs.scandir@2.1.5", "", { "dependencies": { "@nodelib/fs.stat": "2.0.5", "run-parallel": "^1.1.9" } }, "sha512-vq24Bq3ym5HEQm2NKCr3yXDwjc7vTsEThRDnkp2DK9p1uqLR+DHurm/NOTo0KG7HYHU7eppKZj3MyqYuMBf62g=="],

    "@nodelib/fs.stat": ["@nodelib/fs.stat@2.0.5", "", {}, "sha512-RkhPPp2zrqDAQA/2jNhnztcPAlv64XdhIp7a7454A5ovI7Bukxgt7MX7udwAu3zg1DcpPU0rz3VV1SeaqvY4+A=="],

    "@nodelib/fs.walk": ["@nodelib/fs.walk@1.2.8", "", { "dependencies": { "@nodelib/fs.scandir": "2.1.5", "fastq": "^1.6.0" } }, "sha512-oGB+UxlgWcgQkgwo8GcEGwemoTFt3FIO9ababBmaGwXIoBKZ+GTy0pP185beGg7Llih/NSHSV2XAs1lnznocSg=="],

    "@opentelemetry/semantic-conventions": ["@opentelemetry/semantic-conventions@1.36.0", "", {}, "sha512-TtxJSRD8Ohxp6bKkhrm27JRHAxPczQA7idtcTOMYI+wQRRrfgqxHv1cFbCApcSnNjtXkmzFozn6jQtFrOmbjPQ=="],

    "@rolldown/pluginutils": ["@rolldown/pluginutils@1.0.0-beta.27", "", {}, "sha512-+d0F4MKMCbeVUJwG96uQ4SgAznZNSq93I3V+9NHA4OpvqG8mRCpGdKmK8l/dl02h2CCDHwW2FqilnTyDcAnqjA=="],

    "@rollup/rollup-android-arm-eabi": ["@rollup/rollup-android-arm-eabi@4.46.2", "", { "os": "android", "cpu": "arm" }, "sha512-Zj3Hl6sN34xJtMv7Anwb5Gu01yujyE/cLBDB2gnHTAHaWS1Z38L7kuSG+oAh0giZMqG060f/YBStXtMH6FvPMA=="],

    "@rollup/rollup-android-arm64": ["@rollup/rollup-android-arm64@4.46.2", "", { "os": "android", "cpu": "arm64" }, "sha512-nTeCWY83kN64oQ5MGz3CgtPx8NSOhC5lWtsjTs+8JAJNLcP3QbLCtDDgUKQc/Ro/frpMq4SHUaHN6AMltcEoLQ=="],

    "@rollup/rollup-darwin-arm64": ["@rollup/rollup-darwin-arm64@4.46.2", "", { "os": "darwin", "cpu": "arm64" }, "sha512-HV7bW2Fb/F5KPdM/9bApunQh68YVDU8sO8BvcW9OngQVN3HHHkw99wFupuUJfGR9pYLLAjcAOA6iO+evsbBaPQ=="],

    "@rollup/rollup-darwin-x64": ["@rollup/rollup-darwin-x64@4.46.2", "", { "os": "darwin", "cpu": "x64" }, "sha512-SSj8TlYV5nJixSsm/y3QXfhspSiLYP11zpfwp6G/YDXctf3Xkdnk4woJIF5VQe0of2OjzTt8EsxnJDCdHd2xMA=="],

    "@rollup/rollup-freebsd-arm64": ["@rollup/rollup-freebsd-arm64@4.46.2", "", { "os": "freebsd", "cpu": "arm64" }, "sha512-ZyrsG4TIT9xnOlLsSSi9w/X29tCbK1yegE49RYm3tu3wF1L/B6LVMqnEWyDB26d9Ecx9zrmXCiPmIabVuLmNSg=="],

    "@rollup/rollup-freebsd-x64": ["@rollup/rollup-freebsd-x64@4.46.2", "", { "os": "freebsd", "cpu": "x64" }, "sha512-pCgHFoOECwVCJ5GFq8+gR8SBKnMO+xe5UEqbemxBpCKYQddRQMgomv1104RnLSg7nNvgKy05sLsY51+OVRyiVw=="],

    "@rollup/rollup-linux-arm-gnueabihf": ["@rollup/rollup-linux-arm-gnueabihf@4.46.2", "", { "os": "linux", "cpu": "arm" }, "sha512-EtP8aquZ0xQg0ETFcxUbU71MZlHaw9MChwrQzatiE8U/bvi5uv/oChExXC4mWhjiqK7azGJBqU0tt5H123SzVA=="],

    "@rollup/rollup-linux-arm-musleabihf": ["@rollup/rollup-linux-arm-musleabihf@4.46.2", "", { "os": "linux", "cpu": "arm" }, "sha512-qO7F7U3u1nfxYRPM8HqFtLd+raev2K137dsV08q/LRKRLEc7RsiDWihUnrINdsWQxPR9jqZ8DIIZ1zJJAm5PjQ=="],

    "@rollup/rollup-linux-arm64-gnu": ["@rollup/rollup-linux-arm64-gnu@4.46.2", "", { "os": "linux", "cpu": "arm64" }, "sha512-3dRaqLfcOXYsfvw5xMrxAk9Lb1f395gkoBYzSFcc/scgRFptRXL9DOaDpMiehf9CO8ZDRJW2z45b6fpU5nwjng=="],

    "@rollup/rollup-linux-arm64-musl": ["@rollup/rollup-linux-arm64-musl@4.46.2", "", { "os": "linux", "cpu": "arm64" }, "sha512-fhHFTutA7SM+IrR6lIfiHskxmpmPTJUXpWIsBXpeEwNgZzZZSg/q4i6FU4J8qOGyJ0TR+wXBwx/L7Ho9z0+uDg=="],

    "@rollup/rollup-linux-loongarch64-gnu": ["@rollup/rollup-linux-loongarch64-gnu@4.46.2", "", { "os": "linux", "cpu": "none" }, "sha512-i7wfGFXu8x4+FRqPymzjD+Hyav8l95UIZ773j7J7zRYc3Xsxy2wIn4x+llpunexXe6laaO72iEjeeGyUFmjKeA=="],

    "@rollup/rollup-linux-ppc64-gnu": ["@rollup/rollup-linux-ppc64-gnu@4.46.2", "", { "os": "linux", "cpu": "ppc64" }, "sha512-B/l0dFcHVUnqcGZWKcWBSV2PF01YUt0Rvlurci5P+neqY/yMKchGU8ullZvIv5e8Y1C6wOn+U03mrDylP5q9Yw=="],

    "@rollup/rollup-linux-riscv64-gnu": ["@rollup/rollup-linux-riscv64-gnu@4.46.2", "", { "os": "linux", "cpu": "none" }, "sha512-32k4ENb5ygtkMwPMucAb8MtV8olkPT03oiTxJbgkJa7lJ7dZMr0GCFJlyvy+K8iq7F/iuOr41ZdUHaOiqyR3iQ=="],

    "@rollup/rollup-linux-riscv64-musl": ["@rollup/rollup-linux-riscv64-musl@4.46.2", "", { "os": "linux", "cpu": "none" }, "sha512-t5B2loThlFEauloaQkZg9gxV05BYeITLvLkWOkRXogP4qHXLkWSbSHKM9S6H1schf/0YGP/qNKtiISlxvfmmZw=="],

    "@rollup/rollup-linux-s390x-gnu": ["@rollup/rollup-linux-s390x-gnu@4.46.2", "", { "os": "linux", "cpu": "s390x" }, "sha512-YKjekwTEKgbB7n17gmODSmJVUIvj8CX7q5442/CK80L8nqOUbMtf8b01QkG3jOqyr1rotrAnW6B/qiHwfcuWQA=="],

    "@rollup/rollup-linux-x64-gnu": ["@rollup/rollup-linux-x64-gnu@4.46.2", "", { "os": "linux", "cpu": "x64" }, "sha512-Jj5a9RUoe5ra+MEyERkDKLwTXVu6s3aACP51nkfnK9wJTraCC8IMe3snOfALkrjTYd2G1ViE1hICj0fZ7ALBPA=="],

    "@rollup/rollup-linux-x64-musl": ["@rollup/rollup-linux-x64-musl@4.46.2", "", { "os": "linux", "cpu": "x64" }, "sha512-7kX69DIrBeD7yNp4A5b81izs8BqoZkCIaxQaOpumcJ1S/kmqNFjPhDu1LHeVXv0SexfHQv5cqHsxLOjETuqDuA=="],

    "@rollup/rollup-win32-arm64-msvc": ["@rollup/rollup-win32-arm64-msvc@4.46.2", "", { "os": "win32", "cpu": "arm64" }, "sha512-wiJWMIpeaak/jsbaq2HMh/rzZxHVW1rU6coyeNNpMwk5isiPjSTx0a4YLSlYDwBH/WBvLz+EtsNqQScZTLJy3g=="],

    "@rollup/rollup-win32-ia32-msvc": ["@rollup/rollup-win32-ia32-msvc@4.46.2", "", { "os": "win32", "cpu": "ia32" }, "sha512-gBgaUDESVzMgWZhcyjfs9QFK16D8K6QZpwAaVNJxYDLHWayOta4ZMjGm/vsAEy3hvlS2GosVFlBlP9/Wb85DqQ=="],

    "@rollup/rollup-win32-x64-msvc": ["@rollup/rollup-win32-x64-msvc@4.46.2", "", { "os": "win32", "cpu": "x64" }, "sha512-CvUo2ixeIQGtF6WvuB87XWqPQkoFAFqW+HUo/WzHwuHDvIwZCtjdWXoYCcr06iKGydiqTclC4jU/TNObC/xKZg=="],

    "@standard-schema/spec": ["@standard-schema/spec@1.0.0", "", {}, "sha512-m2bOd0f2RT9k8QJx1JN85cZYyH1RqFBdlwtkSlf4tBDYLCiiZnv1fIIwacK6cqwXavOydf0NPToMQgpKq+dVlA=="],

    "@tailwindcss/node": ["@tailwindcss/node@4.1.11", "", { "dependencies": { "@ampproject/remapping": "^2.3.0", "enhanced-resolve": "^5.18.1", "jiti": "^2.4.2", "lightningcss": "1.30.1", "magic-string": "^0.30.17", "source-map-js": "^1.2.1", "tailwindcss": "4.1.11" } }, "sha512-yzhzuGRmv5QyU9qLNg4GTlYI6STedBWRE7NjxP45CsFYYq9taI0zJXZBMqIC/c8fViNLhmrbpSFS57EoxUmD6Q=="],

    "@tailwindcss/oxide": ["@tailwindcss/oxide@4.1.11", "", { "dependencies": { "detect-libc": "^2.0.4", "tar": "^7.4.3" }, "optionalDependencies": { "@tailwindcss/oxide-android-arm64": "4.1.11", "@tailwindcss/oxide-darwin-arm64": "4.1.11", "@tailwindcss/oxide-darwin-x64": "4.1.11", "@tailwindcss/oxide-freebsd-x64": "4.1.11", "@tailwindcss/oxide-linux-arm-gnueabihf": "4.1.11", "@tailwindcss/oxide-linux-arm64-gnu": "4.1.11", "@tailwindcss/oxide-linux-arm64-musl": "4.1.11", "@tailwindcss/oxide-linux-x64-gnu": "4.1.11", "@tailwindcss/oxide-linux-x64-musl": "4.1.11", "@tailwindcss/oxide-wasm32-wasi": "4.1.11", "@tailwindcss/oxide-win32-arm64-msvc": "4.1.11", "@tailwindcss/oxide-win32-x64-msvc": "4.1.11" } }, "sha512-Q69XzrtAhuyfHo+5/HMgr1lAiPP/G40OMFAnws7xcFEYqcypZmdW8eGXaOUIeOl1dzPJBPENXgbjsOyhg2nkrg=="],

    "@tailwindcss/oxide-android-arm64": ["@tailwindcss/oxide-android-arm64@4.1.11", "", { "os": "android", "cpu": "arm64" }, "sha512-3IfFuATVRUMZZprEIx9OGDjG3Ou3jG4xQzNTvjDoKmU9JdmoCohQJ83MYd0GPnQIu89YoJqvMM0G3uqLRFtetg=="],

    "@tailwindcss/oxide-darwin-arm64": ["@tailwindcss/oxide-darwin-arm64@4.1.11", "", { "os": "darwin", "cpu": "arm64" }, "sha512-ESgStEOEsyg8J5YcMb1xl8WFOXfeBmrhAwGsFxxB2CxY9evy63+AtpbDLAyRkJnxLy2WsD1qF13E97uQyP1lfQ=="],

    "@tailwindcss/oxide-darwin-x64": ["@tailwindcss/oxide-darwin-x64@4.1.11", "", { "os": "darwin", "cpu": "x64" }, "sha512-EgnK8kRchgmgzG6jE10UQNaH9Mwi2n+yw1jWmof9Vyg2lpKNX2ioe7CJdf9M5f8V9uaQxInenZkOxnTVL3fhAw=="],

    "@tailwindcss/oxide-freebsd-x64": ["@tailwindcss/oxide-freebsd-x64@4.1.11", "", { "os": "freebsd", "cpu": "x64" }, "sha512-xdqKtbpHs7pQhIKmqVpxStnY1skuNh4CtbcyOHeX1YBE0hArj2romsFGb6yUmzkq/6M24nkxDqU8GYrKrz+UcA=="],

    "@tailwindcss/oxide-linux-arm-gnueabihf": ["@tailwindcss/oxide-linux-arm-gnueabihf@4.1.11", "", { "os": "linux", "cpu": "arm" }, "sha512-ryHQK2eyDYYMwB5wZL46uoxz2zzDZsFBwfjssgB7pzytAeCCa6glsiJGjhTEddq/4OsIjsLNMAiMlHNYnkEEeg=="],

    "@tailwindcss/oxide-linux-arm64-gnu": ["@tailwindcss/oxide-linux-arm64-gnu@4.1.11", "", { "os": "linux", "cpu": "arm64" }, "sha512-mYwqheq4BXF83j/w75ewkPJmPZIqqP1nhoghS9D57CLjsh3Nfq0m4ftTotRYtGnZd3eCztgbSPJ9QhfC91gDZQ=="],

    "@tailwindcss/oxide-linux-arm64-musl": ["@tailwindcss/oxide-linux-arm64-musl@4.1.11", "", { "os": "linux", "cpu": "arm64" }, "sha512-m/NVRFNGlEHJrNVk3O6I9ggVuNjXHIPoD6bqay/pubtYC9QIdAMpS+cswZQPBLvVvEF6GtSNONbDkZrjWZXYNQ=="],

    "@tailwindcss/oxide-linux-x64-gnu": ["@tailwindcss/oxide-linux-x64-gnu@4.1.11", "", { "os": "linux", "cpu": "x64" }, "sha512-YW6sblI7xukSD2TdbbaeQVDysIm/UPJtObHJHKxDEcW2exAtY47j52f8jZXkqE1krdnkhCMGqP3dbniu1Te2Fg=="],

    "@tailwindcss/oxide-linux-x64-musl": ["@tailwindcss/oxide-linux-x64-musl@4.1.11", "", { "os": "linux", "cpu": "x64" }, "sha512-e3C/RRhGunWYNC3aSF7exsQkdXzQ/M+aYuZHKnw4U7KQwTJotnWsGOIVih0s2qQzmEzOFIJ3+xt7iq67K/p56Q=="],

    "@tailwindcss/oxide-wasm32-wasi": ["@tailwindcss/oxide-wasm32-wasi@4.1.11", "", { "dependencies": { "@emnapi/core": "^1.4.3", "@emnapi/runtime": "^1.4.3", "@emnapi/wasi-threads": "^1.0.2", "@napi-rs/wasm-runtime": "^0.2.11", "@tybys/wasm-util": "^0.9.0", "tslib": "^2.8.0" }, "cpu": "none" }, "sha512-Xo1+/GU0JEN/C/dvcammKHzeM6NqKovG+6921MR6oadee5XPBaKOumrJCXvopJ/Qb5TH7LX/UAywbqrP4lax0g=="],

    "@tailwindcss/oxide-win32-arm64-msvc": ["@tailwindcss/oxide-win32-arm64-msvc@4.1.11", "", { "os": "win32", "cpu": "arm64" }, "sha512-UgKYx5PwEKrac3GPNPf6HVMNhUIGuUh4wlDFR2jYYdkX6pL/rn73zTq/4pzUm8fOjAn5L8zDeHp9iXmUGOXZ+w=="],

    "@tailwindcss/oxide-win32-x64-msvc": ["@tailwindcss/oxide-win32-x64-msvc@4.1.11", "", { "os": "win32", "cpu": "x64" }, "sha512-YfHoggn1j0LK7wR82TOucWc5LDCguHnoS879idHekmmiR7g9HUtMw9MI0NHatS28u/Xlkfi9w5RJWgz2Dl+5Qg=="],

    "@tailwindcss/vite": ["@tailwindcss/vite@4.1.11", "", { "dependencies": { "@tailwindcss/node": "4.1.11", "@tailwindcss/oxide": "4.1.11", "tailwindcss": "4.1.11" }, "peerDependencies": { "vite": "^5.2.0 || ^6 || ^7" } }, "sha512-RHYhrR3hku0MJFRV+fN2gNbDNEh3dwKvY8XJvTxCSXeMOsCRSr+uKvDWQcbizrHgjML6ZmTE5OwMrl5wKcujCw=="],

    "@types/babel__core": ["@types/babel__core@7.20.5", "", { "dependencies": { "@babel/parser": "^7.20.7", "@babel/types": "^7.20.7", "@types/babel__generator": "*", "@types/babel__template": "*", "@types/babel__traverse": "*" } }, "sha512-qoQprZvz5wQFJwMDqeseRXWv3rqMvhgpbXFfVyWhbx9X47POIA6i/+dXefEmZKoAgOaTdaIgNSMqMIU61yRyzA=="],

    "@types/babel__generator": ["@types/babel__generator@7.27.0", "", { "dependencies": { "@babel/types": "^7.0.0" } }, "sha512-ufFd2Xi92OAVPYsy+P4n7/U7e68fex0+Ee8gSG9KX7eo084CWiQ4sdxktvdl0bOPupXtVJPY19zk6EwWqUQ8lg=="],

    "@types/babel__template": ["@types/babel__template@7.4.4", "", { "dependencies": { "@babel/parser": "^7.1.0", "@babel/types": "^7.0.0" } }, "sha512-h/NUaSyG5EyxBIp8YRxo4RMe2/qQgvyowRwVMzhYhBCONbW8PUsg4lkFMrhgZhUe5z3L3MiLDuvyJ/CaPa2A8A=="],

    "@types/babel__traverse": ["@types/babel__traverse@7.20.7", "", { "dependencies": { "@babel/types": "^7.20.7" } }, "sha512-dkO5fhS7+/oos4ciWxyEyjWe48zmG6wbCheo/G2ZnHx4fs3EU6YC6UM8rk56gAjNJ9P3MTH2jo5jb92/K6wbng=="],

    "@types/estree": ["@types/estree@1.0.8", "", {}, "sha512-dWHzHa2WqEXI/O1E9OjrocMTKJl2mSrEolh1Iomrv6U+JuNwaHXsXx9bLu5gG7BUWFIN0skIQJQ/L1rIex4X6w=="],

    "@types/json-schema": ["@types/json-schema@7.0.15", "", {}, "sha512-5+fP8P8MFNC+AyZCDxrB2pkZFPGzqQWUzpSeuuVLvm8VMcorNYavBqoFcxK8bQz4Qsbn4oUEEem4wDLfcysGHA=="],

    "@types/react": ["@types/react@19.1.9", "", { "dependencies": { "csstype": "^3.0.2" } }, "sha512-WmdoynAX8Stew/36uTSVMcLJJ1KRh6L3IZRx1PZ7qJtBqT3dYTgyDTx8H1qoRghErydW7xw9mSJ3wS//tCRpFA=="],

    "@types/react-dom": ["@types/react-dom@19.1.7", "", { "peerDependencies": { "@types/react": "^19.0.0" } }, "sha512-i5ZzwYpqjmrKenzkoLM2Ibzt6mAsM7pxB6BCIouEVVmgiqaMj1TjaK7hnA36hbW5aZv20kx7Lw6hWzPWg0Rurw=="],

    "@typescript-eslint/eslint-plugin": ["@typescript-eslint/eslint-plugin@8.38.0", "", { "dependencies": { "@eslint-community/regexpp": "^4.10.0", "@typescript-eslint/scope-manager": "8.38.0", "@typescript-eslint/type-utils": "8.38.0", "@typescript-eslint/utils": "8.38.0", "@typescript-eslint/visitor-keys": "8.38.0", "graphemer": "^1.4.0", "ignore": "^7.0.0", "natural-compare": "^1.4.0", "ts-api-utils": "^2.1.0" }, "peerDependencies": { "@typescript-eslint/parser": "^8.38.0", "eslint": "^8.57.0 || ^9.0.0", "typescript": ">=4.8.4 <5.9.0" } }, "sha512-CPoznzpuAnIOl4nhj4tRr4gIPj5AfKgkiJmGQDaq+fQnRJTYlcBjbX3wbciGmpoPf8DREufuPRe1tNMZnGdanA=="],

    "@typescript-eslint/parser": ["@typescript-eslint/parser@8.38.0", "", { "dependencies": { "@typescript-eslint/scope-manager": "8.38.0", "@typescript-eslint/types": "8.38.0", "@typescript-eslint/typescript-estree": "8.38.0", "@typescript-eslint/visitor-keys": "8.38.0", "debug": "^4.3.4" }, "peerDependencies": { "eslint": "^8.57.0 || ^9.0.0", "typescript": ">=4.8.4 <5.9.0" } }, "sha512-Zhy8HCvBUEfBECzIl1PKqF4p11+d0aUJS1GeUiuqK9WmOug8YCmC4h4bjyBvMyAMI9sbRczmrYL5lKg/YMbrcQ=="],

    "@typescript-eslint/project-service": ["@typescript-eslint/project-service@8.38.0", "", { "dependencies": { "@typescript-eslint/tsconfig-utils": "^8.38.0", "@typescript-eslint/types": "^8.38.0", "debug": "^4.3.4" }, "peerDependencies": { "typescript": ">=4.8.4 <5.9.0" } }, "sha512-dbK7Jvqcb8c9QfH01YB6pORpqX1mn5gDZc9n63Ak/+jD67oWXn3Gs0M6vddAN+eDXBCS5EmNWzbSxsn9SzFWWg=="],

    "@typescript-eslint/scope-manager": ["@typescript-eslint/scope-manager@8.38.0", "", { "dependencies": { "@typescript-eslint/types": "8.38.0", "@typescript-eslint/visitor-keys": "8.38.0" } }, "sha512-WJw3AVlFFcdT9Ri1xs/lg8LwDqgekWXWhH3iAF+1ZM+QPd7oxQ6jvtW/JPwzAScxitILUIFs0/AnQ/UWHzbATQ=="],

    "@typescript-eslint/tsconfig-utils": ["@typescript-eslint/tsconfig-utils@8.38.0", "", { "peerDependencies": { "typescript": ">=4.8.4 <5.9.0" } }, "sha512-Lum9RtSE3EroKk/bYns+sPOodqb2Fv50XOl/gMviMKNvanETUuUcC9ObRbzrJ4VSd2JalPqgSAavwrPiPvnAiQ=="],

    "@typescript-eslint/type-utils": ["@typescript-eslint/type-utils@8.38.0", "", { "dependencies": { "@typescript-eslint/types": "8.38.0", "@typescript-eslint/typescript-estree": "8.38.0", "@typescript-eslint/utils": "8.38.0", "debug": "^4.3.4", "ts-api-utils": "^2.1.0" }, "peerDependencies": { "eslint": "^8.57.0 || ^9.0.0", "typescript": ">=4.8.4 <5.9.0" } }, "sha512-c7jAvGEZVf0ao2z+nnz8BUaHZD09Agbh+DY7qvBQqLiz8uJzRgVPj5YvOh8I8uEiH8oIUGIfHzMwUcGVco/SJg=="],

    "@typescript-eslint/types": ["@typescript-eslint/types@8.38.0", "", {}, "sha512-wzkUfX3plUqij4YwWaJyqhiPE5UCRVlFpKn1oCRn2O1bJ592XxWJj8ROQ3JD5MYXLORW84063z3tZTb/cs4Tyw=="],

    "@typescript-eslint/typescript-estree": ["@typescript-eslint/typescript-estree@8.38.0", "", { "dependencies": { "@typescript-eslint/project-service": "8.38.0", "@typescript-eslint/tsconfig-utils": "8.38.0", "@typescript-eslint/types": "8.38.0", "@typescript-eslint/visitor-keys": "8.38.0", "debug": "^4.3.4", "fast-glob": "^3.3.2", "is-glob": "^4.0.3", "minimatch": "^9.0.4", "semver": "^7.6.0", "ts-api-utils": "^2.1.0" }, "peerDependencies": { "typescript": ">=4.8.4 <5.9.0" } }, "sha512-fooELKcAKzxux6fA6pxOflpNS0jc+nOQEEOipXFNjSlBS6fqrJOVY/whSn70SScHrcJ2LDsxWrneFoWYSVfqhQ=="],

    "@typescript-eslint/utils": ["@typescript-eslint/utils@8.38.0", "", { "dependencies": { "@eslint-community/eslint-utils": "^4.7.0", "@typescript-eslint/scope-manager": "8.38.0", "@typescript-eslint/types": "8.38.0", "@typescript-eslint/typescript-estree": "8.38.0" }, "peerDependencies": { "eslint": "^8.57.0 || ^9.0.0", "typescript": ">=4.8.4 <5.9.0" } }, "sha512-hHcMA86Hgt+ijJlrD8fX0j1j8w4C92zue/8LOPAFioIno+W0+L7KqE8QZKCcPGc/92Vs9x36w/4MPTJhqXdyvg=="],

    "@typescript-eslint/visitor-keys": ["@typescript-eslint/visitor-keys@8.38.0", "", { "dependencies": { "@typescript-eslint/types": "8.38.0", "eslint-visitor-keys": "^4.2.1" } }, "sha512-pWrTcoFNWuwHlA9CvlfSsGWs14JxfN1TH25zM5L7o0pRLhsoZkDnTsXfQRJBEWJoV5DL0jf+Z+sxiud+K0mq1g=="],

    "@vitejs/plugin-react": ["@vitejs/plugin-react@4.7.0", "", { "dependencies": { "@babel/core": "^7.28.0", "@babel/plugin-transform-react-jsx-self": "^7.27.1", "@babel/plugin-transform-react-jsx-source": "^7.27.1", "@rolldown/pluginutils": "1.0.0-beta.27", "@types/babel__core": "^7.20.5", "react-refresh": "^0.17.0" }, "peerDependencies": { "vite": "^4.2.0 || ^5.0.0 || ^6.0.0 || ^7.0.0" } }, "sha512-gUu9hwfWvvEDBBmgtAowQCojwZmJ5mcLn3aufeCsitijs3+f2NsrPtlAWIR6OPiqljl96GVCUbLe0HyqIpVaoA=="],

    "acorn": ["acorn@8.15.0", "", { "bin": { "acorn": "bin/acorn" } }, "sha512-NZyJarBfL7nWwIq+FDL6Zp/yHEhePMNnnJ0y3qfieCrmNvYct8uvtiV41UvlSe6apAfk0fY1FbWx+NwfmpvtTg=="],

    "acorn-jsx": ["acorn-jsx@5.3.2", "", { "peerDependencies": { "acorn": "^6.0.0 || ^7.0.0 || ^8.0.0" } }, "sha512-rq9s+JNhf0IChjtDXxllJ7g41oZk5SlXtp0LHwyA5cejwn7vKmKp4pPri6YEePv2PU65sAsegbXtIinmDFDXgQ=="],

    "ajv": ["ajv@6.12.6", "", { "dependencies": { "fast-deep-equal": "^3.1.1", "fast-json-stable-stringify": "^2.0.0", "json-schema-traverse": "^0.4.1", "uri-js": "^4.2.2" } }, "sha512-j3fVLgvTo527anyYyJOGTYJbG+vnnQYvE0m5mmkc1TK+nxAppkCLMIL0aZ4dblVCNoGShhm+kzE4ZUykBoMg4g=="],

    "ansi-styles": ["ansi-styles@4.3.0", "", { "dependencies": { "color-convert": "^2.0.1" } }, "sha512-zbB9rCJAT1rbjiVDb2hqKFHNYLxgtk8NURxZ3IZwD3F6NtxbXZQCnnSi1Lkx+IDohdPlFp222wVALIheZJQSEg=="],

    "argparse": ["argparse@2.0.1", "", {}, "sha512-8+9WqebbFzpX9OR+Wa6O29asIogeRMzcGtAINdpMHHyAg10f05aSFVBbcEqGf/PXw1EjAZ+q2/bEBg3DvurK3Q=="],

    "balanced-match": ["balanced-match@1.0.2", "", {}, "sha512-3oSeUO0TMV67hN1AmbXsK4yaqU7tjiHlbxRDZOpH0KW9+CeX4bRAaX0Anxt0tx2MrpRpWwQaPwIlISEJhYU5Pw=="],

    "brace-expansion": ["brace-expansion@1.1.12", "", { "dependencies": { "balanced-match": "^1.0.0", "concat-map": "0.0.1" } }, "sha512-9T9UjW3r0UW5c1Q7GTwllptXwhvYmEzFhzMfZ9H7FQWt+uZePjZPjBP/W1ZEyZ1twGWom5/56TF4lPcqjnDHcg=="],

    "braces": ["braces@3.0.3", "", { "dependencies": { "fill-range": "^7.1.1" } }, "sha512-yQbXgO/OSZVD2IsiLlro+7Hf6Q18EJrKSEsdoMzKePKXct3gvD8oLcOQdIzGupr5Fj+EDe8gO/lxc1BzfMpxvA=="],

    "browserslist": ["browserslist@4.25.1", "", { "dependencies": { "caniuse-lite": "^1.0.30001726", "electron-to-chromium": "^1.5.173", "node-releases": "^2.0.19", "update-browserslist-db": "^1.1.3" }, "bin": { "browserslist": "cli.js" } }, "sha512-KGj0KoOMXLpSNkkEI6Z6mShmQy0bc1I+T7K9N81k4WWMrfz+6fQ6es80B/YLAeRoKvjYE1YSHHOW1qe9xIVzHw=="],

    "callsites": ["callsites@3.1.0", "", {}, "sha512-P8BjAsXvZS+VIDUI11hHCQEv74YT67YUi5JJFNWIqL235sBmjX4+qx9Muvls5ivyNENctx46xQLQ3aTuE7ssaQ=="],

    "caniuse-lite": ["caniuse-lite@1.0.30001731", "", {}, "sha512-lDdp2/wrOmTRWuoB5DpfNkC0rJDU8DqRa6nYL6HK6sytw70QMopt/NIc/9SM7ylItlBWfACXk0tEn37UWM/+mg=="],

    "chalk": ["chalk@4.1.2", "", { "dependencies": { "ansi-styles": "^4.1.0", "supports-color": "^7.1.0" } }, "sha512-oKnbhFyRIXpUuez8iBMmyEa4nbj4IOQyuhc/wy9kY7/WVPcwIO9VA668Pu8RkO7+0G76SLROeyw9CpQ061i4mA=="],

    "chownr": ["chownr@3.0.0", "", {}, "sha512-+IxzY9BZOQd/XuYPRmrvEVjF/nqj5kgT4kEq7VofrDoM1MxoRjEWkrCC3EtLi59TVawxTAn+orJwFQcrqEN1+g=="],

    "color-convert": ["color-convert@2.0.1", "", { "dependencies": { "color-name": "~1.1.4" } }, "sha512-RRECPsj7iu/xb5oKYcsFHSppFNnsj/52OVTRKb4zP5onXwVF3zVmmToNcOfGC+CRDpfK/U584fMg38ZHCaElKQ=="],

    "color-name": ["color-name@1.1.4", "", {}, "sha512-dOy+3AuW3a2wNbZHIuMZpTcgjGuLU/uBL/ubcZF9OXbDo8ff4O8yVp5Bf0efS8uEoYo5q4Fx7dY9OgQGXgAsQA=="],

    "concat-map": ["concat-map@0.0.1", "", {}, "sha512-/Srv4dswyQNBfohGpz9o6Yb3Gz3SrUDqBH5rTuhGR7ahtlbYKnVxw2bCFMRljaA7EXHaXZ8wsHdodFvbkhKmqg=="],

    "convert-source-map": ["convert-source-map@2.0.0", "", {}, "sha512-Kvp459HrV2FEJ1CAsi1Ku+MY3kasH19TFykTz2xWmMeq6bk2NU3XXvfJ+Q61m0xktWwt+1HSYf3JZsTms3aRJg=="],

    "cross-spawn": ["cross-spawn@7.0.6", "", { "dependencies": { "path-key": "^3.1.0", "shebang-command": "^2.0.0", "which": "^2.0.1" } }, "sha512-uV2QOWP2nWzsy2aMp8aRibhi9dlzF5Hgh5SHaB9OiTGEyDTiJJyx0uy51QXdyWbtAHNua4XJzUKca3OzKUd3vA=="],

    "csstype": ["csstype@3.1.3", "", {}, "sha512-M1uQkMl8rQK/szD0LNhtqxIPLpimGm8sOBwU7lLnCpSbTyY3yeU1Vc7l4KT5zT4s/yOxHH5O7tIuuLOCnLADRw=="],

    "debug": ["debug@4.4.1", "", { "dependencies": { "ms": "^2.1.3" } }, "sha512-KcKCqiftBJcZr++7ykoDIEwSa3XWowTfNPo92BYxjXiyYEVrUQh2aLyhxBCwww+heortUFxEJYcRzosstTEBYQ=="],

    "deep-is": ["deep-is@0.1.4", "", {}, "sha512-oIPzksmTg4/MriiaYGO+okXDT7ztn/w3Eptv/+gSIdMdKsJo0u4CfYNFJPy+4SKMuCqGw2wxnA+URMg3t8a/bQ=="],

    "detect-libc": ["detect-libc@2.0.4", "", {}, "sha512-3UDv+G9CsCKO1WKMGw9fwq/SWJYbI0c5Y7LU1AXYoDdbhE2AHQ6N6Nb34sG8Fj7T5APy8qXDCKuuIHd1BR0tVA=="],

    "effect": ["effect@3.17.3", "", { "dependencies": { "@standard-schema/spec": "^1.0.0", "fast-check": "^3.23.1" } }, "sha512-FbFMr6xBXPII5Od8QJnkHz+2GTmQgq+8NPQev6C2k9cf1lcUjQ4vpw1kjbMc2X0UkjIkIWe0EtNK2RV6bl34UQ=="],

    "electron-to-chromium": ["electron-to-chromium@1.5.192", "", {}, "sha512-rP8Ez0w7UNw/9j5eSXCe10o1g/8B1P5SM90PCCMVkIRQn2R0LEHWz4Eh9RnxkniuDe1W0cTSOB3MLlkTGDcuCg=="],

    "enhanced-resolve": ["enhanced-resolve@5.18.2", "", { "dependencies": { "graceful-fs": "^4.2.4", "tapable": "^2.2.0" } }, "sha512-6Jw4sE1maoRJo3q8MsSIn2onJFbLTOjY9hlx4DZXmOKvLRd1Ok2kXmAGXaafL2+ijsJZ1ClYbl/pmqr9+k4iUQ=="],

    "esbuild": ["esbuild@0.25.8", "", { "optionalDependencies": { "@esbuild/aix-ppc64": "0.25.8", "@esbuild/android-arm": "0.25.8", "@esbuild/android-arm64": "0.25.8", "@esbuild/android-x64": "0.25.8", "@esbuild/darwin-arm64": "0.25.8", "@esbuild/darwin-x64": "0.25.8", "@esbuild/freebsd-arm64": "0.25.8", "@esbuild/freebsd-x64": "0.25.8", "@esbuild/linux-arm": "0.25.8", "@esbuild/linux-arm64": "0.25.8", "@esbuild/linux-ia32": "0.25.8", "@esbuild/linux-loong64": "0.25.8", "@esbuild/linux-mips64el": "0.25.8", "@esbuild/linux-ppc64": "0.25.8", "@esbuild/linux-riscv64": "0.25.8", "@esbuild/linux-s390x": "0.25.8", "@esbuild/linux-x64": "0.25.8", "@esbuild/netbsd-arm64": "0.25.8", "@esbuild/netbsd-x64": "0.25.8", "@esbuild/openbsd-arm64": "0.25.8", "@esbuild/openbsd-x64": "0.25.8", "@esbuild/openharmony-arm64": "0.25.8", "@esbuild/sunos-x64": "0.25.8", "@esbuild/win32-arm64": "0.25.8", "@esbuild/win32-ia32": "0.25.8", "@esbuild/win32-x64": "0.25.8" }, "bin": { "esbuild": "bin/esbuild" } }, "sha512-vVC0USHGtMi8+R4Kz8rt6JhEWLxsv9Rnu/lGYbPR8u47B+DCBksq9JarW0zOO7bs37hyOK1l2/oqtbciutL5+Q=="],

    "escalade": ["escalade@3.2.0", "", {}, "sha512-WUj2qlxaQtO4g6Pq5c29GTcWGDyd8itL8zTlipgECz3JesAiiOKotd8JU6otB3PACgG6xkJUyVhboMS+bje/jA=="],

    "escape-string-regexp": ["escape-string-regexp@4.0.0", "", {}, "sha512-TtpcNJ3XAzx3Gq8sWRzJaVajRs0uVxA2YAkdb1jm2YkPz4G6egUFAyA3n5vtEIZefPk5Wa4UXbKuS5fKkJWdgA=="],

    "eslint": ["eslint@9.32.0", "", { "dependencies": { "@eslint-community/eslint-utils": "^4.2.0", "@eslint-community/regexpp": "^4.12.1", "@eslint/config-array": "^0.21.0", "@eslint/config-helpers": "^0.3.0", "@eslint/core": "^0.15.0", "@eslint/eslintrc": "^3.3.1", "@eslint/js": "9.32.0", "@eslint/plugin-kit": "^0.3.4", "@humanfs/node": "^0.16.6", "@humanwhocodes/module-importer": "^1.0.1", "@humanwhocodes/retry": "^0.4.2", "@types/estree": "^1.0.6", "@types/json-schema": "^7.0.15", "ajv": "^6.12.4", "chalk": "^4.0.0", "cross-spawn": "^7.0.6", "debug": "^4.3.2", "escape-string-regexp": "^4.0.0", "eslint-scope": "^8.4.0", "eslint-visitor-keys": "^4.2.1", "espree": "^10.4.0", "esquery": "^1.5.0", "esutils": "^2.0.2", "fast-deep-equal": "^3.1.3", "file-entry-cache": "^8.0.0", "find-up": "^5.0.0", "glob-parent": "^6.0.2", "ignore": "^5.2.0", "imurmurhash": "^0.1.4", "is-glob": "^4.0.0", "json-stable-stringify-without-jsonify": "^1.0.1", "lodash.merge": "^4.6.2", "minimatch": "^3.1.2", "natural-compare": "^1.4.0", "optionator": "^0.9.3" }, "peerDependencies": { "jiti": "*" }, "optionalPeers": ["jiti"], "bin": { "eslint": "bin/eslint.js" } }, "sha512-LSehfdpgMeWcTZkWZVIJl+tkZ2nuSkyyB9C27MZqFWXuph7DvaowgcTvKqxvpLW1JZIk8PN7hFY3Rj9LQ7m7lg=="],

    "eslint-plugin-react-hooks": ["eslint-plugin-react-hooks@5.2.0", "", { "peerDependencies": { "eslint": "^3.0.0 || ^4.0.0 || ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0-0 || ^9.0.0" } }, "sha512-+f15FfK64YQwZdJNELETdn5ibXEUQmW1DZL6KXhNnc2heoy/sg9VJJeT7n8TlMWouzWqSWavFkIhHyIbIAEapg=="],

    "eslint-plugin-react-refresh": ["eslint-plugin-react-refresh@0.4.20", "", { "peerDependencies": { "eslint": ">=8.40" } }, "sha512-XpbHQ2q5gUF8BGOX4dHe+71qoirYMhApEPZ7sfhF/dNnOF1UXnCMGZf79SFTBO7Bz5YEIT4TMieSlJBWhP9WBA=="],

    "eslint-scope": ["eslint-scope@8.4.0", "", { "dependencies": { "esrecurse": "^4.3.0", "estraverse": "^5.2.0" } }, "sha512-sNXOfKCn74rt8RICKMvJS7XKV/Xk9kA7DyJr8mJik3S7Cwgy3qlkkmyS2uQB3jiJg6VNdZd/pDBJu0nvG2NlTg=="],

    "eslint-visitor-keys": ["eslint-visitor-keys@4.2.1", "", {}, "sha512-Uhdk5sfqcee/9H/rCOJikYz67o0a2Tw2hGRPOG2Y1R2dg7brRe1uG0yaNQDHu+TO/uQPF/5eCapvYSmHUjt7JQ=="],

    "espree": ["espree@10.4.0", "", { "dependencies": { "acorn": "^8.15.0", "acorn-jsx": "^5.3.2", "eslint-visitor-keys": "^4.2.1" } }, "sha512-j6PAQ2uUr79PZhBjP5C5fhl8e39FmRnOjsD5lGnWrFU8i2G776tBK7+nP8KuQUTTyAZUwfQqXAgrVH5MbH9CYQ=="],

    "esquery": ["esquery@1.6.0", "", { "dependencies": { "estraverse": "^5.1.0" } }, "sha512-ca9pw9fomFcKPvFLXhBKUK90ZvGibiGOvRJNbjljY7s7uq/5YO4BOzcYtJqExdx99rF6aAcnRxHmcUHcz6sQsg=="],

    "esrecurse": ["esrecurse@4.3.0", "", { "dependencies": { "estraverse": "^5.2.0" } }, "sha512-KmfKL3b6G+RXvP8N1vr3Tq1kL/oCFgn2NYXEtqP8/L3pKapUA4G8cFVaoF3SU323CD4XypR/ffioHmkti6/Tag=="],

    "estraverse": ["estraverse@5.3.0", "", {}, "sha512-MMdARuVEQziNTeJD8DgMqmhwR11BRQ/cBP+pLtYdSTnf3MIO8fFeiINEbX36ZdNlfU/7A9f3gUw49B3oQsvwBA=="],

    "esutils": ["esutils@2.0.3", "", {}, "sha512-kVscqXk4OCp68SZ0dkgEKVi6/8ij300KBWTJq32P/dYeWTSwK41WyTxalN1eRmA5Z9UU/LX9D7FWSmV9SAYx6g=="],

    "fast-check": ["fast-check@3.23.2", "", { "dependencies": { "pure-rand": "^6.1.0" } }, "sha512-h5+1OzzfCC3Ef7VbtKdcv7zsstUQwUDlYpUTvjeUsJAssPgLn7QzbboPtL5ro04Mq0rPOsMzl7q5hIbRs2wD1A=="],

    "fast-deep-equal": ["fast-deep-equal@3.1.3", "", {}, "sha512-f3qQ9oQy9j2AhBe/H9VC91wLmKBCCU/gDOnKNAYG5hswO7BLKj09Hc5HYNz9cGI++xlpDCIgDaitVs03ATR84Q=="],

    "fast-glob": ["fast-glob@3.3.3", "", { "dependencies": { "@nodelib/fs.stat": "^2.0.2", "@nodelib/fs.walk": "^1.2.3", "glob-parent": "^5.1.2", "merge2": "^1.3.0", "micromatch": "^4.0.8" } }, "sha512-7MptL8U0cqcFdzIzwOTHoilX9x5BrNqye7Z/LuC7kCMRio1EMSyqRK3BEAUD7sXRq4iT4AzTVuZdhgQ2TCvYLg=="],

    "fast-json-stable-stringify": ["fast-json-stable-stringify@2.1.0", "", {}, "sha512-lhd/wF+Lk98HZoTCtlVraHtfh5XYijIjalXck7saUtuanSDyLMxnHhSXEDJqHxD7msR8D0uCmqlkwjCV8xvwHw=="],

    "fast-levenshtein": ["fast-levenshtein@2.0.6", "", {}, "sha512-DCXu6Ifhqcks7TZKY3Hxp3y6qphY5SJZmrWMDrKcERSOXWQdMhU9Ig/PYrzyw/ul9jOIyh0N4M0tbC5hodg8dw=="],

    "fastq": ["fastq@1.19.1", "", { "dependencies": { "reusify": "^1.0.4" } }, "sha512-GwLTyxkCXjXbxqIhTsMI2Nui8huMPtnxg7krajPJAjnEG/iiOS7i+zCtWGZR9G0NBKbXKh6X9m9UIsYX/N6vvQ=="],

    "fdir": ["fdir@6.4.6", "", { "peerDependencies": { "picomatch": "^3 || ^4" }, "optionalPeers": ["picomatch"] }, "sha512-hiFoqpyZcfNm1yc4u8oWCf9A2c4D3QjCrks3zmoVKVxpQRzmPNar1hUJcBG2RQHvEVGDN+Jm81ZheVLAQMK6+w=="],

    "file-entry-cache": ["file-entry-cache@8.0.0", "", { "dependencies": { "flat-cache": "^4.0.0" } }, "sha512-XXTUwCvisa5oacNGRP9SfNtYBNAMi+RPwBFmblZEF7N7swHYQS6/Zfk7SRwx4D5j3CH211YNRco1DEMNVfZCnQ=="],

    "fill-range": ["fill-range@7.1.1", "", { "dependencies": { "to-regex-range": "^5.0.1" } }, "sha512-YsGpe3WHLK8ZYi4tWDg2Jy3ebRz2rXowDxnld4bkQB00cc/1Zw9AWnC0i9ztDJitivtQvaI9KaLyKrc+hBW0yg=="],

    "find-my-way-ts": ["find-my-way-ts@0.1.6", "", {}, "sha512-a85L9ZoXtNAey3Y6Z+eBWW658kO/MwR7zIafkIUPUMf3isZG0NCs2pjW2wtjxAKuJPxMAsHUIP4ZPGv0o5gyTA=="],

    "find-up": ["find-up@5.0.0", "", { "dependencies": { "locate-path": "^6.0.0", "path-exists": "^4.0.0" } }, "sha512-78/PXT1wlLLDgTzDs7sjq9hzz0vXD+zn+7wypEe4fXQxCmdmqfGsEPQxmiCSQI3ajFV91bVSsvNtrJRiW6nGng=="],

    "flat-cache": ["flat-cache@4.0.1", "", { "dependencies": { "flatted": "^3.2.9", "keyv": "^4.5.4" } }, "sha512-f7ccFPK3SXFHpx15UIGyRJ/FJQctuKZ0zVuN3frBo4HnK3cay9VEW0R6yPYFHC0AgqhukPzKjq22t5DmAyqGyw=="],

    "flatted": ["flatted@3.3.3", "", {}, "sha512-GX+ysw4PBCz0PzosHDepZGANEuFCMLrnRTiEy9McGjmkCQYwRq4A/X786G/fjM/+OjsWSU1ZrY5qyARZmO/uwg=="],

    "fsevents": ["fsevents@2.3.3", "", { "os": "darwin" }, "sha512-5xoDfX+fL7faATnagmWPpbFtwh/R77WmMMqqHGS65C3vvB0YHrgF+B1YmZ3441tMj5n63k0212XNoJwzlhffQw=="],

    "gensync": ["gensync@1.0.0-beta.2", "", {}, "sha512-3hN7NaskYvMDLQY55gnW3NQ+mesEAepTqlg+VEbj7zzqEMBVNhzcGYYeqFo/TlYz6eQiFcp1HcsCZO+nGgS8zg=="],

    "glob-parent": ["glob-parent@6.0.2", "", { "dependencies": { "is-glob": "^4.0.3" } }, "sha512-XxwI8EOhVQgWp6iDL+3b0r86f4d6AX6zSU55HfB4ydCEuXLXc5FcYeOu+nnGftS4TEju/11rt4KJPTMgbfmv4A=="],

    "globals": ["globals@16.3.0", "", {}, "sha512-bqWEnJ1Nt3neqx2q5SFfGS8r/ahumIakg3HcwtNlrVlwXIeNumWn/c7Pn/wKzGhf6SaW6H6uWXLqC30STCMchQ=="],

    "graceful-fs": ["graceful-fs@4.2.11", "", {}, "sha512-RbJ5/jmFcNNCcDV5o9eTnBLJ/HszWV0P73bc+Ff4nS/rJj+YaS6IGyiOL0VoBYX+l1Wrl3k63h/KrH+nhJ0XvQ=="],

    "graphemer": ["graphemer@1.4.0", "", {}, "sha512-EtKwoO6kxCL9WO5xipiHTZlSzBm7WLT627TqC/uVRd0HKmq8NXyebnNYxDoBi7wt8eTWrUrKXCOVaFq9x1kgag=="],

    "has-flag": ["has-flag@4.0.0", "", {}, "sha512-EykJT/Q1KjTWctppgIAgfSO0tKVuZUjhgMr17kqTumMl6Afv3EISleU7qZUzoXDFTAHTDC4NOoG/ZxU3EvlMPQ=="],

    "ignore": ["ignore@5.3.2", "", {}, "sha512-hsBTNUqQTDwkWtcdYI2i06Y/nUBEsNEDJKjWdigLvegy8kDuJAS8uRlpkkcQpyEXL0Z/pjDy5HBmMjRCJ2gq+g=="],

    "import-fresh": ["import-fresh@3.3.1", "", { "dependencies": { "parent-module": "^1.0.0", "resolve-from": "^4.0.0" } }, "sha512-TR3KfrTZTYLPB6jUjfx6MF9WcWrHL9su5TObK4ZkYgBdWKPOFoSoQIdEuTuR82pmtxH2spWG9h6etwfr1pLBqQ=="],

    "imurmurhash": ["imurmurhash@0.1.4", "", {}, "sha512-JmXMZ6wuvDmLiHEml9ykzqO6lwFbof0GG4IkcGaENdCRDDmMVnny7s5HsIgHCbaq0w2MyPhDqkhTUgS2LU2PHA=="],

    "is-extglob": ["is-extglob@2.1.1", "", {}, "sha512-SbKbANkN603Vi4jEZv49LeVJMn4yGwsbzZworEoyEiutsN3nJYdbO36zfhGJ6QEDpOZIFkDtnq5JRxmvl3jsoQ=="],

    "is-glob": ["is-glob@4.0.3", "", { "dependencies": { "is-extglob": "^2.1.1" } }, "sha512-xelSayHH36ZgE7ZWhli7pW34hNbNl8Ojv5KVmkJD4hBdD3th8Tfk9vYasLM+mXWOZhFkgZfxhLSnrwRr4elSSg=="],

    "is-number": ["is-number@7.0.0", "", {}, "sha512-41Cifkg6e8TylSpdtTpeLVMqvSBEVzTttHvERD741+pnZ8ANv0004MRL43QKPDlK9cGvNp6NZWZUBlbGXYxxng=="],

    "isexe": ["isexe@2.0.0", "", {}, "sha512-RHxMLp9lnKHGHRng9QFhRCMbYAcVpn69smSGcq3f36xjgVVWThj4qqLbTLlq7Ssj8B+fIQ1EuCEGI2lKsyQeIw=="],

    "jiti": ["jiti@2.5.1", "", { "bin": { "jiti": "lib/jiti-cli.mjs" } }, "sha512-twQoecYPiVA5K/h6SxtORw/Bs3ar+mLUtoPSc7iMXzQzK8d7eJ/R09wmTwAjiamETn1cXYPGfNnu7DMoHgu12w=="],

    "js-tokens": ["js-tokens@4.0.0", "", {}, "sha512-RdJUflcE3cUzKiMqQgsCu06FPu9UdIJO0beYbPhHN4k6apgJtifcoCtT9bcxOpYBtpD2kCM6Sbzg4CausW/PKQ=="],

    "js-yaml": ["js-yaml@4.1.0", "", { "dependencies": { "argparse": "^2.0.1" }, "bin": { "js-yaml": "bin/js-yaml.js" } }, "sha512-wpxZs9NoxZaJESJGIZTyDEaYpl0FKSA+FB9aJiyemKhMwkxQg63h4T1KJgUGHpTqPDNRcmmYLugrRjJlBtWvRA=="],

    "jsesc": ["jsesc@3.1.0", "", { "bin": { "jsesc": "bin/jsesc" } }, "sha512-/sM3dO2FOzXjKQhJuo0Q173wf2KOo8t4I8vHy6lF9poUp7bKT0/NHE8fPX23PwfhnykfqnC2xRxOnVw5XuGIaA=="],

    "json-buffer": ["json-buffer@3.0.1", "", {}, "sha512-4bV5BfR2mqfQTJm+V5tPPdf+ZpuhiIvTuAB5g8kcrXOZpTT/QwwVRWBywX1ozr6lEuPdbHxwaJlm9G6mI2sfSQ=="],

    "json-schema-traverse": ["json-schema-traverse@0.4.1", "", {}, "sha512-xbbCH5dCYU5T8LcEhhuh7HJ88HXuW3qsI3Y0zOZFKfZEHcpWiHU/Jxzk629Brsab/mMiHQti9wMP+845RPe3Vg=="],

    "json-stable-stringify-without-jsonify": ["json-stable-stringify-without-jsonify@1.0.1", "", {}, "sha512-Bdboy+l7tA3OGW6FjyFHWkP5LuByj1Tk33Ljyq0axyzdk9//JSi2u3fP1QSmd1KNwq6VOKYGlAu87CisVir6Pw=="],

    "json5": ["json5@2.2.3", "", { "bin": { "json5": "lib/cli.js" } }, "sha512-XmOWe7eyHYH14cLdVPoyg+GOH3rYX++KpzrylJwSW98t3Nk+U8XOl8FWKOgwtzdb8lXGf6zYwDUzeHMWfxasyg=="],

    "keyv": ["keyv@4.5.4", "", { "dependencies": { "json-buffer": "3.0.1" } }, "sha512-oxVHkHR/EJf2CNXnWxRLW6mg7JyCCUcG0DtEGmL2ctUo1PNTin1PUil+r/+4r5MpVgC/fn1kjsx7mjSujKqIpw=="],

    "levn": ["levn@0.4.1", "", { "dependencies": { "prelude-ls": "^1.2.1", "type-check": "~0.4.0" } }, "sha512-+bT2uH4E5LGE7h/n3evcS/sQlJXCpIp6ym8OWJ5eV6+67Dsql/LaaT7qJBAt2rzfoa/5QBGBhxDix1dMt2kQKQ=="],

    "lightningcss": ["lightningcss@1.30.1", "", { "dependencies": { "detect-libc": "^2.0.3" }, "optionalDependencies": { "lightningcss-darwin-arm64": "1.30.1", "lightningcss-darwin-x64": "1.30.1", "lightningcss-freebsd-x64": "1.30.1", "lightningcss-linux-arm-gnueabihf": "1.30.1", "lightningcss-linux-arm64-gnu": "1.30.1", "lightningcss-linux-arm64-musl": "1.30.1", "lightningcss-linux-x64-gnu": "1.30.1", "lightningcss-linux-x64-musl": "1.30.1", "lightningcss-win32-arm64-msvc": "1.30.1", "lightningcss-win32-x64-msvc": "1.30.1" } }, "sha512-xi6IyHML+c9+Q3W0S4fCQJOym42pyurFiJUHEcEyHS0CeKzia4yZDEsLlqOFykxOdHpNy0NmvVO31vcSqAxJCg=="],

    "lightningcss-darwin-arm64": ["lightningcss-darwin-arm64@1.30.1", "", { "os": "darwin", "cpu": "arm64" }, "sha512-c8JK7hyE65X1MHMN+Viq9n11RRC7hgin3HhYKhrMyaXflk5GVplZ60IxyoVtzILeKr+xAJwg6zK6sjTBJ0FKYQ=="],

    "lightningcss-darwin-x64": ["lightningcss-darwin-x64@1.30.1", "", { "os": "darwin", "cpu": "x64" }, "sha512-k1EvjakfumAQoTfcXUcHQZhSpLlkAuEkdMBsI/ivWw9hL+7FtilQc0Cy3hrx0AAQrVtQAbMI7YjCgYgvn37PzA=="],

    "lightningcss-freebsd-x64": ["lightningcss-freebsd-x64@1.30.1", "", { "os": "freebsd", "cpu": "x64" }, "sha512-kmW6UGCGg2PcyUE59K5r0kWfKPAVy4SltVeut+umLCFoJ53RdCUWxcRDzO1eTaxf/7Q2H7LTquFHPL5R+Gjyig=="],

    "lightningcss-linux-arm-gnueabihf": ["lightningcss-linux-arm-gnueabihf@1.30.1", "", { "os": "linux", "cpu": "arm" }, "sha512-MjxUShl1v8pit+6D/zSPq9S9dQ2NPFSQwGvxBCYaBYLPlCWuPh9/t1MRS8iUaR8i+a6w7aps+B4N0S1TYP/R+Q=="],

    "lightningcss-linux-arm64-gnu": ["lightningcss-linux-arm64-gnu@1.30.1", "", { "os": "linux", "cpu": "arm64" }, "sha512-gB72maP8rmrKsnKYy8XUuXi/4OctJiuQjcuqWNlJQ6jZiWqtPvqFziskH3hnajfvKB27ynbVCucKSm2rkQp4Bw=="],

    "lightningcss-linux-arm64-musl": ["lightningcss-linux-arm64-musl@1.30.1", "", { "os": "linux", "cpu": "arm64" }, "sha512-jmUQVx4331m6LIX+0wUhBbmMX7TCfjF5FoOH6SD1CttzuYlGNVpA7QnrmLxrsub43ClTINfGSYyHe2HWeLl5CQ=="],

    "lightningcss-linux-x64-gnu": ["lightningcss-linux-x64-gnu@1.30.1", "", { "os": "linux", "cpu": "x64" }, "sha512-piWx3z4wN8J8z3+O5kO74+yr6ze/dKmPnI7vLqfSqI8bccaTGY5xiSGVIJBDd5K5BHlvVLpUB3S2YCfelyJ1bw=="],

    "lightningcss-linux-x64-musl": ["lightningcss-linux-x64-musl@1.30.1", "", { "os": "linux", "cpu": "x64" }, "sha512-rRomAK7eIkL+tHY0YPxbc5Dra2gXlI63HL+v1Pdi1a3sC+tJTcFrHX+E86sulgAXeI7rSzDYhPSeHHjqFhqfeQ=="],

    "lightningcss-win32-arm64-msvc": ["lightningcss-win32-arm64-msvc@1.30.1", "", { "os": "win32", "cpu": "arm64" }, "sha512-mSL4rqPi4iXq5YVqzSsJgMVFENoa4nGTT/GjO2c0Yl9OuQfPsIfncvLrEW6RbbB24WtZ3xP/2CCmI3tNkNV4oA=="],

    "lightningcss-win32-x64-msvc": ["lightningcss-win32-x64-msvc@1.30.1", "", { "os": "win32", "cpu": "x64" }, "sha512-PVqXh48wh4T53F/1CCu8PIPCxLzWyCnn/9T5W1Jpmdy5h9Cwd+0YQS6/LwhHXSafuc61/xg9Lv5OrCby6a++jg=="],

    "locate-path": ["locate-path@6.0.0", "", { "dependencies": { "p-locate": "^5.0.0" } }, "sha512-iPZK6eYjbxRu3uB4/WZ3EsEIMJFMqAoopl3R+zuq0UjcAm/MO6KCweDgPfP3elTztoKP3KtnVHxTn2NHBSDVUw=="],

    "lodash.merge": ["lodash.merge@4.6.2", "", {}, "sha512-0KpjqXRVvrYyCsX1swR/XTK0va6VQkQM6MNo7PqW77ByjAhoARA8EfrP1N4+KlKj8YS0ZUCtRT/YUuhyYDujIQ=="],

    "lru-cache": ["lru-cache@5.1.1", "", { "dependencies": { "yallist": "^3.0.2" } }, "sha512-KpNARQA3Iwv+jTA0utUVVbrh+Jlrr1Fv0e56GGzAFOXN7dk/FviaDW8LHmK52DlcH4WP2n6gI8vN1aesBFgo9w=="],

    "magic-string": ["magic-string@0.30.17", "", { "dependencies": { "@jridgewell/sourcemap-codec": "^1.5.0" } }, "sha512-sNPKHvyjVf7gyjwS4xGTaW/mCnF8wnjtifKBEhxfZ7E/S8tQ0rssrwGNn6q8JH/ohItJfSQp9mBtQYuTlH5QnA=="],

    "merge2": ["merge2@1.4.1", "", {}, "sha512-8q7VEgMJW4J8tcfVPy8g09NcQwZdbwFEqhe/WZkoIzjn/3TGDwtOCYtXGxA3O8tPzpczCCDgv+P2P5y00ZJOOg=="],

    "micromatch": ["micromatch@4.0.8", "", { "dependencies": { "braces": "^3.0.3", "picomatch": "^2.3.1" } }, "sha512-PXwfBhYu0hBCPw8Dn0E+WDYb7af3dSLVWKi3HGv84IdF4TyFoC0ysxFd0Goxw7nSv4T/PzEJQxsYsEiFCKo2BA=="],

    "minimatch": ["minimatch@3.1.2", "", { "dependencies": { "brace-expansion": "^1.1.7" } }, "sha512-J7p63hRiAjw1NDEww1W7i37+ByIrOWO5XQQAzZ3VOcL0PNybwpfmV/N05zFAzwQ9USyEcX6t3UO+K5aqBQOIHw=="],

    "minipass": ["minipass@7.1.2", "", {}, "sha512-qOOzS1cBTWYF4BH8fVePDBOO9iptMnGUEZwNc/cMWnTV2nVLZ7VoNWEPHkYczZA0pdoA7dl6e7FL659nX9S2aw=="],

    "minizlib": ["minizlib@3.0.2", "", { "dependencies": { "minipass": "^7.1.2" } }, "sha512-oG62iEk+CYt5Xj2YqI5Xi9xWUeZhDI8jjQmC5oThVH5JGCTgIjr7ciJDzC7MBzYd//WvR1OTmP5Q38Q8ShQtVA=="],

    "mkdirp": ["mkdirp@3.0.1", "", { "bin": { "mkdirp": "dist/cjs/src/bin.js" } }, "sha512-+NsyUUAZDmo6YVHzL/stxSu3t9YS1iljliy3BSDrXJ/dkn1KYdmtZODGGjLcc9XLgVVpH4KshHB8XmZgMhaBXg=="],

    "ms": ["ms@2.1.3", "", {}, "sha512-6FlzubTLZG3J2a/NVCAleEhjzq5oxgHyaCU9yYXvcLsvoVaHJq/s5xXI6/XXP6tz7R9xAOtHnSO/tXtF3WRTlA=="],

    "msgpackr": ["msgpackr@1.11.5", "", { "optionalDependencies": { "msgpackr-extract": "^3.0.2" } }, "sha512-UjkUHN0yqp9RWKy0Lplhh+wlpdt9oQBYgULZOiFhV3VclSF1JnSQWZ5r9gORQlNYaUKQoR8itv7g7z1xDDuACA=="],

    "msgpackr-extract": ["msgpackr-extract@3.0.3", "", { "dependencies": { "node-gyp-build-optional-packages": "5.2.2" }, "optionalDependencies": { "@msgpackr-extract/msgpackr-extract-darwin-arm64": "3.0.3", "@msgpackr-extract/msgpackr-extract-darwin-x64": "3.0.3", "@msgpackr-extract/msgpackr-extract-linux-arm": "3.0.3", "@msgpackr-extract/msgpackr-extract-linux-arm64": "3.0.3", "@msgpackr-extract/msgpackr-extract-linux-x64": "3.0.3", "@msgpackr-extract/msgpackr-extract-win32-x64": "3.0.3" }, "bin": { "download-msgpackr-prebuilds": "bin/download-prebuilds.js" } }, "sha512-P0efT1C9jIdVRefqjzOQ9Xml57zpOXnIuS+csaB4MdZbTdmGDLo8XhzBG1N7aO11gKDDkJvBLULeFTo46wwreA=="],

    "multipasta": ["multipasta@0.2.7", "", {}, "sha512-KPA58d68KgGil15oDqXjkUBEBYc00XvbPj5/X+dyzeo/lWm9Nc25pQRlf1D+gv4OpK7NM0J1odrbu9JNNGvynA=="],

    "nanoid": ["nanoid@3.3.11", "", { "bin": { "nanoid": "bin/nanoid.cjs" } }, "sha512-N8SpfPUnUp1bK+PMYW8qSWdl9U+wwNWI4QKxOYDy9JAro3WMX7p2OeVRF9v+347pnakNevPmiHhNmZ2HbFA76w=="],

    "natural-compare": ["natural-compare@1.4.0", "", {}, "sha512-OWND8ei3VtNC9h7V60qff3SVobHr996CTwgxubgyQYEpg290h9J0buyECNNJexkFm5sOajh5G116RYA1c8ZMSw=="],

    "node-gyp-build-optional-packages": ["node-gyp-build-optional-packages@5.2.2", "", { "dependencies": { "detect-libc": "^2.0.1" }, "bin": { "node-gyp-build-optional-packages": "bin.js", "node-gyp-build-optional-packages-optional": "optional.js", "node-gyp-build-optional-packages-test": "build-test.js" } }, "sha512-s+w+rBWnpTMwSFbaE0UXsRlg7hU4FjekKU4eyAih5T8nJuNZT1nNsskXpxmeqSK9UzkBl6UgRlnKc8hz8IEqOw=="],

    "node-releases": ["node-releases@2.0.19", "", {}, "sha512-xxOWJsBKtzAq7DY0J+DTzuz58K8e7sJbdgwkbMWQe8UYB6ekmsQ45q0M/tJDsGaZmbC+l7n57UV8Hl5tHxO9uw=="],

    "optionator": ["optionator@0.9.4", "", { "dependencies": { "deep-is": "^0.1.3", "fast-levenshtein": "^2.0.6", "levn": "^0.4.1", "prelude-ls": "^1.2.1", "type-check": "^0.4.0", "word-wrap": "^1.2.5" } }, "sha512-6IpQ7mKUxRcZNLIObR0hz7lxsapSSIYNZJwXPGeF0mTVqGKFIXj1DQcMoT22S3ROcLyY/rz0PWaWZ9ayWmad9g=="],

    "p-limit": ["p-limit@3.1.0", "", { "dependencies": { "yocto-queue": "^0.1.0" } }, "sha512-TYOanM3wGwNGsZN2cVTYPArw454xnXj5qmWF1bEoAc4+cU/ol7GVh7odevjp1FNHduHc3KZMcFduxU5Xc6uJRQ=="],

    "p-locate": ["p-locate@5.0.0", "", { "dependencies": { "p-limit": "^3.0.2" } }, "sha512-LaNjtRWUBY++zB5nE/NwcaoMylSPk+S+ZHNB1TzdbMJMny6dynpAGt7X/tl/QYq3TIeE6nxHppbo2LGymrG5Pw=="],

    "parent-module": ["parent-module@1.0.1", "", { "dependencies": { "callsites": "^3.0.0" } }, "sha512-GQ2EWRpQV8/o+Aw8YqtfZZPfNRWZYkbidE9k5rpl/hC3vtHHBfGm2Ifi6qWV+coDGkrUKZAxE3Lot5kcsRlh+g=="],

    "path-exists": ["path-exists@4.0.0", "", {}, "sha512-ak9Qy5Q7jYb2Wwcey5Fpvg2KoAc/ZIhLSLOSBmRmygPsGwkVVt0fZa0qrtMz+m6tJTAHfZQ8FnmB4MG4LWy7/w=="],

    "path-key": ["path-key@3.1.1", "", {}, "sha512-ojmeN0qd+y0jszEtoY48r0Peq5dwMEkIlCOu6Q5f41lfkswXuKtYrhgoTpLnyIcHm24Uhqx+5Tqm2InSwLhE6Q=="],

    "picocolors": ["picocolors@1.1.1", "", {}, "sha512-xceH2snhtb5M9liqDsmEw56le376mTZkEX/jEb/RxNFyegNul7eNslCXP9FDj/Lcu0X8KEyMceP2ntpaHrDEVA=="],

    "picomatch": ["picomatch@4.0.3", "", {}, "sha512-5gTmgEY/sqK6gFXLIsQNH19lWb4ebPDLA4SdLP7dsWkIXHWlG66oPuVvXSGFPppYZz8ZDZq0dYYrbHfBCVUb1Q=="],

    "postcss": ["postcss@8.5.6", "", { "dependencies": { "nanoid": "^3.3.11", "picocolors": "^1.1.1", "source-map-js": "^1.2.1" } }, "sha512-3Ybi1tAuwAP9s0r1UQ2J4n5Y0G05bJkpUIO0/bI9MhwmD70S5aTWbXGBwxHrelT+XM1k6dM0pk+SwNkpTRN7Pg=="],

    "prelude-ls": ["prelude-ls@1.2.1", "", {}, "sha512-vkcDPrRZo1QZLbn5RLGPpg/WmIQ65qoWWhcGKf/b5eplkkarX0m9z8ppCat4mlOqUsWpyNuYgO3VRyrYHSzX5g=="],

    "punycode": ["punycode@2.3.1", "", {}, "sha512-vYt7UD1U9Wg6138shLtLOvdAu+8DsC/ilFtEVHcH+wydcSpNE20AfSOduf6MkRFahL5FY7X1oU7nKVZFtfq8Fg=="],

    "pure-rand": ["pure-rand@6.1.0", "", {}, "sha512-bVWawvoZoBYpp6yIoQtQXHZjmz35RSVHnUOTefl8Vcjr8snTPY1wnpSPMWekcFwbxI6gtmT7rSYPFvz71ldiOA=="],

    "queue-microtask": ["queue-microtask@1.2.3", "", {}, "sha512-NuaNSa6flKT5JaSYQzJok04JzTL1CA6aGhv5rfLW3PgqA+M2ChpZQnAC8h8i4ZFkBS8X5RqkDBHA7r4hej3K9A=="],

    "react": ["react@19.1.1", "", {}, "sha512-w8nqGImo45dmMIfljjMwOGtbmC/mk4CMYhWIicdSflH91J9TyCyczcPFXJzrZ/ZXcgGRFeP6BU0BEJTw6tZdfQ=="],

    "react-dom": ["react-dom@19.1.1", "", { "dependencies": { "scheduler": "^0.26.0" }, "peerDependencies": { "react": "^19.1.1" } }, "sha512-Dlq/5LAZgF0Gaz6yiqZCf6VCcZs1ghAJyrsu84Q/GT0gV+mCxbfmKNoGRKBYMJ8IEdGPqu49YWXD02GCknEDkw=="],

    "react-refresh": ["react-refresh@0.17.0", "", {}, "sha512-z6F7K9bV85EfseRCp2bzrpyQ0Gkw1uLoCel9XBVWPg/TjRj94SkJzUTGfOa4bs7iJvBWtQG0Wq7wnI0syw3EBQ=="],

    "resolve-from": ["resolve-from@4.0.0", "", {}, "sha512-pb/MYmXstAkysRFx8piNI1tGFNQIFA3vkE3Gq4EuA1dF6gHp/+vgZqsCGJapvy8N3Q+4o7FwvquPJcnZ7RYy4g=="],

    "reusify": ["reusify@1.1.0", "", {}, "sha512-g6QUff04oZpHs0eG5p83rFLhHeV00ug/Yf9nZM6fLeUrPguBTkTQOdpAWWspMh55TZfVQDPaN3NQJfbVRAxdIw=="],

    "rollup": ["rollup@4.46.2", "", { "dependencies": { "@types/estree": "1.0.8" }, "optionalDependencies": { "@rollup/rollup-android-arm-eabi": "4.46.2", "@rollup/rollup-android-arm64": "4.46.2", "@rollup/rollup-darwin-arm64": "4.46.2", "@rollup/rollup-darwin-x64": "4.46.2", "@rollup/rollup-freebsd-arm64": "4.46.2", "@rollup/rollup-freebsd-x64": "4.46.2", "@rollup/rollup-linux-arm-gnueabihf": "4.46.2", "@rollup/rollup-linux-arm-musleabihf": "4.46.2", "@rollup/rollup-linux-arm64-gnu": "4.46.2", "@rollup/rollup-linux-arm64-musl": "4.46.2", "@rollup/rollup-linux-loongarch64-gnu": "4.46.2", "@rollup/rollup-linux-ppc64-gnu": "4.46.2", "@rollup/rollup-linux-riscv64-gnu": "4.46.2", "@rollup/rollup-linux-riscv64-musl": "4.46.2", "@rollup/rollup-linux-s390x-gnu": "4.46.2", "@rollup/rollup-linux-x64-gnu": "4.46.2", "@rollup/rollup-linux-x64-musl": "4.46.2", "@rollup/rollup-win32-arm64-msvc": "4.46.2", "@rollup/rollup-win32-ia32-msvc": "4.46.2", "@rollup/rollup-win32-x64-msvc": "4.46.2", "fsevents": "~2.3.2" }, "bin": { "rollup": "dist/bin/rollup" } }, "sha512-WMmLFI+Boh6xbop+OAGo9cQ3OgX9MIg7xOQjn+pTCwOkk+FNDAeAemXkJ3HzDJrVXleLOFVa1ipuc1AmEx1Dwg=="],

    "run-parallel": ["run-parallel@1.2.0", "", { "dependencies": { "queue-microtask": "^1.2.2" } }, "sha512-5l4VyZR86LZ/lDxZTR6jqL8AFE2S0IFLMP26AbjsLVADxHdhB/c0GUsH+y39UfCi3dzz8OlQuPmnaJOMoDHQBA=="],

    "scheduler": ["scheduler@0.26.0", "", {}, "sha512-NlHwttCI/l5gCPR3D1nNXtWABUmBwvZpEQiD4IXSbIDq8BzLIK/7Ir5gTFSGZDUu37K5cMNp0hFtzO38sC7gWA=="],

    "semver": ["semver@6.3.1", "", { "bin": { "semver": "bin/semver.js" } }, "sha512-BR7VvDCVHO+q2xBEWskxS6DJE1qRnb7DxzUrogb71CWoSficBxYsiAGd+Kl0mmq/MprG9yArRkyrQxTO6XjMzA=="],

    "shebang-command": ["shebang-command@2.0.0", "", { "dependencies": { "shebang-regex": "^3.0.0" } }, "sha512-kHxr2zZpYtdmrN1qDjrrX/Z1rR1kG8Dx+gkpK1G4eXmvXswmcE1hTWBWYUzlraYw1/yZp6YuDY77YtvbN0dmDA=="],

    "shebang-regex": ["shebang-regex@3.0.0", "", {}, "sha512-7++dFhtcx3353uBaq8DDR4NuxBetBzC7ZQOhmTQInHEd6bSrXdiEyzCvG07Z44UYdLShWUyXt5M/yhz8ekcb1A=="],

    "source-map-js": ["source-map-js@1.2.1", "", {}, "sha512-UXWMKhLOwVKb728IUtQPXxfYU+usdybtUrK/8uGE8CQMvrhOpwvzDBwj0QhSL7MQc7vIsISBG8VQ8+IDQxpfQA=="],

    "strip-json-comments": ["strip-json-comments@3.1.1", "", {}, "sha512-6fPc+R4ihwqP6N/aIv2f1gMH8lOVtWQHoqC4yK6oSDVVocumAsfCqjkXnqiYMhmMwS/mEHLp7Vehlt3ql6lEig=="],

    "supports-color": ["supports-color@7.2.0", "", { "dependencies": { "has-flag": "^4.0.0" } }, "sha512-qpCAvRl9stuOHveKsn7HncJRvv501qIacKzQlO/+Lwxc9+0q2wLyv4Dfvt80/DPn2pqOBsJdDiogXGR9+OvwRw=="],

    "tailwindcss": ["tailwindcss@4.1.11", "", {}, "sha512-2E9TBm6MDD/xKYe+dvJZAmg3yxIEDNRc0jwlNyDg/4Fil2QcSLjFKGVff0lAf1jjeaArlG/M75Ey/EYr/OJtBA=="],

    "tapable": ["tapable@2.2.2", "", {}, "sha512-Re10+NauLTMCudc7T5WLFLAwDhQ0JWdrMK+9B2M8zR5hRExKmsRDCBA7/aV/pNJFltmBFO5BAMlQFi/vq3nKOg=="],

    "tar": ["tar@7.4.3", "", { "dependencies": { "@isaacs/fs-minipass": "^4.0.0", "chownr": "^3.0.0", "minipass": "^7.1.2", "minizlib": "^3.0.1", "mkdirp": "^3.0.1", "yallist": "^5.0.0" } }, "sha512-5S7Va8hKfV7W5U6g3aYxXmlPoZVAwUMy9AOKyF2fVuZa2UD3qZjg578OrLRt8PcNN1PleVaL/5/yYATNL0ICUw=="],

    "tinyglobby": ["tinyglobby@0.2.14", "", { "dependencies": { "fdir": "^6.4.4", "picomatch": "^4.0.2" } }, "sha512-tX5e7OM1HnYr2+a2C/4V0htOcSQcoSTH9KgJnVvNm5zm/cyEWKJ7j7YutsH9CxMdtOkkLFy2AHrMci9IM8IPZQ=="],

    "to-regex-range": ["to-regex-range@5.0.1", "", { "dependencies": { "is-number": "^7.0.0" } }, "sha512-65P7iz6X5yEr1cwcgvQxbbIw7Uk3gOy5dIdtZ4rDveLqhrdJP+Li/Hx6tyK0NEb+2GCyneCMJiGqrADCSNk8sQ=="],

    "ts-api-utils": ["ts-api-utils@2.1.0", "", { "peerDependencies": { "typescript": ">=4.8.4" } }, "sha512-CUgTZL1irw8u29bzrOD/nH85jqyc74D6SshFgujOIA7osm2Rz7dYH77agkx7H4FBNxDq7Cjf+IjaX/8zwFW+ZQ=="],

    "type-check": ["type-check@0.4.0", "", { "dependencies": { "prelude-ls": "^1.2.1" } }, "sha512-XleUoc9uwGXqjWwXaUTZAmzMcFZ5858QA2vvx1Ur5xIcixXIP+8LnFDgRplU30us6teqdlskFfu+ae4K79Ooew=="],

    "typescript": ["typescript@5.8.3", "", { "bin": { "tsc": "bin/tsc", "tsserver": "bin/tsserver" } }, "sha512-p1diW6TqL9L07nNxvRMM7hMMw4c5XOo/1ibL4aAIGmSAt9slTE1Xgw5KWuof2uTOvCg9BY7ZRi+GaF+7sfgPeQ=="],

    "typescript-eslint": ["typescript-eslint@8.38.0", "", { "dependencies": { "@typescript-eslint/eslint-plugin": "8.38.0", "@typescript-eslint/parser": "8.38.0", "@typescript-eslint/typescript-estree": "8.38.0", "@typescript-eslint/utils": "8.38.0" }, "peerDependencies": { "eslint": "^8.57.0 || ^9.0.0", "typescript": ">=4.8.4 <5.9.0" } }, "sha512-FsZlrYK6bPDGoLeZRuvx2v6qrM03I0U0SnfCLPs/XCCPCFD80xU9Pg09H/K+XFa68uJuZo7l/Xhs+eDRg2l3hg=="],

    "update-browserslist-db": ["update-browserslist-db@1.1.3", "", { "dependencies": { "escalade": "^3.2.0", "picocolors": "^1.1.1" }, "peerDependencies": { "browserslist": ">= 4.21.0" }, "bin": { "update-browserslist-db": "cli.js" } }, "sha512-UxhIZQ+QInVdunkDAaiazvvT/+fXL5Osr0JZlJulepYu6Jd7qJtDZjlur0emRlT71EN3ScPoE7gvsuIKKNavKw=="],

    "uri-js": ["uri-js@4.4.1", "", { "dependencies": { "punycode": "^2.1.0" } }, "sha512-7rKUyy33Q1yc98pQ1DAmLtwX109F7TIfWlW1Ydo8Wl1ii1SeHieeh0HHfPeL2fMXK6z0s8ecKs9frCuLJvndBg=="],

    "vite": ["vite@7.0.6", "", { "dependencies": { "esbuild": "^0.25.0", "fdir": "^6.4.6", "picomatch": "^4.0.3", "postcss": "^8.5.6", "rollup": "^4.40.0", "tinyglobby": "^0.2.14" }, "optionalDependencies": { "fsevents": "~2.3.3" }, "peerDependencies": { "@types/node": "^20.19.0 || >=22.12.0", "jiti": ">=1.21.0", "less": "^4.0.0", "lightningcss": "^1.21.0", "sass": "^1.70.0", "sass-embedded": "^1.70.0", "stylus": ">=0.54.8", "sugarss": "^5.0.0", "terser": "^5.16.0", "tsx": "^4.8.1", "yaml": "^2.4.2" }, "optionalPeers": ["@types/node", "jiti", "less", "lightningcss", "sass", "sass-embedded", "stylus", "sugarss", "terser", "tsx", "yaml"], "bin": { "vite": "bin/vite.js" } }, "sha512-MHFiOENNBd+Bd9uvc8GEsIzdkn1JxMmEeYX35tI3fv0sJBUTfW5tQsoaOwuY4KhBI09A3dUJ/DXf2yxPVPUceg=="],

    "which": ["which@2.0.2", "", { "dependencies": { "isexe": "^2.0.0" }, "bin": { "node-which": "./bin/node-which" } }, "sha512-BLI3Tl1TW3Pvl70l3yq3Y64i+awpwXqsGBYWkkqMtnbXgrMD+yj7rhW0kuEDxzJaYXGjEW5ogapKNMEKNMjibA=="],

    "word-wrap": ["word-wrap@1.2.5", "", {}, "sha512-BN22B5eaMMI9UMtjrGd5g5eCYPpCPDUy0FJXbYsaT5zYxjFOckS53SQDE3pWkVoWpHXVb3BrYcEN4Twa55B5cA=="],

    "yallist": ["yallist@5.0.0", "", {}, "sha512-YgvUTfwqyc7UXVMrB+SImsVYSmTS8X/tSrtdNZMImM+n7+QTriRXyXim0mBrTXNeqzVF0KWGgHPeiyViFFrNDw=="],

    "yocto-queue": ["yocto-queue@0.1.0", "", {}, "sha512-rVksvsnNCdJ/ohGc6xgPwyN8eheCxsiLM8mxuE/t/mOVqJewPuO1miLpTHQiRgTKCLexL4MeAFVagts7HmNZ2Q=="],

    "zustand": ["zustand@5.0.6", "", { "peerDependencies": { "@types/react": ">=18.0.0", "immer": ">=9.0.6", "react": ">=18.0.0", "use-sync-external-store": ">=1.2.0" }, "optionalPeers": ["@types/react", "immer", "react", "use-sync-external-store"] }, "sha512-ihAqNeUVhe0MAD+X8M5UzqyZ9k3FFZLBTtqo6JLPwV53cbRB/mJwBI0PxcIgqhBBHlEs8G45OTDTMq3gNcLq3A=="],

    "@eslint-community/eslint-utils/eslint-visitor-keys": ["eslint-visitor-keys@3.4.3", "", {}, "sha512-wpc+LXeiyiisxPlEkUzU6svyS1frIO3Mgxj1fdy7Pm8Ygzguax2N3Fa/D/ag1WqbOprdI+uY6wMUl8/a2G+iag=="],

    "@eslint/eslintrc/globals": ["globals@14.0.0", "", {}, "sha512-oahGvuMGQlPw/ivIYBjVSrWAfWLBeku5tpPE2fOPLi+WHffIWbuh2tCjhyQhTBPMf5E9jDEH4FOmTYgYwbKwtQ=="],

    "@humanfs/node/@humanwhocodes/retry": ["@humanwhocodes/retry@0.3.1", "", {}, "sha512-JBxkERygn7Bv/GbN5Rv8Ul6LVknS+5Bp6RgDC/O8gEBU/yeH5Ui5C/OlWrTb6qct7LjjfT6Re2NxB0ln0yYybA=="],

    "@tailwindcss/oxide-wasm32-wasi/@emnapi/core": ["@emnapi/core@1.4.5", "", { "dependencies": { "@emnapi/wasi-threads": "1.0.4", "tslib": "^2.4.0" }, "bundled": true }, "sha512-XsLw1dEOpkSX/WucdqUhPWP7hDxSvZiY+fsUC14h+FtQ2Ifni4znbBt8punRX+Uj2JG/uDb8nEHVKvrVlvdZ5Q=="],

    "@tailwindcss/oxide-wasm32-wasi/@emnapi/runtime": ["@emnapi/runtime@1.4.5", "", { "dependencies": { "tslib": "^2.4.0" }, "bundled": true }, "sha512-++LApOtY0pEEz1zrd9vy1/zXVaVJJ/EbAF3u0fXIzPJEDtnITsBGbbK0EkM72amhl/R5b+5xx0Y/QhcVOpuulg=="],

    "@tailwindcss/oxide-wasm32-wasi/@emnapi/wasi-threads": ["@emnapi/wasi-threads@1.0.4", "", { "dependencies": { "tslib": "^2.4.0" }, "bundled": true }, "sha512-PJR+bOmMOPH8AtcTGAyYNiuJ3/Fcoj2XN/gBEWzDIKh254XO+mM9XoXHk5GNEhodxeMznbg7BlRojVbKN+gC6g=="],

    "@tailwindcss/oxide-wasm32-wasi/@napi-rs/wasm-runtime": ["@napi-rs/wasm-runtime@0.2.12", "", { "dependencies": { "@emnapi/core": "^1.4.3", "@emnapi/runtime": "^1.4.3", "@tybys/wasm-util": "^0.10.0" }, "bundled": true }, "sha512-ZVWUcfwY4E/yPitQJl481FjFo3K22D6qF0DuFH6Y/nbnE11GY5uguDxZMGXPQ8WQ0128MXQD7TnfHyK4oWoIJQ=="],

    "@tailwindcss/oxide-wasm32-wasi/@tybys/wasm-util": ["@tybys/wasm-util@0.9.0", "", { "dependencies": { "tslib": "^2.4.0" }, "bundled": true }, "sha512-6+7nlbMVX/PVDCwaIQ8nTOPveOcFLSt8GcXdx8hD0bt39uWxYT88uXzqTd4fTvqta7oeUJqudepapKNt2DYJFw=="],

    "@tailwindcss/oxide-wasm32-wasi/tslib": ["tslib@2.8.1", "", { "bundled": true }, "sha512-oJFu94HQb+KVduSUQL7wnpmqnfmLsOA/nAh6b6EH0wCEoK0/mPeXU6c3wKDV83MkOuHPRHtSXKKU99IBazS/2w=="],

    "@typescript-eslint/eslint-plugin/ignore": ["ignore@7.0.5", "", {}, "sha512-Hs59xBNfUIunMFgWAbGX5cq6893IbWg4KnrjbYwX3tx0ztorVgTDA6B2sxf8ejHJ4wz8BqGUMYlnzNBer5NvGg=="],

    "@typescript-eslint/typescript-estree/minimatch": ["minimatch@9.0.5", "", { "dependencies": { "brace-expansion": "^2.0.1" } }, "sha512-G6T0ZX48xgozx7587koeX9Ys2NYy6Gmv//P89sEte9V9whIapMNF4idKxnW2QtCcLiTWlb/wfCabAtAFWhhBow=="],

    "@typescript-eslint/typescript-estree/semver": ["semver@7.7.2", "", { "bin": { "semver": "bin/semver.js" } }, "sha512-RF0Fw+rO5AMf9MAyaRXI4AV0Ulj5lMHqVxxdSgiVbixSCXoEmmX/jk0CuJw4+3SqroYO9VoUh+HcuJivvtJemA=="],

    "fast-glob/glob-parent": ["glob-parent@5.1.2", "", { "dependencies": { "is-glob": "^4.0.1" } }, "sha512-AOIgSQCepiJYwP3ARnGx+5VnTu2HBYdzbGP45eLw1vr3zB3vZLeyed1sC9hnbcOc9/SrMyM5RPQrkGz4aS9Zow=="],

    "lru-cache/yallist": ["yallist@3.1.1", "", {}, "sha512-a4UGQaWPH59mOXUYnAG2ewncQS4i4F43Tv3JoAM+s2VDAmS9NsK8GpDMLrCHPksFT7h3K6TOoUNn2pb7RoXx4g=="],

    "micromatch/picomatch": ["picomatch@2.3.1", "", {}, "sha512-JU3teHTNjmE2VCGFzuY8EXzCDVwEqB2a8fsIvwaStHhAWJEeVd1o1QD80CU6+ZdEXXSLbSsuLwJjkCBWqRQUVA=="],

    "@tailwindcss/oxide-wasm32-wasi/@napi-rs/wasm-runtime/@tybys/wasm-util": ["@tybys/wasm-util@0.10.0", "", { "dependencies": { "tslib": "^2.4.0" } }, "sha512-VyyPYFlOMNylG45GoAe0xDoLwWuowvf92F9kySqzYh8vmYm7D2u4iUJKa1tOUpS70Ku13ASrOkS4ScXFsTaCNQ=="],

    "@typescript-eslint/typescript-estree/minimatch/brace-expansion": ["brace-expansion@2.0.2", "", { "dependencies": { "balanced-match": "^1.0.0" } }, "sha512-Jt0vHyM+jmUBqojB7E1NIYadt0vI0Qxjxd2TErW94wDz+E2LAm5vKMXXwg6ZZBTHPuUlDgQHKXvjGBdfcF1ZDQ=="],

}
}

================
File: eslint.config.js
================
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { globalIgnores } from 'eslint/config'

export default tseslint.config([
globalIgnores(['dist']),
{
files: ['**/*.{ts,tsx}'],
extends: [
js.configs.recommended,
tseslint.configs.recommended,
reactHooks.configs['recommended-latest'],
reactRefresh.configs.vite,
],
languageOptions: {
ecmaVersion: 2020,
globals: globals.browser,
},
},
])

================
File: index.html
================

<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vite + React + TS</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>

================
File: package.json
================
{
"name": "vite-project",
"private": true,
"version": "0.0.0",
"type": "module",
"scripts": {
"dev": "vite",
"build": "tsc -b && vite build",
"lint": "eslint .",
"preview": "vite preview"
},
"dependencies": {
"@effect-rx/rx": "0.47.1",
"@effect-rx/rx-react": "^0.40.5",
"@effect/platform-browser": "^0.70.0",
"@tailwindcss/vite": "^4.1.11",
"react": "^19.1.1",
"react-dom": "^19.1.1",
"tailwindcss": "^4.1.11",
"zustand": "^5.0.6"
},
"devDependencies": {
"@eslint/js": "^9.32.0",
"@types/react": "^19.1.9",
"@types/react-dom": "^19.1.7",
"@vitejs/plugin-react": "^4.7.0",
"eslint": "^9.32.0",
"eslint-plugin-react-hooks": "^5.2.0",
"eslint-plugin-react-refresh": "^0.4.20",
"globals": "^16.3.0",
"typescript": "~5.8.3",
"typescript-eslint": "^8.38.0",
"vite": "^7.0.6"
}
}

================
File: README.md
================

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:
