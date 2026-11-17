/**
 * Marks the page with `data-away` while nobody is looking at it: the tab is hidden or the window has lost focus.
 * The card art's idle drift pauses then (see `default.css`), since it costs the main thread a style recalculation on every frame.
 * Returns a function that stops watching.
 */
export function watchAttention(page: Document, view: Window): () => void {
    const update = () => {
        const away = page.hidden || !page.hasFocus()
        page.documentElement.toggleAttribute('data-away', away)
    }
    const events = ['focus', 'blur'] as const
    for (const event of events) view.addEventListener(event, update)
    page.addEventListener('visibilitychange', update)
    update()
    return () => {
        for (const event of events) view.removeEventListener(event, update)
        page.removeEventListener('visibilitychange', update)
    }
}
