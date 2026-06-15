import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUrl, IsString, IsDateString, IsEnum } from 'class-validator';
import { LinkStatus } from '../entities/link.entity';

export class UpdateLinkDto {
  @ApiProperty({
    description: 'The updated original long URL',
    example: 'https://github.com/iamanupambera',
    required: false,
  })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  readonly originalUrl?: string;

  @ApiProperty({
    description: 'A custom alias instead of a random code',
    example: 'new-custom-github',
    required: false,
  })
  @IsOptional()
  @IsString()
  readonly customAlias?: string;

  @ApiProperty({
    description: 'An optional password to protect the link',
    example: 'SuperNewSecret123',
    required: false,
  })
  @IsOptional()
  @IsString()
  readonly password?: string;

  @ApiProperty({
    description: 'Optional expiration datetime for the link',
    example: '2027-12-31T23:59:59.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  readonly expiresAt?: string;

  @ApiProperty({
    description: 'Status of the short link',
    enum: LinkStatus,
    example: LinkStatus.ACTIVE,
    required: false,
  })
  @IsOptional()
  @IsEnum(LinkStatus)
  readonly status?: LinkStatus;
}
