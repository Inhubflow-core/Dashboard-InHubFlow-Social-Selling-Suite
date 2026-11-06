import type { EditorServices } from '@doory/types/adapter'
import type { Page, TemplateCategory, TemplateDetail, TemplateQuery, TemplateSummary } from '@doory/types/api'
import { createTemplatesService } from '../editor/dev/fakeCatalog'

/**
 * Servicio persistente de plantillas de InHubFlow.
 * Consulta la base de datos central (/api/templates) para que todas las plantillas
 * guardadas por el Super Admin estén disponibles globalmente para todos los clientes y usuarios.
 * Si la red o el servidor fallan, utiliza un fallback seguro de plantillas locales.
 */
export function createPersistentTemplatesService(): EditorServices['templates'] {
  const fallback = createTemplatesService()

  return {
    async categories(): Promise<TemplateCategory[]> {
      try {
        const res = await fetch('/api/templates?action=categories', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data.categories) && data.categories.length > 0) {
            return data.categories
          }
        }
      } catch (err) {
        console.warn('[TemplatesService] Error fetching categories from API, using fallback:', err)
      }
      return fallback.categories()
    },

    async list(q: TemplateQuery): Promise<Page<TemplateSummary>> {
      try {
        const params = new URLSearchParams()
        if (q.page) params.set('page', String(q.page))
        if (q.page_size) params.set('page_size', String(q.page_size))
        if (q.q) params.set('q', q.q)
        if (q.category) params.set('category', q.category)
        if (q.orientation) params.set('orientation', q.orientation)
        if (q.featured) params.set('featured', 'true')

        const res = await fetch(`/api/templates?${params.toString()}`, { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          if (data && Array.isArray(data.items)) {
            return {
              page: Number(data.page) || 1,
              page_size: Number(data.page_size) || 24,
              total_pages: Number(data.total_pages) || 1,
              count: Number(data.count) || data.items.length,
              items: data.items,
            }
          }
        }
      } catch (err) {
        console.warn('[TemplatesService] Error fetching templates list from API, using fallback:', err)
      }
      return fallback.list(q)
    },

    async get(slug: string): Promise<TemplateDetail> {
      try {
        const res = await fetch(`/api/templates?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          if (data && data.template) {
            return data.template
          }
        }
      } catch (err) {
        console.warn(`[TemplatesService] Error fetching template detail (${slug}) from API, using fallback:`, err)
      }
      return fallback.get(slug)
    },
  }
}
