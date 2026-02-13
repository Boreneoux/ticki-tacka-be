import { prisma } from '../config/prisma-client.config';


export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
};


export const generateUniqueSlug = async (name: string): Promise<string> => {
  const baseSlug = generateSlug(name);

  const existingEvent = await prisma.event.findUnique({
    where: { slug: baseSlug },
    select: { id: true }
  });

  if (!existingEvent) return baseSlug;

  // Slug collision — find the next available suffix
  let suffix = 1;

  while (true) {
    const candidateSlug = `${baseSlug}-${suffix}`;

    const conflict = await prisma.event.findUnique({
      where: { slug: candidateSlug },
      select: { id: true }
    });

    if (!conflict) return candidateSlug;

    suffix++;
  }
};
