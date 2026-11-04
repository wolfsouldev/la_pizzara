import { Global, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { IdentityRepository } from '../../database/repositories/identity.repository';
import { LocalDevelopmentIdentityProvider } from './providers/local-development-identity.provider';
import { LdapIdentityProvider } from './providers/ldap-identity.provider';

@Global()
@Module({ controllers: [AuthController], providers: [AuthService, SessionService, IdentityRepository, LocalDevelopmentIdentityProvider, LdapIdentityProvider], exports: [SessionService] })
export class AuthModule {}
