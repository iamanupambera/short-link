import { Repository } from 'typeorm';
import { User, UserStatus } from './entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { AuthUserInterface } from 'src/common/interfaces';
import { ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    readonly ConfigService: ConfigService,
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: ConfigService.getOrThrow('ACCESS_TOKEN_SECRET'),
    });
  }

  async validate({ email, userId }: AuthUserInterface) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new ForbiddenException('Access Denied');
    }

    if (user.email !== email || !user.isEmailVerified || user.status === UserStatus.INACTIVE) {
      throw new ForbiddenException('Access Denied');
    }

    return {
      userId,
      email,
      role: user.role,
    };
  }
}
