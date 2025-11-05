import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

export function IsDateTime(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isDateTime',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          // Regex para verificar DateTime no formato ISO 8601 completo
          const dateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?$/;
          return typeof value === 'string' && dateTimeRegex.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `O campo ${args.property} precisa estar no formato DateTime completo (YYYY-MM-DDTHH:mm:ss).`;
        },
      },
    });
  };
}
