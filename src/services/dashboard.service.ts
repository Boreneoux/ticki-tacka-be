import { prisma } from '../config/prisma-client.config';
import { AppError } from '../utils/AppError';

interface GetOrganizerEventsQuery {
  status?: string;
  search?: string;
  category?: string;
  page?: string;
  limit?: string;
}

interface GetEventAttendeesQuery {
  page?: string;
  limit?: string;
}

interface GetStatisticsQuery {
  filterBy?: 'year' | 'month' | 'day';
  year?: string;
  month?: string;
}

async function resolveOrganizerId(userId: string): Promise<string> {
  const organizer = await prisma.organizer.findUnique({
    where: { userId }
  });

  if (!organizer) {
    throw new AppError('Organizer not found', 404);
  }

  return organizer.id;
}

export const dashboardService = {
  async getOrganizerEvents(userId: string, query: GetOrganizerEventsQuery) {
    const organizerId = await resolveOrganizerId(userId);

    const { status, search, category, page = '1', limit = '10' } = query;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Math.min(50, Number(limit)));

    const where: any = {
      organizerId,
      deletedAt: null
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive'
      };
    }

    if (category) {
      where.categoryId = category;
    }

    const [events, totalCount] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          city: { select: { id: true, name: true } },
          eventImages: { take: 1, select: { imageUrl: true } },
          ticketTypes: {
            select: {
              id: true,
              name: true,
              price: true,
              quota: true,
              soldCount: true
            }
          },
          _count: {
            select: { transactions: true }
          }
        },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.event.count({ where })
    ]);

    return {
      events,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    };
  },

  async getEventAttendees(
    userId: string,
    eventId: string,
    query: GetEventAttendeesQuery
  ) {
    const organizerId = await resolveOrganizerId(userId);

    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        organizerId,
        deletedAt: null
      },
      select: { id: true, name: true }
    });

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    const { page = '1', limit = '10' } = query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Math.min(50, Number(limit)));

    const where: any = {
      eventId,
      deletedAt: null,
      paymentStatus: 'done'
    };

    const [transactions, totalCount] = await Promise.all([
      prisma.transaction.findMany({
        where,
        select: {
          id: true,
          invoiceNumber: true,
          totalAmount: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              profilePictureUrl: true
            }
          },
          transactionItems: {
            select: {
              quantity: true,
              ticketType: {
                select: { name: true }
              }
            }
          }
        },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.transaction.count({ where })
    ]);

    const attendees = transactions.map(tx => {
      const totalTicketQty = tx.transactionItems.reduce(
        (sum, item) => sum + item.quantity,
        0
      );

      const ticketDetails = tx.transactionItems.map(item => ({
        ticketType: item.ticketType.name,
        quantity: item.quantity
      }));

      return {
        transactionId: tx.id,
        invoiceNumber: tx.invoiceNumber,
        user: tx.user,
        totalTicketQty,
        totalPaid: tx.totalAmount,
        ticketDetails,
        purchasedAt: tx.createdAt
      };
    });

    return {
      event: { id: event.id, name: event.name },
      attendees,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    };
  },

  async getStatistics(userId: string, query: GetStatisticsQuery) {
    const organizerId = await resolveOrganizerId(userId);

    const { filterBy = 'month', year, month } = query;

    const organizerEvents = await prisma.event.findMany({
      where: { organizerId, deletedAt: null },
      select: { id: true }
    });

    const eventIds = organizerEvents.map(e => e.id);
    const totalEvents = eventIds.length;

    if (totalEvents === 0) {
      return {
        summary: {
          totalRevenue: 0,
          totalEvents: 0,
          totalTicketsSold: 0,
          totalAttendees: 0
        },
        chartData: []
      };
    }

    const confirmedTransactions = await prisma.transaction.findMany({
      where: {
        eventId: { in: eventIds },
        paymentStatus: 'done',
        deletedAt: null
      },
      select: {
        totalAmount: true,
        createdAt: true,
        transactionItems: {
          select: { quantity: true }
        }
      }
    });

    const totalRevenue = confirmedTransactions.reduce(
      (sum, tx) => sum + tx.totalAmount,
      0
    );

    const totalTicketsSold = confirmedTransactions.reduce(
      (sum, tx) =>
        sum + tx.transactionItems.reduce((s, item) => s + item.quantity, 0),
      0
    );

    const totalAttendees = confirmedTransactions.length;

    const dateFilter: { gte?: Date; lt?: Date } = {};

    if (filterBy === 'month' || filterBy === 'day') {
      const targetYear = year ? Number(year) : new Date().getFullYear();
      dateFilter.gte = new Date(`${targetYear}-01-01T00:00:00.000Z`);
      dateFilter.lt = new Date(`${targetYear + 1}-01-01T00:00:00.000Z`);

      if (filterBy === 'day' && month) {
        const targetMonth = Math.max(1, Math.min(12, Number(month)));
        const startDate = new Date(
          `${targetYear}-${String(targetMonth).padStart(2, '0')}-01T00:00:00.000Z`
        );
        const endDate = new Date(startDate);
        endDate.setUTCMonth(endDate.getUTCMonth() + 1);

        dateFilter.gte = startDate;
        dateFilter.lt = endDate;
      }
    }

    const chartWhere: any = {
      eventId: { in: eventIds },
      paymentStatus: 'done',
      deletedAt: null
    };

    if (dateFilter.gte || dateFilter.lt) {
      chartWhere.createdAt = dateFilter;
    }

    const chartTransactions = await prisma.transaction.findMany({
      where: chartWhere,
      select: {
        totalAmount: true,
        createdAt: true,
        transactionItems: {
          select: { quantity: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    const grouped = new Map<
      string,
      { revenue: number; ticketsSold: number; transactions: number }
    >();

    for (const tx of chartTransactions) {
      const date = new Date(tx.createdAt);
      let key: string;

      switch (filterBy) {
        case 'year':
          key = `${date.getUTCFullYear()}`;
          break;
        case 'day':
          key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
          break;
        case 'month':
        default:
          key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
          break;
      }

      const existing = grouped.get(key) || {
        revenue: 0,
        ticketsSold: 0,
        transactions: 0
      };

      existing.revenue += tx.totalAmount;
      existing.ticketsSold += tx.transactionItems.reduce(
        (s, item) => s + item.quantity,
        0
      );
      existing.transactions += 1;

      grouped.set(key, existing);
    }

    const chartData = Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, data]) => ({
        label,
        revenue: data.revenue,
        ticketsSold: data.ticketsSold,
        transactions: data.transactions
      }));

    return {
      summary: {
        totalRevenue,
        totalEvents,
        totalTicketsSold,
        totalAttendees
      },
      chartData
    };
  },

  /**
   * GET /api/organizer/events/:eventId/statistics
   * Returns statistics for a single event:
   * - Total revenue, total tickets sold (with per-ticket-type breakdown), total attendees
   * - Chart data grouped by year, month, or day
   */
  async getEventStatistics(
    userId: string,
    eventId: string,
    query: GetStatisticsQuery
  ) {
    const organizerId = await resolveOrganizerId(userId);

    // Verify event ownership
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        organizerId,
        deletedAt: null
      },
      select: {
        id: true,
        name: true,
        status: true,
        eventDate: true,
        ticketTypes: {
          select: {
            id: true,
            name: true,
            price: true,
            quota: true,
            soldCount: true
          }
        }
      }
    });

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    const { filterBy = 'month', year, month } = query;

    // ---- Summary statistics ----

    const confirmedTransactions = await prisma.transaction.findMany({
      where: {
        eventId,
        paymentStatus: 'done',
        deletedAt: null
      },
      select: {
        totalAmount: true,
        createdAt: true,
        transactionItems: {
          select: {
            quantity: true,
            ticketTypeId: true
          }
        }
      }
    });

    const totalRevenue = confirmedTransactions.reduce(
      (sum, tx) => sum + tx.totalAmount,
      0
    );

    const totalTicketsSold = confirmedTransactions.reduce(
      (sum, tx) =>
        sum + tx.transactionItems.reduce((s, item) => s + item.quantity, 0),
      0
    );

    const totalAttendees = confirmedTransactions.length;

    // Per ticket type breakdown
    const ticketTypeMap = new Map<
      string,
      {
        name: string;
        price: number;
        quota: number;
        soldCount: number;
        revenue: number;
      }
    >();

    for (const tt of event.ticketTypes) {
      ticketTypeMap.set(tt.id, {
        name: tt.name,
        price: tt.price,
        quota: tt.quota,
        soldCount: tt.soldCount,
        revenue: 0
      });
    }

    // Calculate revenue per ticket type from confirmed transactions
    for (const tx of confirmedTransactions) {
      for (const item of tx.transactionItems) {
        const existing = ticketTypeMap.get(item.ticketTypeId);
        if (existing) {
          existing.revenue += existing.price * item.quantity;
        }
      }
    }

    const ticketBreakdown = Array.from(ticketTypeMap.values());

    // ---- Chart data ----

    const dateFilter: { gte?: Date; lt?: Date } = {};

    if (filterBy === 'month' || filterBy === 'day') {
      const targetYear = year ? Number(year) : new Date().getFullYear();
      dateFilter.gte = new Date(`${targetYear}-01-01T00:00:00.000Z`);
      dateFilter.lt = new Date(`${targetYear + 1}-01-01T00:00:00.000Z`);

      if (filterBy === 'day' && month) {
        const targetMonth = Math.max(1, Math.min(12, Number(month)));
        const startDate = new Date(
          `${targetYear}-${String(targetMonth).padStart(2, '0')}-01T00:00:00.000Z`
        );
        const endDate = new Date(startDate);
        endDate.setUTCMonth(endDate.getUTCMonth() + 1);

        dateFilter.gte = startDate;
        dateFilter.lt = endDate;
      }
    }

    const chartWhere: any = {
      eventId,
      paymentStatus: 'done',
      deletedAt: null
    };

    if (dateFilter.gte || dateFilter.lt) {
      chartWhere.createdAt = dateFilter;
    }

    const chartTransactions = await prisma.transaction.findMany({
      where: chartWhere,
      select: {
        totalAmount: true,
        createdAt: true,
        transactionItems: {
          select: { quantity: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    const grouped = new Map<
      string,
      { revenue: number; ticketsSold: number; transactions: number }
    >();

    for (const tx of chartTransactions) {
      const date = new Date(tx.createdAt);
      let key: string;

      switch (filterBy) {
        case 'year':
          key = `${date.getUTCFullYear()}`;
          break;
        case 'day':
          key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
          break;
        case 'month':
        default:
          key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
          break;
      }

      const existing = grouped.get(key) || {
        revenue: 0,
        ticketsSold: 0,
        transactions: 0
      };

      existing.revenue += tx.totalAmount;
      existing.ticketsSold += tx.transactionItems.reduce(
        (s, item) => s + item.quantity,
        0
      );
      existing.transactions += 1;

      grouped.set(key, existing);
    }

    const chartData = Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, data]) => ({
        label,
        revenue: data.revenue,
        ticketsSold: data.ticketsSold,
        transactions: data.transactions
      }));

    return {
      event: {
        id: event.id,
        name: event.name,
        status: event.status,
        eventDate: event.eventDate
      },
      summary: {
        totalRevenue,
        totalTicketsSold,
        totalAttendees
      },
      ticketBreakdown,
      chartData
    };
  }
};
