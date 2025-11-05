import { Injectable, UnauthorizedException, NotFoundException, BadRequestException, Logger, InternalServerErrorException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { User } from '@prisma/client';
import { UserLoginDto } from './dto/user-login.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { CompanyService } from '../company/company.service';
import { DatabaseService } from 'src/services/Database.service';
import { UserPayload } from './interfaces/UserPayload.interface';
import { GetMePayload } from './interfaces/GetMePayload.interface';
import { ChangePasswordDto } from './dto/change-password.dto';
import { TransactionService } from '../../common/services/transaction-context.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly companyService: CompanyService,
    private readonly prisma: DatabaseService,
    private readonly transactionService: TransactionService,
  ) {}

  private async validateUser(email: string, password: string): Promise<Omit<User, "password">> {
    try {
      this.logger.log('Validating user credentials', { email });

      if (!email || !password) {
        throw new UnauthorizedException('Email e senha são obrigatórios');
      }

      const user = await this.userService.findByEmail(email);
      if (!user) {
        this.logger.warn('User not found during login attempt', { email });
        throw new UnauthorizedException('Email ou senha incorretos');
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        this.logger.warn('Invalid password during login attempt', { email });
        throw new UnauthorizedException('Email ou senha incorretos');
      }

      this.logger.log('User credentials validated successfully', { email, userId: user.id });

      const { password: _password, ...result } = user;
      return result;
    } catch (error) {
      this.logger.error('Error validating user credentials', error.stack, { email });
      throw error;
    }
  }

  private async validateNewUser(user: CreateUserDto): Promise<void> {
    try {
      this.logger.log('Validating new user registration', { email: user.email });

      const userExists = await this.userService.findByEmail(user.email);
      if (userExists) {
        this.logger.warn('Attempt to register with existing email', { email: user.email });
        throw new UnauthorizedException('Email já cadastrado');
      }

      this.logger.log('New user validation completed successfully', { email: user.email });
    } catch (error) {
      this.logger.error('Error validating new user', error.stack, { email: user.email });
      throw error;
    }
  }

  public async login(body: UserLoginDto) {
    try {
      this.logger.log('User login attempt', { email: body.email });

      if (!body.email || !body.password) {
        throw new UnauthorizedException('O email e a senha são obrigatórios');
      }

      const user = await this.validateUser(body.email, body.password);
      
      const payload: UserPayload = { 
        userId: user.id, 
        email: user.email, 
        role: user.role, 
        companyId: user.companyId 
      };

      const token = this.jwtService.sign(payload);

      this.logger.log('User login successful', { 
        email: body.email, 
        userId: user.id,
        role: user.role 
      });

      return {
        access_token: token,
      };
    } catch (error) {
      this.logger.error('User login failed', error.stack, { email: body.email });
      throw error;
    }
  }

  public async register(user: CreateUserDto) {
    try {
      this.logger.log('Starting user registration process', { email: user.email });

      await this.validateNewUser(user);

      const hashedPassword = await bcrypt.hash(user.password, 10);

      const result = await this.transactionService.runInTransaction(async () => {
        this.logger.log('Creating company for new user', { email: user.email });

        // Criar uma empresa para o usuário
        const newCompany = await this.companyService.createCompany({
          email: user.email,
          name: user.name,
          phone: user.phone
        });

        this.logger.log('Company created successfully', {
          companyId: newCompany.id,
          email: user.email
        });

        // Criar um usuário administrador para a empresa (versão simplificada)
        const newUser = await this.userService.create({
          email: user.email,
          password: hashedPassword,
          role: 'ADMIN', // String ao invés de enum
          companyId: newCompany.id
        });

        this.logger.log('Admin user created successfully', {
          userId: newUser.id,
          email: user.email
        });
        
        return {
          user: newUser,
          company: newCompany
        };
      },
      );

      const payload: UserPayload = { 
        userId: result.user.id,
        email: result.user.email, 
        role: result.user.role, 
        companyId: result.user.companyId 
      };

      const token = this.jwtService.sign(payload);

      this.logger.log('User registration completed successfully', { 
        userId: result.user.id,
        email: user.email,
        companyId: result.company.id
      });

      return {
        access_token: token,
      };
    } catch (error) {
      this.logger.error('User registration failed', error.stack, { email: user.email });
      throw error;
    }
  }

  public async getMe(userId: number): Promise<GetMePayload> {
    try {
      this.logger.log('Getting user profile information', { userId });

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          company: true,
        },
      });

      if (!user) {
        this.logger.warn('User not found for getMe operation', { userId });
        throw new NotFoundException('Usuário não encontrado');
      }

      if (!user.company) {
        this.logger.error('User has no associated company', '', { userId });
        throw new BadRequestException('Usuário não possui empresa associada');
      }

      const payload: GetMePayload = {
        email: user.email,
        name: user.company.name, // Usar nome da empresa (versão simplificada)
        phone: user.company.phone,
        companyName: user.company.name,
        companyLink: `${process.env.FRONTEND_URL}/company/${user.company.link}/booking`,
      };

      this.logger.log('User profile information retrieved successfully', { 
        userId, 
        email: user.email,
        companyId: user.companyId 
      });

      return payload;
    } catch (error) {
      this.logger.error('Error getting user profile information', error.stack, { userId });
      throw error;
    }
  }

  public async changePassword(userId: number, changePasswordDto: ChangePasswordDto): Promise<{ message: string }> {
    try {
      this.logger.log('Starting password change process', { userId });

      const { currentPassword, newPassword, confirmPassword } = changePasswordDto;

      // Verificar se a nova senha e confirmação são iguais
      if (newPassword !== confirmPassword) {
        this.logger.warn('Password confirmation mismatch', { userId });
        throw new UnauthorizedException('A nova senha e confirmação devem ser iguais');
      }

      // Buscar o usuário
      const user = await this.userService.findById(userId);
      if (!user) {
        this.logger.warn('User not found for password change', { userId });
        throw new NotFoundException('Usuário não encontrado');
      }

      // Verificar se a senha atual está correta
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        this.logger.warn('Invalid current password provided', { userId });
        throw new UnauthorizedException('Senha atual incorreta');
      }

      // Verificar se a nova senha é diferente da atual
      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        this.logger.warn('New password is the same as current password', { userId });
        throw new UnauthorizedException('A nova senha deve ser diferente da senha atual');
      }

      // Criptografar a nova senha
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // Atualizar a senha no banco de dados
      await this.userService.update(userId, { password: hashedNewPassword });

      this.logger.log('Password changed successfully', { userId });

      return { message: 'Senha atualizada com sucesso' };
    } catch (error) {
      this.logger.error('Password change failed', error.stack, { userId });
      throw error;
    }
  }
}

