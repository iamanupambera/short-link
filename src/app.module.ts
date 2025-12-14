import { Module } from '@nestjs/common';
import { ConfigsModule } from './config/config.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSourceModule } from './database/dataSource.module';
import { ConfigsService } from './config/config.service';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    ConfigsModule,
    DataSourceModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigsService],
      imports: [ConfigsModule],
      useFactory: (configsService: ConfigsService) => {
        const dataSourceConfig = configsService.databaseConfig;
        return {
          ...dataSourceConfig,
        };
      },
    }),
    AuthModule,
  ],
})
export class AppModule {}
