import { prisma } from '../config/prisma-client.config';
import { AppError } from '../utils/AppError';
import { hashing, hashMatch } from '../helpers/bcrypt.helper';
import {
  cloudinaryUpload,
  cloudinaryDelete,
  buildCloudinaryFolder
} from '../helpers/cloudinary.helper';
import { Role, PrismaClient } from '../generated/prisma/client';

type TransactionClient = Parameters<
  Parameters<PrismaClient['$transaction']>[0]
>[0];

interface UpdateProfileInput {
  username?: string;
  fullName?: string;
  phoneNumber?: string;
  organizerName?: string;
  companyAddress?: string;
}

interface ChangePasswordInput {
  oldPassword: string;
  newPassword: string;
}

export const userService = {
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { organizer: true }
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const pointAggregate = await prisma.userPoint.aggregate({
      where: {
        userId,
        isUsed: false,
        expiredAt: { gt: new Date() }
      },
      _sum: { amount: true }
    });

    const { password: _, ...userWithoutPassword } = user;
    return {
      ...userWithoutPassword,
      pointBalance: pointAggregate._sum.amount ?? 0
    };
  },

  async updateProfile(
    userId: string,
    data: UpdateProfileInput,
    file?: Express.Multer.File
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { organizer: true }
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (data.username && data.username !== user.username) {
      const existingUsername = await prisma.user.findFirst({
        where: { username: data.username }
      });

      if (existingUsername) {
        throw new AppError('Username already exists', 409);
      }
    }

    if (
      user.role === Role.EO &&
      (data.organizerName || data.companyAddress) &&
      !user.organizer
    ) {
      throw new AppError('Organizer record not found for this EO user', 404);
    }

    let uploadResult: { secureUrl: string; publicId: string } | null = null;

    if (file) {
      try {
        const folder = buildCloudinaryFolder('users', userId, 'profile');
        uploadResult = await cloudinaryUpload(file.buffer, folder);
      } catch {
        throw new AppError('Failed to upload profile picture', 500);
      }
    }

    try {
      const updatedUser = await prisma.$transaction(
        async (tx: TransactionClient) => {
          const updated = await tx.user.update({
            where: { id: userId },
            data: {
              ...(data.username && { username: data.username }),
              ...(data.fullName && { fullName: data.fullName }),
              ...(data.phoneNumber && { phoneNumber: data.phoneNumber }),
              ...(uploadResult && {
                profilePictureUrl: uploadResult.secureUrl,
                profilePicturePublicId: uploadResult.publicId
              })
            },
            include: { organizer: true }
          });

          if (
            user.role === Role.EO &&
            user.organizer &&
            (data.organizerName || data.companyAddress)
          ) {
            await tx.organizer.update({
              where: { id: user.organizer.id },
              data: {
                ...(data.organizerName && {
                  organizerName: data.organizerName
                }),
                ...(data.companyAddress && {
                  companyAddress: data.companyAddress
                })
              }
            });

            const refreshed = await tx.user.findUnique({
              where: { id: userId },
              include: { organizer: true }
            });

            return refreshed!;
          }

          return updated;
        }
      );

      if (uploadResult && user.profilePicturePublicId) {
        await cloudinaryDelete(user.profilePicturePublicId);
      }

      const { password: _, ...userWithoutPassword } = updatedUser;
      return userWithoutPassword;
    } catch (error) {
      if (uploadResult) {
        await cloudinaryDelete(uploadResult.publicId);
      }

      throw error;
    }
  },

  async changePassword(userId: string, input: ChangePasswordInput) {
    const { oldPassword, newPassword } = input;

    if (!oldPassword || !newPassword) {
      throw new AppError('Old password and new password are required', 400);
    }

    if (newPassword.length < 6) {
      throw new AppError('New password must be at least 6 characters', 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const isOldPasswordValid = await hashMatch(oldPassword, user.password);
    if (!isOldPasswordValid) {
      throw new AppError('Current password is incorrect', 400);
    }

    const isSamePassword = await hashMatch(newPassword, user.password);
    if (isSamePassword) {
      throw new AppError(
        'New password must be different from current password',
        400
      );
    }

    const hashedNewPassword = await hashing(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword }
    });
  },

  async getUserPoints(userId: string) {
    const now = new Date();

    const userPoints = await prisma.userPoint.findMany({
      where: { userId, deletedAt: null },
      include: {
        pointUsages: {
          include: {
            transaction: {
              select: { invoiceNumber: true, createdAt: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const points = userPoints.map(point => {
      let status: 'active' | 'used' | 'expired';

      if (point.isUsed) {
        status = 'used';
      } else if (point.expiredAt < now) {
        status = 'expired';
      } else {
        status = 'active';
      }

      return {
        id: point.id,
        amount: point.amount,
        source: point.source,
        status,
        expiredAt: point.expiredAt,
        createdAt: point.createdAt,
        usageHistory: point.pointUsages.map(usage => ({
          amountUsed: usage.amountUsed,
          invoiceNumber: usage.transaction.invoiceNumber,
          usedAt: usage.transaction.createdAt
        }))
      };
    });

    const balance = points
      .filter(p => p.status === 'active')
      .reduce((sum, p) => sum + p.amount, 0);

    return { balance, points };
  },

  async getUserCoupons(userId: string) {
    const now = new Date();

    const userCoupons = await prisma.userCoupon.findMany({
      where: { userId, deletedAt: null },
      include: {
        transactions: {
          select: { invoiceNumber: true, createdAt: true },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const coupons = userCoupons.map(coupon => {
      let status: 'active' | 'used' | 'expired';

      if (coupon.isUsed) {
        status = 'used';
      } else if (coupon.expiredAt < now) {
        status = 'expired';
      } else {
        status = 'active';
      }

      return {
        id: coupon.id,
        couponCode: coupon.couponCode,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        status,
        expiredAt: coupon.expiredAt,
        usedAt: coupon.usedAt,
        createdAt: coupon.createdAt,
        usedInTransaction: coupon.transactions[0]
          ? {
              invoiceNumber: coupon.transactions[0].invoiceNumber,
              transactionDate: coupon.transactions[0].createdAt
            }
          : null
      };
    });

    return { coupons };
  }
};
