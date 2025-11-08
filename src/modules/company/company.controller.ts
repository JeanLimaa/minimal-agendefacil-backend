import { Body, Controller, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import { CompanyService } from "./company.service";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { GetUser } from "src/common/decorators/GetUser.decorator";
import { SkipAuth } from "src/common/decorators/SkipAuth.decorator";
import { CompanyWorkingHoursDto } from "./dto/company-working-hours.dto";
import { UpdateCompanyProfileDto } from "./dto/update-company-profile.dto";
import { GetAvailableTimesDTO } from "./dto/get-available-times.dto";

@UseGuards(JwtAuthGuard)
@Controller('company')
export class CompanyController {
    constructor(
        private readonly companyService: CompanyService
    ) { }

    @Get("/info")
    async getCompanyProfile(
        @GetUser('companyId') companyId: number
    ) {
        return this.companyService.getCompanyInfo(companyId);
    }

    @SkipAuth()
    @Get(":name")
    async getCompany(
        @Param('name') name: string
    ) {
        return this.companyService.getCompanyByLinkName(name);
    }
    
    @SkipAuth()
    @Get(':companyId/services')
    async getCompanyServices(
        @Param('companyId') companyId: number
    ) {
        return this.companyService.getCompanyServices(companyId);
    }

    @SkipAuth()
    @Post(':companyId/available-times')
    async getCompanyAvailableTimes(
        @Param('companyId') companyId: number,
        @Body() dto: GetAvailableTimesDTO
    ) {
        return this.companyService.getCompanyAvailableTimes(companyId, dto);
    }

    @Put('/working-hours')
    async updateWorkingHours(
        @GetUser('companyId') companyId: number,
        @Body("working-hours") workingHours: CompanyWorkingHoursDto
    ) {
        return this.companyService.updateCompanyWorkingHours(companyId, workingHours);
    }

    @Put('/profile')
    async updateCompanyProfile(
        @GetUser('companyId') companyId: number,
        @Body() profileData: UpdateCompanyProfileDto
    ) {
        return this.companyService.updateCompanyProfile(companyId, profileData);
    }
}