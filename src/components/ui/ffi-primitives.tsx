"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/* ========================================
   FFI Button Components
   ======================================== */

interface FFIButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost"
  size?: "default" | "sm" | "lg"
}

export function FFIButton({
  className,
  variant = "primary",
  size = "default",
  children,
  ...props
}: FFIButtonProps) {
  const variants = {
    primary: "ffi-btn-primary",
    secondary: "ffi-btn-secondary",
    ghost: "ffi-btn-ghost",
  }

  const sizes = {
    sm: "px-4 py-1.5 text-sm",
    default: "px-6 py-2.5 text-base",
    lg: "px-8 py-3 text-lg",
  }

  return (
    <button
      className={cn(
        variants[variant],
        size !== "default" && sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

/* ========================================
   FFI Card Components
   ======================================== */

interface FFICardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "interactive"
}

export function FFICard({
  className,
  variant = "default",
  children,
  ...props
}: FFICardProps) {
  const variants = {
    default: "ffi-card",
    elevated: "ffi-card-elevated",
    interactive: "ffi-card-interactive",
  }

  return (
    <div className={cn(variants[variant], className)} {...props}>
      {children}
    </div>
  )
}

export function FFICardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mb-3", className)} {...props}>
      {children}
    </div>
  )
}

export function FFICardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("ffi-title-lg text-white", className)} {...props}>
      {children}
    </h3>
  )
}

export function FFICardDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("ffi-body-md text-[var(--ffi-text-secondary)]", className)} {...props}>
      {children}
    </p>
  )
}

/* ========================================
   FFI Badge Components
   ======================================== */

type PositionType = "QB" | "RB" | "WR" | "TE" | "K" | "DEF"
type StatusType = "success" | "warning" | "danger" | "info"

interface FFIBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  position?: PositionType
  status?: StatusType
  variant?: "default" | "tag"
}

export function FFIBadge({
  className,
  position,
  status,
  variant = "default",
  children,
  ...props
}: FFIBadgeProps) {
  const positionClasses: Record<PositionType, string> = {
    QB: "ffi-badge-qb",
    RB: "ffi-badge-rb",
    WR: "ffi-badge-wr",
    TE: "ffi-badge-te",
    K: "ffi-badge-k",
    DEF: "ffi-badge-def",
  }

  const statusClasses: Record<StatusType, string> = {
    success: "ffi-badge-success",
    warning: "ffi-badge-warning",
    danger: "ffi-badge-danger",
    info: "ffi-badge-info",
  }

  const baseClass = variant === "tag" ? "ffi-tag" : "ffi-badge"
  const variantClass = position
    ? positionClasses[position]
    : status
    ? statusClasses[status]
    : ""

  return (
    <span className={cn(baseClass, variantClass, className)} {...props}>
      {children}
    </span>
  )
}

/* ========================================
   FFI Position Badge (Convenience)
   ======================================== */

interface FFIPositionBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  position: PositionType
}

export function FFIPositionBadge({
  position,
  className,
  ...props
}: FFIPositionBadgeProps) {
  return (
    <FFIBadge position={position} className={className} {...props}>
      {position}
    </FFIBadge>
  )
}

/* ========================================
   FFI Input Components
   ======================================== */

type FFIInputProps = React.InputHTMLAttributes<HTMLInputElement>

export const FFIInput = React.forwardRef<HTMLInputElement, FFIInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn("ffi-input", className)}
        {...props}
      />
    )
  }
)
FFIInput.displayName = "FFIInput"

/* ========================================
   FFI Progress Bar
   ======================================== */

interface FFIProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number // 0-100
  status?: "default" | "critical" | "stable" | "elite"
  label?: string
  showPercentage?: boolean
}

export function FFIProgress({
  className,
  value,
  status = "default",
  label,
  showPercentage = false,
  ...props
}: FFIProgressProps) {
  const clampedValue = Math.max(0, Math.min(100, value))

  const statusClasses = {
    default: "",
    critical: "ffi-progress-critical",
    stable: "ffi-progress-stable",
    elite: "ffi-progress-elite",
  }

  return (
    <div className={cn("w-full", className)} {...props}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && <span className="ffi-label text-[var(--ffi-text-secondary)]">{label}</span>}
          {showPercentage && <span className="ffi-label text-[var(--ffi-text-muted)]">{clampedValue}%</span>}
        </div>
      )}
      <div className={cn("ffi-progress", statusClasses[status])}>
        <div
          className="ffi-progress-bar"
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  )
}

