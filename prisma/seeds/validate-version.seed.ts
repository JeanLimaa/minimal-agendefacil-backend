import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.appVersion.upsert({
    where: { platform: "ANDROID" },
    update: {},
    create: {
      platform: "ANDROID",
      minVersion: "1.0.0",
      latestVersion: "1.0.0",
      forceUpdate: false,
      downloadUrl: "https://play.google.com/store/apps/details?id=com.agendefacil.app",
    },
  });

  await prisma.appVersion.upsert({
    where: { platform: "IOS" },
    update: {},
    create: {
      platform: "IOS",
      minVersion: "1.0.0",
      latestVersion: "1.0.0",
      forceUpdate: false,
      downloadUrl: "https://apps.apple.com/br/app/agende-facil/id123456789",
    },
  });

  await prisma.appVersion.upsert({
    where: { platform: "WEB" },
    update: {},
    create: {
      platform: "WEB",
      minVersion: "1.0.0",
      latestVersion: "1.0.0",
      forceUpdate: false,
      downloadUrl: "https://app.agendefacil.com.br",
    },
  });
}

main().finally(async () => {
  await prisma.$disconnect();
});