import {
  PrismaClient,
  UserStatus,
  ChurchMemberStatus,
  AdStatus,
  AdPlacement,
  ReactType,
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
    placement: AdPlacement.CHURCH_FEED,
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

// Church Posts Data
const churchPostsData = [
  {
    content:
      'Amazing worship service this Sunday! Thank you to everyone who joined us.',
    image: 'posts/sunday-service.jpg',
  },
  {
    content:
      'Join us for our midweek Bible study every Wednesday at 7 PM. We are currently studying the book of Psalms.',
    image: 'posts/bible-study.jpg',
  },
  {
    content:
      'Our community outreach program served over 200 families this month. Glory to God!',
    image: 'posts/outreach.jpg',
  },
  {
    content:
      'Please keep our missionary team in your prayers as they travel to serve in South America.',
    image: null,
  },
  {
    content:
      'Welcome to all our new members! Orientation will be held this Saturday at 10 AM.',
    image: 'posts/new-members.jpg',
  },
];

// Church Comments Data
const churchCommentsData = [
  { content: 'What a blessing! Thank you for sharing.', image: null },
  { content: 'Amen! 🙏', image: null },
  { content: 'I will definitely be there!', image: null },
  { content: 'This is wonderful news!', image: null },
  { content: 'God is good all the time!', image: 'comments/praise.jpg' },
];

// Comment Replies Data
const commentRepliesData = [
  { content: 'Yes, God is good!', image: null },
  { content: 'Looking forward to it!', image: null },
  { content: 'Thank you for organizing this.', image: null },
];

async function main() {
  console.log('🌱 Starting database seeding...');
  console.log('='.repeat(60));

  try {
    // Step 1: Create Superadmin User
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

    // Step 6: Create Churches AND Church Admin Users
    console.log('\n📝 Step 6: Creating churches and church admin users...');
    const createdChurches = new Map<string, any>();
    const createdChurchMembers = new Map<string, any>();
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
        const result = await prisma.$transaction(async (tx) => {
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

          const churchMember = await tx.churchMember.create({
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

          await tx.roleUser.create({
            data: {
              role_id: churchAdminRole.id,
              user_id: newAdminUser.id,
              churchId: newChurch.id,
              assigned_by_id: superadmin.id,
            },
          });

          await tx.church.update({
            where: { id: newChurch.id },
            data: { church_members: 1, user_id: newAdminUser.id },
          });

          return { church: newChurch, adminUser: newAdminUser, churchMember };
        });

        church = result.church;
        adminUser = result.adminUser;
        createdChurchMembers.set(churchData.name, new Map());
        createdChurchMembers
          .get(churchData.name)
          .set(adminUser.id, result.churchMember);
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

            const result = await prisma.$transaction(async (tx) => {
              const churchMember = await tx.churchMember.create({
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

              return churchMember;
            });

            if (!createdChurchMembers.get(churchData.name)) {
              createdChurchMembers.set(churchData.name, new Map());
            }
            createdChurchMembers.get(churchData.name).set(adminUser.id, result);
            console.log(
              `  ✅ Created missing membership for ${adminUser.email}`,
            );
          } else {
            console.log(`  ✅ Admin already has church membership`);
            if (!createdChurchMembers.get(churchData.name)) {
              createdChurchMembers.set(churchData.name, new Map());
            }
            createdChurchMembers
              .get(churchData.name)
              .set(adminUser.id, adminUser.church_memberships[0]);
          }
        } else {
          console.log(`  ⚠️ Admin user not found for ${churchData.email}`);
        }
      }
      createdChurches.set(churchData.name, church);
    }

    // Step 7: Create Additional Church Users
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

      if (!createdChurchMembers.get(churchName)) {
        createdChurchMembers.set(churchName, new Map());
      }

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

        let churchMember;

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

        const existingMembership = await prisma.churchMember.findFirst({
          where: {
            church_id: church.id,
            user_id: user.id,
          },
        });

        if (!existingMembership) {
          churchMember = await prisma.churchMember.create({
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
          churchMember = existingMembership;
          console.log(`  ✅ Church membership already exists`);
        }

        createdChurchMembers.get(churchName).set(user.id, churchMember);

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
          const churchMember = await prisma.churchMember.create({
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

          const churchName = church.church_name;
          if (!createdChurchMembers.get(churchName)) {
            createdChurchMembers.set(churchName, new Map());
          }
          createdChurchMembers.get(churchName).set(admin.id, churchMember);
        }
      } else {
        console.log(
          `  ✅ ${admin.email} has ${admin.church_memberships.length} membership(s)`,
        );
      }
    }

    // Step 10: Create Church Posts, Comments, and Reacts
    console.log('\n📝 Step 10: Creating church posts, comments, and reacts...');

    for (const [churchName, church] of createdChurches) {
      const churchMembersMap = createdChurchMembers.get(churchName);
      if (!churchMembersMap || churchMembersMap.size === 0) {
        console.log(
          `  ⚠️ No members found for ${churchName}, skipping posts...`,
        );
        continue;
      }

      const memberIds = Array.from(churchMembersMap.keys());
      console.log(`\n  📝 Creating content for ${churchName}:`);

      // Create posts
      for (let i = 0; i < churchPostsData.length; i++) {
        const postData = churchPostsData[i];
        const randomMemberId =
          memberIds[Math.floor(Math.random() * memberIds.length)];
        const churchMember = churchMembersMap.get(randomMemberId);

        if (!churchMember) continue;

        const existingPost = await prisma.churchPost.findFirst({
          where: {
            church_id: church.id,
            deleted_at: null,
          },
        });

        if (!existingPost) {
          const post = await prisma.churchPost.create({
            data: {
              id: randomUUID(),
              content: postData.content,
              image: postData.image,
              church_id: church.id,
              church_member_id: churchMember.id,
            },
          });
          console.log(`    ✅ Post created: ${postData.content}`);

          // Add comments to each post
          for (let j = 0; j < Math.min(3, churchCommentsData.length); j++) {
            const commentData = churchCommentsData[j];
            const randomCommenterId =
              memberIds[Math.floor(Math.random() * memberIds.length)];
            const commenter = churchMembersMap.get(randomCommenterId);

            if (!commenter) continue;

            const comment = await prisma.churchComment.create({
              data: {
                id: randomUUID(),
                content: commentData.content,
                image: commentData.image,
                post_id: post.id,
                church_member_id: commenter.id,
              },
            });
            console.log(
              `      ✅ Comment added: "${commentData.content.substring(0, 30)}..."`,
            );

            // Add replies to some comments
            if (j < commentRepliesData.length) {
              const replyData = commentRepliesData[j];
              const randomReplierId =
                memberIds[Math.floor(Math.random() * memberIds.length)];
              const replier = churchMembersMap.get(randomReplierId);

              if (replier) {
                await prisma.churchCommentReply.create({
                  data: {
                    id: randomUUID(),
                    content: replyData.content,
                    image: replyData.image,
                    comment_id: comment.id,
                    church_member_id: replier.id,
                  },
                });
                console.log(`        ✅ Reply added: "${replyData.content}"`);
              }
            }
          }

          // Add reacts to posts
          const uniqueReactMembers = new Set();
          const numberOfReacts = Math.min(5, memberIds.length);

          for (let k = 0; k < numberOfReacts; k++) {
            let reactMemberId;
            do {
              reactMemberId =
                memberIds[Math.floor(Math.random() * memberIds.length)];
            } while (
              uniqueReactMembers.has(reactMemberId) &&
              uniqueReactMembers.size < memberIds.length
            );

            uniqueReactMembers.add(reactMemberId);
            const reactor = churchMembersMap.get(reactMemberId);

            if (reactor) {
              const reactType =
                Math.random() > 0.5 ? ReactType.LIKE : ReactType.LOVE;

              const existingReact = await prisma.churchPostReact.findUnique({
                where: {
                  post_id_church_member_id: {
                    post_id: post.id,
                    church_member_id: reactor.id,
                  },
                },
              });

              if (!existingReact) {
                await prisma.churchPostReact.create({
                  data: {
                    id: randomUUID(),
                    react_type: reactType,
                    post_id: post.id,
                    church_member_id: reactor.id,
                  },
                });
                console.log(
                  `        ✅ React added: ${reactType} from ${reactor.id.substring(0, 8)}`,
                );
              }
            }
          }
        } else {
          console.log(`    ✅ Post already exists: ${postData.content}`);
        }
      }
    }

    // Step 11: Create Ads
    console.log('\n📝 Step 11: Creating ads...');
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

    // Step 12: Create sample ad metrics
    console.log('\n📝 Step 12: Creating sample ad metrics...');
    const ads = await prisma.ad.findMany();
    let metricsCreated = 0;

    for (const ad of ads) {
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

    // Step 13: Create announcements
    console.log('\n📝 Step 13: Creating announcements...');

    const graceChurch = await prisma.church.findFirst({
      where: { church_email: 'admin@gracechurch.org' },
    });
    const faithChurch = await prisma.church.findFirst({
      where: { church_email: 'admin@faithassembly.org' },
    });

    const superAdminUser = await prisma.user.findFirst({
      where: { email: appConfig().defaultUser.system.email },
    });

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

    // Step 14: Create Audit Logs (after announcements)
    console.log('\n📝 Step 14: Creating audit logs...');

    // Get all users for actor references
    const allUsers = await prisma.user.findMany({
      include: {
        churchUser: true,
        church_memberships: {
          include: { church: true },
        },
      },
    });

    // Helper function to safely get actor_id
    const getActorId = (user: any, actorName: string) => {
      if (user?.id) return user.id;
      console.log(`  ⚠️ Warning: ${actorName} user not found, using fallback`);
      return null;
    };

    // Helper function to safely get church_id
    const getChurchId = (church: any, churchName: string) => {
      if (church?.id) return church.id;
      console.log(`  ⚠️ Warning: ${churchName} church not found`);
      return null;
    };

    // Sample Audit Logs Data
    const auditLogsData = [
      // ============================================
      // SUPER ADMIN ACTIONS
      // ============================================
      {
        actor: 'Super Admin',
        action: 'Deleted Permission',
        target: 'Manage Churches',
        church: '--',
        actor_id: getActorId(superAdminUser, 'Super Admin'),
        actor_type: 'SUPER_ADMIN',
        church_id: null,
        created_at: new Date('2026-02-14T17:08:25.000Z'),
      },
      {
        actor: 'Super Admin',
        action: 'Deleted Permission',
        target: 'James Cole — Grace NY',
        church: 'Grace Community Church',
        actor_id: getActorId(superAdminUser, 'Super Admin'),
        actor_type: 'SUPER_ADMIN',
        church_id: getChurchId(graceChurch, 'Grace Community Church'),
        created_at: new Date('2025-02-11T09:14:00.000Z'),
      },
      {
        actor: 'Super Admin',
        action: 'Deleted Permission',
        target: 'Henry Park',
        church: 'Hope Chapel',
        actor_id: getActorId(superAdminUser, 'Super Admin'),
        actor_type: 'SUPER_ADMIN',
        church_id: null,
        created_at: new Date('2025-02-11T09:14:00.000Z'),
      },
      {
        actor: 'Super Admin',
        action: 'Deleted Permission',
        target: 'Bible Study App',
        church: '--',
        actor_id: getActorId(superAdminUser, 'Super Admin'),
        actor_type: 'SUPER_ADMIN',
        church_id: null,
        created_at: new Date('2025-02-11T09:14:00.000Z'),
      },
      {
        actor: 'Super Admin',
        action: 'Deleted Permission',
        target: 'Platform Maintenance',
        church: '--',
        actor_id: getActorId(superAdminUser, 'Super Admin'),
        actor_type: 'SUPER_ADMIN',
        church_id: null,
        created_at: new Date('2025-02-11T09:14:00.000Z'),
      },
      {
        actor: 'Super Admin',
        action: 'Deleted Permission',
        target: 'Hope Chapel',
        church: 'Hope Chapel',
        actor_id: getActorId(superAdminUser, 'Super Admin'),
        actor_type: 'SUPER_ADMIN',
        church_id: null,
        created_at: new Date('2025-02-11T09:14:00.000Z'),
      },
      {
        actor: 'Super Admin',
        action: 'Deleted Permission',
        target: 'Amara Diallo → Helper',
        church: '--',
        actor_id: getActorId(superAdminUser, 'Super Admin'),
        actor_type: 'SUPER_ADMIN',
        church_id: null,
        created_at: new Date('2025-02-11T09:14:00.000Z'),
      },
      {
        actor: 'Super Admin',
        action: 'Deleted Permission',
        target: 'Lisa Chen',
        church: '--',
        actor_id: getActorId(superAdminUser, 'Super Admin'),
        actor_type: 'SUPER_ADMIN',
        church_id: null,
        created_at: new Date('2025-02-11T09:14:00.000Z'),
      },
      {
        actor: 'Super Admin',
        action: 'Assigned Role',
        target: 'John Smith → Church Admin',
        church: 'Grace Community Church',
        actor_id: getActorId(superAdminUser, 'Super Admin'),
        actor_type: 'SUPER_ADMIN',
        church_id: getChurchId(graceChurch, 'Grace Community Church'),
        created_at: new Date('2025-02-10T10:30:00.000Z'),
      },
      {
        actor: 'Super Admin',
        action: 'Assigned Role',
        target: 'Michael Johnson → Church Admin',
        church: 'Faith Assembly Church',
        actor_id: getActorId(superAdminUser, 'Super Admin'),
        actor_type: 'SUPER_ADMIN',
        church_id: getChurchId(faithChurch, 'Faith Assembly Church'),
        created_at: new Date('2025-02-09T14:20:00.000Z'),
      },
      {
        actor: 'Super Admin',
        action: 'Created Church',
        target: 'Grace Community Church',
        church: '--',
        actor_id: getActorId(superAdminUser, 'Super Admin'),
        actor_type: 'SUPER_ADMIN',
        church_id: null,
        created_at: new Date('2025-02-01T09:00:00.000Z'),
      },
      {
        actor: 'Super Admin',
        action: 'Created Church',
        target: 'Faith Assembly Church',
        church: '--',
        actor_id: getActorId(superAdminUser, 'Super Admin'),
        actor_type: 'SUPER_ADMIN',
        church_id: null,
        created_at: new Date('2025-02-01T10:15:00.000Z'),
      },
      {
        actor: 'Super Admin',
        action: 'Activated User',
        target: 'pastor@gracechurch.org',
        church: 'Grace Community Church',
        actor_id: getActorId(superAdminUser, 'Super Admin'),
        actor_type: 'SUPER_ADMIN',
        church_id: getChurchId(graceChurch, 'Grace Community Church'),
        created_at: new Date('2025-02-05T11:45:00.000Z'),
      },
      {
        actor: 'Super Admin',
        action: 'Suspended User',
        target: 'suspended_user@example.com',
        church: '--',
        actor_id: getActorId(superAdminUser, 'Super Admin'),
        actor_type: 'SUPER_ADMIN',
        church_id: null,
        created_at: new Date('2025-02-08T16:30:00.000Z'),
      },
      {
        actor: 'Super Admin',
        action: 'Created Announcement',
        target: 'Platform Maintenance — Feb 15',
        church: '--',
        actor_id: getActorId(superAdminUser, 'Super Admin'),
        actor_type: 'SUPER_ADMIN',
        church_id: null,
        created_at: new Date('2025-02-08T12:00:00.000Z'),
      },
      {
        actor: 'Super Admin',
        action: 'Created Ad',
        target: 'Bible Study App – DigiSanctuary',
        church: '--',
        actor_id: getActorId(superAdminUser, 'Super Admin'),
        actor_type: 'SUPER_ADMIN',
        church_id: null,
        created_at: new Date('2025-01-10T08:00:00.000Z'),
      },
      {
        actor: 'Super Admin',
        action: 'Updated Permission',
        target: 'manage_church_members',
        church: '--',
        actor_id: getActorId(superAdminUser, 'Super Admin'),
        actor_type: 'SUPER_ADMIN',
        church_id: null,
        created_at: new Date('2025-02-12T15:20:00.000Z'),
      },
      {
        actor: 'Super Admin',
        action: 'Exported Audit Logs',
        target: 'audit-logs-2025-02-12.csv',
        church: '--',
        actor_id: getActorId(superAdminUser, 'Super Admin'),
        actor_type: 'SUPER_ADMIN',
        church_id: null,
        created_at: new Date('2025-02-12T18:00:00.000Z'),
      },
      {
        actor: 'Super Admin',
        action: 'Created Role',
        target: 'Worship Leader',
        church: '--',
        actor_id: getActorId(superAdminUser, 'Super Admin'),
        actor_type: 'SUPER_ADMIN',
        church_id: null,
        created_at: new Date('2025-02-13T11:00:00.000Z'),
      },
      {
        actor: 'Super Admin',
        action: 'Updated System Settings',
        target: 'Email notification preferences',
        church: '--',
        actor_id: getActorId(superAdminUser, 'Super Admin'),
        actor_type: 'SUPER_ADMIN',
        church_id: null,
        created_at: new Date('2025-02-11T14:30:00.000Z'),
      },

      // ============================================
      // CHURCH ADMIN ACTIONS - Grace Community Church
      // ============================================
      {
        actor: 'John Smith',
        action: 'Added Church Member',
        target: 'pastor@gracechurch.org → Pastor',
        church: 'Grace Community Church',
        actor_id: getActorId(
          graceChurchAdmin,
          'John Smith (Grace Church Admin)',
        ),
        actor_type: 'CHURCH_ADMIN',
        church_id: getChurchId(graceChurch, 'Grace Community Church'),
        created_at: new Date('2025-02-15T09:30:00.000Z'),
      },
      {
        actor: 'John Smith',
        action: 'Assigned Role',
        target: 'pastor@gracechurch.org → Pastor',
        church: 'Grace Community Church',
        actor_id: getActorId(
          graceChurchAdmin,
          'John Smith (Grace Church Admin)',
        ),
        actor_type: 'CHURCH_ADMIN',
        church_id: getChurchId(graceChurch, 'Grace Community Church'),
        created_at: new Date('2025-02-15T09:35:00.000Z'),
      },
      {
        actor: 'John Smith',
        action: 'Added Church Member',
        target: 'helper@gracechurch.org → Helper',
        church: 'Grace Community Church',
        actor_id: getActorId(
          graceChurchAdmin,
          'John Smith (Grace Church Admin)',
        ),
        actor_type: 'CHURCH_ADMIN',
        church_id: getChurchId(graceChurch, 'Grace Community Church'),
        created_at: new Date('2025-02-16T10:00:00.000Z'),
      },
      {
        actor: 'John Smith',
        action: 'Assigned Role',
        target: 'helper@gracechurch.org → Helper',
        church: 'Grace Community Church',
        actor_id: getActorId(
          graceChurchAdmin,
          'John Smith (Grace Church Admin)',
        ),
        actor_type: 'CHURCH_ADMIN',
        church_id: getChurchId(graceChurch, 'Grace Community Church'),
        created_at: new Date('2025-02-16T10:05:00.000Z'),
      },
      {
        actor: 'John Smith',
        action: 'Created Church Post',
        target: 'Amazing worship service this Sunday!',
        church: 'Grace Community Church',
        actor_id: getActorId(
          graceChurchAdmin,
          'John Smith (Grace Church Admin)',
        ),
        actor_type: 'CHURCH_ADMIN',
        church_id: getChurchId(graceChurch, 'Grace Community Church'),
        created_at: new Date('2025-02-14T14:00:00.000Z'),
      },
      {
        actor: 'John Smith',
        action: 'Updated Church Settings',
        target: 'Church description and service times',
        church: 'Grace Community Church',
        actor_id: getActorId(
          graceChurchAdmin,
          'John Smith (Grace Church Admin)',
        ),
        actor_type: 'CHURCH_ADMIN',
        church_id: getChurchId(graceChurch, 'Grace Community Church'),
        created_at: new Date('2025-02-10T11:20:00.000Z'),
      },
      {
        actor: 'John Smith',
        action: 'Created Announcement',
        target: 'Grace Church Christmas Service',
        church: 'Grace Community Church',
        actor_id: getActorId(
          graceChurchAdmin,
          'John Smith (Grace Church Admin)',
        ),
        actor_type: 'CHURCH_ADMIN',
        church_id: getChurchId(graceChurch, 'Grace Community Church'),
        created_at: new Date('2025-12-20T09:00:00.000Z'),
      },
      {
        actor: 'John Smith',
        action: 'Removed Church Member',
        target: 'inactive_member@gracechurch.org',
        church: 'Grace Community Church',
        actor_id: getActorId(
          graceChurchAdmin,
          'John Smith (Grace Church Admin)',
        ),
        actor_type: 'CHURCH_ADMIN',
        church_id: getChurchId(graceChurch, 'Grace Community Church'),
        created_at: new Date('2025-02-18T13:45:00.000Z'),
      },
      {
        actor: 'John Smith',
        action: 'Updated Member Role',
        target: 'member@gracechurch.org → Church Leader',
        church: 'Grace Community Church',
        actor_id: getActorId(
          graceChurchAdmin,
          'John Smith (Grace Church Admin)',
        ),
        actor_type: 'CHURCH_ADMIN',
        church_id: getChurchId(graceChurch, 'Grace Community Church'),
        created_at: new Date('2025-02-17T15:30:00.000Z'),
      },
      {
        actor: 'John Smith',
        action: 'Deleted Church Post',
        target: 'Outdated event announcement',
        church: 'Grace Community Church',
        actor_id: getActorId(
          graceChurchAdmin,
          'John Smith (Grace Church Admin)',
        ),
        actor_type: 'CHURCH_ADMIN',
        church_id: getChurchId(graceChurch, 'Grace Community Church'),
        created_at: new Date('2025-02-13T16:00:00.000Z'),
      },
      {
        actor: 'John Smith',
        action: 'Approved Church Member',
        target: 'new_member@gracechurch.org',
        church: 'Grace Community Church',
        actor_id: getActorId(
          graceChurchAdmin,
          'John Smith (Grace Church Admin)',
        ),
        actor_type: 'CHURCH_ADMIN',
        church_id: getChurchId(graceChurch, 'Grace Community Church'),
        created_at: new Date('2025-02-12T09:00:00.000Z'),
      },
      {
        actor: 'John Smith',
        action: 'Exported Member List',
        target: 'grace-church-members.csv',
        church: 'Grace Community Church',
        actor_id: getActorId(
          graceChurchAdmin,
          'John Smith (Grace Church Admin)',
        ),
        actor_type: 'CHURCH_ADMIN',
        church_id: getChurchId(graceChurch, 'Grace Community Church'),
        created_at: new Date('2025-02-19T16:20:00.000Z'),
      },

      // ============================================
      // CHURCH ADMIN ACTIONS - Faith Assembly Church
      // ============================================
      {
        actor: 'Michael Johnson',
        action: 'Added Church Member',
        target: 'pastor@faithassembly.org → Pastor',
        church: 'Faith Assembly Church',
        actor_id: getActorId(
          faithChurchAdmin,
          'Michael Johnson (Faith Church Admin)',
        ),
        actor_type: 'CHURCH_ADMIN',
        church_id: getChurchId(faithChurch, 'Faith Assembly Church'),
        created_at: new Date('2025-02-14T11:00:00.000Z'),
      },
      {
        actor: 'Michael Johnson',
        action: 'Assigned Role',
        target: 'pastor@faithassembly.org → Pastor',
        church: 'Faith Assembly Church',
        actor_id: getActorId(
          faithChurchAdmin,
          'Michael Johnson (Faith Church Admin)',
        ),
        actor_type: 'CHURCH_ADMIN',
        church_id: getChurchId(faithChurch, 'Faith Assembly Church'),
        created_at: new Date('2025-02-14T11:05:00.000Z'),
      },
      {
        actor: 'Michael Johnson',
        action: 'Added Church Member',
        target: 'helper@faithassembly.org → Helper',
        church: 'Faith Assembly Church',
        actor_id: getActorId(
          faithChurchAdmin,
          'Michael Johnson (Faith Church Admin)',
        ),
        actor_type: 'CHURCH_ADMIN',
        church_id: getChurchId(faithChurch, 'Faith Assembly Church'),
        created_at: new Date('2025-02-15T09:00:00.000Z'),
      },
      {
        actor: 'Michael Johnson',
        action: 'Assigned Role',
        target: 'member@faithassembly.org → Church Member',
        church: 'Faith Assembly Church',
        actor_id: getActorId(
          faithChurchAdmin,
          'Michael Johnson (Faith Church Admin)',
        ),
        actor_type: 'CHURCH_ADMIN',
        church_id: getChurchId(faithChurch, 'Faith Assembly Church'),
        created_at: new Date('2025-02-16T10:30:00.000Z'),
      },
      {
        actor: 'Michael Johnson',
        action: 'Created Church Post',
        target: 'Faith Assembly Church Revival',
        church: 'Faith Assembly Church',
        actor_id: getActorId(
          faithChurchAdmin,
          'Michael Johnson (Faith Church Admin)',
        ),
        actor_type: 'CHURCH_ADMIN',
        church_id: getChurchId(faithChurch, 'Faith Assembly Church'),
        created_at: new Date('2025-02-12T15:00:00.000Z'),
      },
      {
        actor: 'Michael Johnson',
        action: 'Updated Church Settings',
        target: 'Service times and location',
        church: 'Faith Assembly Church',
        actor_id: getActorId(
          faithChurchAdmin,
          'Michael Johnson (Faith Church Admin)',
        ),
        actor_type: 'CHURCH_ADMIN',
        church_id: getChurchId(faithChurch, 'Faith Assembly Church'),
        created_at: new Date('2025-02-11T13:45:00.000Z'),
      },
      {
        actor: 'Michael Johnson',
        action: 'Created Announcement',
        target: 'Faith Assembly Church Revival',
        church: 'Faith Assembly Church',
        actor_id: getActorId(
          faithChurchAdmin,
          'Michael Johnson (Faith Church Admin)',
        ),
        actor_type: 'CHURCH_ADMIN',
        church_id: getChurchId(faithChurch, 'Faith Assembly Church'),
        created_at: new Date('2025-03-10T08:30:00.000Z'),
      },
      {
        actor: 'Michael Johnson',
        action: 'Exported Member List',
        target: 'faith-church-members.csv',
        church: 'Faith Assembly Church',
        actor_id: getActorId(
          faithChurchAdmin,
          'Michael Johnson (Faith Church Admin)',
        ),
        actor_type: 'CHURCH_ADMIN',
        church_id: getChurchId(faithChurch, 'Faith Assembly Church'),
        created_at: new Date('2025-02-15T14:20:00.000Z'),
      },
      {
        actor: 'Michael Johnson',
        action: 'Removed Church Member',
        target: 'inactive@faithassembly.org',
        church: 'Faith Assembly Church',
        actor_id: getActorId(
          faithChurchAdmin,
          'Michael Johnson (Faith Church Admin)',
        ),
        actor_type: 'CHURCH_ADMIN',
        church_id: getChurchId(faithChurch, 'Faith Assembly Church'),
        created_at: new Date('2025-02-17T11:00:00.000Z'),
      },
      {
        actor: 'Michael Johnson',
        action: 'Updated Church Banner',
        target: 'New worship banner image',
        church: 'Faith Assembly Church',
        actor_id: getActorId(
          faithChurchAdmin,
          'Michael Johnson (Faith Church Admin)',
        ),
        actor_type: 'CHURCH_ADMIN',
        church_id: getChurchId(faithChurch, 'Faith Assembly Church'),
        created_at: new Date('2025-02-13T10:15:00.000Z'),
      },

      // ============================================
      // REGULAR USER ACTIONS
      // ============================================
      {
        actor: 'Father Michael Anderson',
        action: 'Created Post',
        target: 'Sunday sermon notes',
        church: 'Grace Community Church',
        actor_id: allUsers.find((u) => u.email === 'pastor@gracechurch.org')
          ?.id,
        actor_type: 'USER',
        church_id: getChurchId(graceChurch, 'Grace Community Church'),
        created_at: new Date('2025-02-17T08:00:00.000Z'),
      },
      {
        actor: 'David Kim',
        action: 'Commented on Post',
        target: 'Great message!',
        church: 'Grace Community Church',
        actor_id: allUsers.find((u) => u.email === 'helper@gracechurch.org')
          ?.id,
        actor_type: 'USER',
        church_id: getChurchId(graceChurch, 'Grace Community Church'),
        created_at: new Date('2025-02-17T09:15:00.000Z'),
      },
      {
        actor: 'Emily Rodriguez',
        action: 'Reacted to Post',
        target: 'Liked the announcement',
        church: 'Grace Community Church',
        actor_id: allUsers.find((u) => u.email === 'member@gracechurch.org')
          ?.id,
        actor_type: 'USER',
        church_id: getChurchId(graceChurch, 'Grace Community Church'),
        created_at: new Date('2025-02-17T09:30:00.000Z'),
      },
    ];

    // Insert audit logs
    let auditLogsCreated = 0;
    for (const logData of auditLogsData) {
      // Skip if required actor_id is missing
      if (logData.actor_id === undefined || logData.actor_id === null) {
        if (logData.actor !== 'Super Admin' || !superAdminUser) {
          console.log(
            `  ⚠️ Skipping audit log "${logData.action}" - actor not found`,
          );
          continue;
        }
      }

      const existingLog = await prisma.auditLog.findFirst({
        where: {
          actor: logData.actor,
          action: logData.action,
          target: logData.target,
          created_at: logData.created_at,
        },
      });

      if (!existingLog) {
        await prisma.auditLog.create({
          data: {
            id: randomUUID(),
            actor: logData.actor,
            action: logData.action,
            target: logData.target,
            church: logData.church,
            actor_id: logData.actor_id,
            actor_type: logData.actor_type,
            church_id: logData.church_id,
            created_at: logData.created_at,
          },
        });
        auditLogsCreated++;
      }
    }
    console.log(`  ✅ Created ${auditLogsCreated} audit log records`);

    // Display recent audit logs by type
    const superAdminLogs = await prisma.auditLog.count({
      where: { actor_type: 'SUPER_ADMIN' },
    });
    const churchAdminLogs = await prisma.auditLog.count({
      where: { actor_type: 'CHURCH_ADMIN' },
    });
    const userLogs = await prisma.auditLog.count({
      where: { actor_type: 'USER' },
    });

    console.log(`  📊 Audit logs breakdown:`);
    console.log(`     - Super Admin actions: ${superAdminLogs}`);
    console.log(`     - Church Admin actions: ${churchAdminLogs}`);
    console.log(`     - User actions: ${userLogs}`);

    // Step 15: Display Summary (update the existing summary)
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

    const totalPosts = await prisma.churchPost.count();
    console.log(`✅ Church posts: ${totalPosts}`);

    const totalComments = await prisma.churchComment.count();
    console.log(`✅ Church comments: ${totalComments}`);

    const totalReplies = await prisma.churchCommentReply.count();
    console.log(`✅ Comment replies: ${totalReplies}`);

    const totalReacts = await prisma.churchPostReact.count();
    console.log(`✅ Post reacts: ${totalReacts}`);

    const totalAds = await prisma.ad.count();
    console.log(`✅ Total ads: ${totalAds}`);

    const totalAdMetrics = await prisma.adMetrics.count();
    console.log(`✅ Total ad metric records: ${totalAdMetrics}`);

    const totalAnnouncements = await prisma.announcement.count();
    console.log(`✅ Total announcements: ${totalAnnouncements}`);

    const totalAuditLogs = await prisma.auditLog.count();
    console.log(`✅ Total audit logs: ${totalAuditLogs}`);

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
