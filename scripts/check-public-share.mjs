const baseUrl = new URL(
  process.argv[2] || process.env.PUBLIC_SHARE_TEST_BASE_URL || 'http://localhost:3000',
)
const expectedOrigin = String(
  process.env.PUBLIC_SHARE_EXPECTED_ORIGIN || 'https://indovinando.vercel.app',
).replace(/\/+$/, '')
const expectedSocialImagePath = '/og/indovinando-share.jpg'
const expectedSocialImageUrl = `${expectedOrigin}${expectedSocialImagePath}`
const fakePublicContent = [
  'Barolo Riserva XYZ',
  'Etna Rosso ABC',
  'Chianti Classico DEF',
  '+20 enoteche',
  '20+ wine shops',
]

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function decodeHtml(value = '') {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function getTags(html, tagName) {
  return html.match(new RegExp(`<${tagName}\\b[^>]*>`, 'gi')) || []
}

function getAttribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, 'i'))
  return decodeHtml(match?.[1] || '')
}

function getMetaContent(html, attribute, value) {
  const tag = getTags(html, 'meta').find(
    (candidate) => getAttribute(candidate, attribute).toLowerCase() === value.toLowerCase(),
  )
  return tag ? getAttribute(tag, 'content') : ''
}

function getCanonical(html) {
  const tag = getTags(html, 'link').find(
    (candidate) => getAttribute(candidate, 'rel').toLowerCase() === 'canonical',
  )
  return tag ? getAttribute(tag, 'href') : ''
}

function getTitle(html) {
  return decodeHtml(html.match(/<title>([^<]+)<\/title>/i)?.[1] || '')
}

async function request(path, {headers, redirect = 'follow'} = {}) {
  const url = new URL(path, baseUrl)
  const response = await fetch(url, {headers, redirect})
  const body = await response.text()
  return {url, response, body}
}

function assertStatus(result, expected = [200]) {
  assert(
    expected.includes(result.response.status),
    `${result.url.pathname} returned ${result.response.status}`,
  )
}

function assertHomeMetadata(html, lang) {
  const title = getTitle(html)
  const description = getMetaContent(html, 'name', 'description')
  const canonical = getCanonical(html)
  const ogImage = getMetaContent(html, 'property', 'og:image')
  const twitterImage = getMetaContent(html, 'name', 'twitter:image')

  assert(new RegExp(`<html[^>]+lang=["']${lang}["']`, 'i').test(html), `Missing html lang=${lang}`)
  assert(title.includes('Indovinando'), `Missing branded ${lang} title`)
  assert(description.length >= 80, `${lang} description is missing or too short`)
  assert(canonical.replace(/\/+$/, '') === expectedOrigin, `Unexpected canonical: ${canonical}`)
  assert(ogImage === expectedSocialImageUrl, `Unexpected og:image: ${ogImage}`)
  assert(twitterImage === expectedSocialImageUrl, `Unexpected twitter:image: ${twitterImage}`)
  assert(getMetaContent(html, 'property', 'og:image:width') === '1200', 'Missing og:image:width')
  assert(getMetaContent(html, 'property', 'og:image:height') === '630', 'Missing og:image:height')
  assert(
    getMetaContent(html, 'property', 'og:image:type') === 'image/jpeg',
    'Missing og:image:type',
  )
  assert(html.includes('application/ld+json'), `Missing ${lang} JSON-LD`)

  for (const fakeValue of fakePublicContent) {
    assert(!html.includes(fakeValue), `Public home still exposes demo content: ${fakeValue}`)
  }
}

const homeIt = await request('/', {
  headers: {'Accept-Language': 'it-IT,it;q=0.9'},
})
assertStatus(homeIt)
assertHomeMetadata(homeIt.body, 'it')

const homeEn = await request('/', {
  headers: {'Accept-Language': 'en-US,en;q=0.9'},
})
assertStatus(homeEn)
assertHomeMetadata(homeEn.body, 'en')

