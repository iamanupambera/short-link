import { IsEnum } from 'class-validator';
import { UserStatus } from 'src/modules/auth/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserStatusDto {
  @ApiProperty({
    enum: UserStatus,
    description: 'The status to set the user to',
  })
  @IsEnum(UserStatus)
  status: UserStatus;
}
