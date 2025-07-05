import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private prismaService: PrismaService,
  ) {}
  private users = new Map<string, { password: string }>([]);

  async signUp(email: string, password: string) {
    const existingUser = await this.prismaService.user.findUnique({
      where: { email },
    });
    if (existingUser) return { status: 400, message: 'User already exists' };
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prismaService.user.create({ data: { email, password: passwordHash } });
    return this.generateToken(email, user.id)
  }

  async logIn(email: string, password: string) {
    const user = await this.prismaService.user.findUnique({ where: { email } });
    if (!user) return { message: 'User not found', status: 404 };
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return { status: 400, message: 'Invalid password' };  
    return this.generateToken(email, user.id);
  }

  private generateToken(email: string, sub: string): string {
    return this.jwtService.sign({ email, sub });
  }
}