/* ========================================
   FFI Grade Display
   ======================================== */

interface FFIGradeProps extends React.HTMLAttributes<HTMLDivElement> {
  grade: string // A+, A, A-, B+, etc.
  size?: "sm" | "default" | "lg"
}

export function FFIGrade({
  grade,
  size = "default",
  className,
  ...props
}: FFIGradeProps) {
  const letter = grade.charAt(0).toUpperCase()

  const gradeColors: Record<string, string> = {
    A: "ffi-grade-a",
    B: "ffi-grade-b",
    C: "ffi-grade-c",
    D: "ffi-grade-d",
    F: "ffi-grade-f",
  }

  const sizes = {
    sm: "w-12 h-12 text-2xl",
    default: "w-20 h-20 text-4xl",
    lg: "w-28 h-28 ffi-display-xl",
  }

  return (
    <div
      className={cn(
        "ffi-grade ffi-glass",
        gradeColors[letter] || "ffi-grade-c",
        sizes[size],
        className
      )}
      {...props}
    >
      {grade}
    </div>
  )
}

/* ========================================
   FFI Tactical Insight Card
   ======================================== */

interface FFITacticalInsightProps extends React.HTMLAttributes<HTMLDivElement> {
  insight: string
  confidence: number // 0-100
  onViewAnalytics?: () => void
}

export function FFITacticalInsight({
  insight,
  confidence,
  onViewAnalytics,
  className,
  ...props
}: FFITacticalInsightProps) {
  return (
    <div className={cn("ffi-card ffi-animate-slide-in", className)} {...props}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[var(--ffi-accent)]">✦</span>
        <span className="ffi-label text-[var(--ffi-text-secondary)]">TACTICAL INSIGHT</span>
      </div>
      <p className="ffi-body-md text-white mb-4">{insight}</p>
      <div className="flex items-center justify-between">
        <FFIProgress
          value={confidence}
          label="CONFIDENCE"
          showPercentage
          className="flex-1 mr-4"
        />
        {onViewAnalytics && (
          <FFIButton
            variant="ghost"
            size="sm"
            onClick={onViewAnalytics}
            className="text-[var(--ffi-primary)]"
          >
            FULL ANALYTICS
          </FFIButton>
        )}
      </div>
    </div>
  )
}

/* ========================================
   FFI Trash Talk Alert
   ======================================== */

type TrashTalkType = "overpay" | "imbalance" | "bye_disaster" | "reach" | "steal"

interface FFITrashTalkAlertProps extends React.HTMLAttributes<HTMLDivElement> {
  type: TrashTalkType
  message: string
  onDismiss?: () => void
  onSave?: () => void
}

