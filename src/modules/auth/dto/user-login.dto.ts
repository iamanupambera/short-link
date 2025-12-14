import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class UserLoginDto {
  @ApiProperty({
    example: 'john.doe@example.com',
    required: true,
    description: 'Enter user email or phone',
  })
  @IsNotEmpty()
  @IsEmail()
  readonly email: string;

  @ApiProperty({
    example: 'SecurePassword123',
    required: true,
    description: 'Enter user password',
  })
  @IsNotEmpty()
  @IsString()
  readonly password: string;
}
