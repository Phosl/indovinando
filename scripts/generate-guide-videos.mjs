import {existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {spawnSync} from 'node:child_process'

const ROOT = process.cwd()
const OUTPUT_DIR = path.join(ROOT, 'public', 'guide')
const FONT_REGULAR = resolveFont('Nunito', [
  '/System/Library/Fonts/Supplemental/Arial.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
])
const FONT_BOLD = resolveFont('Nunito:style=ExtraBold', [
  '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
])
const SCENE_SECONDS = 3.2
const FPS = 30

const SCENE_MEDIA = [
  {path: 'public/landing/hero.png', fit: 'cover'},
  {path: 'public/app_FEAT.jpg', fit: 'contain'},
  {path: 'public/landing/box.png', fit: 'cover'},
  {path: 'public/landing/hero.png', fit: 'cover'},
  {path: 'public/card_course.png', fit: 'cover'},
  {path: 'public/app_FEAT.jpg', fit: 'contain'},
]

const LANGUAGES = {
  it: [
    ['Indovinando', 'Dalla bottiglia alla classifica'],
    ['1 · PREPARA', 'Scansiona le etichette o usa il template'],
    ['2 · CONDIVIDI', 'Un link e un QR portano tutti alla partita'],
    ['3 · GIOCA', 'Ogni tavolo risponde dal proprio telefono'],
    ['4 · IMPARA', 'Risultati, classifiche e corso vino'],
    ['INIZIA', 'Prova la demo senza account'],
  ],
  en: [
    ['Indovinando', 'From the bottle to the final leaderboard'],
    ['1 · PREPARE', 'Scan the labels or use the ready-made template'],
    ['2 · SHARE', 'One link and QR code bring everyone into the game'],
    ['3 · PLAY', 'Each table answers from its own phone'],
    ['4 · LEARN', 'Results, rankings, and the wine course'],
    ['START', 'Try the demo without an account'],
  ],
}

function resolveFont(family, fallbacks) {
  const match = spawnSync('fc-match', ['-f', '%{file}', family], {encoding: 'utf8'})
  const matchedFile = match.status === 0 ? match.stdout.trim() : ''
  const font = [matchedFile, ...fallbacks].find((candidate) => candidate && existsSync(candidate))

  if (!font) {
    throw new Error(`No font found for ${family}. Install fontconfig or update the fallback list.`)
  }

  return font
}

function run(command, args) {
  const result = spawnSync(command, args, {cwd: ROOT, encoding: 'utf8'})
  if (result.status === 0) return

  process.stderr.write(result.stdout || '')
  process.stderr.write(result.stderr || '')
  process.exit(result.status || 1)
}

function buildSceneFilter(index, fit, titleFile, bodyFile) {
  const sizeFilter =
    fit === 'contain'
      ? 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=white'
      : "scale=1408:792:force_original_aspect_ratio=increase,crop=1408:792,zoompan=z='min(zoom+0.0006,1.06)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1280x720:fps=30"

  return [
    `[${index}:v]${sizeFilter}`,
    'setsar=1',
    'format=yuv420p',
    'drawbox=x=0:y=0:w=iw:h=ih:color=black@0.22:t=fill',
    'drawbox=x=0:y=h-205:w=iw:h=205:color=black@0.72:t=fill',
    `drawtext=fontfile='${FONT_BOLD}':textfile='${titleFile}':fontcolor=white:fontsize=54:x=64:y=h-170`,
    `drawtext=fontfile='${FONT_REGULAR}':textfile='${bodyFile}':fontcolor=white:fontsize=30:x=64:y=h-94`,
    `fade=t=in:st=0:d=0.3,fade=t=out:st=${SCENE_SECONDS - 0.3}:d=0.3`,
    `setpts=PTS-STARTPTS[v${index}]`,
  ].join(',')
}

function generateLanguageVideo(language, captions) {
  const tempDir = mkdtempSync(path.join(tmpdir(), `indovinando-guide-${language}-`))

  try {
    const inputArgs = []
    const filters = []

    SCENE_MEDIA.forEach((scene, index) => {
      const [title, body] = captions[index]
      const titleFile = path.join(tempDir, `title-${index}.txt`)
      const bodyFile = path.join(tempDir, `body-${index}.txt`)
      writeFileSync(titleFile, title, 'utf8')
      writeFileSync(bodyFile, body, 'utf8')

      inputArgs.push(
        '-loop',
        '1',
        '-framerate',
        String(FPS),
        '-t',
        String(SCENE_SECONDS),
        '-i',
        path.join(ROOT, scene.path),
      )
      filters.push(buildSceneFilter(index, scene.fit, titleFile, bodyFile))
    })

    const concatInputs = SCENE_MEDIA.map((_, index) => `[v${index}]`).join('')
    filters.push(`${concatInputs}concat=n=${SCENE_MEDIA.length}:v=1:a=0[outv]`)

    const videoPath = path.join(OUTPUT_DIR, `indovinando-guide-${language}.mp4`)
    run('ffmpeg', [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      ...inputArgs,
      '-filter_complex',
      filters.join(';'),
      '-map',
      '[outv]',
      '-an',
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-crf',
      '24',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      videoPath,
    ])

    run('ffmpeg', [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-ss',
      '0.8',
      '-i',
      videoPath,
      '-frames:v',
      '1',
      '-q:v',
      '3',
      path.join(OUTPUT_DIR, `indovinando-guide-${language}-poster.jpg`),
    ])
  } finally {
    rmSync(tempDir, {recursive: true, force: true})
  }
}

mkdirSync(OUTPUT_DIR, {recursive: true})
Object.entries(LANGUAGES).forEach(([language, captions]) => {
  generateLanguageVideo(language, captions)
})

console.log('Guide videos generated in public/guide.')
