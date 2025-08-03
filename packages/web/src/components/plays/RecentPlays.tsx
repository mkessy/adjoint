// packages/web/src/components/plays/RecentPlays.tsx
import { Effect } from "effect"
import { ApiClient } from "../../services/ApiClient.js"
import { useAppEffect } from "../../services/AppRuntime.js"
import { PlayItem } from "./PlayItem.js"

export function RecentPlays() {
  // Create the effect that fetches plays
  const fetchPlaysEffect = Effect.gen(function*() {
    const api = yield* ApiClient
    return yield* api.getRecentPlays({ limit: 50 })
  })

  // Use our custom hook that handles lifecycle properly
  const { data: plays, error, loading } = useAppEffect(
    fetchPlaysEffect,
    [] // Dependencies - effect is recreated when these change
  )

  if (loading) {
    return <div className="loading">Loading recent plays...</div>
  }

  if (error) {
    return (
      <div className="error">
        Failed to load plays: {error._tag || "Unknown error"}
      </div>
    )
  }

  if (!plays || plays.length === 0) {
    return <div className="empty">No recent plays found</div>
  }

  return (
    <section className="recent-plays">
      <h2>Recent KEXP Plays</h2>
      <div className="plays-list">
        {plays.map((play: FactPlay) => <PlayItem key={play.id} play={play} />)}
      </div>
    </section>
  )
}
