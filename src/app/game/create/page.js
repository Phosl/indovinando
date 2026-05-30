import {redirect} from 'next/navigation'
import {Suspense} from 'react'
import GameCreateClient from './GameCreateClient'
import GameCreateLoading from './loading'
import {getCreateGameData} from './createGameData'

export default async function Page({searchParams}) {
  const params = await searchParams
  if (params?.mode === 'quick') redirect('/game/create/quick')
  if (params?.mode === 'custom') redirect('/game/create/custom')
  if (params?.mode === 'automatic') redirect('/game/create/automatic')
  const {initialShowOnboarding, userId, avatarOptions} = await getCreateGameData()

  return (
    <Suspense fallback={<GameCreateLoading />}>
      <GameCreateClient
        initialShowOnboarding={initialShowOnboarding}
        userId={userId}
        avatarOptions={avatarOptions}
        mode="choose"
      />
    </Suspense>
  )
}
