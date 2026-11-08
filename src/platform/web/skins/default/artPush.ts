const OUT_SECONDS = 0.1925
const BACK_SECONDS = 0.715
const PUSH_SECONDS = OUT_SECONDS + BACK_SECONDS
/** Share of the push spent travelling out; the rest is the return. */
const OUT_SHARE = OUT_SECONDS / PUSH_SECONDS

interface Point {
    x: number
    y: number
}

const running = new WeakMap<Element, Animation>()

/**
 * Pushes every shape of the card art away from its rest position and lets it settle back.
 * Entering again while a push still moves restarts the push from the shape's current place, not from rest and not by finishing the old one.
 * The animation belongs to the shape, not to `:hover`, so leaving the card does not cut it.
 */
export function pushArt(event: Event): void {
    const card = event.currentTarget as HTMLElement
    if (!motionAllowed(card)) return
    const duration = PUSH_SECONDS * loopTimeFactor(card) * 1000
    for (const shape of card.querySelectorAll<SVGElement>('svg.art > g > *')) pushShape(shape, duration)
}

function pushShape(shape: SVGElement, duration: number): void {
    const peak = readPoint(shape.parentElement as Element, '--bx', '--by')
    const here = readTranslate(shape)
    running.get(shape)?.cancel()

    const animation = shape.animate([{ translate: px(here) }, { translate: px(peak), offset: OUT_SHARE }, { translate: '0px 0px' }], {
        duration,
        easing: 'ease-out',
    })
    running.set(shape, animation)
    animation.addEventListener('finish', () => {
        if (running.get(shape) === animation) running.delete(shape)
    })
}

function motionAllowed(card: HTMLElement): boolean {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false
    return card.closest('.app')?.getAttribute('data-anim') !== 'off'
}

function loopTimeFactor(element: Element): number {
    const factor = parseFloat(getComputedStyle(element).getPropertyValue('--loop-time'))
    return Number.isFinite(factor) ? factor : 1
}

function readPoint(element: Element, xName: string, yName: string): Point {
    const style = getComputedStyle(element)
    return { x: parseFloat(style.getPropertyValue(xName)) || 0, y: parseFloat(style.getPropertyValue(yName)) || 0 }
}

function readTranslate(element: Element): Point {
    const [x = '0', y = '0'] = getComputedStyle(element).translate.split(' ')
    return { x: parseFloat(x) || 0, y: parseFloat(y) || 0 }
}

function px({ x, y }: Point): string {
    return `${x}px ${y}px`
}
