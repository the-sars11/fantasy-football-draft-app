/**
 * withViewTransition (Sunday Night Gridiron - continuity)
 *
 * Runs a DOM update (usually a route navigation) inside a same-document View Transition when
 * the browser supports it, for a smooth cross-fade / shared-element morph. Feature-detected
 * and safe everywhere: on unsupported browsers it just runs the update immediately.
 *
 * Usage: withViewTransition(() => router.push('/draft/live?session=' + id))
 * To morph a specific element across the transition, give the source and destination elements
 * the same CSS `view-transition-name`.
 */
export function withViewTransition(update: () => void): void {
  if (
    typeof document !== 'undefined' &&
    'startViewTransition' in document &&
    typeof (document as Document & { startViewTransition?: unknown }).startViewTransition === 'function'
  ) {
    ;(document as Document & { startViewTransition: (cb: () => void) => void }).startViewTransition(update)
  } else {
    update()
  }
}
