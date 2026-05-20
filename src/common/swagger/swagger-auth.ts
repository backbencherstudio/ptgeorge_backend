import { DocumentBuilder } from '@nestjs/swagger';
import appConfig from 'src/config/app.config';
import { Role } from '../guard/role/role.enum';

export const SWAGGER_AUTH = {
  SUPER_ADMIN: 'super_admin-token',
  ADMIN: 'admin-token',
  CHURCH_ADMIN: 'church_admin-token',
  CHURCH_MAIN_ADMIN: 'church_main_admin-token',
  CHURCH_LEADER: 'church_leader-token',
  PASTOR: 'pastor-token',
  ASSISTANT_PASTOR: 'assistant_pastor-token',
  BACKGROUND_CHECKER: 'background_checker-token',
  HELPER: 'helper-token',
  CHURCH_MEMBER: 'church_member-token',
  VERIFIED_PRO: 'verified_pro-token',
  USER: 'user-token',
} as const;

export type SwaggerAuthValue = (typeof SWAGGER_AUTH)[keyof typeof SWAGGER_AUTH];

// Role to Auth Key mapping (uppercase Role enum to lowercase auth key)
export const roleToAuthKey: Record<Role, SwaggerAuthValue> = {
  [Role.SUPER_ADMIN]: SWAGGER_AUTH.SUPER_ADMIN,
  [Role.ADMIN]: SWAGGER_AUTH.ADMIN,
  [Role.CHURCH_ADMIN]: SWAGGER_AUTH.CHURCH_ADMIN,
  [Role.CHURCH_MAIN_ADMIN]: SWAGGER_AUTH.CHURCH_MAIN_ADMIN,
  [Role.CHURCH_LEADER]: SWAGGER_AUTH.CHURCH_LEADER,
  [Role.PASTOR]: SWAGGER_AUTH.PASTOR,
  [Role.ASSISTANT_PASTOR]: SWAGGER_AUTH.ASSISTANT_PASTOR,
  [Role.BACKGROUND_CHECKER]: SWAGGER_AUTH.BACKGROUND_CHECKER,
  [Role.HELPER]: SWAGGER_AUTH.HELPER,
  [Role.CHURCH_MEMBER]: SWAGGER_AUTH.CHURCH_MEMBER,
  [Role.VERIFIED_PRO]: SWAGGER_AUTH.VERIFIED_PRO,
  [Role.USER]: SWAGGER_AUTH.USER,
};

