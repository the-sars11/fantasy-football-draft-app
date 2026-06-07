import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FFI Gridiron',
    short_name: 'FFI',
    description: 'AI-powered fantasy football draft intelligence',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0D0F14',
    theme_color: '#8BFF45',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
