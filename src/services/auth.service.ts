import { prisma } from '../config/prisma-client.config';
import { JWT_SECRET_TOKEN } from '../config/main.config';
import { AppError } from '../utils/AppError';
import { hashing, hashMatch } from '../helpers/bcrypt.helper';
import { jwtCreateToken } from '../helpers/jwt.helper';
import { Role, PrismaClient } from '../generated/prisma/client';

type TransactionClient = Parameters<
  Parameters<PrismaClient['$transaction']>[0]
>[0];

interface RegisterInput {
  email: string;
  username: string;
  password: string;
  fullName: string;
  phoneNumber: string;
  role?: Role;
  referralCode?: string;
  organizerName?: string;
  companyAddress?: string;
}

interface LoginInput {
  email: string;
  password: string;
}

function generateReferralCode(username: string, phoneNumber: string): string {
  const prefix = username.slice(0, 2).toUpperCase();
  const suffix = phoneNumber.slice(-4);
  return `${prefix}${suffix}`;
}

async function getUniqueReferralCode(
  username: string,
  phoneNumber: string
): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = generateReferralCode(username, phoneNumber);
  let exists = await prisma.user.findUnique({ where: { referralCode: code } });

  while (exists) {
    const randomChar = chars.charAt(Math.floor(Math.random() * chars.length));
    code = code.slice(0, 5) + randomChar;
    exists = await prisma.user.findUnique({ where: { referralCode: code } });
  }

  return code;
}

export const authService = {
  async register(input: RegisterInput) {
    const {
      email,
      username,
      password,
      fullName,
      phoneNumber,
      role = Role.User,
      referralCode,
      organizerName,
      companyAddress
    } = input;

    if (!email || !username || !password || !fullName || !phoneNumber) {
      throw new AppError('All fields are required', 400);
    }

    if (role === Role.EO) {
      if (!organizerName || !companyAddress) {
        throw new AppError(
          'Organizer name and company address are required for EO registration',
          400
        );
      }
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new AppError('Email already exists', 409);
    }

    const existingUsername = await prisma.user.findFirst({
      where: { username }
    });
    if (existingUsername) {
      throw new AppError('Username already exists', 409);
    }

    let referrer = null;
    if (referralCode) {
      referrer = await prisma.user.findUnique({
        where: { referralCode }
      });

      if (!referrer) {
        throw new AppError('Invalid referral code', 400);
      }
    }

    const hashedPassword = await hashing(password);
    const newReferralCode = await getUniqueReferralCode(username, phoneNumber);

    const result = await prisma.$transaction(async (tx: TransactionClient) => {
      const user = await tx.user.create({
        data: {
          email,
          username,
          password: hashedPassword,
          fullName,
          phoneNumber,
          role,
          referralCode: newReferralCode
        }
      });

      // Create Organizer if EO
      if (role === Role.EO) {
        await tx.organizer.create({
          data: {
            userId: user.id,
            organizerName: organizerName!,
            companyAddress: companyAddress!
          }
        });
      }

      if (referrer) {
        const threeMonthsFromNow = new Date();
        threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

        const referral = await tx.referral.create({
          data: {
            referrerId: referrer.id,
            refereeId: user.id,
            codeUsed: referralCode!
          }
        });

        await tx.userPoint.create({
          data: {
            userId: referrer.id,
            amount: 10000,
            source: 'referral',
            referralId: referral.id,
            expiredAt: threeMonthsFromNow
          }
        });

        const couponCode = `REF-${newReferralCode}-${Date.now().toString(36).toUpperCase()}`;
        await tx.userCoupon.create({
          data: {
            userId: user.id,
            couponCode,
            discountType: 'percentage',
            discountValue: 10,
            referralId: referral.id,
            expiredAt: threeMonthsFromNow
          }
        });
      }

      return user;
    });

    const token = jwtCreateToken(
      { id: result.id, email: result.email, role: result.role },
      JWT_SECRET_TOKEN!,
      { expiresIn: '1d' }
    );

    const { password: _, ...userWithoutPassword } = result;

    return { user: userWithoutPassword, token };
  },

  async login(input: LoginInput) {
    const { email, password } = input;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const isPasswordValid = await hashMatch(password, user.password);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }

    const token = jwtCreateToken(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET_TOKEN!,
      { expiresIn: '1d' }
    );

    const { password: _, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, token };
  },

  async session(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return {
      username: user.username,
      role: user.role
    };
  }
};
