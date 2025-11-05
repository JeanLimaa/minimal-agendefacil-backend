export interface UserPayload {
    userId: number;
    email: string;
    role: string;
    companyId: number;
    iat?: number;
    exp?: number;
}