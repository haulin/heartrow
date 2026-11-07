/** Every file in `glyphs/`, by path, as the URL the bundler serves it from. A new icon is a new file there and nothing else. */
const GLYPH_URLS = import.meta.glob<string>('./glyphs/*.svg', { eager: true, query: '?url', import: 'default' })

export const glyphNames = (): string[] => Object.keys(GLYPH_URLS).map((path) => /\/([^/]+)\.svg$/.exec(path)![1]!)

/** A one-colour icon from `glyphs/<name>.svg`, drawn in the text colour. It is decoration, so screen readers skip it. */
export function Glyph({ name }: { name: string }) {
    const url = GLYPH_URLS[`./glyphs/${name}.svg`]
    const mask = url ? `url("${url}")` : undefined
    return <span class={`glyph ${name}`} style={{ maskImage: mask, WebkitMaskImage: mask }} aria-hidden="true" />
}
