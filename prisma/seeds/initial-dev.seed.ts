import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Iniciando seed de dados para versão acadêmica...');

    // Cria uma empresa inicial
    const company = await prisma.company.create({
        data: {
            name: 'Empresa Demo',
            email: 'empresa@demo.com',
            phone: '(11) 98765-4321',
            link: 'empresa-demo',
            description: 'Empresa de demonstração para projeto acadêmico',
        },
    });
    console.log('Empresa criada:', company.name);

    // Cria endereço da empresa
    await prisma.companyAddress.create({
        data: {
            companyId: company.id,
            zipCode: '10000-100',
            street: 'Demo',
            number: '1000',
            neighborhood: 'Demo',
            city: 'Salvador',
            state: 'BA',
            country: 'Brasil',
        },
    });
    console.log('Endereço da empresa criado');

    // Cria horários de funcionamento da empresa (Seg-Sex, 8h-18h)
    const workingDays = [1, 2, 3, 4, 5]; // Segunda a Sexta
    for (const day of workingDays) {
        await prisma.companyWorkingHour.create({
            data: {
                companyId: company.id,
                dayOfWeek: day,
                startTime: '08:00',
                endTime: '18:00',
            },
        });
    }
    console.log('Horários de funcionamento criados (Seg-Sex, 8h-18h)');

    // Cria usuário admin
    const adminUser = await prisma.user.create({
        data: {
            email: 'admin@demo.com',
            password: await bcrypt.hash('admin123', 10),
            companyId: company.id,
            role: 'ADMIN',
        },
    });
    console.log('Usuário admin criado:', adminUser.email);

    // Cria serviços
    const services = await prisma.service.createMany({
        data: [
            {
                name: 'Consulta Inicial',
                description: 'Primeira consulta e avaliação',
                price: 80.0,
                duration: 60,
                companyId: company.id,
            },
            {
                name: 'Retorno',
                description: 'Consulta de retorno',
                price: 50.0,
                duration: 30,
                companyId: company.id,
            },
            {
                name: 'Procedimento Completo',
                description: 'Procedimento completo com acompanhamento',
                price: 150.0,
                duration: 90,
                companyId: company.id,
            },
        ],
    });
    console.log('Serviços criados:', services.count);

    // Busca os serviços criados para associar aos agendamentos
    const createdServices = await prisma.service.findMany({
        where: { companyId: company.id },
    });

    // Cria clientes
    const clients = await prisma.client.createMany({
        data: [
            {
                name: 'João Silva',
                phone: '(11) 91234-5678',
                email: 'joao.silva@email.com',
                companyId: company.id,
            },
            {
                name: 'Maria Santos',
                phone: '(11) 98765-4321',
                email: 'maria.santos@email.com',
                companyId: company.id,
            },
            {
                name: 'Pedro Costa',
                phone: '(11) 99876-5432',
                companyId: company.id,
            },
        ],
    });
    console.log('Clientes criados:', clients.count);

    // Busca os clientes criados
    const createdClients = await prisma.client.findMany({
        where: { companyId: company.id },
    });

    // Cria agendamentos de exemplo
    const today = new Date();
    const appointments = [
        {
            date: new Date(today.setHours(10, 0, 0, 0)),
            status: 'PENDING' as const,
            clientId: createdClients[0].id,
            companyId: company.id,
            duration: 60,
            subTotalPrice: 80.0,
            discount: 0 ,
            totalPrice: 80.0,
        },
        {
            date: new Date(new Date().setDate(today.getDate() - 1)),
            status: 'CONFIRMED' as const,
            clientId: createdClients[1].id,
            companyId: company.id,
            duration: 30,
            subTotalPrice: 50.0,
            discount: 0,
            totalPrice: 50.0,
        },
        {
            date: new Date(new Date().setDate(today.getDate() - 2)),
            status: 'COMPLETED' as const,
            clientId: createdClients[2].id,
            companyId: company.id,
            duration: 90,
            subTotalPrice: 150.0,
            discount: 10,
            totalPrice: 140.0,
        },
        {
            date: new Date(new Date().setDate(today.getDate() - 3)),
            status: 'CANCELLED' as const,
            clientId: createdClients[0].id,
            companyId: company.id,
            duration: 60,
            subTotalPrice: 80.0,
            discount: 0,
            totalPrice: 80.0,
        },
        {
            date: new Date(new Date().setDate(today.getDate() + 1)),
            status: 'PENDING' as const,
            clientId: createdClients[1].id,
            companyId: company.id,
            duration: 30,
            subTotalPrice: 50.0,
            discount: 5,
            totalPrice: 45.0,
        },
    ];

    for (const appointment of appointments) {
        const appointmentCreated = await prisma.appointment.create({
            data: appointment,
        });

        // Associa serviços aos agendamentos
        const service = createdServices.find((s) => s.duration === appointment.duration);
        if (service) {
            await prisma.appointmentService.create({
                data: {
                    appointmentId: appointmentCreated.id,
                    serviceId: service.id,
                },
            });
        }
    }
    console.log('Agendamentos criados:', appointments.length);

    console.log('\nSeed concluído com sucesso!');
    console.log('\nCredenciais de acesso:');
    console.log('Email: admin@demo.com');
    console.log('Senha: admin123');
    console.log('\nLink da empresa: http://localhost:3000/empresa-demo');
}

main()
    .catch((e) => {
        console.error('❌ Erro ao executar seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
