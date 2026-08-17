// Matches markdown links (`[label](url)`) or bare URLs, so both forms found
// in event descriptions and notes render as clickable links.
const LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s]+)/g

export function LinkifiedText({ text, className }: { text: string; className?: string }) {
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let key = 0
  for (const match of text.matchAll(LINK_RE)) {
    const index = match.index
    if (index > lastIndex) parts.push(text.slice(lastIndex, index))
    const [full, mdLabel, mdUrl, bareUrl] = match
    const url = mdUrl ?? bareUrl
    parts.push(
      <a key={key++} href={url} target="_blank" rel="noreferrer" className="text-violet-600 underline">
        {mdLabel ?? bareUrl}
      </a>,
    )
    lastIndex = index + full.length
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))

  return <p className={className}>{parts}</p>
}
