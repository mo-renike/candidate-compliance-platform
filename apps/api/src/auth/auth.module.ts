import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { TenantContextService } from './tenant-context.service.js';
import { TenantContextGuard } from './guard/tenant-context.guard.js';
import { PermissionsGuard } from './guard/permissions.guard.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '1h',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    TenantContextService,
    TenantContextGuard,
    PermissionsGuard,
  ],
  exports: [
    AuthService,
    TenantContextService,
    TenantContextGuard,
    PermissionsGuard,
  ],
})
export class AuthModule {}
