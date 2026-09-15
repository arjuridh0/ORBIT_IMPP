import sharp from 'sharp'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const jobs = [
  { src: 'public/logo-orbit-impp.png', out: 'public/logo-orbit-impp.webp' },
  { src: 'public/logo impp.png', out: 'public/logo-impp.webp' },
]

for (const { src, out } of jobs) {
  await sharp(path.join(root, src))
    .webp({ quality: 80 })
    .toFile(path.join(root, out))
  console.log(`OK ${out}`)
}