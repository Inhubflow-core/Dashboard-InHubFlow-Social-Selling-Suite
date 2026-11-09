import { useCallback, useEffect, useReducer, useRef } from 'react'
import type { Page } from '@visual-studio/types/api'
import { useLatest } from './useLatest'

interface State<T> {
  items: T[]
  page: number
  loading: boolean
  error: string | null
  hasMore: boolean
}

type Action<T> =
  | { type: 'start'; reset: boolean }
  | { type: 'done'; items: T[]; page: number; hasMore: boolean; reset: boolean }
  | { type: 'fail'; message: string }

function reducer<T>(state: State<T>, action: Action<T>): State<T> {
  switch (action.type) {
    case 'start':
      return action.reset ? { items: [], page: 0, loading: true, error: null, hasMore: true } : { ...state, loading: true, error: null }
    case 'done':
      if (action.reset) {
        return { items: action.items, page: action.page, loading: false, error: null, hasMore: action.hasMore }
      }
      const existingKeys = new Set(
        state.items.map((it: any) => (it && typeof it === 'object' && 'id' in it ? `${it.provider || ''}:${it.id}` : it))
      )
      const freshItems = action.items.filter((it: any) => {
        const key = it && typeof it === 'object' && 'id' in it ? `${it.provider || ''}:${it.id}` : it
        if (existingKeys.has(key)) return false
        existingKeys.add(key)
        return true
      })
      return { items: [...state.items, ...freshItems], page: action.page, loading: false, error: null, hasMore: action.hasMore }
    case 'fail':
      return { ...state, loading: false, error: action.message }
  }
}

/**
 * Paginated catalog loader with loading / empty / error states. Restarts when `key` changes; stale
 * responses are ignored.
 */
export function useAsyncList<T>(fetchPage: (page: number) => Promise<Page<T>>, key: string, enabled = true) {
  const [state, dispatch] = useReducer(reducer<T>, { items: [], page: 0, loading: enabled, error: null, hasMore: true })
  const token = useRef(0)
  const fetchRef = useLatest(fetchPage)

  const load = useCallback((page: number, reset: boolean) => {
    const mine = ++token.current
    dispatch({ type: 'start', reset })
    fetchRef.current(page).then(
      (res) => {
        if (mine === token.current) dispatch({ type: 'done', items: res.results, page, hasMore: res.next !== null, reset })
      },
      (err: unknown) => {
        if (mine === token.current) dispatch({ type: 'fail', message: err instanceof Error ? err.message : 'Request failed' })
      },
    )
  }, [fetchRef])

  useEffect(() => {
    if (!enabled) return
    load(1, true)
    return () => {
      token.current += 1
    }
  }, [key, enabled, load])

  return {
    ...state,
    loadMore: () => {
      if (!state.loading && state.hasMore) load(state.page + 1, false)
    },
    reload: () => load(1, true),
  }
}
