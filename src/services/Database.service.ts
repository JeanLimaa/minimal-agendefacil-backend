import { INestApplication, Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaClient, Prisma } from "@prisma/client";

@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();

    // Middleware para converter Decimal -> number
    this.$use(async (params, next) => {
      const result = await next(params);

      const convertDecimal = (obj: any): any => {
        if (!obj || typeof obj !== "object") return obj;

        if (Array.isArray(obj)) {
          return obj.map(convertDecimal);
        }

        for (const key of Object.keys(obj)) {
          const value = obj[key];
          if (value && typeof value.toNumber === "function") {
            obj[key] = value.toNumber();
          } else if (typeof value === "object") {
            obj[key] = convertDecimal(value);
          }
        }

        return obj;
      };

      return convertDecimal(result);
    });
  }
}