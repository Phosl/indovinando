import GameCreateClient from '../GameCreateClient'
import {getCreateGameData} from '../createGameData'

export default async function CustomCreatePage() {
  const {initialShowOnboarding, userId, avatarOptions} = await getCreateGameData()

  return (
    <GameCreateClient
      initialShowOnboarding={initialShowOnboarding}
      userId={userId}
      avatarOptions={avatarOptions}
      mode="custom"
    />
  )
}
