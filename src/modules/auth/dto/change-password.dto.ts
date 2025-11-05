import { IsString, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
    @IsString({ message: 'A senha atual deve ser uma string' })
    @MinLength(1, { message: 'A senha atual é obrigatória' })
    currentPassword: string;

    @IsString({ message: 'A nova senha deve ser uma string' })
    @MinLength(8, { message: 'A nova senha deve ter no mínimo 8 caracteres' })
    @Matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        {
            message: 'A nova senha deve conter pelo menos: 1 letra minúscula, 1 maiúscula, 1 número e 1 símbolo especial'
        }
    )
    newPassword: string;

    @IsString({ message: 'A confirmação da senha deve ser uma string' })
    @MinLength(1, { message: 'A confirmação da senha é obrigatória' })
    confirmPassword: string;
}