import type { HttpClientError } from "@effect/platform"
import { FetchHttpClient, HttpClient, HttpClientRequest, HttpClientResponse } from "@effect/platform"
import { Context, Effect, Layer, Schema } from "effect"
import type { ParseError } from "effect/ParseResult"

// API response schemas
const PlaysResponse = Schema.Array(FactPlay)

// Service interface
export interface ApiClient {
  readonly getRecentPlays: (params?: {
    limit?: number
    offset?: number
  }) => Effect.Effect<ReadonlyArray<FactPlay>, ParseError | HttpClientError.HttpClientError>
}

// Service tag
export const ApiClient = Context.GenericTag<ApiClient>("@adjoint/web/ApiClient")

// Service implementation
export const ApiClientLive = Layer.effect(
  ApiClient,
  Effect.gen(function*() {
    const baseUrl = window.location.origin // Use current origin in dev, proxy handles routing
    const client = (yield* HttpClient.HttpClient).pipe(
      HttpClient.mapRequest(HttpClientRequest.prependUrl(baseUrl))
    )

    return ApiClient.of({
      getRecentPlays: (params) =>
        client.get("/api/plays", {
          urlParams: new URLSearchParams({
            limit: String(params?.limit ?? 50),
            offset: String(params?.offset ?? 0)
          })
        }).pipe(
          Effect.flatMap(HttpClientResponse.schemaBodyJson(PlaysResponse))
        )
    })
  })
)

// Default layer composition
export const ApiClientDefault = ApiClientLive.pipe(
  Layer.provide(FetchHttpClient.layer)
)
