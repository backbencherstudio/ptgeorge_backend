// src/config/swagger.config.ts
import { DocumentBuilder } from '@nestjs/swagger';
import appConfig from 'src/config/app.config';

export const SWAGGER_AUTH = {
  SUPER_ADMIN: 'super_admin-token',
  CHURCH_ADMIN: 'church_admin-token',
  CHURCH_MAIN_ADMIN: 'church_main_admin-token',
  PASTOR: 'pastor-token',
  ASSISTANT_PASTOR: 'assistant_pastor-token',
  CHURCH_LEADER: 'church_leader-token',
  BACKGROUND_CHECKER: 'background_checker-token',
  HELPER: 'helper-token',
  CHURCH_MEMBER: 'church_member-token',
  VERIFIED_PRO: 'verified_pro-token',
  USER: 'user-token',
} as const;

export type SwaggerAuthValue = (typeof SWAGGER_AUTH)[keyof typeof SWAGGER_AUTH];

export function buildSwaggerOptions() {
  const builder = new DocumentBuilder()
    .setTitle(`${process.env.APP_NAME} API`)
    .setVersion('1.0')
    .addServer(appConfig().app.url || 'http://localhost:3000');

  Object.values(SWAGGER_AUTH).forEach((name) => {
    builder.addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
        description: `Enter JWT token for ${name.replace('-token', '')} role`,
      },
      name,
    );
  });

  return builder.build();
}

// Role to Auth Key mapping
const roleToAuthKey: Record<string, SwaggerAuthValue> = {
  super_admin: SWAGGER_AUTH.SUPER_ADMIN,
  church_admin: SWAGGER_AUTH.CHURCH_ADMIN,
  church_main_admin: SWAGGER_AUTH.CHURCH_MAIN_ADMIN,
  pastor: SWAGGER_AUTH.PASTOR,
  assistant_pastor: SWAGGER_AUTH.ASSISTANT_PASTOR,
  church_leader: SWAGGER_AUTH.CHURCH_LEADER,
  background_checker: SWAGGER_AUTH.BACKGROUND_CHECKER,
  helper: SWAGGER_AUTH.HELPER,
  church_member: SWAGGER_AUTH.CHURCH_MEMBER,
  verified_pros: SWAGGER_AUTH.VERIFIED_PRO,
  user: SWAGGER_AUTH.USER,
};

// Pure JavaScript version for Swagger interceptor (no TypeScript types)
export const swaggerUiOptions = {
  swaggerOptions: {
    persistAuthorization: true,
    defaultModelsExpandDepth: -1,
    docExpansion: 'none',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,

    responseInterceptor: function (response: any) {
      try {
        if (response.url && response.url.indexOf('/auth/login') !== -1) {
          if (response.status === 200 || response.status === 201) {
            let data = response.obj || response.body || response.data;
            if (typeof data === 'string') {
              data = JSON.parse(data);
            }

            console.log('[Swagger] Login response received');

            // Get token
            const token = data?.authorization?.access_token;

            if (!token) {
              console.warn('[Swagger] No token found');
              return response;
            }

            // Get role_name from response
            let roleName = null;

            if (data?.data?.role_name) {
              roleName = data.data.role_name;
            } else if (data?.data?.role) {
              roleName = data.data.role.toLowerCase().replace(/\s+/g, '_');
            } else if (data?.data?.type === 'CHURCH') {
              roleName = 'church_admin';
            } else if (data?.data?.user?.type) {
              roleName = data.data.user.type.toLowerCase();
            }

            console.log('[Swagger] Role name detected:', roleName);

            // Map role to auth key (using plain object for JavaScript)
            const roleMap: Record<string, string> = {
              super_admin: 'super_admin-token',
              church_admin: 'church_admin-token',
              church_main_admin: 'church_main_admin-token',
              pastor: 'pastor-token',
              assistant_pastor: 'assistant_pastor-token',
              church_leader: 'church_leader-token',
              background_checker: 'background_checker-token',
              helper: 'helper-token',
              church_member: 'church_member-token',
              verified_pros: 'verified_pro-token',
              user: 'user-token',
            };

            let authKey = 'user-token';
            if (roleName && roleMap[roleName]) {
              authKey = roleMap[roleName];
            }

            console.log('[Swagger] Using auth key:', authKey);
            console.log(
              '[Swagger] Token (first 50 chars):',
              token.substring(0, 50) + '...',
            );

            // Get Swagger UI instance
            const ui = (window as any).ui;

            if (ui && ui.authActions) {
              // Create authorization object
              const authorization: Record<string, any> = {};
              authorization[authKey] = {
                name: authKey,
                schema: {
                  type: 'http',
                  scheme: 'bearer',
                  bearerFormat: 'JWT',
                },
                value: token,
              };

              // Authorize in Swagger
              ui.authActions.authorize(authorization);
              console.log('[Swagger] Authorized with key:', authKey);

              // Also save to localStorage for persistence
              try {
                const currentAuth = localStorage.getItem('authorized');
                const parsedAuth = currentAuth ? JSON.parse(currentAuth) : {};
                parsedAuth[authKey] = authorization[authKey];
                localStorage.setItem('authorized', JSON.stringify(parsedAuth));
                console.log(
                  '[Swagger] Token saved to localStorage for key:',
                  authKey,
                );
              } catch (e) {
                console.warn('[Swagger] Could not save to localStorage:', e);
              }
            } else {
              console.warn('[Swagger] ui or ui.authActions not available');

              // Fallback: Save to localStorage only
              try {
                const authorization: Record<string, any> = {};
                authorization[authKey] = {
                  name: authKey,
                  schema: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                  },
                  value: token,
                };
                const currentAuth = localStorage.getItem('authorized');
                const parsedAuth = currentAuth ? JSON.parse(currentAuth) : {};
                parsedAuth[authKey] = authorization[authKey];
                localStorage.setItem('authorized', JSON.stringify(parsedAuth));
                console.log('[Swagger] Token saved to localStorage (fallback)');

                // Reload to apply token
                setTimeout(() => {
                  console.log('[Swagger] Reloading page to apply token...');
                  window.location.reload();
                }, 500);
              } catch (e) {
                console.error('[Swagger] Fallback failed:', e);
              }
            }
          }
        }
      } catch (err) {
        console.error('[Swagger] Auto-auth error:', err);
      }
      return response;
    },
  },
};

