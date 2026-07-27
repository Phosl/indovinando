import {serializeJsonLd} from '@/lib/seo'

export default function JsonLd({data}) {
  if (!data) return null

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{__html: serializeJsonLd(data)}}
    />
  )
}
