import { Component } from 'preact'
import type { ComponentChildren } from 'preact'
import { useState } from 'preact/hooks'
import { Modal, copy } from './Dialogs'

interface State {
    error: Error | null
}

/** What a player pastes into a bug report: the error with its stack, the game version, the address and the browser. */
export function errorReport(error: Error): string {
    // The error and the top of the stack come first, because the dialog only shows the first lines.
    const head = `${error.name}: ${error.message}`
    const lines = [error.stack?.includes(head) ? error.stack : [head, error.stack].filter(Boolean).join('\n')]
    lines.push('', `Heartrow ${__APP_VERSION__}`, `Address: ${window.location.search || '(none)'}`, `Browser: ${navigator.userAgent}`)
    return lines.join('\n')
}

/** The dialog for an error the game cannot recover from. Closing it reloads the page, and the saved run survives a reload. */
export function ErrorDialog({ error }: { error: Error }) {
    const [copied, setCopied] = useState(false)
    const report = errorReport(error)
    const reload = () => window.location.reload()
    return (
        <Modal title="Something went wrong" onClose={reload}>
            <p>{error.message}</p>
            <pre class="err-details">{report}</pre>
            <p class="rules">Copy the details into a bug report. Reloading the page keeps your run.</p>
            <div class="bar">
                <button type="button" class="b alt" onClick={() => void copy(report).then(setCopied)}>
                    {copied ? 'Copied' : 'Copy details'}
                </button>
                <button type="button" class="b" onClick={reload}>
                    Reload
                </button>
            </div>
        </Modal>
    )
}

/**
 * Catches an error thrown while drawing. Without it Preact leaves a half-drawn page that no later update can repair
 * (its next error is `insertBefore` on a node that is gone). The page shows a dialog with the details instead. Closing it
 * reloads the page, and so does the next hot update in development: the app that failed is gone from the page, so a hot
 * update has nothing mounted to patch and would keep drawing the old broken code. The saved run survives a reload.
 * Errors outside drawing (startup, event handlers, timers) are shown by `fatalErrors.ts`.
 */
export class ErrorBoundary extends Component<{ children: ComponentChildren }, State> {
    state: State = { error: null }

    componentDidMount() {
        import.meta.hot?.on('vite:afterUpdate', this.reloadAfterFailure)
    }

    componentWillUnmount() {
        import.meta.hot?.off('vite:afterUpdate', this.reloadAfterFailure)
    }

    componentDidCatch(error: unknown) {
        this.setState({ error: error instanceof Error ? error : new Error(String(error)) })
    }

    reloadAfterFailure = () => {
        if (this.state.error !== null) window.location.reload()
    }

    render() {
        const { error } = this.state
        return error === null ? this.props.children : <ErrorDialog error={error} />
    }
}
