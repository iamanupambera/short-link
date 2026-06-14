import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUrl, IsOptional, IsString, IsDateString } from 'class-validator';

export class CreateLinkDto {
  @ApiProperty({
    description: 'The original long URL to shorten',
    example: 'https://github.com/iamanupambera/short-link',
  })
  @IsNotEmpty()
  @IsUrl()
  readonly originalUrl: string;

  @ApiProperty({
    description: 'A custom alias instead of a random code',
    example: 'my-custom-github',
    required: false,
  })
  @IsOptional()
  @IsString()
  readonly customAlias?: string;

  @ApiProperty({
    description: 'An optional password to protect the link',
    example: 'SuperSecret123',
    required: false,
  })
  @IsOptional()
  @IsString()
  readonly password?: string;

  @ApiProperty({
    description: 'Optional expiration datetime for the link',
    example: '2026-12-31T23:59:59.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  readonly expiresAt?: string;
}
