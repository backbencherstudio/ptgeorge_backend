import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { NotificationModule } from './notification/notification.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { ChurchesModule } from './churches/churches.module';

@Module({
  imports: [
    UserModule,
    RolesModule,
    PermissionsModule,
    ChurchesModule,
    NotificationModule,
  ],
})
export class AdminModule {}
