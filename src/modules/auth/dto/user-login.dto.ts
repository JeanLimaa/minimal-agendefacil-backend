import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class UserLoginDto {
    @IsEmail()
    email: string;

    @IsNotEmpty()
    @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres' })
    password: string;
}
