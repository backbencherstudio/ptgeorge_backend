import helmet from 'helmet';
import appConfig from 'src/config/app.config';
import { rateLimit } from 'express-rate-limit';

export const helmetConfig = () => {
  return helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy:
      appConfig().app.node_env === 'development'
        ? false
        : {
            directives: {
              defaultSrc: [`'self'`],
              connectSrc: [`'self'`, `https:`, `wss:`],
              scriptSrc: [`'self'`, `'unsafe-inline'`, `'unsafe-eval'`],
              styleSrc: [`'self'`, `'unsafe-inline'`],
              imgSrc: [`'self'`, `data:`, `https:`, `http:`],
              workerSrc: [`'self'`, `blob:`],
              frameSrc: [`'self'`],
              fontSrc: [`'self'`, `data:`],
              objectSrc: [`'none'`],
              mediaSrc: [`'self'`],
              frameAncestors: [`'none'`],
              baseUri: [`'self'`],
              formAction: [`'self'`],
            },
          },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true,
    originAgentCluster: true,
  });
};

export const rateLimiterConfig = () => {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skip: (req) => {
      // Skip rate limiting for certain paths if needed
      const skipPaths = ['/api/docs', '/.well-known/'];
      return skipPaths.some((path) => req.path.includes(path));
    },
    keyGenerator: (req) => {
      // Use X-Forwarded-For header if behind a proxy (you have trust proxy enabled)
      return req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
    },
  });
};