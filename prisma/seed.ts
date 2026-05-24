import {
  PrismaClient,
  UserStatus,
  ChurchMemberStatus,
  AdStatus,
  AdPlacement,
} from '../prisma/generated/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import appConfig from '../src/config/app.config';
import { Role } from '../src/common/guard/role/role.enum';

const connectionString = appConfig().database.url;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

// Define roles data - Simplified (matching Role enum)
const rolesData = [
  {
    title: 'Super Admin',
    name: Role.SUPER_ADMIN,
    description: 'System super administrator with full access',
    color: '#FF0000',
  },
  {
    title: 'Admin',
    name: Role.ADMIN,
    description: 'System administrator',
    color: '#FF6B6B',
  },
  {
    title: 'Church Admin',
    name: Role.CHURCH_ADMIN,
    description:
      'Church administrator with full control over church management',
    color: '#FF8C00',
  },
  {
    title: 'Church Leader',
    name: Role.CHURCH_LEADER,
    description: 'Church leadership role with limited assignment rights',
    color: '#4ECDC4',
  },
  {
    title: 'Pastor',
    name: Role.PASTOR,
    description: 'Church pastor',
    color: '#45B7D1',
  },
  {
    title: 'Assistant Pastor',
    name: Role.ASSISTANT_PASTOR,
    description: 'Assistant to the pastor',
    color: '#96CEB4',
  },
  {
    title: 'Background Checker',
    name: Role.BACKGROUND_CHECKER,
    description: 'Performs background checks',
    color: '#FFEAA7',
  },
  {
    title: 'Helper',
    name: Role.HELPER,
    description: 'Church helper/volunteer',
    color: '#DDA0DD',
  },
  {
    title: 'Church Member',
    name: Role.CHURCH_MEMBER,
    description: 'Regular church member',
    color: '#98D8C8',
  },
  {
    title: 'Pro User',
    name: Role.PRO_USER,
    description: 'Verified professional members',
    color: '#F7B731',
  },
  {
    title: 'Regular User',
    name: Role.USER,
    description: 'Regular platform user',
    color: '#A0A0A0',
  },
];

// Define permissions data
const permissionsData = [
  {
    title: 'Assign Roles',
    name: 'assign_role',
    action: 'assign',
    category: 'Role',
    description: 'Can assign roles to users within church',
  },
  {
    title: 'Manage Role Assignments',
    name: 'manage_role_assignments',
    action: 'manage',
    category: 'Role',
    description: 'Full control over role assignments',
  },
  {
    title: 'View Role Assignments',
    name: 'view_role_assignments',
    action: 'read',
    category: 'Role',
    description: 'Can view role assignments',
  },
  {
    title: 'View Church Members',
    name: 'view_church_members',
    action: 'read',
    category: 'Member',
    description: 'Can view list of church members',
  },
  {
    title: 'Manage Church Members',
    name: 'manage_church_members',
    action: 'manage',
    category: 'Member',
    description: 'Full control over church members',
  },
  {
    title: 'Add Church Members',
    name: 'add_church_members',
    action: 'create',
    category: 'Member',
    description: 'Can add new church members',
  },
  {
    title: 'Edit Church Members',
    name: 'edit_church_members',
    action: 'update',
    category: 'Member',
    description: 'Can edit church member details',
  },
  {
    title: 'Delete Church Members',
    name: 'delete_church_members',
    action: 'delete',
    category: 'Member',
    description: 'Can remove church members',
  },
  {
    title: 'Manage Church Settings',
    name: 'manage_church_settings',
    action: 'manage',
    category: 'Church',
    description: 'Can manage church settings',
  },
  {
    title: 'View Church Settings',
    name: 'view_church_settings',
    action: 'read',
    category: 'Church',
    description: 'Can view church settings',
  },
  {
    title: 'Update Church Settings',
    name: 'update_church_settings',
    action: 'update',
    category: 'Church',
    description: 'Can update church settings',
  },
  {
    title: 'Manage Content',
    name: 'manage_content',
    action: 'manage',
    category: 'Content',
    description: 'Full control over content',
  },
  {
    title: 'Publish Content',
    name: 'publish_content',
    action: 'update',
    category: 'Content',
    description: 'Can publish content',
  },
  {
    title: 'View Content',
    name: 'view_content',
    action: 'read',
    category: 'Content',
    description: 'Can view content',
  },
];

