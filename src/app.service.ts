import { Injectable, HttpStatus, HttpException } from '@nestjs/common';
import { DatabaseService } from './services/Database.service';
import { Platform } from '@prisma/client';
// Platform agora é string: "ANDROID" | "IOS" | "WEB"

@Injectable()
export class AppService {
  constructor(private readonly databaseService: DatabaseService) {}

  getHello(): string {
    return 'Hello World!';
  }

  async validateVersion(version: string, platform: Platform) {
    if (!version) {
      throw new HttpException('Versão não fornecida', HttpStatus.BAD_REQUEST);
    }

    const appVersionConfig = await this.getAppVersionConfig(platform.toUpperCase() as Platform);

    if (!appVersionConfig) {
      // Se não há configuração, permite acesso (backward compatibility)
      return {
        isValid: true,
        isLatest: true,
        currentVersion: version,
        minRequiredVersion: version,
        userVersion: version,
        message: 'Nenhuma configuração de versão encontrada, acesso liberado.',
        forceUpdate: false,
        optionalUpdate: false,
        downloadUrl: null
      };
    }

    const isValidVersion = this.compareVersions(version, appVersionConfig.minVersion) >= 0;
    const isLatestVersion = this.compareVersions(version, appVersionConfig.latestVersion) >= 0;
    const shouldForceUpdate = appVersionConfig.forceUpdate && !isValidVersion;

    return {
      isValid: isValidVersion,
      isLatest: isLatestVersion,
      currentVersion: appVersionConfig.latestVersion,
      minRequiredVersion: appVersionConfig.minVersion,
      userVersion: version,
      message: this.getVersionMessage(isValidVersion, isLatestVersion, shouldForceUpdate),
      forceUpdate: shouldForceUpdate,
      optionalUpdate: isValidVersion && !isLatestVersion,
      downloadUrl: appVersionConfig.downloadUrl
    };
  }

  private async getAppVersionConfig(platform: Platform) {
    return await this.databaseService.appVersion.findFirst({
      where: { 
        platform,
        isActive: true 
      }
    });
  }

  private compareVersions(version1: string, version2: string): number {
    const v1parts = version1.split('.').map(Number);
    const v2parts = version2.split('.').map(Number);
    
    const maxLength = Math.max(v1parts.length, v2parts.length);
    
    for (let i = 0; i < maxLength; i++) {
      const v1part = v1parts[i] || 0;
      const v2part = v2parts[i] || 0;
      
      if (v1part > v2part) return 1;
      if (v1part < v2part) return -1;
    }
    
    return 0;
  }

  private getVersionMessage(isValid: boolean, isLatest: boolean, forceUpdate?: boolean): string {
    if (forceUpdate || !isValid) {
      return 'Sua versão do aplicativo está desatualizada e não é mais suportada. Atualize para continuar.';
    }
    
    if (!isLatest) {
      return 'Uma nova versão do aplicativo está disponível. Recomendamos que você atualize para ter acesso às últimas funcionalidades.';
    }
    
    return 'Sua versão do aplicativo está atualizada.';
  }
}