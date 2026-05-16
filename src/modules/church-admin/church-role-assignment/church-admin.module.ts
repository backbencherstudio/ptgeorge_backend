import { Module } from '@nestjs/common';
import { ChurchRoleAssignmentController } from './church-role-assignment.controller';
import { ChurchRoleAssignmentService } from './church-role-assignment.service';

@Module({
  controllers: [ChurchRoleAssignmentController],
  providers: [ChurchRoleAssignmentService],
  exports: [ChurchRoleAssignmentService],
})
export class ChurchAdminModule {}