// Define role-permission assignments
const rolePermissionsMap: Record<string, string[]> = {
  [Role.SUPER_ADMIN]: [
    'assign_role',
    'manage_role_assignments',
    'view_role_assignments',
    'view_church_members',
    'manage_church_members',
    'add_church_members',
    'edit_church_members',
    'delete_church_members',
    'manage_church_settings',
    'view_church_settings',
    'update_church_settings',
    'manage_content',
    'publish_content',
    'view_content',
  ],
  [Role.ADMIN]: [
    'assign_role',
    'manage_role_assignments',
    'view_role_assignments',
    'view_church_members',
    'manage_church_members',
    'add_church_members',
    'edit_church_members',
    'delete_church_members',
    'manage_church_settings',
    'view_church_settings',
    'update_church_settings',
    'manage_content',
    'publish_content',
    'view_content',
  ],
  [Role.CHURCH_ADMIN]: [
    'assign_role',
    'manage_role_assignments',
    'view_role_assignments',
    'view_church_members',
    'manage_church_members',
    'add_church_members',
    'edit_church_members',
    'delete_church_members',
    'manage_church_settings',
    'view_church_settings',
    'update_church_settings',
    'manage_content',
    'publish_content',
    'view_content',
  ],
  [Role.CHURCH_LEADER]: [
    'assign_role',
    'view_role_assignments',
    'view_church_members',
    'add_church_members',
    'edit_church_members',
    'view_church_settings',
    'view_content',
  ],
  [Role.PASTOR]: [
    'assign_role',
    'view_role_assignments',
    'view_church_members',
    'add_church_members',
    'edit_church_members',
    'view_church_settings',
    'publish_content',
    'view_content',
  ],
  [Role.ASSISTANT_PASTOR]: [
    'assign_role',
    'view_role_assignments',
    'view_church_members',
    'add_church_members',
    'view_content',
  ],
  [Role.BACKGROUND_CHECKER]: [
    'assign_role',
    'view_role_assignments',
    'view_church_members',
  ],
  [Role.HELPER]: ['view_church_members', 'view_content'],
  [Role.CHURCH_MEMBER]: ['view_content'],
  [Role.PRO_USER]: ['view_content'],
  [Role.USER]: ['view_content'],
};

// Define role assignment rules
const roleAssignmentRules = [
  { from_role: Role.SUPER_ADMIN, to_role: Role.ADMIN },
  { from_role: Role.SUPER_ADMIN, to_role: Role.CHURCH_ADMIN },
  { from_role: Role.SUPER_ADMIN, to_role: Role.PASTOR },
  { from_role: Role.SUPER_ADMIN, to_role: Role.ASSISTANT_PASTOR },
  { from_role: Role.SUPER_ADMIN, to_role: Role.CHURCH_LEADER },
  { from_role: Role.SUPER_ADMIN, to_role: Role.BACKGROUND_CHECKER },
  { from_role: Role.SUPER_ADMIN, to_role: Role.HELPER },
  { from_role: Role.SUPER_ADMIN, to_role: Role.CHURCH_MEMBER },
  { from_role: Role.SUPER_ADMIN, to_role: Role.PRO_USER },
  { from_role: Role.SUPER_ADMIN, to_role: Role.USER },
  { from_role: Role.ADMIN, to_role: Role.CHURCH_ADMIN },
  { from_role: Role.ADMIN, to_role: Role.PASTOR },
  { from_role: Role.ADMIN, to_role: Role.HELPER },
  { from_role: Role.ADMIN, to_role: Role.CHURCH_MEMBER },
  { from_role: Role.CHURCH_ADMIN, to_role: Role.PASTOR },
  { from_role: Role.CHURCH_ADMIN, to_role: Role.ASSISTANT_PASTOR },
  { from_role: Role.CHURCH_ADMIN, to_role: Role.CHURCH_LEADER },
  { from_role: Role.CHURCH_ADMIN, to_role: Role.BACKGROUND_CHECKER },
  { from_role: Role.CHURCH_ADMIN, to_role: Role.HELPER },
  { from_role: Role.CHURCH_ADMIN, to_role: Role.CHURCH_MEMBER },
  { from_role: Role.CHURCH_ADMIN, to_role: Role.PRO_USER },
  { from_role: Role.CHURCH_ADMIN, to_role: Role.USER },
  { from_role: Role.CHURCH_LEADER, to_role: Role.HELPER },
  { from_role: Role.CHURCH_LEADER, to_role: Role.CHURCH_MEMBER },
  { from_role: Role.PASTOR, to_role: Role.HELPER },
  { from_role: Role.PASTOR, to_role: Role.CHURCH_MEMBER },
  { from_role: Role.ASSISTANT_PASTOR, to_role: Role.HELPER },
  { from_role: Role.ASSISTANT_PASTOR, to_role: Role.CHURCH_MEMBER },
  { from_role: Role.BACKGROUND_CHECKER, to_role: Role.HELPER },
  { from_role: Role.BACKGROUND_CHECKER, to_role: Role.CHURCH_MEMBER },
];

// Church data with passwords for the admin users
const churchesData = [
  {
    name: 'Grace Community Church',
    city: 'New York',
    email: 'admin@gracechurch.org',
    domain: 'gracechurch.org',
    adminName: 'John Smith',
    adminPassword: 'Password@123',
    status: 'ACTIVE' as const,
  },
  {
    name: 'Faith Assembly Church',
    city: 'Los Angeles',
    email: 'admin@faithassembly.org',
    domain: 'faithassembly.org',
    adminName: 'Michael Johnson',
    adminPassword: 'Password@123',
    status: 'ACTIVE' as const,
  },
];

