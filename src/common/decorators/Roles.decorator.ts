
import { Reflector } from '@nestjs/core';

// Role agora é string: "CLIENT" | "ADMIN"
export const Roles = Reflector.createDecorator<string[]>();