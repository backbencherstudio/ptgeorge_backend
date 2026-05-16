import { PrismaClient } from '../prisma/generated/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import appConfig from '../src/config/app.config';

const connectionString = appConfig().database.url;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// Helper function to hash passwords
async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

// Define roles data
const rolesData = [
  {
    title: 'Church Main Admin',
    name: 'church_main_admin',
    description: 'Full control over church management',
    color: '#FF6B6B',
  },
  {
    title: 'Church Leader',
    name: 'church_leader',
    description: 'Church leadership role with limited assignment rights',
    color: '#4ECDC4',
  },
  {
    title: 'Pastor',
    name: 'pastor',
    description: 'Church pastor',
    color: '#45B7D1',
  },
  {
    title: 'Assistant Pastor',
    name: 'assistant_pastor',
    description: 'Assistant to the pastor',
    color: '#96CEB4',
  },
  {
    title: 'Background Checker',
    name: 'background_checker',
    description: 'Performs background checks',
    color: '#FFEAA7',
  },
  {
    title: 'Helper',
    name: 'helper',
    description: 'Church helper/volunteer',
    color: '#DDA0DD',
  },
  {
    title: 'Church Member',
    name: 'church_member',
    description: 'Regular church member',
    color: '#98D8C8',
  },
  {
    title: 'Verified Pros',
    name: 'verified_pros',
    description: 'Verified professional members',
    color: '#F7B731',
  },
];

