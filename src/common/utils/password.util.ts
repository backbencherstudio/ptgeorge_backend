import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string,
) {
  const isPasswordMatched = await bcrypt.compare(
    plainPassword,
    hashedPassword,
  );

  if (!isPasswordMatched) {
    throw new BadRequestException('Invalid email or password');
  }

  return true;
}