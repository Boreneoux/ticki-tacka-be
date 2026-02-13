import { prisma } from '../config/prisma-client.config';

export const categoryService = {
    async getAllCategories() {
        const categories = await prisma.eventCategory.findMany({
            where: { deletedAt: null },
            select: {
                id: true,
                name: true,
                slug: true
            },
            orderBy: { name: 'asc' }
        });

        return categories;
    }
};
