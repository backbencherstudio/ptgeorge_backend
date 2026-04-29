// external imports
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { join } from 'path';
// internal imports
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';
import { CustomExceptionFilter } from './common/exception/custom-exception.filter';
import { TanvirStorage } from './common/lib/Disk/TanvirStorage';
import appConfig from './config/app.config';
import { PrismaExceptionFilter } from './common/exception/prisma-exception.filter';
import {
  buildSwaggerOptions,
  swaggerUiOptions,
} from './common/swagger/swagger-auth';
import { NextFunction, Request, Response } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  app.useWebSocketAdapter(new IoAdapter(app));
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // ← add this
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`],
          connectSrc: [`'self'`, `https:`, `http:`],
          scriptSrc: [`'self'`, `'unsafe-inline'`, `'unsafe-eval'`],
          styleSrc: [`'self'`, `'unsafe-inline'`],
          imgSrc: [`'self'`, `data:`, `https:`, `http:`], // ← also add http: here
          workerSrc: [`'self'`, `blob:`],
          frameSrc: [`'self'`],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use((req: Request, res: Response, next: NextFunction) => {
    const url = req.originalUrl || req.url;

    if (url.includes('/.well-known/') || url.includes('com.chrome.devtools')) {
      return res.status(204).end();
    }

    next();
  });

  app.useStaticAssets(join(__dirname, '..', '..', 'public'), {
    index: false,
    prefix: '/public',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(
    new CustomExceptionFilter(),
    new PrismaExceptionFilter(),
  );

  // storage setup
  TanvirStorage.config({
    driver: 'local',
    connection: {
      rootUrl: appConfig().storageUrl.rootUrl,
      publicUrl: appConfig().storageUrl.rootUrlPublic,
      awsBucket: appConfig().fileSystems.s3.bucket,
      awsAccessKeyId: appConfig().fileSystems.s3.key,
      awsSecretAccessKey: appConfig().fileSystems.s3.secret,
      awsDefaultRegion: appConfig().fileSystems.s3.region,
      awsEndpoint: appConfig().fileSystems.s3.endpoint,
      minio: true,
    },
  });

  // swagger
  const document = SwaggerModule.createDocument(app, buildSwaggerOptions());

  SwaggerModule.setup('api/docs', app, document, swaggerUiOptions);

  await app.listen(process.env.PORT ?? 4000, '0.0.0.0');
}
bootstrap();
