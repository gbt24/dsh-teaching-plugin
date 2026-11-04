/**
 * 极简图片工具：读取常见图片头尺寸、把抽取出的位图编码为 PNG。
 *
 * 不引入 native 依赖：PNG 编码使用 fflate 的 zlibSync（RFC1950 包装），
 * 自己写 IHDR/IDAT/IEND 与 CRC32；尺寸解析只读文件头。
 */
import { zlibSync } from 'fflate'

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

/** 图片尺寸信息。 */
export interface ImageSize {
  readonly width: number
  readonly height: number
  readonly format: 'png' | 'jpeg' | 'gif' | 'webp' | 'bmp' | 'unknown'
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(bytes: Uint8Array, start: number, end: number): number {
  let crc = 0xffffffff
  for (let i = start; i < end; i += 1) {
    crc = (CRC_TABLE[(crc ^ (bytes[i] as number)) & 0xff] as number) ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type)
  const out = new Uint8Array(12 + data.length)
  const view = new DataView(out.buffer)
  view.setUint32(0, data.length)
  out.set(typeBytes, 4)
  out.set(data, 8)
  view.setUint32(8 + data.length, crc32(out, 4, 8 + data.length))
  return out
}

/**
 * 把像素编码成 PNG。
 * @param width 像素宽
 * @param height 像素高
 * @param channels 3=RGB，4=RGBA
 * @param pixels 长度必须为 width*height*channels
 */
export function encodePng(
  width: number,
  height: number,
  channels: 3 | 4,
  pixels: Uint8Array,
): Uint8Array {
  const bytes = channels === 4 ? pixels : rgbToRgba(width, height, pixels)
  const stride = width * 4
  const raw = new Uint8Array((stride + 1) * height)
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0 // filter type: none
    raw.set(bytes.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1)
  }
  const ihdr = new Uint8Array(13)
  const ihdrView = new DataView(ihdr.buffer)
  ihdrView.setUint32(0, width)
  ihdrView.setUint32(4, height)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type RGBA
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace
  const idat = zlibSync(raw, { level: 6 })
  const parts = [
    new Uint8Array(PNG_SIGNATURE),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', new Uint8Array(0)),
  ]
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

function rgbToRgba(width: number, height: number, rgb: Uint8Array): Uint8Array {
  const out = new Uint8Array(width * height * 4)
  for (let i = 0, j = 0; i < rgb.length; i += 3, j += 4) {
    out[j] = rgb[i] as number
    out[j + 1] = rgb[i + 1] as number
    out[j + 2] = rgb[i + 2] as number
    out[j + 3] = 255
  }
  return out
}

/** 解码 1bpp 位图为 RGBA。 */
export function decode1bpp(width: number, height: number, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(width * height * 4)
  const rowBytes = Math.ceil(width / 8)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const byte = data[y * rowBytes + (x >> 3)] ?? 0
      const bit = (byte >> (7 - (x & 7))) & 1
      const value = bit === 0 ? 0 : 255 // 0 表示黑色（PDF 1bpp 约定）
      const index = (y * width + x) * 4
      out[index] = value
      out[index + 1] = value
      out[index + 2] = value
      out[index + 3] = 255
    }
  }
  return out
}

/** 从文件头解析图片尺寸；无法识别时返回 undefined。 */
export function imageSizeFromBytes(bytes: Uint8Array): ImageSize | undefined {
  if (bytes.length < 16) return undefined
  // PNG
  if (PNG_SIGNATURE.every((value, index) => bytes[index] === value)) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    return { width: view.getUint32(16), height: view.getUint32(20), format: 'png' }
  }
  // JPEG
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset += 1
        continue
      }
      const marker = bytes[offset + 1] as number
      if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
        offset += 2
        continue
      }
      const length = ((bytes[offset + 2] as number) << 8) | (bytes[offset + 3] as number)
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        const height = ((bytes[offset + 5] as number) << 8) | (bytes[offset + 6] as number)
        const width = ((bytes[offset + 7] as number) << 8) | (bytes[offset + 8] as number)
        return { width, height, format: 'jpeg' }
      }
      offset += 2 + length
    }
    return undefined
  }
  // GIF
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return {
      width: (bytes[6] as number) | ((bytes[7] as number) << 8),
      height: (bytes[8] as number) | ((bytes[9] as number) << 8),
      format: 'gif',
    }
  }
  // WebP
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    const tag = String.fromCharCode(bytes[12] as number, bytes[13] as number, bytes[14] as number, bytes[15] as number)
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    if (tag === 'VP8X') {
      const width = (bytes[24] as number) | ((bytes[25] as number) << 8) | ((bytes[26] as number) << 16)
      const height = (bytes[27] as number) | ((bytes[28] as number) << 8) | ((bytes[29] as number) << 16)
      return { width: width + 1, height: height + 1, format: 'webp' }
    }
    if (tag === 'VP8 ') {
      return {
        width: view.getUint16(26, true) & 0x3fff,
        height: view.getUint16(28, true) & 0x3fff,
        format: 'webp',
      }
    }
    if (tag === 'VP8L') {
      const bits = view.getUint32(21, true)
      return {
        width: (bits & 0x3fff) + 1,
        height: ((bits >> 14) & 0x3fff) + 1,
        format: 'webp',
      }
    }
    return undefined
  }
  // BMP
  if (bytes[0] === 0x42 && bytes[1] === 0x4d) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    return {
      width: Math.abs(view.getInt32(18, true)),
      height: Math.abs(view.getInt32(22, true)),
      format: 'bmp',
    }
  }
  return undefined
}
