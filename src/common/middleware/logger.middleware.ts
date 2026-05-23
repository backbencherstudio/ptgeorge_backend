import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import * as os from 'os';

// ─── ANSI colour helpers ──────────────────────────────────────────────────────
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  white: '\x1b[97m',
  gray: '\x1b[90m',
  cyan: '\x1b[96m',
  green: '\x1b[92m',
  yellow: '\x1b[93m',
  red: '\x1b[91m',
  magenta: '\x1b[95m',
  blue: '\x1b[94m',
  bgRed: '\x1b[41m',
  bgYellow: '\x1b[43m',
  bgGreen: '\x1b[42m',
  bgBlue: '\x1b[44m',
  bgGray: '\x1b[100m',
};

const paint = (...parts: string[]): string => parts.join('') + c.reset;

// ─── Method badge colours ─────────────────────────────────────────────────────
const METHOD_STYLES: Record<string, string> = {
  GET: paint(c.bgBlue, c.bold, c.white, ' GET    '),
  POST: paint(c.bgGreen, c.bold, c.white, ' POST   '),
  PUT: paint(c.bgYellow, c.bold, c.white, ' PUT    '),
  PATCH: paint(c.bgYellow, c.bold, c.white, ' PATCH  '),
  DELETE: paint(c.bgRed, c.bold, c.white, ' DELETE '),
  OPTIONS: paint(c.bgGray, c.bold, c.white, ' OPTIONS'),
  HEAD: paint(c.bgGray, c.bold, c.white, ' HEAD   '),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function statusStyle(code: number): string {
  if (code >= 500) return paint(c.bold, c.red);
  if (code >= 400) return paint(c.bold, c.yellow);
  if (code >= 300) return paint(c.bold, c.cyan);
  return paint(c.bold, c.green);
}

function levelTag(code: number): string {
  if (code >= 500) return paint(c.bgRed, c.bold, c.white, ' ERROR ');
  if (code >= 400) return paint(c.bgYellow, c.bold, c.white, '  WARN ');
  return paint(c.bgGreen, c.bold, c.white, '  INFO ');
}

function durationStyle(ms: number): string {
  if (ms > 2000) return paint(c.bold, c.red, `${ms}ms`);
  if (ms > 500) return paint(c.bold, c.yellow, `${ms}ms`);
  return paint(c.bold, c.green, `${ms}ms`);
}

function writeLog(level: 'info' | 'warn' | 'error', line: string): void {
  if (level === 'error') process.stderr.write(line + '\n');
  else process.stdout.write(line + '\n');
}

const SEP = paint(c.gray, '─'.repeat(90));

// ─── Device parser ────────────────────────────────────────────────────────────
function parseDevice(userAgent: string | null): string {
  if (!userAgent) return 'Unknown';

  if (/mobile/i.test(userAgent)) return 'Mobile';
  if (/tablet/i.test(userAgent)) return 'Tablet';
  return 'Desktop';
}

function parseBrowser(userAgent: string | null): string {
  if (!userAgent) return 'Unknown';

  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Edg')) return 'Edge';
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Safari')) return 'Safari';

  return 'Unknown';
}

function parseOS(userAgent: string | null): string {
  if (!userAgent) return 'Unknown';

  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac')) return 'MacOS';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iPhone')) return 'iPhone';

  return 'Unknown';
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface LogFields {
  level: 'info' | 'warn' | 'error';
  timestamp: string;
  requestId: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;

  ip: string | null;
  forwardedFor: string | null;
  host: string | null;
  origin: string | null;
  referer: string | null;

  userAgent: string | null;
  browser: string;
  os: string;
  device: string;

  userId: string | null;
  userEmail: string | null;
  userRole: string | null;

  protocol: string;
  httpVersion: string;

  query: unknown;
  params: unknown;
  body: unknown;
  response: unknown;

  responseSize: string | null;

  cpuUsage: NodeJS.CpuUsage;
  memoryUsage: NodeJS.MemoryUsage;

  serverHostname: string;
}

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  // ─── Sensitive keys ─────────────────────────────────────────────────────────
  private readonly sensitiveKeys = new Set([
    'password',
    'new_password',
    'old_password',
    'token',
    'authorization',
    'access_token',
    'refresh_token',
    'otp',
    'secret',
    'cvv',
    'card_number',
    'ssn',
    'pin',
  ]);

  // ─── Skip config ────────────────────────────────────────────────────────────
  private readonly skipPrefixes = ['/api/docs', '/public', '/storage'];

  private readonly skipExact = new Set(['/health', '/favicon.ico']);

  private readonly skipContains = ['/.well-known/', 'com.chrome.devtools.json'];

  private shouldSkip(path: string): boolean {
    if (this.skipExact.has(path)) return true;

    if (this.skipContains.some((pattern) => path.includes(pattern))) {
      return true;
    }

    return this.skipPrefixes.some((prefix) => path.startsWith(prefix));
  }

  // ─── Mask sensitive data ────────────────────────────────────────────────────
  private mask(value: unknown, depth = 0): unknown {
    if (depth > 4 || value === null || value === undefined) {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.mask(item, depth + 1));
    }

    if (typeof value === 'object' && !Buffer.isBuffer(value)) {
      const out: Record<string, unknown> = {};

      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        out[k] = this.sensitiveKeys.has(k.toLowerCase())
          ? '••••••'
          : this.mask(v, depth + 1);
      }

      return out;
    }

    if (typeof value === 'string' && value.length > 1000) {
      return `${value.slice(0, 1000)}...[+${value.length - 1000} chars]`;
    }

    return value;
  }

  // ─── Normalize response body ────────────────────────────────────────────────
  private normalizeResponseBody(body: unknown): unknown {
    if (body === undefined || body === null) return null;

    if (Buffer.isBuffer(body)) {
      return `[Buffer ${body.length} bytes]`;
    }

    if (typeof body === 'string') {
      try {
        return JSON.parse(body);
      } catch {
        return body.length > 1000
          ? `${body.slice(0, 1000)}...[truncated]`
          : body;
      }
    }

    return body;
  }

  // ─── Structured JSON log ───────────────────────────────────────────────────
  private structuredPayload(fields: LogFields): string {
    return JSON.stringify(fields);
  }

  // ─── Pretty dev block ──────────────────────────────────────────────────────
  private prettyBlock(fields: LogFields): string {
    const methodBadge =
      METHOD_STYLES[fields.method] ??
      paint(c.bold, c.white, ` ${fields.method.padEnd(7)} `);

    const header = [
      levelTag(fields.statusCode),
      methodBadge,
      paint(c.bold, c.white, fields.path),
      '→',
      statusStyle(fields.statusCode) + fields.statusCode + c.reset,
      durationStyle(fields.durationMs),
      paint(c.gray, '│'),
      paint(c.dim, c.gray, fields.timestamp),
      paint(c.dim, c.cyan, `[${fields.requestId.slice(0, 8)}]`),
    ].join(' ');

    const lines: string[] = [SEP, header];

    const meta: string[] = [];

    if (fields.userId) {
      meta.push(
        paint(c.magenta, `👤 ${fields.userId}`) +
          paint(
            c.gray,
            ` (${fields.userEmail ?? fields.userRole ?? 'unknown'})`,
          ),
      );
    }

    if (fields.ip) {
      meta.push(paint(c.gray, `🌐 ${fields.ip}`));
    }

    meta.push(
      paint(c.blue, `💻 ${fields.device}`),
      paint(c.cyan, `🧭 ${fields.browser}`),
      paint(c.yellow, `🖥️ ${fields.os}`),
    );

    if (fields.responseSize) {
      meta.push(paint(c.green, `📦 ${fields.responseSize}`));
    }

    if (fields.host) {
      meta.push(paint(c.magenta, `🏠 ${fields.host}`));
    }

    if (meta.length) {
      lines.push('  ' + meta.join(paint(c.dim, c.gray, '  ·  ')));
    }

    if (fields.userAgent) {
      lines.push(
        paint(c.dim, c.gray, `  🔧 ${fields.userAgent.slice(0, 150)}`),
      );
    }

    if (fields.referer) {
      lines.push(paint(c.dim, c.cyan, `  ↩ Referer: ${fields.referer}`));
    }

    lines.push(
      paint(
        c.dim,
        c.yellow,
        `  ⚡ Memory RSS: ${Math.round(
          fields.memoryUsage.rss / 1024 / 1024,
        )} MB`,
      ),
    );

    lines.push(paint(c.dim, c.green, `  🖥 Host: ${fields.serverHostname}`));

    return lines.join('\n');
  }

  // ─── Main middleware ───────────────────────────────────────────────────────
  use(req: Request & { user?: any }, res: Response, next: NextFunction): void {
    const url = req.originalUrl || req.url;

    if (this.shouldSkip(url)) {
      return next();
    }

    const startedAt = Date.now();

    let capturedBody: unknown;

    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    // ─── Capture response json ─────────────────────────────────────────────
    res.json = ((body: unknown): Response => {
      capturedBody = body;
      return originalJson(body);
    }) as typeof res.json;

    // ─── Capture response send ─────────────────────────────────────────────
    res.send = ((body: unknown): Response => {
      if (capturedBody === undefined) {
        capturedBody = body;
      }

      return originalSend(body);
    }) as typeof res.send;

    // ─── Request ID ────────────────────────────────────────────────────────
    const requestId =
      (req.headers['x-request-id'] as string) ||
      (req.headers['x-correlation-id'] as string) ||
      randomUUID();

    req.headers['x-request-id'] = requestId;

    res.setHeader('x-request-id', requestId);

    // ─── Finish listener ───────────────────────────────────────────────────
    res.on('finish', () => {
      const durationMs = Date.now() - startedAt;

      const statusCode = res.statusCode;

      const level: 'info' | 'warn' | 'error' =
        statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

      // ─── Better IP detection 🔥 ─────────────────────────────────────────
      const forwardedFor = req.headers['x-forwarded-for'];

      const ip =
        typeof forwardedFor === 'string'
          ? forwardedFor.split(',')[0].trim()
          : req.socket?.remoteAddress || req.ip || null;

      const rawSize = res.getHeader('content-length');

      let responseSize: string | null = null;

      if (rawSize !== undefined && rawSize !== null) {
        responseSize = `${String(rawSize)} B`;
      }

      const userAgent = req.get('user-agent') ?? null;

      const fields: LogFields = {
        level,
        timestamp: new Date().toISOString(),

        requestId,

        method: req.method,
        path: req.originalUrl || req.url,

        statusCode,
        durationMs,

        ip,
        forwardedFor: typeof forwardedFor === 'string' ? forwardedFor : null,

        host: req.get('host') ?? null,
        origin: req.get('origin') ?? null,
        referer: req.get('referer') ?? null,

        userAgent,

        browser: parseBrowser(userAgent),
        os: parseOS(userAgent),
        device: parseDevice(userAgent),

        userId: req.user?.userId ?? req.user?.id ?? null,
        userEmail: req.user?.email ?? null,
        userRole: req.user?.role ?? null,

        protocol: req.protocol,
        httpVersion: req.httpVersion,

        query: this.mask(req.query),
        params: this.mask(req.params),
        body: this.mask(req.body),

        response: this.mask(this.normalizeResponseBody(capturedBody)),

        responseSize,

        cpuUsage: process.cpuUsage(),
        memoryUsage: process.memoryUsage(),

        serverHostname: os.hostname(),
      };

      writeLog(
        level,
        process.env.NODE_ENV === 'production'
          ? this.structuredPayload(fields)
          : this.prettyBlock(fields),
      );
    });

    next();
  }
}
