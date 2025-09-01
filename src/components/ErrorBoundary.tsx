import { Component, type ReactNode } from 'react'

type Props = { children: ReactNode; fallback?: (error: Error) => ReactNode }
type State = { hasError: boolean; error?: Error }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }
  componentDidCatch(error: Error, info: unknown) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback?.(this.state.error as Error) ?? (
        <div role="alert">Something went wrong.</div>
      )
    }
    return this.props.children
  }
}
