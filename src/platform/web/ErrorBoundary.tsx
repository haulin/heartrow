import { Component } from 'preact'
import type { ComponentChildren } from 'preact'
import { Modal } from './Dialogs'

interface State {
    error: Error | null
}

/**
 * Catches an error thrown while drawing. Without it Preact leaves a half-drawn page that no later update can repair
 * (its next error is `insertBefore` on a node that is gone). The page shows a dialog with the message instead. Closing it
 * reloads the page, and so does the next hot update in development: the app that failed is gone from the page, so a hot
 * update has nothing mounted to patch and would keep drawing the old broken code. The saved run survives a reload.
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
        if (error === null) return this.props.children
        return (
            <Modal onClose={() => window.location.reload()}>
                <h2>Something went wrong</h2>
                <p>{error.message}</p>
                <p class="rules">Closing this reloads the page. Your run is kept.</p>
            </Modal>
        )
    }
}
