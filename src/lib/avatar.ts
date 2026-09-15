import sharp from 'sharp'

export const AVATAR_MAX_DIM = 512

export async function processAvatar(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate()
    .resize(AVATAR_MAX_DIM, AVATAR_MAX_DIM, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer()
}