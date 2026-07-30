'use client'

import {useT} from '@/lib/i18n/useT'
import OnboardingModal from '@/components/game/OnboardingModal'
import {Button, ButtonLink} from '@/components/ui/Button'

/**
 * GuestWarningModal component - displays a warning for guest users about progress loss
 * @param {boolean} isOpen - Whether the modal is open
 * @param {Function} onClose - Callback when closing the modal
 */
export default function GuestWarningModal({isOpen, onClose, signUpHref}) {
  const t = useT('course')

  if (!isOpen) return null

  return (
    <OnboardingModal
      onClose={onClose}
      steps={[
        {
          icon: '👤',
          title: t('guest.title'),
          description: t('guest.desc'),
        },
      ]}
      labels={{eyebrow: t('guest.eyebrow')}}
      actions={
        <>
          <Button variant="neutral" onClick={onClose}>
            {t('guest.continueAsGuest')}
          </Button>
          <ButtonLink href={signUpHref} variant="primary-filled" onClick={onClose}>
            {t('guest.signUp')}
          </ButtonLink>
        </>
      }
    />
  )
}
