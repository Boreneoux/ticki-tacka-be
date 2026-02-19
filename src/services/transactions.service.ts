import { prisma } from '../config/prisma-client.config';
import { AppError } from '../utils/AppError';
import {
  buildCloudinaryFolder,
  cloudinaryUpload,
  cloudinaryDelete
} from '../helpers/cloudinary.helper';
import { PrismaClient } from '../generated/prisma/client';
import transporter from '../helpers/nodemailer.helper';
import { USER_EMAILER, FRONTEND_URL } from '../config/main.config';
import handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';

type TransactionClient = Parameters<
  Parameters<PrismaClient['$transaction']>[0]
>[0];

interface TransactionItemInput {
  ticketTypeId: string;
  quantity: number;
}

interface CreateTransactionInput {
  eventId: string;
  items: TransactionItemInput[];
  usePoints?: boolean;
  userCouponId?: string;
  eventVoucherId?: string;
}

interface GetCustomerTransactionsQuery {
  status?: string;
  page?: string;
  limit?: string;
}

interface GetOrganizerTransactionsQuery {
  status?: string;
  eventId?: string;
  page?: string;
  limit?: string;
}

function generateInvoiceNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `INV-${dateStr}-${random}`;
}

const customerTransactionInclude = {
  event: {
    select: {
      id: true,
      name: true,
      slug: true,
      eventDate: true,
      eventTime: true,
      venueName: true,
      eventImages: { take: 1, select: { imageUrl: true } }
    }
  },
  transactionItems: {
    include: { ticketType: { select: { id: true, name: true, price: true } } }
  },
  pointUsages: true,
  eventVoucherUsages: true
} as const;

const organizerTransactionInclude = {
  user: {
    select: {
      id: true,
      username: true,
      fullName: true,
      email: true,
      profilePictureUrl: true
    }
  },
  event: {
    select: {
      id: true,
      name: true,
      slug: true,
      eventDate: true,
      eventTime: true,
      venueName: true,
      eventImages: { take: 1, select: { imageUrl: true } }
    }
  },
  transactionItems: {
    include: { ticketType: { select: { id: true, name: true, price: true } } }
  },
  pointUsages: true,
  eventVoucherUsages: true
} as const;

