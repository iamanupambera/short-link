import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Link } from './entities/link.entity';
import { LinksService } from './links.service';
import { LinksController } from './links.controller';
import { LinksRepository } from './repository/links.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Link])],
  providers: [LinksService, LinksRepository],
  controllers: [LinksController],
  exports: [LinksService, LinksRepository, TypeOrmModule],
})
export class LinksModule {}
