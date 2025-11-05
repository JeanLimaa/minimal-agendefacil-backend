import { Module } from "@nestjs/common";
import { UserService } from "./user.service";
import { DatabaseService } from "src/services/Database.service";

@Module({
    providers: [UserService, DatabaseService],
    exports: [UserService]
})

export class UserModule {}