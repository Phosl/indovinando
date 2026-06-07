import GameCreateClient from '../GameCreateClient'
import {getCreateGameData} from '../createGameData'

export const dynamic = 'force-dynamic'

export default async function AutomaticCreatePage() {
  const {initialShowOnboarding, userId, avatarOptions, initialAiScanCredits} =
    await getCreateGameData()

  return (
    <GameCreateClient
      initialShowOnboarding={initialShowOnboarding}
      userId={userId}
      avatarOptions={avatarOptions}
      initialAiScanCredits={initialAiScanCredits}
      mode="automatic"
    />
  )
}