// Define permissions data
const permissionsData = [
  // Role management permissions
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

  // Member management permissions
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

  // Church management permissions
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

  // Content management permissions
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

// Define role-permission assignments (which role gets which permissions)
const rolePermissionsMap = {
  church_main_admin: [
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
  church_leader: [
    'assign_role',
    'view_role_assignments',
    'view_church_members',
    'add_church_members',
    'edit_church_members',
    'view_church_settings',
    'view_content',
  ],
  pastor: [
    'assign_role',
    'view_role_assignments',
    'view_church_members',
    'add_church_members',
    'edit_church_members',
    'view_church_settings',
    'publish_content',
    'view_content',
  ],
  assistant_pastor: [
    'assign_role',
    'view_role_assignments',
    'view_church_members',
    'add_church_members',
    'view_content',
  ],
  background_checker: [
    'assign_role',
    'view_role_assignments',
    'view_church_members',
  ],
  helper: ['view_church_members', 'view_content'],
  church_member: ['view_content'],
  verified_pros: ['view_content'],
};

// Define role assignment rules (who can assign which roles)
const roleAssignmentRules = [
  // Church Main Admin can assign ALL roles
  { from_role: 'church_main_admin', to_role: 'pastor' },
  { from_role: 'church_main_admin', to_role: 'assistant_pastor' },
  { from_role: 'church_main_admin', to_role: 'church_leader' },
  { from_role: 'church_main_admin', to_role: 'background_checker' },
  { from_role: 'church_main_admin', to_role: 'helper' },
  { from_role: 'church_main_admin', to_role: 'church_member' },
  { from_role: 'church_main_admin', to_role: 'verified_pros' },

  // Church Leader can assign limited roles
  { from_role: 'church_leader', to_role: 'helper' },
  { from_role: 'church_leader', to_role: 'church_member' },

  // Pastor can assign limited roles
  { from_role: 'pastor', to_role: 'helper' },
  { from_role: 'pastor', to_role: 'church_member' },

  // Assistant Pastor can assign limited roles
  { from_role: 'assistant_pastor', to_role: 'helper' },
  { from_role: 'assistant_pastor', to_role: 'church_member' },

  // Background Checker can assign limited roles
  { from_role: 'background_checker', to_role: 'helper' },
  { from_role: 'background_checker', to_role: 'church_member' },
];

// Define church data
const churchesData = [
  {
    name: 'Grace Community Church',
    city: 'New York',
    email: 'admin@gracechurch.org',
    domain: 'gracechurch.org',
    password: 'Church@2024',
    adminName: 'John Smith',
    status: 'ACTIVE' as const,
  },
  {
    name: 'Faith Assembly Church',
    city: 'Los Angeles',
    email: 'admin@faithassembly.org',
    domain: 'faithassembly.org',
    password: 'Church@2024',
    adminName: 'Michael Johnson',
    status: 'ACTIVE' as const,
  },
];

// Define users for each church with role-based email naming
const churchUsers = {
  'Grace Community Church': [
    {
      first_name: 'John',
      last_name: 'Smith',
      email: 'church_main_admin@gracechurch.org',  // Clear role identification
      phone: '+1 212 555 0001',
      role: 'church_main_admin',
      type: 'CHURCH_ADMIN' as const,
    },
    {
      first_name: 'Father Michael',
      last_name: 'Anderson',
      email: 'pastor@gracechurch.org',  // Easy to identify as pastor
      phone: '+1 212 555 0002',
      role: 'pastor',
      type: 'USER' as const,
    },
    {
      first_name: 'Rev. Sarah',
      last_name: 'Johnson',
      email: 'assistant_pastor@gracechurch.org',  // Clear role
      phone: '+1 212 555 0003',
      role: 'assistant_pastor',
      type: 'USER' as const,
    },
    {
      first_name: 'Michael',
      last_name: 'Chen',
      email: 'church_leader@gracechurch.org',  // Role-based email
      phone: '+1 212 555 0110',
      role: 'church_leader',
      type: 'USER' as const,
    },
    {
      first_name: 'Robert',
      last_name: 'Wilson',
      email: 'background_checker@gracechurch.org',  // Role-based email
      phone: '+1 212 555 0004',
      role: 'background_checker',
      type: 'USER' as const,
    },
    {
      first_name: 'David',
      last_name: 'Kim',
      email: 'helper@gracechurch.org',  // Simple role-based email
      phone: '+1 212 555 0005',
      role: 'helper',
      type: 'USER' as const,
    },
    {
      first_name: 'Emily',
      last_name: 'Rodriguez',
      email: 'church_member@gracechurch.org',  // Clear role
      phone: '+1 212 555 0006',
      role: 'church_member',
      type: 'USER' as const,
    },
    {
      first_name: 'James',
      last_name: 'Wilson',
      email: 'verified_pros@gracechurch.org',  // Role-based email
      phone: '+1 212 555 0007',
      role: 'verified_pros',
      type: 'PRO_USER' as const,
    },
  ],
  'Faith Assembly Church': [
    {
      first_name: 'Michael',
      last_name: 'Johnson',
      email: 'church_main_admin@faithassembly.org',  // Church-specific + role
      phone: '+1 310 555 0001',
      role: 'church_main_admin',
      type: 'CHURCH_ADMIN' as const,
    },
    {
      first_name: 'Pastor David',
      last_name: 'Williams',
      email: 'pastor@faithassembly.org',  // Role-based
      phone: '+1 310 555 0002',
      role: 'pastor',
      type: 'USER' as const,
    },
    {
      first_name: 'Lisa',
      last_name: 'Brown',
      email: 'helper@faithassembly.org',  // Role-based
      phone: '+1 310 555 0003',
      role: 'helper',
      type: 'USER' as const,
    },
    {
      first_name: 'Mark',
      last_name: 'Davis',
      email: 'church_member@faithassembly.org',  // Role-based
      phone: '+1 310 555 0004',
      role: 'church_member',
      type: 'USER' as const,
    },
  ],
};

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
      status: 1,
    };

    // Check if superadmin exists
    let superadmin = await prisma.user.findUnique({
      where: { email: superadminData.email },
    });

    if (!superadmin) {
      superadmin = await prisma.user.create({
        data: {
          id: randomUUID(),
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
    const createdRoles = new Map();
    for (const role of rolesData) {
      // Check if role exists by name (since name is not unique in schema, we check by name field)
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
    const createdPermissions = new Map();
    for (const permission of permissionsData) {
      // Check if permission exists by name (name is unique in schema)
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

        // Check if assignment already exists
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

      // Check if rule already exists
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

    // Step 6: Create Churches
    console.log('\n📝 Step 6: Creating churches...');
    const createdChurches = new Map();
    for (const churchData of churchesData) {
      // Check if church exists by email (church_email is not unique in schema)
      let existingChurch = await prisma.church.findFirst({
        where: { church_email: churchData.email },
      });

      let church;
      if (!existingChurch) {
        church = await prisma.church.create({
          data: {
            id: randomUUID(),
            church_name: churchData.name,
            church_city: churchData.city,
            church_email: churchData.email,
            church_domain: churchData.domain,
            church_password: await hashPassword(churchData.password),
            church_adminname: churchData.adminName,
            status: churchData.status,
            church_members: 0,
          },
        });
        console.log(`✅ Church created: ${churchData.name}`);
      } else {
        church = existingChurch;
        console.log(`✅ Church already exists: ${churchData.name}`);
      }
      createdChurches.set(churchData.name, church);
    }

    // Step 7: Create Users and Assign Roles
    console.log('\n📝 Step 7: Creating church users and assigning roles...');

    // Get system admin user for assignment tracking
    const systemAdmin = await prisma.user.findFirst({
      where: { type: 'SUPER_ADMIN' },
    });

    for (const [churchName, users] of Object.entries(churchUsers)) {
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

        // Check if user exists
        let user = await prisma.user.findUnique({
          where: { email: userData.email },
        });

        if (!user) {
          // Create user
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
              status: 1,
              church_id: church.id,
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
        }

        // Assign role to user
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
              assigned_by_id: systemAdmin?.id,
              churchId: church.id,
            },
          });
          console.log(`  ✅ Role assigned: ${userData.role}`);
        } else {
          console.log(`  ✅ Role already assigned: ${userData.role}`);
        }

        // Update church member count
        const memberCount = await prisma.user.count({
          where: { church_id: church.id, deleted_at: null },
        });

        await prisma.church.update({
          where: { id: church.id },
          data: { church_members: memberCount },
        });
      }
    }

    // Step 8: Display Summary
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

    const totalRoleAssignments = await prisma.roleUser.count();
    console.log(`✅ Role assignments: ${totalRoleAssignments}`);

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
