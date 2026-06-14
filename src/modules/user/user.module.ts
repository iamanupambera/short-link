import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UserSuperAdminService } from './user.super-admin.service';
import { UserSuperAdminController } from './user.super-admin.controller';

@Module({
  imports: [AuthModule],
  controllers: [UserSuperAdminController],
  providers: [UserSuperAdminService],
  exports: [UserSuperAdminService],
})
export class UserModule {}
