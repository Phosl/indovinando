export const DEFAULT_AI_SCAN_CREDITS_TOTAL = 12

export function normalizeAiScanCredits(rawProfile = {}) {
  const totalBase = Number(
    rawProfile?.ai_scan_credits_total ?? rawProfile?.total ?? DEFAULT_AI_SCAN_CREDITS_TOTAL,
  )
  const bonusBase = Number(rawProfile?.ai_scan_credits_bonus ?? rawProfile?.bonus ?? 0)
  const usedBase = Number(rawProfile?.ai_scan_credits_used ?? rawProfile?.used ?? 0)

  const total = Number.isFinite(totalBase) ? Math.max(0, Math.trunc(totalBase)) : DEFAULT_AI_SCAN_CREDITS_TOTAL
  const bonus = Number.isFinite(bonusBase) ? Math.max(0, Math.trunc(bonusBase)) : 0
  const used = Number.isFinite(usedBase) ? Math.max(0, Math.trunc(usedBase)) : 0
  const available = total + bonus
  const remaining = Math.max(0, available - used)

  return {
    total,
    bonus,
    used,
    available,
    remaining,
  }
}

export function canConsumeAiScanCredits(credits, amount = 1) {
  const safeCredits = normalizeAiScanCredits(credits)
  const needed = Math.max(0, Math.trunc(Number(amount) || 0))
  return safeCredits.remaining >= needed
}
