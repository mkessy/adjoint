interface PlayItemProps {
  play: FactPlay
}

export function PlayItem({ play }: PlayItemProps) {
  // Format the airdate for display
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  return (
    <article className="play-item">
      <div className="play-content">
        <h3 className="play-artist">{play.artist || "Unknown Artist"}</h3>
        <p className="play-song">{play.song || "Unknown Song"}</p>
        {play.album && <p className="play-album">from {play.album}</p>}
      </div>
      <time className="play-time">{formatTime(play.airdate)}</time>
    </article>
  )
}
