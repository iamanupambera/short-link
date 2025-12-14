import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({
    description: 'Name of the user',
    example: 'John Doe',
  })
  @IsNotEmpty()
  @IsString()
  readonly name: string;

  @ApiProperty({
    description: 'Alternative Phone Number of the user (cannot be "0")',
    example: '9876543210',
    minLength: 10,
  })
  @IsOptional()
  @IsString()
  @Length(10)
  readonly alter_phone: string;

  @ApiProperty({
    description: 'Location of the user',
  })
  @IsOptional()
  @IsString()
  readonly location: string;

  @ApiProperty({
    description: 'Company Name of the user',
  })
  @IsOptional()
  @IsString()
  readonly company_name: string;

  @ApiProperty({
    description: 'Company Email of the user',
    example: 'john.doe@example.com',
  })
  @IsOptional()
  @IsString()
  readonly company_email: string;

  @ApiProperty({
    description: 'Company Phone Number of the user',
  })
  @IsOptional()
  @IsString()
  readonly company_phone: string;

  @ApiProperty({
    description: 'Company Alternative Phone Number of the user',
  })
  @IsOptional()
  @IsString()
  readonly company_alter_phone: string;

  @ApiProperty({
    description: 'Website of the user',
  })
  @IsOptional()
  @IsString()
  readonly website: string;

  @ApiProperty({
    description: 'Employee Number of the user',
  })
  @IsOptional()
  @IsNumber()
  readonly employees: number;

  @ApiProperty({
    description: 'Bio of the user',
    maxLength: 250,
  })
  @IsOptional()
  @MaxLength(250, { message: 'Bio must be at most 250 characters' })
  readonly bio: string;

  @ApiProperty({
    description: 'Qualification of the user',
  })
  @IsOptional()
  @IsString()
  readonly qualification: string;

  @ApiProperty({
    description: 'Language Known of the user',
  })
  @IsOptional()
  @IsString()
  readonly languages: string;

  @ApiProperty({
    description: 'Experience of the user',
  })
  @IsOptional()
  @IsString()
  readonly experience: string;

  @ApiProperty({
    description: 'Hourly Rate of the user',
  })
  @IsOptional()
  @IsNumber()
  readonly hourly_rate: number;

  @ApiProperty({
    description: 'Country of the user',
  })
  @IsOptional()
  @IsString()
  readonly country: string;

  @ApiProperty({
    description: 'skills ids',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsNumberString({}, { each: true })
  readonly skills?: number[];
}