export function FFITrashTalkAlert({
  type,
  message,
  onDismiss,
  onSave,
  className,
  ...props
}: FFITrashTalkAlertProps) {
  const icons: Record<TrashTalkType, string> = {
    overpay: "🔥",
    imbalance: "⚠️",
    bye_disaster: "💀",
    reach: "😬",
    steal: "🎯",
  }

  return (
    <div
      className={cn(
        "ffi-card-elevated ffi-animate-shake border-l-4",
        type === "overpay" && "border-l-[var(--ffi-danger)]",
        type === "imbalance" && "border-l-[var(--ffi-warning)]",
        type === "bye_disaster" && "border-l-[var(--ffi-danger)]",
        type === "reach" && "border-l-[var(--ffi-warning)]",
        type === "steal" && "border-l-[var(--ffi-success)]",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icons[type]}</span>
        <span className="ffi-label text-[var(--ffi-accent)]">TRASH TALK ALERT</span>
      </div>
      <p className="ffi-body-md text-white mb-3">{message}</p>
      <div className="flex gap-2">
        {onDismiss && (
          <FFIButton variant="ghost" size="sm" onClick={onDismiss}>
            DISMISS
          </FFIButton>
        )}
        {onSave && (
          <FFIButton variant="secondary" size="sm" onClick={onSave}>
            SAVE FOR LATER
          </FFIButton>
        )}
      </div>
    </div>
  )
}

/* ========================================
   FFI AI Recommendation Card
   ======================================== */

interface FFIAIRecommendationProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  message: string
  variant?: "strategic" | "dynamic"
  primaryAction?: {
    label: string
    onClick: () => void
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
}

export function FFIAIRecommendation({
  title,
  message,
  variant = "strategic",
  primaryAction,
  secondaryAction,
  className,
  ...props
}: FFIAIRecommendationProps) {
  return (
    <div
      className={cn(
        variant === "strategic" ? "ffi-card-elevated" : "ffi-card",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[var(--ffi-primary)]">
          {variant === "strategic" ? "⚙️" : "★"}
        </span>
        <span className="ffi-label text-[var(--ffi-text-muted)]">
          {variant === "strategic" ? "SYSTEM STATUS" : "AI RECOMMENDATION"}
        </span>
      </div>
      <h4 className="ffi-title-md text-white mb-2">{title}</h4>
      <p className="ffi-body-md text-[var(--ffi-text-secondary)] mb-4">{message}</p>
      {(primaryAction || secondaryAction) && (
        <div className="flex gap-2">
          {primaryAction && (
            <FFIButton variant="primary" size="sm" onClick={primaryAction.onClick}>
              {primaryAction.label}
            </FFIButton>
          )}
          {secondaryAction && (
            <FFIButton variant="secondary" size="sm" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </FFIButton>
          )}
        </div>
      )}
    </div>
  )
}

/* ========================================
   FFI Player Card (Compact)
   ======================================== */

interface FFIPlayerCardProps extends React.HTMLAttributes<HTMLDivElement> {
  rank: number
  name: string
  team: string
  position: PositionType
  bye: number
  value: number
  valueRange?: { low: number; high: number }
  badges?: string[]
  onExpand?: () => void
  isExpanded?: boolean
}

export function FFIPlayerCard({
  rank,
  name,
  team,
  position,
  bye,
  value,
  valueRange,
  badges,
  onExpand,
  isExpanded,
  className,
  children,
  ...props
}: FFIPlayerCardProps) {
  return (
    <div
      className={cn(
        "ffi-card-interactive",
        isExpanded && "ffi-card-elevated",
        className
      )}
      onClick={onExpand}
      {...props}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <span className="ffi-display-md text-[var(--ffi-accent)] font-bold w-8">
            {String(rank).padStart(2, "0")}
          </span>
          <div>
            <h4 className="ffi-title-lg text-white">{name}</h4>
            <p className="ffi-body-md text-[var(--ffi-text-secondary)]">
              {team} • <FFIPositionBadge position={position} className="inline" /> • BYE {bye}
            </p>
            {badges && badges.length > 0 && (
              <div className="flex gap-1.5 mt-2">
                {badges.map((badge, i) => (
                  <FFIBadge key={i} variant="tag" status="info">
                    {badge}
                  </FFIBadge>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="text-right">
          <span className="ffi-display-md text-[var(--ffi-accent)] font-bold">${value}</span>
          {valueRange && (
            <p className="ffi-body-md text-[var(--ffi-text-muted)]">
              ${valueRange.low}-${valueRange.high} RANGE
            </p>
          )}
        </div>
      </div>
      {isExpanded && children && (
        <div className="mt-4 pt-4 border-t border-[var(--ffi-border)]/20">
          {children}
        </div>
      )}
    </div>
  )
}

/* ========================================
   FFI Section Header
   ======================================== */

interface FFISectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function FFISectionHeader({
  title,
  subtitle,
  action,
  className,
  ...props
}: FFISectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between mb-4", className)} {...props}>
      <div>
        <h2 className="ffi-display-md text-white">{title}</h2>
        {subtitle && (
          <p className="ffi-body-md text-[var(--ffi-text-secondary)]">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  )
}

/* ========================================
   FFI Empty State
   ======================================== */

interface FFIEmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

export function FFIEmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: FFIEmptyStateProps) {
  return (
    <div className={cn("ffi-card text-center py-12", className)} {...props}>
      {icon && <div className="text-4xl mb-4">{icon}</div>}
      <h3 className="ffi-title-lg text-white mb-2">{title}</h3>
      {description && (
        <p className="ffi-body-md text-[var(--ffi-text-secondary)] mb-4 max-w-md mx-auto">
          {description}
        </p>
      )}
      {action}
    </div>
  )
}
