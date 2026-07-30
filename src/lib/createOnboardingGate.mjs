export function shouldAutoOpenCreateOnboarding({
  profile,
  profileError = null,
  createdGamesCount,
  gamesCountError = null,
}) {
  if (profileError || gamesCountError) return false

  return (
    profile?.onboarding === true &&
    Number.isInteger(createdGamesCount) &&
    createdGamesCount === 0
  )
}
