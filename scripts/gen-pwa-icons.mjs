import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

mkdirSync('public', { recursive: true })

const svg = (size, maskable) => `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#0f172a"/>
  ${maskable ? '' : '<rect width="512" height="512" rx="96" fill="#0f172a"/>'}
  <text x="256" y="340" font-family="Arial, sans-serif" font-weight="900" font-size="280"
        text-anchor="middle" fill="#fbbf24" letter-spacing="-10">M</text>
</svg>
`

const targets = [
  { file: 'icon-64.png', size: 64 },
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'maskable-icon-512.png', size: 512, maskable: true },
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'favicon.png', size: 64 },
]

for (const t of targets) {
  await sharp(Buffer.from(svg(t.size, t.maskable)))
    .resize(t.size, t.size)
    .png()
    .toFile(`public/${t.file}`)
  console.log(`wrote public/${t.file}`)
}
