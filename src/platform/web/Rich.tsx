import { richParts } from './text'

/** Text where ●, ⚔, ♥ and ↺ are drawn as icons. The symbol stays in the page as transparent text, so copied text is still the symbol. */
export function Rich({ text }: { text: string }) {
    return (
        <>
            {richParts(text).map((part, i) =>
                part.sym ? (
                    <span key={i} class={`ico ${part.sym}`}>
                        {part.text}
                    </span>
                ) : (
                    part.text
                ),
            )}
        </>
    )
}
