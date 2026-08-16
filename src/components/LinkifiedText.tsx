const URL_RE = /(https?:\/\/[^\s]+)/g

export function LinkifiedText({ text, className }: { text: string; className?: string }) {
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let key = 0
  for (const match of text.matchAll(URL_RE)) {
    const index = match.index
    if (index > lastIndex) parts.push(text.slice(lastIndex, index))
    parts.push(
      <a key={key++} href={match[0]} target="_blank" rel="noreferrer" className="text-violet-600 underline">
        {match[0]}
      </a>,
    )
    lastIndex = index + match[0].length
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))

  return <p className={className}>{parts}</p>
}