// Test credentials
export const TEST_CREDENTIALS = {
  'System Admin': {
    email: process.env.SUPER_ADMIN_EMAIL || 'superadmin@gmail.com',
    password: process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123',
    role: 'super_admin',
    authKey: SWAGGER_AUTH.SUPER_ADMIN,
  },
  'Church Main Admin (Grace)': {
    email: 'admin@gracechurch.org',
    password: 'Password@123',
    role: 'church_main_admin',
    authKey: SWAGGER_AUTH.CHURCH_MAIN_ADMIN,
  },
  'Pastor (Grace)': {
    email: 'pastor@gracechurch.org',
    password: 'Password@123',
    role: 'pastor',
    authKey: SWAGGER_AUTH.PASTOR,
  },
  'Assistant Pastor (Grace)': {
    email: 'assistant-pastor@gracechurch.org',
    password: 'Password@123',
    role: 'assistant_pastor',
    authKey: SWAGGER_AUTH.ASSISTANT_PASTOR,
  },
  'Church Leader (Grace)': {
    email: 'leader@gracechurch.org',
    password: 'Password@123',
    role: 'church_leader',
    authKey: SWAGGER_AUTH.CHURCH_LEADER,
  },
  'Background Checker (Grace)': {
    email: 'checker@gracechurch.org',
    password: 'Password@123',
    role: 'background_checker',
    authKey: SWAGGER_AUTH.BACKGROUND_CHECKER,
  },
  'Helper (Grace)': {
    email: 'helper@gracechurch.org',
    password: 'Password@123',
    role: 'helper',
    authKey: SWAGGER_AUTH.HELPER,
  },
  'Church Member (Grace)': {
    email: 'member@gracechurch.org',
    password: 'Password@123',
    role: 'church_member',
    authKey: SWAGGER_AUTH.CHURCH_MEMBER,
  },
  'Verified Pro (Grace)': {
    email: 'pro@gracechurch.org',
    password: 'Password@123',
    role: 'verified_pros',
    authKey: SWAGGER_AUTH.VERIFIED_PRO,
  },
  'Church Main Admin (Faith)': {
    email: 'admin@faithassembly.org',
    password: 'Password@123',
    role: 'church_main_admin',
    authKey: SWAGGER_AUTH.CHURCH_MAIN_ADMIN,
  },
  'Pastor (Faith)': {
    email: 'pastor@faithassembly.org',
    password: 'Password@123',
    role: 'pastor',
    authKey: SWAGGER_AUTH.PASTOR,
  },
  'Helper (Faith)': {
    email: 'helper@faithassembly.org',
    password: 'Password@123',
    role: 'helper',
    authKey: SWAGGER_AUTH.HELPER,
  },
  'Church Member (Faith)': {
    email: 'member@faithassembly.org',
    password: 'Password@123',
    role: 'church_member',
    authKey: SWAGGER_AUTH.CHURCH_MEMBER,
  },
};
