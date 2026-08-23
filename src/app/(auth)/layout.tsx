export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      {/* Full-screen navy SHIELD field (replaces shadcn bg-background + bg-primary/5 blur-3xl glow) */}
      <div className="stadium-atmos" aria-hidden="true" />
      <div className="atmos-grain" aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  )
}
