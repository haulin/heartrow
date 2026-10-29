import { richParts } from './text'

/** Text where ●, ⚔ and ♥ get their currency colours. */
export function Rich({ text }: { text: string }) {
  return (
    <>
      {richParts(text).map((part, i) => (part.sym ? <span key={i} class={part.sym}>{part.text}</span> : part.text))}
    </>
  )
}
