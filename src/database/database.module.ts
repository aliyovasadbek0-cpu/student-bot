import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '../entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        
        if (!databaseUrl) {
          throw new Error('DATABASE_URL is required. Please set it in your .env file');
        }

        // PostgreSQL connection from URL
        const url = new URL(databaseUrl);
        return {
          type: 'postgres',
          host: url.hostname,
          port: parseInt(url.port) || 5432,
          username: url.username,
          password: url.password,
          database: url.pathname.slice(1),
          entities: [User],
          synchronize: true,
          ssl: url.searchParams.get('sslmode') === 'require' || url.searchParams.get('ssl') === 'true',
        };
      },
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([User]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}

