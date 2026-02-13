import { prisma } from '../config/prisma-client.config';
import { AppError } from '../utils/AppError';

export const locationService = {
  async getAllProvinces() {
    const provinces = await prisma.province.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true
      },
      orderBy: { name: 'asc' }
    });

    return provinces;
  },

  async getCitiesByProvince(provinceId: string) {
    const province = await prisma.province.findUnique({
      where: { id: provinceId, deletedAt: null }
    });

    if (!province) {
      throw new AppError('Province not found', 404);
    }

    const cities = await prisma.city.findMany({
      where: { provinceId, deletedAt: null },
      select: {
        id: true,
        name: true,
        provinceId: true
      },
      orderBy: { name: 'asc' }
    });

    return cities;
  }
};