// Ads data for seeding
const adsData = [
  {
    title: 'Bible Study App – DigiSanctuary',
    description:
      'Join our interactive Bible study community. Daily devotionals, group discussions, and spiritual growth resources.',
    link: 'https://digisanctuary.com/bible-study',
    thumbnail: 'ads/bible-study-app.jpg',
    status: AdStatus.ACTIVE,
    placement: AdPlacement.HOME_BANNER,
    country: 'USA',
    city: 'New York',
    start_date: new Date('2025-01-10T00:00:00Z'),
    end_date: new Date('2025-12-31T23:59:59Z'),
    total_views: 8900,
    total_clicks: 1240,
  },
  {
    title: 'Church Management Software',
    description:
      'Complete church management solution. Track members, manage events, handle donations, and more.',
    link: 'https://churchmanager.com',
    thumbnail: 'ads/church-management.jpg',
    status: AdStatus.ACTIVE,
    placement: AdPlacement.COMMUNITY_FEED,
    country: null,
    city: null,
    start_date: new Date('2025-01-10T00:00:00Z'),
    end_date: new Date('2025-12-31T23:59:59Z'),
    total_views: 8900,
    total_clicks: 1240,
  },
  {
    title: 'Worship Music Streaming',
    description:
      'Stream thousands of worship songs, create playlists, and download for offline listening.',
    link: 'https://worshipstream.com',
    thumbnail: 'ads/worship-music.jpg',
    status: AdStatus.PAUSED,
    placement: AdPlacement.SIDEBAR,
    country: 'USA',
    city: 'Los Angeles',
    start_date: new Date('2025-02-01T00:00:00Z'),
    end_date: new Date('2025-12-31T23:59:59Z'),
    total_views: 4500,
    total_clicks: 890,
  },
  {
    title: 'Online Giving Platform',
    description:
      'Secure online giving for churches. Accept donations, track tithes, and manage pledges.',
    link: 'https://give.church',
    thumbnail: 'ads/online-giving.jpg',
    status: AdStatus.ACTIVE,
    placement: AdPlacement.POPUP,
    country: 'Canada',
    city: 'Toronto',
    start_date: new Date('2025-03-01T00:00:00Z'),
    end_date: new Date('2025-10-31T23:59:59Z'),
    total_views: 3200,
    total_clicks: 560,
  },
  {
    title: 'Sunday School Curriculum',
    description:
      'Complete curriculum for all ages. Lesson plans, activities, and teaching resources.',
    link: 'https://sundayschool.com',
    thumbnail: 'ads/sunday-school.jpg',
    status: AdStatus.HIDDEN,
    placement: AdPlacement.IN_ARTICLE,
    country: 'UK',
    city: 'London',
    start_date: new Date('2025-01-15T00:00:00Z'),
    end_date: new Date('2025-06-30T23:59:59Z'),
    total_views: 1200,
    total_clicks: 145,
  },
  {
    title: 'Christian Podcast Network',
    description:
      'Discover inspiring Christian podcasts. Sermons, discussions, and testimonies.',
    link: 'https://christianpodcasts.com',
    thumbnail: 'ads/podcast.jpg',
    status: AdStatus.ACTIVE,
    placement: AdPlacement.HOME_BANNER,
    country: 'Australia',
    city: 'Sydney',
    start_date: new Date('2025-04-01T00:00:00Z'),
    end_date: new Date('2025-12-31T23:59:59Z'),
    total_views: 5600,
    total_clicks: 980,
  },
  {
    title: 'Event Management for Churches',
    description:
      'Plan and manage church events, registrations, and volunteer coordination.',
    link: 'https://churchevents.com',
    thumbnail: 'ads/event-management.jpg',
    status: AdStatus.PAUSED,
    placement: AdPlacement.CHURCH_FEED,
    country: null,
    city: null,
    start_date: new Date('2025-02-10T00:00:00Z'),
    end_date: new Date('2025-09-30T23:59:59Z'),
    total_views: 2100,
    total_clicks: 320,
  },
  {
    title: 'Bible Reading Challenge',
    description:
      'Join our 365-day Bible reading plan with daily reminders and progress tracking.',
    link: 'https://biblechallenge.com',
    thumbnail: 'ads/bible-challenge.jpg',
    status: AdStatus.ACTIVE,
    placement: AdPlacement.FULLSCREEN,
    country: 'USA',
    city: 'Chicago',
    start_date: new Date('2025-01-01T00:00:00Z'),
    end_date: new Date('2025-12-31T23:59:59Z'),
    total_views: 10200,
    total_clicks: 2150,
  },
];

