import { Injectable } from '@nestjs/common';
import { config } from 'dotenv';
import { DataSourceOptions } from 'typeorm';
import { SeederOptions } from 'typeorm-extension';

config({ path: '.env' });

@Injectable()
export class ConfigsService {
  get databaseConfig(): DataSourceOptions & SeederOptions {
    return {
      type: 'mysql',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB,
      entities: ['dist/**/entities/*.entity.js'],
      migrationsTableName: 'migrations',
      migrations: ['dist/database/migrations/*js'],
      seeds: ['dist/database/seeds/*js'],
      ssl: process.env.DB_SSL === 'true',
      logging: false,
      synchronize: process.env.DB_SYNCHRONIZE === 'true',
    };
  }
}
