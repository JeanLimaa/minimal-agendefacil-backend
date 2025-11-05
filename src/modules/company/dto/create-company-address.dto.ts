import { IsString } from "class-validator";

export class CreateCompanyAddressDTO {
    @IsString({message: "Preencha o campo rua antes de continuar."})
    street: string;

    @IsString({message: "Preencha o campo número antes de continuar."})
    number: string;

    @IsString({message: "Preencha o campo bairro antes de continuar."})
    neighborhood: string;

    @IsString({message: "Preencha o campo cidade antes de continuar."})
    city: string;

    @IsString({message: "Preencha o campo Estado antes de continuar."})
    state: string;

    @IsString({message: "Preencha o país antes de continuar."})
    country: string;

    @IsString({message: "Preencha o campo CEP antes de continuar."})
    zipCode: string;
}