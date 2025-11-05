import { IsEmail, IsString, IsPhoneNumber, Min, MinLength } from 'class-validator';

export class CreateUserDto {
    @IsString({message: 'O nome deve ser uma string'})
    @MinLength(3, {message: 'O nome deve ter no mínimo 3 caracteres'})
    name: string;

    @IsEmail({}, {message: 'O email deve ser um email válido'})
    email: string;

    @IsString({ message: 'A senha deve ser uma string' })
    @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres' })
    password: string;

    @IsPhoneNumber('BR', {message: 'O telefone deve ser um número de telefone válido'})
    phone: string;
}
