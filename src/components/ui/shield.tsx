"use client"

/* ========================================================================
   SHIELD — the permanent typed component layer for the D0-locked design
   (Joe D0 GATE CLOSED 2026-08-14, optionB_shield). This module is the
   SINGLE sanctioned source for the recovered visual system: the shield
   background, the gunmetal nameplate card, the bevel titles, and the
   duotone icon chip. Screens compose these; they never hand-roll the look.
   ======================================================================== */

import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/* ---- Background ---------------------------------------------------------
   Fixed field gradient + blacked-out shield photo + veil + grain.
   Renders behind everything; content sits at z-10 in the shell. */
export function ShieldBackground() {
  return (
    <>
      <div className="shield-field" aria-hidden />
      <div className="shield-photo" aria-hidden />
      <div className="shield-veil" aria-hidden />
      <div className="atmos-grain" aria-hidden />
    </>
  )
}

/* ---- Titles -------------------------------------------------------------
   PageTitle  = hero page headline, deep muted-red bevel (Kanit).
   CardTitle  = card / destination title, chrome-silver bevel (Kanit). */
interface TitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3"
  tone?: "red" | "chrome"
}

export function PageTitle({
  as: Tag = "h1",
  tone = "red",
  className,
  children,
  ...props
}: TitleProps) {
  return (
    <Tag
      className={cn(tone === "red" ? "ffi-title-red" : "ffi-title-chrome", className)}
      {...props}
    >
      {children}
    </Tag>
  )
}

export function CardTitle({
  as: Tag = "h3",
  tone = "chrome",
  className,
  children,
  ...props
}: TitleProps) {
  return (
    <Tag
      className={cn(tone === "chrome" ? "ffi-title-chrome" : "ffi-title-red", className)}
      {...props}
    >
      {children}
    </Tag>
  )
}

/* ---- Nameplate (THE approved card) --------------------------------------
   Gunmetal plate with a brushed-steel gradient edge. `interactive` adds the
   hover lift. Renders a <button> or <a> automatically when given onClick/href
   via `asChild`-free simple props; default is a <div>. */
interface NameplateProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
}

export const Nameplate = React.forwardRef<HTMLDivElement, NameplateProps>(
  function Nameplate({ interactive = false, className, children, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          "ffi-nameplate",
          interactive && "ffi-nameplate-interactive cursor-pointer",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

/* ---- Duotone icon chip --------------------------------------------------
   Red plate + white glyph. Locked icon treatment. */
interface IconChipProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: LucideIcon
  size?: "sm" | "md" | "lg"
}

const CHIP_SIZE: Record<NonNullable<IconChipProps["size"]>, { box: string; glyph: number }> = {
  sm: { box: "h-10 w-10 rounded-lg", glyph: 18 },
  md: { box: "h-14 w-14", glyph: 24 },
  lg: { box: "h-16 w-16", glyph: 28 },
}

export function IconChip({ icon: Icon, size = "md", className, ...props }: IconChipProps) {
  const s = CHIP_SIZE[size]
  return (
    <div className={cn("ffi-icon-chip", s.box, className)} {...props}>
      <Icon size={s.glyph} strokeWidth={2} />
    </div>
  )
}
