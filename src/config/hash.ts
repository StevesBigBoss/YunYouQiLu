/**
 * 同步 SHA-256 加盐哈希工具（演示项目本地账户脱敏用）。
 *
 * 背景：本项目是演示系统，注册账号与密码保存在浏览器 localStorage 中，
 * 为避免明文密码落盘，这里用加盐 SHA-256 摘要替代明文。
 * 说明：浏览器本地哈希仅用于避免明文泄露，不作为服务端高安全认证方案；
 * 生产环境请使用服务端标准密码哈希（如 Django PBKDF2 / bcrypt）。
 */

/** SHA-256 轮常量（FIPS 180-4） */
const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]

const H_INIT = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
  0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
]

function rotr(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n))
}

/** 将字符串按 UTF-8 编码为字节数组（正确处理代理对） */
function utf8Bytes(input: string): number[] {
  const bytes: number[] = []
  for (let i = 0; i < input.length; i++) {
    let code = input.charCodeAt(i)
    if (code < 0x80) {
      bytes.push(code)
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
    } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < input.length) {
      const next = input.charCodeAt(i + 1)
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = 0x10000 + (((code & 0x3ff) << 10) | (next & 0x3ff))
        i++
        bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
      } else {
        bytes.push(0xef, 0xbf, 0xbd)
      }
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      // 孤立低代理 → U+FFFD
      bytes.push(0xef, 0xbf, 0xbd)
    } else {
      // BMP 非代理字符（0x800..0xd7ff / 0xe000..0xffff）→ 3 字节
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
    }
  }
  return bytes
}

/** 同步计算 SHA-256 十六进制摘要（FIPS 180-4） */
export function sha256Sync(input: string): string {
  const bytes = utf8Bytes(input)
  const bitLenHi = Math.floor((bytes.length * 8) / 0x100000000)
  const bitLenLo = (bytes.length * 8) >>> 0

  bytes.push(0x80)
  while (bytes.length % 64 !== 56) bytes.push(0)
  for (let i = 3; i >= 0; i--) bytes.push((bitLenHi >>> (8 * i)) & 0xff)
  for (let i = 3; i >= 0; i--) bytes.push((bitLenLo >>> (8 * i)) & 0xff)

  let h = H_INIT.slice()
  const w = new Array<number>(64).fill(0)

  for (let i = 0; i < bytes.length; i += 64) {
    for (let t = 0; t < 16; t++) {
      const o = i + t * 4
      w[t] = ((bytes[o] << 24) | (bytes[o + 1] << 16) | (bytes[o + 2] << 8) | bytes[o + 3]) >>> 0
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3)
      const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10)
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0
    }

    let [a, b, c, d, e, f, g, hh] = h
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
      const ch = (e & f) ^ (~e & g)
      const t1 = (hh + S1 + ch + K[t] + w[t]) >>> 0
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const t2 = (S0 + maj) >>> 0
      hh = g
      g = f
      f = e
      e = (d + t1) >>> 0
      d = c
      c = b
      b = a
      a = (t1 + t2) >>> 0
    }
    h = [
      (a + h[0]) >>> 0,
      (b + h[1]) >>> 0,
      (c + h[2]) >>> 0,
      (d + h[3]) >>> 0,
      (e + h[4]) >>> 0,
      (f + h[5]) >>> 0,
      (g + h[6]) >>> 0,
      (hh + h[7]) >>> 0,
    ]
  }

  return h.map((v) => v.toString(16).padStart(8, '0')).join('')
}

/** 生成 8 字节随机盐（16 位十六进制） */
function randomSalt(): string {
  try {
    const arr = new Uint8Array(8)
    crypto.getRandomValues(arr)
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('')
  } catch {
    let s = ''
    for (let i = 0; i < 16; i++) s += Math.floor(Math.random() * 16).toString(16)
    return s
  }
}

/** 密码存储格式：sha256:<盐>:<摘要> */
export const HASH_PREFIX = 'sha256:'

/** 生成密码哈希存储串（加盐 SHA-256） */
export function makePasswordHash(password: string): string {
  const salt = randomSalt()
  return `${HASH_PREFIX}${salt}:${sha256Sync(salt + password)}`
}

/**
 * 校验明文密码与存储串是否匹配。
 * 兼容历史明文数据：存储串不含 sha256: 前缀时按明文直接比较。
 */
export function verifyPasswordHash(password: string, stored: string): boolean {
  if (!stored) return false
  if (stored.startsWith(HASH_PREFIX)) {
    const parts = stored.split(':')
    if (parts.length !== 3) return false
    return sha256Sync(parts[1] + password) === parts[2]
  }
  return password === stored
}

/** 该存储串是否仍是旧版明文（需要升级为哈希） */
export function isLegacyPlaintext(stored: string): boolean {
  return !!stored && !stored.startsWith(HASH_PREFIX)
}
