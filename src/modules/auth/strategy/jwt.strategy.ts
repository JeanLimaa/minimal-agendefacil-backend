import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserPayload } from '../interfaces/UserPayload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: process.env.NODE_ENV === 'development',
      secretOrKey: process.env.JWT_SECRET || 'secretKey',
    });
  }

  async validate(payload: UserPayload) {
    const {
      userId,
      email,
      role,
      companyId,
    } = payload;
    
    return { userId, email, role, companyId };
  }
}
