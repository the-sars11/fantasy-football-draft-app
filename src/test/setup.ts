/**
 * Global Vitest setup — registered via vitest.config.ts `setupFiles`.
 *
 * Imports @testing-library/jest-dom so DOM matchers (toBeInTheDocument,
 * toHaveTextContent, etc.) are available to hook/component tests. Pure-function
 * and route-handler tests do not depend on this file, but loading it globally is
 * harmless and keeps a single setup path.
 */
import '@testing-library/jest-dom/vitest'