export const transactionService = {
  async createTransaction(userId: string, input: CreateTransactionInput) {
    const { eventId, items, usePoints, userCouponId, eventVoucherId } = input;

    // --- Pre-validation (outside transaction) ---

    if (!items || !items.length) {
      throw new AppError('At least one ticket item is required', 400);
    }

    // Check event exists and is published
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event || event.deletedAt) {
      throw new AppError('Event not found', 404);
    }

    if (event.status !== 'published') {
      throw new AppError('Event is not available for purchase', 400);
    }

    // --- All the heavy logic inside $transaction ---
    const result = await prisma.$transaction(async (tx: TransactionClient) => {
      // 1. Validate ticket availability & calculate subtotal
      let subtotal = 0;
      const ticketDetails: {
        ticketTypeId: string;
        quantity: number;
        unitPrice: number;
        subtotal: number;
      }[] = [];

      for (const item of items) {
        const ticketType = await tx.ticketType.findUnique({
          where: { id: item.ticketTypeId }
        });

        if (!ticketType || ticketType.deletedAt) {
          throw new AppError(`Ticket type ${item.ticketTypeId} not found`, 404);
        }

        if (ticketType.eventId !== eventId) {
          throw new AppError(
            `Ticket type ${ticketType.name} does not belong to this event`,
            400
          );
        }

        const available = ticketType.quota - ticketType.soldCount;
        if (item.quantity > available) {
          throw new AppError(
            `Not enough tickets for "${ticketType.name}". Available: ${available}`,
            400
          );
        }

        if (item.quantity < 1) {
          throw new AppError('Ticket quantity must be at least 1', 400);
        }

        const itemSubtotal = ticketType.price * item.quantity;
        subtotal += itemSubtotal;

        ticketDetails.push({
          ticketTypeId: item.ticketTypeId,
          quantity: item.quantity,
          unitPrice: ticketType.price,
          subtotal: itemSubtotal
        });
      }

      // 2. Apply points (FIFO by expiredAt — earliest expiring first)
      let pointsUsed = 0;
      const pointUsages: { userPointId: string; amountUsed: number }[] = [];

      if (usePoints && subtotal > 0) {
        const availablePoints = await tx.userPoint.findMany({
          where: {
            userId,
            isUsed: false,
            deletedAt: null,
            expiredAt: { gt: new Date() }
          },
          orderBy: { expiredAt: 'asc' }
        });

        let remaining = subtotal;

        for (const point of availablePoints) {
          if (remaining <= 0) break;

          const deduct = Math.min(point.amount, remaining);
          remaining -= deduct;
          pointsUsed += deduct;

          // Reduce point amount; only mark as fully used when exhausted
          const newAmount = point.amount - deduct;
          await tx.userPoint.update({
            where: { id: point.id },
            data: {
              amount: newAmount,
              isUsed: newAmount === 0
            }
          });

          pointUsages.push({
            userPointId: point.id,
            amountUsed: deduct
          });
        }
      }

      // 3. Apply coupon discount
      let couponDiscount = 0;

      if (userCouponId) {
        const coupon = await tx.userCoupon.findUnique({
          where: { id: userCouponId }
        });

        if (!coupon || coupon.deletedAt) {
          throw new AppError('Coupon not found', 404);
        }

        if (coupon.userId !== userId) {
          throw new AppError('This coupon does not belong to you', 403);
        }

        if (coupon.isUsed) {
          throw new AppError('Coupon has already been used', 400);
        }

        if (new Date(coupon.expiredAt) < new Date()) {
          throw new AppError('Coupon has expired', 400);
        }

        if (coupon.discountType === 'percentage') {
          couponDiscount = Math.floor((subtotal * coupon.discountValue) / 100);
        } else {
          // fixed
          couponDiscount = coupon.discountValue;
        }

        // Mark coupon as used
        await tx.userCoupon.update({
          where: { id: userCouponId },
          data: { isUsed: true, usedAt: new Date() }
        });
      }

      // 4. Apply voucher discount
      let voucherDiscount = 0;

      if (eventVoucherId) {
        const voucher = await tx.eventVoucher.findUnique({
          where: { id: eventVoucherId }
        });

        if (!voucher || voucher.deletedAt) {
          throw new AppError('Voucher not found', 404);
        }

        if (voucher.eventId !== eventId) {
          throw new AppError('This voucher does not belong to this event', 400);
        }

        if (!voucher.isActive) {
          throw new AppError('Voucher is not active', 400);
        }

        if (new Date(voucher.expiredAt) < new Date()) {
          throw new AppError('Voucher has expired', 400);
        }

        if (new Date(voucher.startDate) > new Date()) {
          throw new AppError('Voucher is not yet valid', 400);
        }

        if (voucher.usedCount >= voucher.maxUsage) {
          throw new AppError('Voucher usage limit reached', 400);
        }

        if (voucher.discountType === 'percentage') {
          voucherDiscount = Math.floor(
            (subtotal * voucher.discountValue) / 100
          );
          // Cap discount at maxDiscount if set
          if (voucher.maxDiscount && voucherDiscount > voucher.maxDiscount) {
            voucherDiscount = voucher.maxDiscount;
          }
        } else {
          // fixed
          voucherDiscount = voucher.discountValue;
        }

        // Increment usedCount
        await tx.eventVoucher.update({
          where: { id: eventVoucherId },
          data: { usedCount: { increment: 1 } }
        });
      }

      // 5. Calculate totalAmount (min 0)
      const totalAmount = Math.max(
        0,
        subtotal - pointsUsed - couponDiscount - voucherDiscount
      );

      // 6. Determine payment status
      const isFree = totalAmount === 0;
      const paymentStatus = isFree ? 'done' : 'waiting_for_payment';

      // 7. Generate invoice & deadline
      const invoiceNumber = generateInvoiceNumber();
      const paymentDeadline = new Date(Date.now() + 2 * 60 * 60 * 1000); // +2 hours

      // 8. Create the transaction
      const transaction = await tx.transaction.create({
        data: {
          userId,
          eventId,
          invoiceNumber,
          subtotal,
          pointsUsed,
          couponDiscount,
          voucherDiscount,
          totalAmount,
          paymentStatus,
          paymentDeadline,
          ...(isFree && { confirmedAt: new Date() }),
          ...(userCouponId && { userCouponId }),
          ...(eventVoucherId && { eventVoucherId })
        }
      });

      // 9. Create TransactionItems & increment soldCount
      for (const detail of ticketDetails) {
        await tx.transactionItem.create({
          data: {
            transactionId: transaction.id,
            ticketTypeId: detail.ticketTypeId,
            quantity: detail.quantity,
            unitPrice: detail.unitPrice,
            subtotal: detail.subtotal
          }
        });

        await tx.ticketType.update({
          where: { id: detail.ticketTypeId },
          data: { soldCount: { increment: detail.quantity } }
        });
      }

      // 10. Create PointUsage records
      for (const pu of pointUsages) {
        await tx.pointUsage.create({
          data: {
            userPointId: pu.userPointId,
            transactionId: transaction.id,
            amountUsed: pu.amountUsed
          }
        });
      }

      // 11. Create EventVoucherUsage record
      if (eventVoucherId && voucherDiscount > 0) {
        await tx.eventVoucherUsage.create({
          data: {
            voucherId: eventVoucherId,
            userId,
            transactionId: transaction.id,
            discountApplied: voucherDiscount
          }
        });
      }

      return transaction;
    });

    // Return full transaction with relations
    const fullTransaction = await prisma.transaction.findUnique({
      where: { id: result.id },
      include: {
        transactionItems: {
          include: { ticketType: true }
        },
        event: true,
        pointUsages: true,
        eventVoucherUsages: true
      }
    });

    return fullTransaction;
  },

  async uploadPaymentProof(
    transactionId: string,
    userId: string,
    file: Express.Multer.File
  ) {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId }
    });

    if (!transaction || transaction.deletedAt) {
      throw new AppError('Transaction not found', 404);
    }

    if (transaction.userId !== userId) {
      throw new AppError('This transaction does not belong to you', 403);
    }

    if (transaction.paymentStatus !== 'waiting_for_payment') {
      throw new AppError(
        `Cannot upload proof for transaction with status '${transaction.paymentStatus}'`,
        400
      );
    }

    if (new Date(transaction.paymentDeadline) < new Date()) {
      throw new AppError('Payment deadline has passed', 400);
    }

    if (!file) {
      throw new AppError('Payment proof image is required', 400);
    }

    // Upload to Cloudinary
    let uploadResult: { secureUrl: string; publicId: string };

    try {
      const folder = buildCloudinaryFolder(
        'transactions',
        transactionId,
        'payment-proof'
      );
      uploadResult = await cloudinaryUpload(file.buffer, folder);
    } catch {
      throw new AppError('Failed to upload payment proof', 500);
    }

    try {
      // Delete old proof from Cloudinary if re-uploading
      if (transaction.paymentProofUrl) {
        // We don't have publicId stored for payment proof in schema,
        // so we skip deleting old one unless schema supports it
      }

      const confirmationDeadline = new Date(
        Date.now() + 3 * 24 * 60 * 60 * 1000
      ); // +3 days

      const updated = await prisma.transaction.update({
        where: { id: transactionId },
        data: {
          paymentProofUrl: uploadResult.secureUrl,
          proofUploadedAt: new Date(),
          paymentStatus: 'waiting_for_admin_confirmation',
          confirmationDeadline
        },
        include: {
          transactionItems: {
            include: { ticketType: true }
          },
          event: true
        }
      });

      return updated;
    } catch (error) {
      // Rollback: delete uploaded image from Cloudinary
      await cloudinaryDelete(uploadResult.publicId);
      throw error;
    }
  },

  async getCustomerTransactions(
    userId: string,
    query: GetCustomerTransactionsQuery
  ) {
    const { status, page = '1', limit = '10' } = query;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Math.min(50, Number(limit)));

    const where: any = {
      userId,
      deletedAt: null
    };

    if (status) {
      where.paymentStatus = status;
    }

    const [transactions, totalCount] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: customerTransactionInclude,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.transaction.count({ where })
    ]);

    return {
      transactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    };
  },

  async getCustomerTransactionById(userId: string, transactionId: string) {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: customerTransactionInclude
    });

    if (!transaction || transaction.deletedAt) {
      throw new AppError('Transaction not found', 404);
    }

    if (transaction.userId !== userId) {
      throw new AppError('You do not have access to this transaction', 403);
    }

    return transaction;
  },

  async getOrganizerTransactions(
    userId: string,
    query: GetOrganizerTransactionsQuery
  ) {
    const { status, eventId, page = '1', limit = '10' } = query;

    const organizer = await prisma.organizer.findUnique({
      where: { userId }
    });

    if (!organizer) {
      throw new AppError('Organizer not found', 404);
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Math.min(50, Number(limit)));

    const where: any = {
      deletedAt: null,
      event: {
        organizerId: organizer.id,
        deletedAt: null
      }
    };

    if (status) {
      where.paymentStatus = status;
    }

    if (eventId) {
      where.eventId = eventId;
    }

    const [transactions, totalCount] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: organizerTransactionInclude,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.transaction.count({ where })
    ]);

    return {
      transactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    };
  },

  async getOrganizerTransactionById(userId: string, transactionId: string) {
    const organizer = await prisma.organizer.findUnique({
      where: { userId }
    });

    if (!organizer) {
      throw new AppError('Organizer not found', 404);
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        ...organizerTransactionInclude,
        userCoupon: {
          select: { couponCode: true, discountType: true, discountValue: true }
        },
        eventVoucher: {
          select: {
            voucherCode: true,
            voucherName: true,
            discountType: true,
            discountValue: true
          }
        }
      }
    });

    if (!transaction || transaction.deletedAt) {
      throw new AppError('Transaction not found', 404);
    }

    const event = await prisma.event.findFirst({
      where: {
        id: transaction.eventId,
        organizerId: organizer.id
      }
    });

    if (!event) {
      throw new AppError('You do not have access to this transaction', 403);
    }

    return transaction;
  },

  async cancelTransaction(userId: string, transactionId: string) {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        transactionItems: true,
        pointUsages: true,
        eventVoucherUsages: true
      }
    });

    if (!transaction || transaction.deletedAt) {
      throw new AppError('Transaction not found', 404);
    }

    if (transaction.userId !== userId) {
      throw new AppError('You do not have access to this transaction', 403);
    }

    if (transaction.paymentStatus !== 'waiting_for_payment') {
      throw new AppError(
        'Only transactions with status "waiting_for_payment" can be canceled',
        400
      );
    }

    const result = await prisma.$transaction(async (tx: TransactionClient) => {
      for (const item of transaction.transactionItems) {
        await tx.ticketType.update({
          where: { id: item.ticketTypeId },
          data: { soldCount: { decrement: item.quantity } }
        });
      }

      for (const pu of transaction.pointUsages) {
        await tx.userPoint.update({
          where: { id: pu.userPointId },
          data: {
            amount: { increment: pu.amountUsed },
            isUsed: false
          }
        });
      }

      if (transaction.userCouponId) {
        await tx.userCoupon.update({
          where: { id: transaction.userCouponId },
          data: { isUsed: false, usedAt: null }
        });
      }

      if (transaction.eventVoucherId) {
        await tx.eventVoucher.update({
          where: { id: transaction.eventVoucherId },
          data: { usedCount: { decrement: 1 } }
        });
      }

      await tx.pointUsage.deleteMany({
        where: { transactionId: transaction.id }
      });

      await tx.eventVoucherUsage.deleteMany({
        where: { transactionId: transaction.id }
      });

      const canceled = await tx.transaction.update({
        where: { id: transaction.id },
        data: { paymentStatus: 'canceled' },
        include: customerTransactionInclude
      });

      return canceled;
    });

    return result;
  },

  async acceptTransaction(userId: string, transactionId: string) {
    const organizer = await prisma.organizer.findUnique({
      where: { userId }
    });

    if (!organizer) {
      throw new AppError('Organizer not found', 404);
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            slug: true,
            organizerId: true,
            eventDate: true,
            eventTime: true,
            venueName: true
          }
        },
        user: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        transactionItems: {
          include: {
            ticketType: { select: { name: true } }
          }
        }
      }
    });

    if (!transaction || transaction.deletedAt) {
      throw new AppError('Transaction not found', 404);
    }

    if (transaction.event.organizerId !== organizer.id) {
      throw new AppError('You do not have access to this transaction', 403);
    }

    if (transaction.paymentStatus !== 'waiting_for_admin_confirmation') {
      throw new AppError(
        `Only transactions with status "waiting_for_admin_confirmation" can be accepted`,
        400
      );
    }

    const updated = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        paymentStatus: 'done',
        confirmedAt: new Date()
      },
      include: organizerTransactionInclude
    });

    const totalQuantity = transaction.transactionItems.reduce(
      (sum, item) => sum + item.quantity,
      0
    );
    const ticketTypeNames = transaction.transactionItems
      .map(item => item.ticketType.name)
      .join(', ');

    const eventDate = new Date(transaction.event.eventDate).toLocaleDateString(
      'en-US',
      { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
    );

    const templatePath = path.join(
      __dirname,
      '../templates/transaction-accepted.html'
    );
    const templateSource = fs.readFileSync(templatePath, 'utf-8');
    const compiledTemplate = handlebars.compile(templateSource);
    const html = compiledTemplate({
      userName: transaction.user.fullName,
      eventName: transaction.event.name,
      orderId: transaction.invoiceNumber,
      eventDate,
      ticketQuantity: totalQuantity,
      ticketType: ticketTypeNames,
      ticketLink: `${FRONTEND_URL}/transactions/${transaction.id}`
    });

    transporter
      .sendMail({
        from: USER_EMAILER,
        to: transaction.user.email,
        subject: `🎉 Your tickets for ${transaction.event.name} are confirmed!`,
        html
      })
      .catch((err: unknown) => {
        console.error('Failed to send acceptance email:', err);
      });

    return updated;
  },

  async rejectTransaction(userId: string, transactionId: string) {
    const organizer = await prisma.organizer.findUnique({
      where: { userId }
    });

    if (!organizer) {
      throw new AppError('Organizer not found', 404);
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            slug: true,
            organizerId: true
          }
        },
        user: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        transactionItems: true,
        pointUsages: true,
        eventVoucherUsages: true
      }
    });

    if (!transaction || transaction.deletedAt) {
      throw new AppError('Transaction not found', 404);
    }

    if (transaction.event.organizerId !== organizer.id) {
      throw new AppError('You do not have access to this transaction', 403);
    }

    if (transaction.paymentStatus !== 'waiting_for_admin_confirmation') {
      throw new AppError(
        `Only transactions with status "waiting_for_admin_confirmation" can be rejected`,
        400
      );
    }

    const result = await prisma.$transaction(async (tx: TransactionClient) => {
      for (const item of transaction.transactionItems) {
        await tx.ticketType.update({
          where: { id: item.ticketTypeId },
          data: { soldCount: { decrement: item.quantity } }
        });
      }

      for (const pu of transaction.pointUsages) {
        await tx.userPoint.update({
          where: { id: pu.userPointId },
          data: {
            amount: { increment: pu.amountUsed },
            isUsed: false
          }
        });
      }

      await tx.pointUsage.deleteMany({
        where: { transactionId: transaction.id }
      });

      if (transaction.userCouponId) {
        await tx.userCoupon.update({
          where: { id: transaction.userCouponId },
          data: { isUsed: false, usedAt: null }
        });
      }

      if (transaction.eventVoucherId) {
        await tx.eventVoucher.update({
          where: { id: transaction.eventVoucherId },
          data: { usedCount: { decrement: 1 } }
        });
      }

      await tx.eventVoucherUsage.deleteMany({
        where: { transactionId: transaction.id }
      });

      const rejected = await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          paymentStatus: 'rejected',
          confirmedAt: new Date()
        },
        include: organizerTransactionInclude
      });

      return rejected;
    });

    const templatePath = path.join(
      __dirname,
      '../templates/transaction-rejected.html'
    );
    const templateSource = fs.readFileSync(templatePath, 'utf-8');
    const compiledTemplate = handlebars.compile(templateSource);
    const html = compiledTemplate({
      userName: transaction.user.fullName,
      eventName: transaction.event.name,
      retryLink: `${FRONTEND_URL}/events/${transaction.event.slug}`
    });

    transporter
      .sendMail({
        from: USER_EMAILER,
        to: transaction.user.email,
        subject: `Transaction update for ${transaction.event.name}`,
        html
      })
      .catch((err: unknown) => {
        console.error('Failed to send rejection email:', err);
      });

    return result;
  },

  async _rollbackTransactionData(tx: TransactionClient, transactionId: string) {
    // 1. Restore soldCount on ticket types
    const items = await tx.transactionItem.findMany({
      where: { transactionId }
    });

    for (const item of items) {
      await tx.ticketType.update({
        where: { id: item.ticketTypeId },
        data: { soldCount: { decrement: item.quantity } }
      });
    }

    const pointUsages = await tx.pointUsage.findMany({
      where: { transactionId }
    });

    for (const pu of pointUsages) {
      await tx.userPoint.update({
        where: { id: pu.userPointId },
        data: {
          amount: { increment: pu.amountUsed },
          isUsed: false
        }
      });
    }

    await tx.pointUsage.deleteMany({
      where: { transactionId }
    });

    // 3. Restore coupon (mark as unused)
    const transaction = await tx.transaction.findUnique({
      where: { id: transactionId }
    });

    if (transaction?.userCouponId) {
      await tx.userCoupon.update({
        where: { id: transaction.userCouponId },
        data: { isUsed: false, usedAt: null }
      });
    }

    // 4. Restore voucher (decrement usedCount)
    if (transaction?.eventVoucherId) {
      await tx.eventVoucher.update({
        where: { id: transaction.eventVoucherId },
        data: { usedCount: { decrement: 1 } }
      });

      // Delete voucher usage records
      await tx.eventVoucherUsage.deleteMany({
        where: { transactionId }
      });
    }
  }
};