async function main() {
  console.log('🌱 Starting database seeding...');
  console.log('='.repeat(60));

  try {
    // Step 1: Create Superadmin User (NO church membership - superadmin is system-wide)
    console.log('📝 Step 1: Creating superadmin user...');
    const superadminData = {
      first_name: 'System',
      last_name: 'Admin',
      username: appConfig().defaultUser.system.username,
      email: appConfig().defaultUser.system.email,
      password: await hashPassword(appConfig().defaultUser.system.password),
      phone_number: '+1234567890',
      church_name: 'System Administration',
      language: 'en',
      type: 'SUPER_ADMIN' as const,
      status: UserStatus.ACTIVE,
    };

    let superadmin = await prisma.user.findUnique({
      where: { email: superadminData.email },
    });

    if (!superadmin) {
      superadmin = await prisma.user.create({
        data: {
          ...superadminData,
          email_verified_at: new Date(),
        },
      });
      console.log(`✅ Superadmin created: ${superadmin.email}`);
    } else {
      console.log(`✅ Superadmin already exists: ${superadmin.email}`);
    }

    // Step 2: Create Roles
    console.log('\n📝 Step 2: Creating roles...');
    const createdRoles = new Map<string, any>();
    for (const role of rolesData) {
      let existingRole = await prisma.role.findFirst({
        where: { name: role.name },
      });

      let createdRole;
      if (!existingRole) {
        createdRole = await prisma.role.create({
          data: {
            id: randomUUID(),
            title: role.title,
            name: role.name,
            description: role.description,
            color: role.color,
            status: 1,
          },
        });
        console.log(`✅ Role created: ${role.title} (${role.name})`);
      } else {
        createdRole = existingRole;
        console.log(`✅ Role already exists: ${role.title} (${role.name})`);
      }
      createdRoles.set(role.name, createdRole);
    }

    // Step 3: Create Permissions
    console.log('\n📝 Step 3: Creating permissions...');
    const createdPermissions = new Map<string, any>();
    for (const permission of permissionsData) {
      let existingPermission = await prisma.permission.findUnique({
        where: { name: permission.name },
      });

      let createdPermission;
      if (!existingPermission) {
        createdPermission = await prisma.permission.create({
          data: {
            id: randomUUID(),
            title: permission.title,
            name: permission.name,
            action: permission.action as any,
            category: permission.category,
            description: permission.description,
            status: 'ACTIVE',
          },
        });
        console.log(
          `✅ Permission created: ${permission.title} (${permission.name})`,
        );
      } else {
        createdPermission = existingPermission;
        console.log(
          `✅ Permission already exists: ${permission.title} (${permission.name})`,
        );
      }
      createdPermissions.set(permission.name, createdPermission);
    }

    // Step 4: Assign Permissions to Roles
    console.log('\n📝 Step 4: Assigning permissions to roles...');
    for (const [roleName, permissions] of Object.entries(rolePermissionsMap)) {
      const role = createdRoles.get(roleName);
      if (!role) {
        console.log(`⚠️ Role ${roleName} not found, skipping...`);
        continue;
      }

      for (const permName of permissions) {
        const permission = createdPermissions.get(permName);
        if (!permission) {
          console.log(`⚠️ Permission ${permName} not found, skipping...`);
          continue;
        }

        const existingAssignment = await prisma.permissionRole.findUnique({
          where: {
            permission_id_role_id: {
              permission_id: permission.id,
              role_id: role.id,
            },
          },
        });

        if (!existingAssignment) {
          await prisma.permissionRole.create({
            data: {
              permission_id: permission.id,
              role_id: role.id,
            },
          });
        }
      }
      console.log(
        `✅ Assigned ${permissions.length} permissions to ${roleName}`,
      );
    }

    // Step 5: Create Role Assignment Rules
    console.log('\n📝 Step 5: Creating role assignment rules...');
    for (const rule of roleAssignmentRules) {
      const fromRole = createdRoles.get(rule.from_role);
      const toRole = createdRoles.get(rule.to_role);

      if (!fromRole || !toRole) {
        console.log(
          `⚠️ Rule from ${rule.from_role} to ${rule.to_role} - roles not found, skipping...`,
        );
        continue;
      }

      const existingRule = await prisma.roleAssignmentRule.findUnique({
        where: {
          from_role_id_to_role_id: {
            from_role_id: fromRole.id,
            to_role_id: toRole.id,
          },
        },
      });

      if (!existingRule) {
        await prisma.roleAssignmentRule.create({
          data: {
            from_role_id: fromRole.id,
            to_role_id: toRole.id,
          },
        });
        console.log(
          `✅ Rule created: ${rule.from_role} → can assign → ${rule.to_role}`,
        );
      } else {
        console.log(
          `✅ Rule already exists: ${rule.from_role} → can assign → ${rule.to_role}`,
        );
      }
    }

    // Step 6: Create Churches AND Church Admin Users (in transaction)
    console.log('\n📝 Step 6: Creating churches and church admin users...');
    const createdChurches = new Map<string, any>();
    const churchAdminRole = createdRoles.get(Role.CHURCH_ADMIN);

    if (!churchAdminRole) {
      throw new Error('CHURCH_ADMIN role not found!');
    }

    for (const churchData of churchesData) {
      let existingChurch = await prisma.church.findFirst({
        where: { church_email: churchData.email },
      });

      let church;
      let adminUser;

      if (!existingChurch) {
        // Create church and admin user in transaction
        const result = await prisma.$transaction(async (tx) => {
          // Create church
          const newChurch = await tx.church.create({
            data: {
              id: randomUUID(),
              church_name: churchData.name,
              church_city: churchData.city,
              church_email: churchData.email,
              church_domain: churchData.domain,
              church_adminname: churchData.adminName,
              status: churchData.status,
              church_members: 0,
            },
          });

          // Create church admin user
          const hashedPassword = await hashPassword(churchData.adminPassword);
          const newAdminUser = await tx.user.create({
            data: {
              id: randomUUID(),
              first_name:
                churchData.adminName.split(' ')[0] || churchData.adminName,
              last_name: churchData.adminName.split(' ')[1] || '',
              email: churchData.email,
              password: hashedPassword,
              phone_number: '',
              church_name: churchData.name,
              language: 'en',
              type: 'CHURCH_ADMIN',
              status: UserStatus.ACTIVE,
              email_verified_at: new Date(),
            },
          });

          // Create church membership for admin user
          await tx.churchMember.create({
            data: {
              id: randomUUID(),
              church_id: newChurch.id,
              user_id: newAdminUser.id,
              church_role: 'Church Admin',
              status: ChurchMemberStatus.ACTIVE,
              joined_at: new Date(),
              approved_by: superadmin.id,
              approved_at: new Date(),
            },
          });

          // Assign CHURCH_ADMIN role
          await tx.roleUser.create({
            data: {
              role_id: churchAdminRole.id,
              user_id: newAdminUser.id,
              churchId: newChurch.id,
              assigned_by_id: superadmin.id,
            },
          });

          // Update church member count
          await tx.church.update({
            where: { id: newChurch.id },
            data: { church_members: 1 },
          });

          return { church: newChurch, adminUser: newAdminUser };
        });

        church = result.church;
        adminUser = result.adminUser;
        console.log(
          `✅ Church created: ${churchData.name} with admin user ${churchData.email}`,
        );
      } else {
        church = existingChurch;
        console.log(`✅ Church already exists: ${churchData.name}`);

        adminUser = await prisma.user.findFirst({
          where: { email: churchData.email },
          include: {
            church_memberships: {
              where: { church_id: church.id },
            },
          },
        });

        if (adminUser) {
          if (!adminUser.email_verified_at) {
            await prisma.user.update({
              where: { id: adminUser.id },
              data: { email_verified_at: new Date() },
            });
            console.log(`  ✅ Email verified for ${adminUser.email}`);
          }

          const hasMembership = adminUser.church_memberships.length > 0;

          if (!hasMembership) {
            console.log(
              `  ⚠️ Missing membership for ${adminUser.email}, creating...`,
            );

            await prisma.$transaction(async (tx) => {
              await tx.churchMember.create({
                data: {
                  id: randomUUID(),
                  church_id: church.id,
                  user_id: adminUser.id,
                  church_role: 'Church Admin',
                  status: ChurchMemberStatus.ACTIVE,
                  joined_at: new Date(),
                  approved_by: superadmin.id,
                  approved_at: new Date(),
                },
              });

              const existingRole = await tx.roleUser.findUnique({
                where: {
                  role_id_user_id: {
                    role_id: churchAdminRole.id,
                    user_id: adminUser.id,
                  },
                },
              });

              if (!existingRole) {
                await tx.roleUser.create({
                  data: {
                    role_id: churchAdminRole.id,
                    user_id: adminUser.id,
                    churchId: church.id,
                    assigned_by_id: superadmin.id,
                  },
                });
              }

              const memberCount = await tx.churchMember.count({
                where: {
                  church_id: church.id,
                  status: ChurchMemberStatus.ACTIVE,
                  deleted_at: null,
                },
              });

              await tx.church.update({
                where: { id: church.id },
                data: { church_members: memberCount },
              });
            });

            console.log(
              `  ✅ Created missing membership for ${adminUser.email}`,
            );
          } else {
            console.log(`  ✅ Admin already has church membership`);
          }
        } else {
          console.log(`  ⚠️ Admin user not found for ${churchData.email}`);
        }
      }
      createdChurches.set(churchData.name, church);
    }

    // Step 7: Create Additional Church Users (non-admin members)
    console.log('\n📝 Step 7: Creating additional church users...');

    const churchUsersData = {
      'Grace Community Church': [
        {
          first_name: 'Father Michael',
          last_name: 'Anderson',
          email: 'pastor@gracechurch.org',
          phone: '+1 212 555 0002',
          role: Role.PASTOR,
          type: 'USER' as const,
          church_role: 'Pastor',
        },
        {
          first_name: 'Rev. Sarah',
          last_name: 'Johnson',
          email: 'assistant_pastor@gracechurch.org',
          phone: '+1 212 555 0003',
          role: Role.ASSISTANT_PASTOR,
          type: 'USER' as const,
          church_role: 'Assistant Pastor',
        },
        {
          first_name: 'Michael',
          last_name: 'Chen',
          email: 'leader@gracechurch.org',
          phone: '+1 212 555 0110',
          role: Role.CHURCH_LEADER,
          type: 'USER' as const,
          church_role: 'Church Leader',
        },
        {
          first_name: 'Robert',
          last_name: 'Wilson',
          email: 'checker@gracechurch.org',
          phone: '+1 212 555 0004',
          role: Role.BACKGROUND_CHECKER,
          type: 'USER' as const,
          church_role: 'Background Checker',
        },
        {
          first_name: 'David',
          last_name: 'Kim',
          email: 'helper@gracechurch.org',
          phone: '+1 212 555 0005',
          role: Role.HELPER,
          type: 'USER' as const,
          church_role: 'Helper',
        },
        {
          first_name: 'Emily',
          last_name: 'Rodriguez',
          email: 'member@gracechurch.org',
          phone: '+1 212 555 0006',
          role: Role.CHURCH_MEMBER,
          type: 'USER' as const,
          church_role: 'Member',
        },
        {
          first_name: 'James',
          last_name: 'Wilson',
          email: 'pro@gracechurch.org',
          phone: '+1 212 555 0007',
          role: Role.PRO_USER,
          type: 'PRO_USER' as const,
          church_role: 'Pro User',
        },
        {
          first_name: 'Regular',
          last_name: 'User',
          email: 'user@gracechurch.org',
          phone: '+1 212 555 0008',
          role: Role.USER,
          type: 'USER' as const,
          church_role: 'Regular User',
        },
      ],
      'Faith Assembly Church': [
        {
          first_name: 'Pastor David',
          last_name: 'Williams',
          email: 'pastor@faithassembly.org',
          phone: '+1 310 555 0002',
          role: Role.PASTOR,
          type: 'USER' as const,
          church_role: 'Pastor',
        },
        {
          first_name: 'Lisa',
          last_name: 'Brown',
          email: 'helper@faithassembly.org',
          phone: '+1 310 555 0003',
          role: Role.HELPER,
          type: 'USER' as const,
          church_role: 'Helper',
        },
        {
          first_name: 'Mark',
          last_name: 'Davis',
          email: 'member@faithassembly.org',
          phone: '+1 310 555 0004',
          role: Role.CHURCH_MEMBER,
          type: 'USER' as const,
          church_role: 'Member',
        },
      ],
    };

    for (const [churchName, users] of Object.entries(churchUsersData)) {
      const church = createdChurches.get(churchName);
      if (!church) {
        console.log(`⚠️ Church ${churchName} not found, skipping users...`);
        continue;
      }

      console.log(`\n📝 Creating users for ${churchName}:`);

      for (const userData of users) {
        const role = createdRoles.get(userData.role);
        if (!role) {
          console.log(
            `⚠️ Role ${userData.role} not found for user ${userData.email}, skipping...`,
          );
          continue;
        }

        let user = await prisma.user.findUnique({
          where: { email: userData.email },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              id: randomUUID(),
              first_name: userData.first_name,
              last_name: userData.last_name,
              email: userData.email,
              password: await hashPassword('Password@123'),
              phone_number: userData.phone,
              church_name: churchName,
              language: 'en',
              type: userData.type,
              status: UserStatus.ACTIVE,
              email_verified_at: new Date(),
            },
          });
          console.log(
            `  ✅ User created: ${userData.first_name} ${userData.last_name} (${userData.role})`,
          );
        } else {
          console.log(
            `  ✅ User already exists: ${userData.first_name} ${userData.last_name} (${userData.role})`,
          );

          if (!user.email_verified_at) {
            await prisma.user.update({
              where: { id: user.id },
              data: { email_verified_at: new Date() },
            });
            console.log(`  ✅ Email verified for ${user.email}`);
          }
        }

        // Create church membership
        const existingMembership = await prisma.churchMember.findFirst({
          where: {
            church_id: church.id,
            user_id: user.id,
          },
        });

        if (!existingMembership) {
          await prisma.churchMember.create({
            data: {
              id: randomUUID(),
              church_id: church.id,
              user_id: user.id,
              church_role: userData.church_role,
              status: ChurchMemberStatus.ACTIVE,
              joined_at: new Date(),
              approved_by: superadmin?.id,
              approved_at: new Date(),
            },
          });
          console.log(`  ✅ Church membership created`);
        } else {
          console.log(`  ✅ Church membership already exists`);
        }

        // Assign role
        const existingAssignment = await prisma.roleUser.findUnique({
          where: {
            role_id_user_id: {
              role_id: role.id,
              user_id: user.id,
            },
          },
        });

        if (!existingAssignment) {
          await prisma.roleUser.create({
            data: {
              role_id: role.id,
              user_id: user.id,
              assigned_by_id: superadmin?.id,
              churchId: church.id,
            },
          });
          console.log(`  ✅ Role assigned: ${userData.role}`);
        } else {
          console.log(`  ✅ Role already assigned: ${userData.role}`);
        }
      }
    }

    // Step 8: Update church member counts
    console.log('\n📝 Step 8: Updating church member counts...');
    for (const [churchName, church] of createdChurches) {
      const memberCount = await prisma.churchMember.count({
        where: {
          church_id: church.id,
          status: ChurchMemberStatus.ACTIVE,
          deleted_at: null,
        },
      });
      await prisma.church.update({
        where: { id: church.id },
        data: { church_members: memberCount },
      });
      console.log(`  ✅ ${churchName}: ${memberCount} members`);
    }

    // Step 9: Verify all CHURCH_ADMIN users have memberships
    console.log(
      '\n📝 Step 9: Verifying all CHURCH_ADMIN users have memberships...',
    );
    const churchAdmins = await prisma.user.findMany({
      where: {
        type: 'CHURCH_ADMIN',
        status: UserStatus.ACTIVE,
      },
      include: {
        church_memberships: true,
      },
    });

    for (const admin of churchAdmins) {
      if (admin.church_memberships.length === 0) {
        console.log(`  ⚠️ Admin ${admin.email} has no church membership!`);

        const church = await prisma.church.findFirst({
          where: { church_email: admin.email },
        });

        if (church) {
          await prisma.churchMember.create({
            data: {
              id: randomUUID(),
              church_id: church.id,
              user_id: admin.id,
              church_role: 'Church Admin',
              status: ChurchMemberStatus.ACTIVE,
              joined_at: new Date(),
              approved_by: superadmin.id,
              approved_at: new Date(),
            },
          });
          console.log(`  ✅ Created missing membership for ${admin.email}`);
        }
      } else {
        console.log(
          `  ✅ ${admin.email} has ${admin.church_memberships.length} membership(s)`,
        );
      }
    }

    // Step 10: Create Ads
    console.log('\n📝 Step 10: Creating ads...');
    let adsCreated = 0;
    for (const adData of adsData) {
      const existingAd = await prisma.ad.findFirst({
        where: {
          title: adData.title,
          link: adData.link,
          deleted_at: null,
        },
      });

      if (!existingAd) {
        await prisma.ad.create({
          data: {
            id: randomUUID(),
            title: adData.title,
            description: adData.description,
            link: adData.link,
            thumbnail: adData.thumbnail,
            status: adData.status,
            placement: adData.placement,
            country: adData.country,
            city: adData.city,
            start_date: adData.start_date,
            end_date: adData.end_date,
            total_views: adData.total_views,
            total_clicks: adData.total_clicks,
            created_by_id: superadmin.id,
          },
        });
        adsCreated++;
        console.log(`  ✅ Ad created: ${adData.title}`);
      } else {
        console.log(`  ✅ Ad already exists: ${adData.title}`);
      }
    }
    console.log(
      `  📊 Total ads created/found: ${adsCreated}/${adsData.length}`,
    );

    // Step 11: Create sample ad metrics for analytics
    console.log('\n📝 Step 11: Creating sample ad metrics...');
    const ads = await prisma.ad.findMany();
    let metricsCreated = 0;

    for (const ad of ads) {
      // Create daily metrics for the last 30 days
      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const dailyViews = Math.floor(Math.random() * 500) + 100;
        const dailyClicks = Math.floor(
          dailyViews * (Math.random() * 0.2 + 0.05),
        );

        const existingMetric = await prisma.adMetrics.findUnique({
          where: {
            ad_id_date: {
              ad_id: ad.id,
              date: date,
            },
          },
        });

        if (!existingMetric) {
          await prisma.adMetrics.create({
            data: {
              id: randomUUID(),
              ad_id: ad.id,
              date: date,
              views: dailyViews,
              clicks: dailyClicks,
              updated_at: new Date(),
            },
          });
          metricsCreated++;
        }
      }
    }
    console.log(`  ✅ Created ${metricsCreated} daily metrics records`);

    // Step 12: Create sample ad metrics for analytics
    console.log('\n📝 Step 12: Creating announcements...');

    // Get churches for targeting
    const graceChurch = await prisma.church.findFirst({
      where: { church_email: 'admin@gracechurch.org' },
    });
    const faithChurch = await prisma.church.findFirst({
      where: { church_email: 'admin@faithassembly.org' },
    });

    // Get super admin user
    const superAdminUser = await prisma.user.findFirst({
      where: { email: appConfig().defaultUser.system.email },
    });

    // Get church admin users
    const graceChurchAdmin = await prisma.user.findFirst({
      where: { email: 'admin@gracechurch.org' },
    });
    const faithChurchAdmin = await prisma.user.findFirst({
      where: { email: 'admin@faithassembly.org' },
    });

    const announcementsData = [
      {
        title: 'Platform Maintenance — Feb 15',
        message:
          'Scheduled maintenance on Feb 15 from 2–4 AM EST. The platform will be temporarily unavailable during this time.',
        status: 'PUBLISHED',
        audience: 'ALL_USERS',
        target_church_ids: [],
        start_date: new Date('2025-02-08T00:00:00Z'),
        end_date: new Date('2025-02-15T23:59:59Z'),
        created_by_id: superAdminUser?.id,
      },
      {
        title: 'New Feature: Helper Assignment in Portfolio',
        message:
          'Pros can now manage helper assignments from their portfolio page. Check out the new feature today!',
        status: 'PUBLISHED',
        audience: 'ALL_USERS',
        target_church_ids: [],
        start_date: new Date('2025-02-06T00:00:00Z'),
        end_date: new Date('2025-03-06T23:59:59Z'),
        created_by_id: superAdminUser?.id,
      },
      {
        title: 'Verify Your Church Email Domain',
        message:
          'All churches must re-verify their email domain by March 1. Please update your domain settings in the church dashboard.',
        status: 'PUBLISHED',
        audience: 'CHURCH_ADMINS_ONLY',
        target_church_ids: [],
        start_date: new Date('2025-02-03T00:00:00Z'),
        end_date: new Date('2025-03-01T23:59:59Z'),
        created_by_id: superAdminUser?.id,
      },
      {
        title: 'Grace Church Christmas Service',
        message:
          'Join us for Christmas Eve service at 7 PM. Special music and candlelight ceremony.',
        status: 'PUBLISHED',
        audience: 'ALL_USERS',
        target_church_ids: graceChurch ? [graceChurch.id] : [],
        start_date: new Date('2025-12-20T00:00:00Z'),
        end_date: new Date('2025-12-25T23:59:59Z'),
        created_by_id: graceChurchAdmin?.id,
      },
      {
        title: 'Easter Sunday Celebration',
        message:
          'Celebrate Easter Sunday with us at 10 AM. Sunrise service at 6 AM followed by breakfast.',
        status: 'PUBLISHED',
        audience: 'ALL_USERS',
        target_church_ids: graceChurch ? [graceChurch.id] : [],
        start_date: new Date('2025-04-01T00:00:00Z'),
        end_date: new Date('2025-04-09T23:59:59Z'),
        created_by_id: graceChurchAdmin?.id,
      },
      {
        title: 'Faith Assembly Church Revival',
        message:
          'Join our 3-day revival event with special guest speakers. All are welcome!',
        status: 'PUBLISHED',
        audience: 'ALL_USERS',
        target_church_ids: faithChurch ? [faithChurch.id] : [],
        start_date: new Date('2025-03-10T00:00:00Z'),
        end_date: new Date('2025-03-13T23:59:59Z'),
        created_by_id: faithChurchAdmin?.id,
      },
      {
        title: 'New Admin Training Session',
        message:
          'Training for church admins on new platform features. Register by Feb 20.',
        status: 'PUBLISHED',
        audience: 'CHURCH_ADMINS_ONLY',
        target_church_ids: [],
        start_date: new Date('2025-02-15T00:00:00Z'),
        end_date: new Date('2025-02-28T23:59:59Z'),
        created_by_id: superAdminUser?.id,
      },
      {
        title: 'Year-End Giving Campaign',
        message:
          'Help us reach our year-end giving goal. Every donation makes a difference!',
        status: 'PUBLISHED',
        audience: 'ALL_USERS',
        target_church_ids: [],
        start_date: new Date('2025-12-01T00:00:00Z'),
        end_date: new Date('2025-12-31T23:59:59Z'),
        created_by_id: superAdminUser?.id,
      },
      {
        title: 'System Security Update',
        message:
          'Important security update will be applied on March 5 at 3 AM EST. Expect 1 hour downtime.',
        status: 'PUBLISHED',
        audience: 'SUPER_ADMINS_ONLY',
        target_church_ids: [],
        start_date: new Date('2025-03-01T00:00:00Z'),
        end_date: new Date('2025-03-05T23:59:59Z'),
        created_by_id: superAdminUser?.id,
      },
      {
        title: 'Draft: New Member Onboarding Guide',
        message:
          'Draft announcement - New member onboarding guide coming soon. Still in review.',
        status: 'UNPUBLISHED',
        audience: 'ALL_USERS',
        target_church_ids: [],
        start_date: new Date('2025-02-20T00:00:00Z'),
        end_date: new Date('2025-03-20T23:59:59Z'),
        created_by_id: superAdminUser?.id,
      },
    ];

    let announcementsCreated = 0;
    for (const announcementData of announcementsData) {
      if (!announcementData.created_by_id) {
        console.log(
          `  ⚠️ Skipping announcement "${announcementData.title}" - creator not found`,
        );
        continue;
      }

      const existingAnnouncement = await prisma.announcement.findFirst({
        where: {
          title: announcementData.title,
          created_by_id: announcementData.created_by_id,
          deleted_at: null,
        },
      });

      if (!existingAnnouncement) {
        await prisma.announcement.create({
          data: {
            id: randomUUID(),
            title: announcementData.title,
            message: announcementData.message,
            status: announcementData.status as any,
            audience: announcementData.audience as any,
            target_church_ids: announcementData.target_church_ids,
            start_date: announcementData.start_date,
            end_date: announcementData.end_date,
            created_by_id: announcementData.created_by_id,
          },
        });
        announcementsCreated++;
        console.log(`  ✅ Announcement created: ${announcementData.title}`);
      } else {
        console.log(
          `  ✅ Announcement already exists: ${announcementData.title}`,
        );
      }
    }
    console.log(
      `  📊 Total announcements created/found: ${announcementsCreated}/${announcementsData.length}`,
    );

    // Step 13: Display Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SEEDING SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Superadmin: ${superadminData.email}`);
    console.log(`✅ Roles created/found: ${rolesData.length}`);
    console.log(`✅ Permissions created/found: ${permissionsData.length}`);
    console.log(`✅ Role assignment rules: ${roleAssignmentRules.length}`);
    console.log(`✅ Churches created/found: ${churchesData.length}`);

    const totalUsers = await prisma.user.count();
    console.log(`✅ Total users: ${totalUsers}`);

    const totalMemberships = await prisma.churchMember.count();
    console.log(`✅ Church memberships: ${totalMemberships}`);

    const totalRoleAssignments = await prisma.roleUser.count();
    console.log(`✅ Role assignments: ${totalRoleAssignments}`);

    const totalAds = await prisma.ad.count();
    console.log(`✅ Total ads: ${totalAds}`);

    const totalAdViews = await prisma.adView.count();
    console.log(`✅ Total ad views tracked: ${totalAdViews}`);

    const totalAdClicks = await prisma.adClick.count();
    console.log(`✅ Total ad clicks tracked: ${totalAdClicks}`);

    const totalAdMetrics = await prisma.adMetrics.count();
    console.log(`✅ Total ad metric records: ${totalAdMetrics}`);

    // Verify data integrity
    const adminsWithoutMembership = await prisma.user.count({
      where: {
        type: 'CHURCH_ADMIN',
        status: UserStatus.ACTIVE,
        church_memberships: {
          none: {},
        },
      },
    });

    if (adminsWithoutMembership > 0) {
      console.log(
        `\n⚠️ WARNING: ${adminsWithoutMembership} CHURCH_ADMIN(s) without membership!`,
      );
    } else {
      console.log(`\n✅ All CHURCH_ADMIN users have valid church memberships`);
    }

    console.log('\n🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