// Helper function to get auth key from role string
export function getAuthKeyFromRole(role: string | Role): SwaggerAuthValue {
  // Convert to uppercase for lookup
  const roleUpper = role.toString().toUpperCase() as Role;
  return roleToAuthKey[roleUpper] || SWAGGER_AUTH.USER;
}

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
        description: `Enter JWT token for ${name.replace('-token', '').replace(/_/g, ' ')} role`,
      },
      name,
    );
  });

  return builder.build();
}

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

            // Get role_name from response (standardized to uppercase)
            let roleName = null;

            if (data?.data?.role_name) {
              roleName = data.data.role_name.toUpperCase();
            } else if (data?.data?.role) {
              roleName = data.data.role.toUpperCase();
            } else if (data?.data?.type === 'CHURCH') {
              roleName = 'CHURCH_ADMIN';
            } else if (data?.data?.user?.type) {
              roleName = data.data.user.type.toUpperCase();
            }

            console.log('[Swagger] Role name detected:', roleName);

            // Map role to auth key (using uppercase keys for consistency)
            const roleMap: Record<string, string> = {
              SUPER_ADMIN: 'super_admin-token',
              ADMIN: 'admin-token',
              CHURCH_ADMIN: 'church_admin-token',
              CHURCH_MAIN_ADMIN: 'church_main_admin-token',
              CHURCH_LEADER: 'church_leader-token',
              PASTOR: 'pastor-token',
              ASSISTANT_PASTOR: 'assistant_pastor-token',
              BACKGROUND_CHECKER: 'background_checker-token',
              HELPER: 'helper-token',
              CHURCH_MEMBER: 'church_member-token',
              VERIFIED_PRO: 'verified_pro-token',
              USER: 'user-token',
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

// Test credentials with standardized role names
export const TEST_CREDENTIALS = {
  'System Admin': {
    email: process.env.SUPER_ADMIN_EMAIL || 'superadmin@gmail.com',
    password: process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123',
    role: Role.SUPER_ADMIN,
    authKey: SWAGGER_AUTH.SUPER_ADMIN,
  },
  Admin: {
    email: 'admin@system.com',
    password: 'Admin@123',
    role: Role.ADMIN,
    authKey: SWAGGER_AUTH.ADMIN,
  },
  'Church Admin (Grace)': {
    email: 'churchadmin@gracechurch.org',
    password: 'Password@123',
    role: Role.CHURCH_ADMIN,
    authKey: SWAGGER_AUTH.CHURCH_ADMIN,
  },
  'Church Main Admin (Grace)': {
    email: 'admin@gracechurch.org',
    password: 'Password@123',
    role: Role.CHURCH_MAIN_ADMIN,
    authKey: SWAGGER_AUTH.CHURCH_MAIN_ADMIN,
  },
  'Pastor (Grace)': {
    email: 'pastor@gracechurch.org',
    password: 'Password@123',
    role: Role.PASTOR,
    authKey: SWAGGER_AUTH.PASTOR,
  },
  'Assistant Pastor (Grace)': {
    email: 'assistant-pastor@gracechurch.org',
    password: 'Password@123',
    role: Role.ASSISTANT_PASTOR,
    authKey: SWAGGER_AUTH.ASSISTANT_PASTOR,
  },
  'Church Leader (Grace)': {
    email: 'leader@gracechurch.org',
    password: 'Password@123',
    role: Role.CHURCH_LEADER,
    authKey: SWAGGER_AUTH.CHURCH_LEADER,
  },
  'Background Checker (Grace)': {
    email: 'checker@gracechurch.org',
    password: 'Password@123',
    role: Role.BACKGROUND_CHECKER,
    authKey: SWAGGER_AUTH.BACKGROUND_CHECKER,
  },
  'Helper (Grace)': {
    email: 'helper@gracechurch.org',
    password: 'Password@123',
    role: Role.HELPER,
    authKey: SWAGGER_AUTH.HELPER,
  },
  'Church Member (Grace)': {
    email: 'member@gracechurch.org',
    password: 'Password@123',
    role: Role.CHURCH_MEMBER,
    authKey: SWAGGER_AUTH.CHURCH_MEMBER,
  },
  'Verified Pro (Grace)': {
    email: 'pro@gracechurch.org',
    password: 'Password@123',
    role: Role.VERIFIED_PRO,
    authKey: SWAGGER_AUTH.VERIFIED_PRO,
  },
  'Regular User (Grace)': {
    email: 'user@gracechurch.org',
    password: 'Password@123',
    role: Role.USER,
    authKey: SWAGGER_AUTH.USER,
  },
  'Church Main Admin (Faith)': {
    email: 'admin@faithassembly.org',
    password: 'Password@123',
    role: Role.CHURCH_MAIN_ADMIN,
    authKey: SWAGGER_AUTH.CHURCH_MAIN_ADMIN,
  },
  'Pastor (Faith)': {
    email: 'pastor@faithassembly.org',
    password: 'Password@123',
    role: Role.PASTOR,
    authKey: SWAGGER_AUTH.PASTOR,
  },
  'Helper (Faith)': {
    email: 'helper@faithassembly.org',
    password: 'Password@123',
    role: Role.HELPER,
    authKey: SWAGGER_AUTH.HELPER,
  },
  'Church Member (Faith)': {
    email: 'member@faithassembly.org',
    password: 'Password@123',
    role: Role.CHURCH_MEMBER,
    authKey: SWAGGER_AUTH.CHURCH_MEMBER,
  },
};

// Helper function to get test credentials by role
export function getTestCredentialsByRole(role: Role) {
  const credentialEntry = Object.values(TEST_CREDENTIALS).find(
    (cred) => cred.role === role,
  );
  return credentialEntry || null;
}

// Helper function to get all test credentials as array
export function getAllTestCredentials() {
  return Object.entries(TEST_CREDENTIALS).map(([name, creds]) => ({
    name,
    ...creds,
  }));
}