const socialCrawler = await request('/', {
  headers: {
    'Accept-Language': 'it-IT,it;q=0.9',
    'User-Agent':
      'WhatsApp/2.24.7.81 A Mozilla/5.0 (compatible; facebookexternalhit/1.1; +http://www.facebook.com/externalhit_uatext.php)',
  },
})
assertStatus(socialCrawler)
assertHomeMetadata(socialCrawler.body, 'it')

const publicPaths = ['/demo', '/auth?mode=register', '/partner', '/classifiche', '/corso-vino']
for (const path of publicPaths) {
  const result = await request(path, {headers: {'Accept-Language': 'it-IT,it;q=0.9'}})
  assertStatus(result)
}

const privatePaths = ['/dashboard', '/landingpage', '/api/app-data']
for (const path of privatePaths) {
  const result = await request(path, {redirect: 'manual'})
  assertStatus(result, [200, 301, 302, 303, 307, 308, 401, 403])
  const robotsHeader = result.response.headers.get('x-robots-tag') || ''
  assert(
    robotsHeader.includes('noindex') && robotsHeader.includes('nofollow'),
    `${path} is missing X-Robots-Tag`,
  )
}

const robots = await request('/robots.txt')
assertStatus(robots)
assert(robots.body.includes('User-Agent: OAI-SearchBot'), 'robots.txt is missing OAI-SearchBot')
assert(robots.body.includes('User-Agent: GPTBot'), 'robots.txt is missing GPTBot')
assert(robots.body.includes('Disallow: /api/'), 'robots.txt does not exclude API routes')
assert(
  robots.body.includes(`Sitemap: ${expectedOrigin}/sitemap.xml`),
  'robots.txt has an unexpected sitemap URL',
)

const sitemap = await request('/sitemap.xml')
assertStatus(sitemap)
assert(sitemap.body.includes('<urlset'), 'sitemap.xml is not a URL set')
const sitemapUrls = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) =>
  decodeHtml(match[1]),
)
assert(sitemapUrls.length >= 28, `Sitemap has only ${sitemapUrls.length} URLs`)
assert(sitemapUrls.includes(`${expectedOrigin}/`), 'Sitemap is missing the home URL')
assert(sitemapUrls.includes(`${expectedOrigin}/demo`), 'Sitemap is missing the demo URL')
assert(
  sitemapUrls.some((url) => url.startsWith(`${expectedOrigin}/partner/`)),
  'Sitemap is missing public partner detail URLs',
)
assert(
  sitemapUrls.some((url) => url.startsWith(`${expectedOrigin}/classifiche/`)),
  'Sitemap is missing public wine detail URLs',
)
assert(
  sitemapUrls.every((url) => url.startsWith(`${expectedOrigin}/`)),
  'Sitemap contains a foreign origin',
)
assert(
  sitemapUrls.every(
    (url) =>
      !/\/(admin|api|auth|dashboard|enoteca|game|landingpage|live|miei-giochi|profilo|table-live)(\/|$)/.test(
        new URL(url).pathname,
      ),
  ),
  'Sitemap contains a private or operational route',
)

const socialImage = await request(expectedSocialImagePath)
assertStatus(socialImage)
assert(
  socialImage.response.headers.get('content-type')?.startsWith('image/jpeg'),
  'Social image is not served as JPEG',
)
const socialImageLength = Number(socialImage.response.headers.get('content-length') || 0)
assert(
  !socialImageLength || socialImageLength <= 500_000,
  `Social image is too large: ${socialImageLength} bytes`,
)

console.log(
  JSON.stringify(
    {
      ok: true,
      testedBaseUrl: baseUrl.origin,
      canonicalOrigin: expectedOrigin,
      sitemapUrls: sitemapUrls.length,
      socialImage: {
        url: expectedSocialImageUrl,
        contentType: socialImage.response.headers.get('content-type'),
        contentLength: socialImageLength || null,
      },
      publicPaths,
      privatePaths,
    },
    null,
    2,
  ),
)
