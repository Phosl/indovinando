import LandingPage from '@/components/landing/LandingPage'
import {buildPageMetadata} from '@/lib/seo'

export const metadata = buildPageMetadata({
  title: 'Landing page preview',
  path: '/landingpage',
  noIndex: true,
})

export default function LandingPagePreview() {
  return <LandingPage includeStructuredData={false} />
}
