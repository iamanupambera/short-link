import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Email address of the user resetting their password',
    example: 'john.doe@example.com',
  })
  @IsNotEmpty()
  @IsEmail()
  readonly email: string;

  @ApiProperty({
    description: 'OTP code received by email',
    example: '123456',
  })
  @IsNotEmpty()
  @IsString()
  @Length(6, 6)
  readonly otp: string;

  @ApiProperty({
    description: 'New password for the user account',
    example: 'NewSecurePassword123',
    minLength: 8,
  })
  @IsNotEmpty()
  @IsString()
  @Length(8)
  readonly password: string;
}
