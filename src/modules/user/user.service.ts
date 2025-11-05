import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { Prisma, User } from "@prisma/client";
import { TransactionService } from "src/common/services/transaction-context.service";
import { DatabaseService } from "src/services/Database.service";

@Injectable()
export class UserService {
    private readonly logger = new Logger(UserService.name);

    constructor(
        private readonly prisma: DatabaseService,
        private readonly transactionService: TransactionService
    ) { }

    async create(data: Prisma.UserCreateManyInput): Promise<User> {
        try {
            const prisma = this.transactionService.getPrismaInstance();
            
            this.logger.log('Creating new user', { email: data.email, role: data.role });

            const usersExists = await prisma.user.findMany({
                where: {
                    email: data.email
                }
            });

            if (usersExists.length > 0) {
                this.logger.warn('Attempt to create user with existing email', { email: data.email });
                throw new BadRequestException('Usuario com esse e-mail já existe.');
            }

            const user = await prisma.user.create({
                data
            });

            this.logger.log('User created successfully', { 
                userId: user.id, 
                email: user.email, 
                role: user.role 
            });

            return user;
        } catch (error) {
            this.logger.error('Error creating user', error.stack, { email: data.email });
            throw error;
        }
    }

    async update(id: number, data: Prisma.UserUncheckedUpdateManyInput): Promise<User> {
        try {
            const prisma = this.transactionService.getPrismaInstance();

            this.logger.log('Updating user', { userId: id, updateData: Object.keys(data) });

            const user = await prisma.user.update({
                where: { id },
                data,
            });

            this.logger.log('User updated successfully', { userId: id });
            return user;
        } catch (error) {
            this.logger.error('Error updating user', error.stack, { userId: id });
            throw error;
        }
    }

    async findByEmail(email: string) {
        try {
            this.logger.log('Finding user by email', { email });

            const user = await this.prisma.user.findUnique({
                where: {
                    email
                }
            });

            if (user) {
                this.logger.log('User found by email', { userId: user.id, email });
            } else {
                this.logger.log('No user found with email', { email });
            }

            return user;
        } catch (error) {
            this.logger.error('Error finding user by email', error.stack, { email });
            throw error;
        }
    }

    async findById(id: number) {
        try {
            const prisma = this.transactionService.getPrismaInstance();

            this.logger.log('Finding user by ID', { userId: id });

            const user = await prisma.user.findUnique({
                where: {
                    id
                }
            });

            if (user) {
                this.logger.log('User found by ID', { userId: id, email: user.email });
            } else {
                this.logger.warn('No user found with ID', { userId: id });
            }

            return user;
        } catch (error) {
            this.logger.error('Error finding user by ID', error.stack, { userId: id });
            throw error;
        }
    }

    public async isUserAdmin(userId: number): Promise<boolean> {
        try {
            this.logger.log('Checking if user is admin', { userId });

            const admin = await this.findById(userId);

            if (!admin || admin.role !== 'ADMIN') {
                this.logger.log('User is not admin', { userId, isAdmin: false });
                return false;
            }

            this.logger.log('User is admin', { userId, isAdmin: true });
            return true;
        } catch (error) {
            this.logger.error('Error checking if user is admin', error.stack, { userId });
            throw error;
        }
    }
}
