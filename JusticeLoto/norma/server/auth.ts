import crypto from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'
import { pool } from './db'

const COOKIE = 'norma_session'
const secret = () => process.env.SESSION_SECRET ?? 'local-development-change-me'
const hashCode = (phone: string, code: string) => crypto.createHmac('sha256', secret()).update(`${phone}:${code}`).digest('hex')
const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex')
const normalizePhone = (phone: string) => `+${phone.replace(/\D/g, '').replace(/^8/, '7')}`

export type AuthedRequest = Request & { userId?: number }

function setSessionCookie(res: Response, token: string, expires: Date) {
  res.cookie(COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
    expires, path: '/', priority: 'high',
  })
}

export async function requestCode(req: Request, res: Response) {
  const phone = normalizePhone(String(req.body.phone ?? ''))
  if (!/^\+7\d{10}$/.test(phone)) return res.status(400).json({ error: 'Введите российский номер из 11 цифр' })
  const recent = await pool.query('SELECT count(*)::int count FROM otp_challenges WHERE phone=$1 AND created_at>now()-interval \'1 minute\'', [phone])
  if (recent.rows[0].count >= 3) return res.status(429).json({ error: 'Слишком много запросов. Попробуйте через минуту.' })
  const code = process.env.DEV_SMS_CODE || String(crypto.randomInt(1000, 10000))
  await pool.query('INSERT INTO otp_challenges(phone,code_hash,expires_at) VALUES($1,$2,now()+interval \'5 minutes\')', [phone, hashCode(phone, code)])
  if (process.env.DEV_SMS_CODE) return res.json({ ok: true, demo: true })
  if (!process.env.SMS_PROVIDER_URL) return res.status(503).json({ error: 'SMS-провайдер не настроен' })
  const response = await fetch(process.env.SMS_PROVIDER_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.SMS_PROVIDER_TOKEN ?? ''}` },
    body: JSON.stringify({ phone, text: `Ваш код для Нормы: ${code}. Никому не сообщайте его.` }), signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) return res.status(502).json({ error: 'Не удалось отправить SMS' })
  return res.json({ ok: true })
}

export async function verifyCode(req: Request, res: Response) {
  const phone = normalizePhone(String(req.body.phone ?? ''))
  const code = String(req.body.code ?? '')
  const result = await pool.query(`SELECT id,code_hash,attempts FROM otp_challenges
    WHERE phone=$1 AND consumed_at IS NULL AND expires_at>now() ORDER BY created_at DESC LIMIT 1`, [phone])
  const challenge = result.rows[0]
  if (!challenge || challenge.attempts >= 5) return res.status(401).json({ error: 'Код истёк. Запросите новый.' })
  const actual = Buffer.from(hashCode(phone, code))
  const expected = Buffer.from(challenge.code_hash)
  if (!crypto.timingSafeEqual(actual, expected)) {
    await pool.query('UPDATE otp_challenges SET attempts=attempts+1 WHERE id=$1', [challenge.id])
    return res.status(401).json({ error: 'Неверный код' })
  }
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('UPDATE otp_challenges SET consumed_at=now() WHERE id=$1', [challenge.id])
    const user = await client.query(`INSERT INTO users(phone) VALUES($1) ON CONFLICT(phone) DO UPDATE SET updated_at=now() RETURNING id`, [phone])
    const token = crypto.randomBytes(32).toString('base64url')
    const expires = new Date(Date.now() + 30 * 24 * 3600 * 1000)
    await client.query(`INSERT INTO sessions(user_id,token_hash,expires_at,user_agent) VALUES($1,$2,$3,$4)`,
      [user.rows[0].id, hashToken(token), expires, req.headers['user-agent'] ?? null])
    await client.query('COMMIT')
    setSessionCookie(res, token, expires)
    return res.json({ ok: true, phone })
  } catch (error) { await client.query('ROLLBACK'); throw error } finally { client.release() }
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = req.cookies[COOKIE]
  if (!token) return res.status(401).json({ error: 'Требуется вход' })
  const result = await pool.query(`SELECT s.id session_id,s.user_id,s.expires_at,s.rotated_at FROM sessions s
    WHERE s.token_hash=$1 AND s.expires_at>now()`, [hashToken(token)])
  const session = result.rows[0]
  if (!session) return res.status(401).json({ error: 'Сессия истекла' })
  req.userId = session.user_id
  // Opaque token, hashed at rest. Rotation limits the useful lifetime of a stolen cookie.
  if (Date.now() - new Date(session.rotated_at).getTime() > 7 * 24 * 3600 * 1000) {
    const nextToken = crypto.randomBytes(32).toString('base64url')
    const expires = new Date(Date.now() + 30 * 24 * 3600 * 1000)
    await pool.query('UPDATE sessions SET token_hash=$1,rotated_at=now(),expires_at=$2 WHERE id=$3', [hashToken(nextToken), expires, session.session_id])
    setSessionCookie(res, nextToken, expires)
  }
  next()
}

export async function me(req: AuthedRequest, res: Response) {
  const result = await pool.query('SELECT id,phone,birth_year,sex,weight_kg,height_cm,activity,goal FROM users WHERE id=$1', [req.userId])
  res.json({ user: result.rows[0] })
}

export async function logout(req: AuthedRequest, res: Response) {
  const token = req.cookies[COOKIE]
  if (token) await pool.query('DELETE FROM sessions WHERE token_hash=$1', [hashToken(token)])
  res.clearCookie(COOKIE, { path: '/' })
  res.json({ ok: true })
}
