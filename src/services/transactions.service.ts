import { prisma } from '../config/prisma-client.config';
import { AppError } from '../utils/AppError';
import { PrismaClient } from '../generated/prisma/client';

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

function generateInvoiceNumber(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `INV-${dateStr}-${random}`;
}

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
        const result = await prisma.$transaction(
            async (tx: TransactionClient) => {
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
                        throw new AppError(
                            `Ticket type ${item.ticketTypeId} not found`,
                            404
                        );
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

                // 2. Apply points (FIFO by expiredAt)
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

                        // Mark point as used
                        await tx.userPoint.update({
                            where: { id: point.id },
                            data: { isUsed: true }
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
                        couponDiscount = Math.floor(
                            (subtotal * coupon.discountValue) / 100
                        );
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
                        throw new AppError(
                            'This voucher does not belong to this event',
                            400
                        );
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
            }
        );

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
    }
};
