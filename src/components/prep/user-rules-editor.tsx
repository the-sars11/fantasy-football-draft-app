'use client'

/**
 * UserRulesEditor (FF-231)
 *
 * Management UI for user-defined natural language rules.
 * Features:
 * - Create rules via natural language input
 * - View AI interpretation and confidence
 * - Toggle rules on/off
 * - Preview affected players
 * - Edit and delete rules
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  X,
  Trash2,
  Edit2,
  Check,
  ChevronDown,
  ChevronRight,
  Zap,
  Target,
  ShieldAlert,
  Sparkles,
  AlertCircle,
  Users,
  RefreshCw,
  Lightbulb,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useUserRules, useRulePreview, getExampleRules } from '@/hooks/use-user-rules'
import type { UserRule, ParsedRule, RuleType } from '@/lib/supabase/database.types'

// --- Types ---

interface UserRulesEditorProps {
  leagueId?: string | null
  className?: string
}

// --- Constants ---

const RULE_TYPE_CONFIG: Record<RuleType, {
  icon: typeof Target
  label: string
  bgColor: string
  textColor: string
  glowColor: string
}> = {
  target: {
    icon: Target,
    label: 'TARGET',
    bgColor: 'bg-secondary-container/30',
    textColor: 'text-gridiron-secondary',
    glowColor: 'shadow-[0_0_10px_rgba(47,248,1,0.2)]',
  },
  avoid: {
    icon: ShieldAlert,
    label: 'AVOID',
    bgColor: 'bg-error/20',
    textColor: 'text-error',
    glowColor: 'shadow-[0_0_10px_rgba(255,113,108,0.2)]',
  },
  boost: {
    icon: Zap,
    label: 'BOOST',
    bgColor: 'bg-primary/20',
    textColor: 'text-gridiron-primary',
    glowColor: 'shadow-[0_0_10px_rgba(139,172,255,0.2)]',
  },
  filter: {
    icon: Users,
    label: 'FILTER',
    bgColor: 'bg-surface-container-high',
    textColor: 'text-on-surface-variant',
    glowColor: '',
  },
  custom: {
    icon: Sparkles,
    label: 'CUSTOM',
    bgColor: 'bg-surface-container-high',
    textColor: 'text-on-surface-variant',
    glowColor: '',
  },
}

// --- Main Component ---

export function UserRulesEditor({ leagueId, className }: UserRulesEditorProps) {
  const {
    rules,
    isLoading,
    error,
    refetch,
    createRule,
    deleteRule,
    toggleRule,
    updateRule,
  } = useUserRules({ leagueId, includeGlobal: true })

  const { preview, isLoading: previewLoading, previewRule, clearPreview } = useRulePreview()

  // UI state
  const [isCreating, setIsCreating] = useState(false)
  const [newRuleText, setNewRuleText] = useState('')
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Debounced preview
  useEffect(() => {
    if (!newRuleText.trim()) {
      clearPreview()
      return
    }

    const timer = setTimeout(() => {
      previewRule(newRuleText)
    }, 500)

    return () => clearTimeout(timer)
  }, [newRuleText, previewRule, clearPreview])

  // Handlers
  const handleCreateRule = useCallback(async () => {
    if (!newRuleText.trim() || isSubmitting) return

    setIsSubmitting(true)
    setCreateError(null)

    const result = await createRule(newRuleText)

    if (result.success) {
      setNewRuleText('')
      setIsCreating(false)
      clearPreview()
    } else {
      setCreateError(result.error ?? 'Failed to create rule')
    }

    setIsSubmitting(false)
  }, [newRuleText, isSubmitting, createRule, clearPreview])

  const handleToggleRule = useCallback(async (id: string) => {
    await toggleRule(id)
  }, [toggleRule])

  const handleDeleteRule = useCallback(async (id: string) => {
    await deleteRule(id)
  }, [deleteRule])

  const handleStartEdit = useCallback((rule: UserRule) => {
    setEditingRuleId(rule.id)
    setEditingText(rule.rule_text)
  }, [])

  const handleSaveEdit = useCallback(async () => {
    if (!editingRuleId || !editingText.trim()) return

    const result = await updateRule(editingRuleId, { ruleText: editingText })
    if (result.success) {
      setEditingRuleId(null)
      setEditingText('')
    }
  }, [editingRuleId, editingText, updateRule])

  const handleCancelEdit = useCallback(() => {
    setEditingRuleId(null)
    setEditingText('')
  }, [])

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedRuleId((prev) => (prev === id ? null : id))
  }, [])

  const handleExampleClick = useCallback((text: string) => {
    setNewRuleText(text)
    setIsCreating(true)
  }, [])

  const exampleRules = useMemo(() => getExampleRules(), [])

  // Split rules by active status
  const activeRules = rules.filter((r) => r.is_active)
  const inactiveRules = rules.filter((r) => !r.is_active)

  return (
    <div className={`space-y-4 ${className ?? ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-headline text-lg font-bold text-on-surface">
            Custom Rules
          </h3>
          <p className="text-xs text-on-surface-variant">
            Natural language rules that modify player scores
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isLoading}
            className="h-8 w-8"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            onClick={() => setIsCreating(true)}
            className="h-8 gap-1.5 bg-gridiron-secondary text-on-secondary hover:bg-gridiron-secondary/90 shadow-[0_0_15px_rgba(47,248,1,0.3)]"
          >
            <Plus className="h-4 w-4" />
            Add Rule
          </Button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-error/10 border border-error/30 text-error text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Create new rule section */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-panel rounded-xl p-4 space-y-4 border border-gridiron-secondary/20">
              <div className="flex items-center justify-between">
                <h4 className="font-headline text-sm font-bold text-on-surface flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-gridiron-secondary" />
                  New Rule
                </h4>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsCreating(false)
                    setNewRuleText('')
                    clearPreview()
                    setCreateError(null)
                  }}
                  className="h-6 w-6"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Input */}
              <div className="space-y-2">
                <Input
                  value={newRuleText}
                  onChange={(e) => setNewRuleText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleCreateRule()
                    }
                  }}
                  placeholder="e.g., Avoid all WRs from Dallas"
                  className="bg-surface-container border-outline-variant/30 focus:border-gridiron-secondary text-on-surface"
                  autoFocus
                />
                <p className="text-[10px] text-on-surface-variant">
                  Describe your rule in plain English. AI will interpret it.
                </p>
              </div>

              {/* Preview */}
              {previewLoading && (
                <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Analyzing rule...
                </div>
              )}

              {preview && !previewLoading && (
                <RulePreviewDisplay preview={preview} />
              )}

              {/* Create error */}
              {createError && (
                <div className="flex items-center gap-2 text-sm text-error">
                  <AlertCircle className="h-4 w-4" />
                  {createError}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-outline-variant/20">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsCreating(false)
                    setNewRuleText('')
                    clearPreview()
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateRule}
                  disabled={
                    !newRuleText.trim() ||
                    isSubmitting ||
                    (preview?.validation && !preview.validation.isValid)
                  }
                  className="bg-gridiron-secondary text-on-secondary hover:bg-gridiron-secondary/90"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Create Rule
                    </>
                  )}
                </Button>
              </div>

              {/* Examples */}
              <div className="pt-2 border-t border-outline-variant/20">
                <p className="text-[10px] text-on-surface-variant mb-2 flex items-center gap-1">
                  <Lightbulb className="h-3 w-3" />
                  Examples:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {exampleRules.slice(0, 4).map((ex) => (
                    <button
                      key={ex.text}
                      onClick={() => handleExampleClick(ex.text)}
                      className="text-[10px] px-2 py-1 rounded-full bg-surface-container-high text-on-surface-variant hover:bg-surface-bright hover:text-on-surface transition-colors"
                    >
                      {ex.text}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Rules */}
      {activeRules.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
            Active ({activeRules.length})
          </h4>
          <div className="space-y-2">
            {activeRules.map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                isEditing={editingRuleId === rule.id}
                editingText={editingText}
                isExpanded={expandedRuleId === rule.id}
                onToggle={() => handleToggleRule(rule.id)}
                onDelete={() => handleDeleteRule(rule.id)}
                onStartEdit={() => handleStartEdit(rule)}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
                onEditTextChange={setEditingText}
                onToggleExpand={() => handleToggleExpand(rule.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Inactive Rules */}
      {inactiveRules.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
            Inactive ({inactiveRules.length})
          </h4>
          <div className="space-y-2 opacity-60">
            {inactiveRules.map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                isEditing={editingRuleId === rule.id}
                editingText={editingText}
                isExpanded={expandedRuleId === rule.id}
                onToggle={() => handleToggleRule(rule.id)}
                onDelete={() => handleDeleteRule(rule.id)}
                onStartEdit={() => handleStartEdit(rule)}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
                onEditTextChange={setEditingText}
                onToggleExpand={() => handleToggleExpand(rule.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {rules.length === 0 && !isLoading && !isCreating && (
        <div className="glass-panel rounded-xl p-6 text-center">
          <Sparkles className="h-10 w-10 text-gridiron-secondary/50 mx-auto mb-3" />
          <h4 className="font-headline text-lg font-bold text-on-surface mb-1">
            No rules yet
          </h4>
          <p className="text-sm text-on-surface-variant mb-4">
            Create rules in plain English to customize player scores
          </p>
          <Button
            onClick={() => setIsCreating(true)}
            className="bg-gridiron-secondary text-on-secondary hover:bg-gridiron-secondary/90"
          >
            <Plus className="h-4 w-4 mr-1" />
            Create Your First Rule
          </Button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && rules.length === 0 && (
        <div className="flex items-center justify-center py-8 text-on-surface-variant">
          <RefreshCw className="h-5 w-5 animate-spin mr-2" />
          Loading rules...
        </div>
      )}
    </div>
  )
}

// --- Rule Card Component ---

interface RuleCardProps {
  rule: UserRule
  isEditing: boolean
  editingText: string
  isExpanded: boolean
  onToggle: () => void
  onDelete: () => void
  onStartEdit: () => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onEditTextChange: (text: string) => void
  onToggleExpand: () => void
}

function RuleCard({
  rule,
  isEditing,
  editingText,
  isExpanded,
  onToggle,
  onDelete,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditTextChange,
  onToggleExpand,
}: RuleCardProps) {
  const config = RULE_TYPE_CONFIG[rule.rule_type] ?? RULE_TYPE_CONFIG.custom
  const Icon = config.icon
  const parsedRule = rule.parsed_rule as ParsedRule

  return (
    <motion.div
      layout
      className={`glass-panel rounded-xl overflow-hidden border transition-all ${
        rule.is_active
          ? `border-${rule.rule_type === 'target' ? 'gridiron-secondary' : rule.rule_type === 'avoid' ? 'error' : 'outline-variant'}/20 ${config.glowColor}`
          : 'border-outline-variant/10'
      }`}
    >
      {/* Main row */}
      <div className="p-4 flex items-start gap-3">
        {/* Type badge */}
        <div
          className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${config.bgColor}`}
        >
          <Icon className={`h-5 w-5 ${config.textColor}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                value={editingText}
                onChange={(e) => onEditTextChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    onSaveEdit()
                  } else if (e.key === 'Escape') {
                    onCancelEdit()
                  }
                }}
                className="flex-1 h-8 text-sm bg-surface-container border-outline-variant/30"
                autoFocus
              />
              <Button size="icon" variant="ghost" onClick={onSaveEdit} className="h-8 w-8">
                <Check className="h-4 w-4 text-gridiron-secondary" />
              </Button>
              <Button size="icon" variant="ghost" onClick={onCancelEdit} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-on-surface">
                {rule.rule_text}
              </p>
              {rule.llm_interpretation && (
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {rule.llm_interpretation}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Badge
                  variant="outline"
                  className={`${config.bgColor} ${config.textColor} border-0 text-[9px] font-bold`}
                >
                  {config.label}
                </Badge>
                {parsedRule?.score_modifier !== undefined && (
                  <Badge
                    variant="outline"
                    className={`text-[9px] font-bold ${
                      parsedRule.score_modifier > 0
                        ? 'bg-secondary-container/30 text-gridiron-secondary'
                        : parsedRule.score_modifier < 0
                          ? 'bg-error/20 text-error'
                          : 'bg-surface-container-high text-on-surface-variant'
                    } border-0`}
                  >
                    {parsedRule.score_modifier > 0 ? '+' : ''}
                    {parsedRule.score_modifier}
                  </Badge>
                )}
                {parsedRule?.confidence !== undefined && (
                  <span className="text-[9px] text-on-surface-variant">
                    {Math.round(parsedRule.confidence * 100)}% confidence
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="shrink-0 flex items-center gap-1">
          <Switch
            checked={rule.is_active}
            onCheckedChange={onToggle}
            className="data-[state=checked]:bg-gridiron-secondary"
          />
          <button
            onClick={onToggleExpand}
            className="p-1.5 rounded-lg hover:bg-surface-container-high transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-on-surface-variant" />
            ) : (
              <ChevronRight className="h-4 w-4 text-on-surface-variant" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 space-y-3 border-t border-outline-variant/10">
              {/* Parsed conditions */}
              {parsedRule?.conditions && parsedRule.conditions.length > 0 && (
                <div className="pt-3">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                    Conditions
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {parsedRule.conditions.map((cond, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-1 rounded bg-surface-container-high text-on-surface-variant"
                      >
                        {cond.field} {cond.operator.replace('_', ' ')}{' '}
                        {Array.isArray(cond.value)
                          ? cond.value.join(', ')
                          : String(cond.value)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions row */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onStartEdit}
                  className="h-7 text-xs"
                >
                  <Edit2 className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDelete}
                  className="h-7 text-xs text-error hover:text-error hover:bg-error/10"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// --- Rule Preview Display ---

interface RulePreviewDisplayProps {
  preview: {
    parsedRule: ParsedRule
    interpretation?: string
    confidence: number
    validation: {
      isValid: boolean
      errors: string[]
      warnings: string[]
    }
    affectedPlayers: Array<{
      id: string
      name: string
      team: string | null
      position: string
      adp: number | null
      modifier: number
    }>
    totalAffected: number
    modifier: number
  }
}

function RulePreviewDisplay({ preview }: RulePreviewDisplayProps) {
  const { parsedRule, interpretation, confidence, validation, affectedPlayers, totalAffected } = preview

  const config = RULE_TYPE_CONFIG[parsedRule.action] ?? RULE_TYPE_CONFIG.custom
  const Icon = config.icon

  return (
    <div className="space-y-3 p-3 rounded-lg bg-surface-container-low border border-outline-variant/20">
      {/* Interpretation */}
      <div className="flex items-start gap-2">
        <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${config.bgColor}`}>
          <Icon className={`h-4 w-4 ${config.textColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-on-surface">
            {interpretation ?? 'Processing...'}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className={`${config.bgColor} ${config.textColor} border-0 text-[9px]`}>
              {config.label}
            </Badge>
            <Badge
              variant="outline"
              className={`text-[9px] ${
                parsedRule.score_modifier > 0
                  ? 'bg-secondary-container/30 text-gridiron-secondary'
                  : parsedRule.score_modifier < 0
                    ? 'bg-error/20 text-error'
                    : 'bg-surface-container-high text-on-surface-variant'
              } border-0`}
            >
              {parsedRule.score_modifier > 0 ? '+' : ''}
              {parsedRule.score_modifier}
            </Badge>
            <span className="text-[9px] text-on-surface-variant">
              {Math.round(confidence * 100)}% confidence
            </span>
          </div>
        </div>
      </div>

      {/* Validation errors */}
      {!validation.isValid && validation.errors.length > 0 && (
        <div className="flex items-start gap-2 p-2 rounded bg-error/10 border border-error/20">
          <AlertCircle className="h-4 w-4 text-error shrink-0 mt-0.5" />
          <div className="text-xs text-error">
            {validation.errors.map((err, i) => (
              <p key={i}>{err}</p>
            ))}
          </div>
        </div>
      )}

      {/* Validation warnings */}
      {validation.warnings.length > 0 && (
        <div className="text-[10px] text-on-surface-variant">
          {validation.warnings.map((warn, i) => (
            <p key={i}>⚠️ {warn}</p>
          ))}
        </div>
      )}

      {/* Affected players preview */}
      {affectedPlayers.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
            Affects {totalAffected} player{totalAffected !== 1 ? 's' : ''} (showing {affectedPlayers.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {affectedPlayers.slice(0, 8).map((player) => (
              <span
                key={player.id}
                className={`text-[10px] px-2 py-1 rounded ${
                  player.modifier > 0
                    ? 'bg-secondary-container/30 text-gridiron-secondary'
                    : player.modifier < 0
                      ? 'bg-error/20 text-error'
                      : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                {player.name} ({player.position})
              </span>
            ))}
            {affectedPlayers.length > 8 && (
              <span className="text-[10px] px-2 py-1 text-on-surface-variant">
                +{affectedPlayers.length - 8} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}