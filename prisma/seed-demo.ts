/**
 * Demo Seed — seed-demo.ts
 *
 * Run AFTER prisma migrate reset (to wipe existing data), then
 * run the base seed first:   ts-node prisma/seed.ts
 * then run this demo seed:   ts-node prisma/seed-demo.ts
 *
 * What this seeds:
 *  • 8 users (2 required accounts + 6 extras for bulk transactions)
 *  • 1 organizer profile (for the EO user)
 *  • 1 referral (alice used testuser's referral code)
 *  • Points + coupon created from that referral
 *  • 32 events across all 12 categories (8 past + 24 future)
 *  • 2–3 ticket types per event
 *  • Event images (placeholder URLs) per event
 *  • Event vouchers on 2 future events
 *  • 35 transactions covering every status:
 *      waiting_for_payment, waiting_for_admin_confirmation, done, canceled, expired, rejected
 *  • Transaction items + individual ticket records
 *  • Point usage on one transaction (testuser uses 10 000 pts)
 *  • Coupon usage on one transaction (alice uses 10 % coupon)
 *  • Voucher usage on one transaction (charlie uses TECHCONF20)
 *  • 10 event reviews on past events
 */

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';

dotenv.config();

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// ─── helpers ────────────────────────────────────────────────────────────────

function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

function generateInvoiceNumber(n: number) {
  return `INV-20260101-SEED${String(n).padStart(2, '0')}`;
}

function generateTicketCode(prefix: string, n: number) {
  return `TKT-${prefix}${String(n).padStart(3, '0')}`;
}

/** past date helpers */
const D = (isoDate: string) => new Date(isoDate);
const addHours = (d: Date, h: number) => new Date(d.getTime() + h * 3_600_000);
const addDays = (d: Date, days: number) =>
  new Date(d.getTime() + days * 86_400_000);

// ─── seedUsers ───────────────────────────────────────────────────────────────

async function seedUsers() {
  console.log('👤 Seeding users...');

  const existing = await prisma.user.count();
  if (existing > 0) {
    console.log(`  ⚠️  Already has ${existing} users — skipping user seed.`);
    const users = await prisma.user.findMany({
      include: { organizer: true },
      orderBy: { createdAt: 'asc' }
    });
    return {
      testUser: users.find(u => u.email === 'user@test.com')!,
      eoUser: users.find(u => u.email === 'eo@test.com')!,
      alice: users.find(u => u.email === 'alice@test.com')!,
      bob: users.find(u => u.email === 'bob@test.com')!,
      charlie: users.find(u => u.email === 'charlie@test.com')!,
      diana: users.find(u => u.email === 'diana@test.com')!,
      evan: users.find(u => u.email === 'evan@test.com')!,
      fiona: users.find(u => u.email === 'fiona@test.com')!
    };
  }

  const [pw, eoPw, commonPw] = await Promise.all([
    hashPassword('Test1234!'),
    hashPassword('Test1234!'),
    hashPassword('Test1234!')
  ]);

  // ── required accounts ──────────────────────────────────────────────────
  const testUser = await prisma.user.create({
    data: {
      email: 'user@test.com',
      username: 'testuser',
      password: pw,
      fullName: 'Test User',
      phoneNumber: '08123456789',
      role: 'User',
      referralCode: 'TSTREF'
    }
  });

  const eoUser = await prisma.user.create({
    data: {
      email: 'eo@test.com',
      username: 'Si EO',
      password: eoPw,
      fullName: 'Xela Cyber',
      phoneNumber: '08198765312',
      role: 'EO',
      referralCode: 'EOREF1',
      organizer: {
        create: {
          organizerName: 'Xela Events',
          companyAddress: 'Pesanggrahan'
        }
      }
    }
  });

  // ── extra regular users ────────────────────────────────────────────────
  const extras = [
    {
      email: 'alice@test.com',
      username: 'alice_w',
      fullName: 'Alice Wijaya',
      phoneNumber: '08111110001',
      referralCode: 'ALICE1'
    },
    {
      email: 'bob@test.com',
      username: 'bob_s',
      fullName: 'Bob Santoso',
      phoneNumber: '08111110002',
      referralCode: 'BOBS01'
    },
    {
      email: 'charlie@test.com',
      username: 'charlie_p',
      fullName: 'Charlie Putra',
      phoneNumber: '08111110003',
      referralCode: 'CHARX1'
    },
    {
      email: 'diana@test.com',
      username: 'diana_k',
      fullName: 'Diana Kusuma',
      phoneNumber: '08111110004',
      referralCode: 'DIANK1'
    },
    {
      email: 'evan@test.com',
      username: 'evan_h',
      fullName: 'Evan Hartono',
      phoneNumber: '08111110005',
      referralCode: 'EVANH1'
    },
    {
      email: 'fiona@test.com',
      username: 'fiona_r',
      fullName: 'Fiona Rahayu',
      phoneNumber: '08111110006',
      referralCode: 'FIONAR'
    }
  ] as const;

  const created = await Promise.all(
    extras.map(u =>
      prisma.user.create({
        data: { ...u, password: commonPw, role: 'User' }
      })
    )
  );

  const [alice, bob, charlie, diana, evan, fiona] = created;

  console.log(`  ✅ 8 users created`);
  return { testUser, eoUser, alice, bob, charlie, diana, evan, fiona };
}

// ─── seedReferral ────────────────────────────────────────────────────────────

async function seedReferral(testUserId: string, aliceId: string) {
  console.log("🔗 Seeding referral (alice used testuser's code)...");

  const existing = await prisma.referral.count();
  if (existing > 0) {
    console.log(`  ⚠️  Already has referrals — skipping.`);
    const referral = await prisma.referral.findFirst({
      where: { referrerId: testUserId }
    });
    const point = await prisma.userPoint.findFirst({
      where: { userId: testUserId }
    });
    const coupon = await prisma.userCoupon.findFirst({
      where: { userId: aliceId }
    });
    return { referral: referral!, point: point!, coupon: coupon! };
  }

  const referral = await prisma.referral.create({
    data: {
      referrerId: testUserId,
      refereeId: aliceId,
      codeUsed: 'TSTREF'
    }
  });

  // testuser earns 10 000 points (expires 3 months from "now")
  const point = await prisma.userPoint.create({
    data: {
      userId: testUserId,
      amount: 10_000,
      source: 'referral',
      referralId: referral.id,
      expiredAt: D('2026-05-22T00:00:00Z')
    }
  });

  // alice gets a 10 % discount coupon (expires 3 months from "now")
  const coupon = await prisma.userCoupon.create({
    data: {
      userId: aliceId,
      couponCode: 'ALICE10PCT',
      discountType: 'percentage',
      discountValue: 10,
      referralId: referral.id,
      expiredAt: D('2026-05-22T00:00:00Z')
    }
  });

  console.log(
    '  ✅ Referral + 10 000 pts (testuser) + 10 % coupon (alice) created'
  );
  return { referral, point, coupon };
}

// ─── seedEvents ──────────────────────────────────────────────────────────────

async function seedEvents(organizerId: string) {
  console.log('🎉 Seeding events...');

  const existing = await prisma.event.count();
  if (existing > 0) {
    console.log(`  ⚠️  Already has ${existing} events — skipping event seed.`);
    return prisma.event.findMany({ include: { ticketTypes: true } });
  }

  // Fetch categories by slug
  const cats = await prisma.eventCategory.findMany();
  const cat = (slug: string) => cats.find(c => c.slug === slug)!.id;

  // Fetch cities by exact name
  const allCities = await prisma.city.findMany();
  const city = (name: string) => {
    const found = allCities.find(c => c.name === name);
    if (!found) throw new Error(`City not found: ${name}`);
    return found.id;
  };

  // Placeholder cover image utility
  const img = (text: string, bg: string) =>
    `https://placehold.co/800x400/${bg}/ffffff?text=${encodeURIComponent(text)}`;

  const eventsData = [
    // ================================================================
    // PAST EVENTS  (eventDate < today, status published)
    // ================================================================
    {
      slug: 'jazz-night-jakarta-jan-2026',
      name: 'Jazz Night Jakarta',
      categoryId: cat('music'),
      eventDate: D('2026-01-15'),
      eventTime: D('2026-01-15T19:00:00Z'),
      endDate: D('2026-01-15'),
      endTime: D('2026-01-15T23:00:00Z'),
      cityId: city('Jakarta Pusat'),
      venueName: 'Gedung Kesenian Jakarta',
      venueAddress: 'Jl. Pos No. 1, Pasar Baru, Jakarta Pusat',
      description:
        "A night filled with smooth jazz from Indonesia's finest jazz musicians. Enjoy an unforgettable evening with world-class performances in one of Jakarta's most iconic venues. The event features both classic jazz standards and original compositions from the artists.",
      status: 'published',
      imageUrl: img('Jazz Night Jakarta', '1a1a2e'),
      imagePid: 'seed/events/jazz-night-jakarta',
      tickets: [
        { name: 'General Admission', price: 150_000, quota: 200, soldCount: 3 },
        {
          name: 'VIP',
          description: 'Front-row seat + 1 complimentary drink',
          price: 350_000,
          quota: 50,
          soldCount: 1
        }
      ]
    },
    {
      slug: 'web-dev-bootcamp-jan-2026',
      name: 'Web Dev Bootcamp',
      categoryId: cat('technology'),
      eventDate: D('2026-01-20'),
      eventTime: D('2026-01-20T09:00:00Z'),
      endDate: D('2026-01-22'),
      endTime: D('2026-01-22T17:00:00Z'),
      cityId: city('Jakarta Selatan'),
      venueName: 'Hackerspace.ID',
      venueAddress: 'Jl. Kemang Selatan VIII No. 60, Jakarta Selatan',
      description:
        'Intensive 3-day bootcamp covering React, Node.js, and PostgreSQL. By the end you will ship a full-stack project. Meals and printed notes are included.',
      status: 'published',
      imageUrl: img('Web Dev Bootcamp', '0f3460'),
      imagePid: 'seed/events/web-dev-bootcamp',
      tickets: [
        { name: 'Regular', price: 250_000, quota: 100, soldCount: 2 },
        {
          name: 'Premium',
          description: 'Includes 1-month mentoring after the event',
          price: 500_000,
          quota: 50,
          soldCount: 2
        }
      ]
    },
    {
      slug: 'food-truck-festival-bandung-jan-2026',
      name: 'Food Truck Festival Bandung',
      categoryId: cat('food-drink'),
      eventDate: D('2026-01-25'),
      eventTime: D('2026-01-25T10:00:00Z'),
      endDate: D('2026-01-25'),
      endTime: D('2026-01-25T21:00:00Z'),
      cityId: city('Bandung'),
      venueName: 'Lapangan Gasibu',
      venueAddress: 'Jl. Diponegoro, Citarum, Bandung',
      description:
        'Over 50 food trucks gathered at Gasibu field. Street food paradise from across the archipelago. Live music, cooking demos, and family-friendly activities throughout the day.',
      status: 'published',
      imageUrl: img('Food Truck Festival', 'e84545'),
      imagePid: 'seed/events/food-truck-festival-bandung',
      tickets: [
        { name: 'Visitor Pass', price: 50_000, quota: 500, soldCount: 3 },
        {
          name: 'VIP Table',
          description: 'Reserved table for 4 + complimentary appetisers',
          price: 150_000,
          quota: 50,
          soldCount: 1
        }
      ]
    },
    {
      slug: '5k-fun-run-jakarta-feb-2026',
      name: '5K Fun Run Jakarta',
      categoryId: cat('sports'),
      eventDate: D('2026-02-01'),
      eventTime: D('2026-02-01T06:00:00Z'),
      endDate: D('2026-02-01'),
      endTime: D('2026-02-01T09:00:00Z'),
      cityId: city('Jakarta Pusat'),
      venueName: 'Monas Area',
      venueAddress: 'Monumen Nasional, Gambir, Jakarta Pusat',
      description:
        'Join hundreds of runners for a fun 5K loop around the iconic Monas monument. All fitness levels welcome. Finisher medal, hydration stations, and post-run breakfast included.',
      status: 'published',
      imageUrl: img('5K Fun Run', '2c7873'),
      imagePid: 'seed/events/5k-fun-run-jakarta',
      tickets: [
        { name: 'Regular', price: 75_000, quota: 300, soldCount: 4 },
        {
          name: 'Premium',
          description: 'Includes race jersey + medal',
          price: 150_000,
          quota: 100,
          soldCount: 2
        }
      ]
    },
    {
      slug: 'stand-up-comedy-night-surabaya-feb-2026',
      name: 'Stand Up Comedy Night Surabaya',
      categoryId: cat('entertainment'),
      eventDate: D('2026-02-05'),
      eventTime: D('2026-02-05T19:30:00Z'),
      endDate: D('2026-02-05'),
      endTime: D('2026-02-05T22:30:00Z'),
      cityId: city('Surabaya'),
      venueName: 'Surabaya Town Hall',
      venueAddress: 'Jl. Yos Sudarso No. 9, Surabaya',
      description:
        "Three of Indonesia's most-loved stand-up comedians hit the stage in Surabaya for one unforgettable night of laughter. Parental advisory: adult humour.",
      status: 'published',
      imageUrl: img('Stand Up Comedy Night', '3a1078'),
      imagePid: 'seed/events/stand-up-comedy-surabaya',
      tickets: [
        { name: 'Standard', price: 100_000, quota: 200, soldCount: 3 },
        {
          name: 'Front Row',
          description: 'Seats A1–D10 closest to the stage',
          price: 250_000,
          quota: 40,
          soldCount: 1
        }
      ]
    },
    {
      slug: 'digital-marketing-seminar-feb-2026',
      name: 'Digital Marketing Seminar',
      categoryId: cat('education'),
      eventDate: D('2026-02-10'),
      eventTime: D('2026-02-10T09:00:00Z'),
      endDate: D('2026-02-10'),
      endTime: D('2026-02-10T17:00:00Z'),
      cityId: city('Jakarta Pusat'),
      venueName: 'Grand Hyatt Jakarta',
      venueAddress: 'Jl. MH Thamrin No. 28-30, Jakarta Pusat',
      description:
        'Full-day seminar covering SEO, paid ads, social media strategy, and content marketing. All participants receive a certificate and exclusive recorded sessions.',
      status: 'published',
      imageUrl: img('Digital Marketing Seminar', '1565c0'),
      imagePid: 'seed/events/digital-marketing-seminar',
      tickets: [
        { name: 'Regular', price: 200_000, quota: 150, soldCount: 2 },
        {
          name: 'Workshop',
          description: 'Includes hands-on practise session in the afternoon',
          price: 450_000,
          quota: 50,
          soldCount: 2
        }
      ]
    },
    {
      slug: 'indie-movie-night-yogyakarta-feb-2026',
      name: 'Indie Movie Night Yogyakarta',
      categoryId: cat('arts-culture'),
      eventDate: D('2026-02-15'),
      eventTime: D('2026-02-15T18:00:00Z'),
      endDate: D('2026-02-15'),
      endTime: D('2026-02-15T22:00:00Z'),
      cityId: city('Yogyakarta'),
      venueName: 'Taman Budaya Yogyakarta',
      venueAddress: 'Jl. Sri Wedani No. 1, Yogyakarta',
      description:
        'Curated screening of four award-winning Indonesian indie films followed by a Q&A with the directors. Popcorn and soft drinks included in the ticket price.',
      status: 'published',
      imageUrl: img('Indie Movie Night', '4a235a'),
      imagePid: 'seed/events/indie-movie-night-yogya',
      tickets: [
        { name: 'Regular', price: 85_000, quota: 150, soldCount: 2 },
        {
          name: 'Couple',
          description: 'Entry for two + shared snack platter',
          price: 150_000,
          quota: 30,
          soldCount: 1
        }
      ]
    },
    {
      slug: 'zumba-fitness-camp-bandung-feb-2026',
      name: 'Zumba Fitness Camp Bandung',
      categoryId: cat('health-wellness'),
      eventDate: D('2026-02-20'),
      eventTime: D('2026-02-20T07:00:00Z'),
      endDate: D('2026-02-20'),
      endTime: D('2026-02-20T10:00:00Z'),
      cityId: city('Bandung'),
      venueName: 'Sportclub Arcamanik',
      venueAddress: 'Jl. Arcamanik Endah No. 1, Bandung',
      description:
        'High-energy outdoor Zumba session led by certified instructors. Suitable for all fitness levels. Bring water and a towel. Healthy breakfast box included.',
      status: 'published',
      imageUrl: img('Zumba Fitness Camp', '00897b'),
      imagePid: 'seed/events/zumba-fitness-camp-bandung',
      tickets: [
        { name: 'Early Bird', price: 60_000, quota: 200, soldCount: 3 },
        { name: 'Walk-in', price: 100_000, quota: 100, soldCount: 1 }
      ]
    },

    // ================================================================
    // FUTURE EVENTS
    // ================================================================
    {
      slug: 'tech-conference-2026',
      name: 'Tech Conference 2026',
      categoryId: cat('technology'),
      eventDate: D('2026-03-15'),
      eventTime: D('2026-03-15T09:00:00Z'),
      endDate: D('2026-03-16'),
      endTime: D('2026-03-16T17:00:00Z'),
      cityId: city('Jakarta Pusat'),
      venueName: 'Jakarta Convention Center',
      venueAddress: 'Jl. Gatot Subroto, Senayan, Jakarta Pusat',
      description:
        'The biggest tech gathering in Southeast Asia. Two days of keynotes, workshops, and networking sessions featuring CTOs, startup founders, and engineers from top tech companies. Topics span AI, cloud, mobile, and open source.',
      status: 'published',
      imageUrl: img('Tech Conference 2026', '263238'),
      imagePid: 'seed/events/tech-conference-2026',
      tickets: [
        { name: 'Early Bird', price: 300_000, quota: 100, soldCount: 1 },
        { name: 'General', price: 500_000, quota: 500, soldCount: 2 },
        {
          name: 'VIP',
          description:
            'All-access pass including exclusive workshops and speaker dinner',
          price: 1_000_000,
          quota: 50,
          soldCount: 1
        }
      ]
    },
    {
      slug: 'music-festival-nusantara-2026',
      name: 'Music Festival Nusantara',
      categoryId: cat('music'),
      eventDate: D('2026-03-20'),
      eventTime: D('2026-03-20T15:00:00Z'),
      endDate: D('2026-03-21'),
      endTime: D('2026-03-21T23:00:00Z'),
      cityId: city('Bandung'),
      venueName: 'Stadion Si Jalak Harupat',
      venueAddress: 'Jl. Kopo Soreang KM 11, Bandung',
      description:
        'A two-day festival celebrating Indonesian music across genres: indie pop, rock, electronic, and traditional fusion. 20+ acts, 3 stages, food zone and art installations.',
      status: 'published',
      imageUrl: img('Music Festival Nusantara', '880e4f'),
      imagePid: 'seed/events/music-festival-nusantara',
      tickets: [
        {
          name: 'General Admission',
          price: 200_000,
          quota: 5000,
          soldCount: 1
        },
        {
          name: 'VIP Festival Pass',
          description: 'VIP deck access both days + exclusive merchandise',
          price: 500_000,
          quota: 200,
          soldCount: 1
        }
      ]
    },
    {
      slug: 'startup-summit-indonesia-2026',
      name: 'Startup Summit Indonesia 2026',
      categoryId: cat('business'),
      eventDate: D('2026-03-25'),
      eventTime: D('2026-03-25T09:00:00Z'),
      endDate: D('2026-03-25'),
      endTime: D('2026-03-25T18:00:00Z'),
      cityId: city('Jakarta Selatan'),
      venueName: 'The Ritz-Carlton Pacific Place',
      venueAddress: 'Jl. Jenderal Sudirman Kav 52-53, SCBD, Jakarta Selatan',
      description:
        "Indonesia's premier pitch competition and startup networking event. Founders, investors, and mentors converge for one day of deals, ideas, and inspiration.",
      status: 'published',
      imageUrl: img('Startup Summit Indonesia', '1b5e20'),
      imagePid: 'seed/events/startup-summit-indonesia',
      tickets: [
        { name: 'Attendee', price: 350_000, quota: 300, soldCount: 1 },
        {
          name: 'Investor Pass',
          description: 'Access to pitch sessions + private networking lunch',
          price: 700_000,
          quota: 50,
          soldCount: 1
        }
      ]
    },
    {
      slug: 'bali-food-and-wine-festival-2026',
      name: 'Bali Food & Wine Festival 2026',
      categoryId: cat('food-drink'),
      eventDate: D('2026-04-01'),
      eventTime: D('2026-04-01T11:00:00Z'),
      endDate: D('2026-04-03'),
      endTime: D('2026-04-03T22:00:00Z'),
      cityId: city('Denpasar'),
      venueName: 'Nusa Dua Beach Hotel',
      venueAddress: 'Kawasan BTDC, Nusa Dua, Bali',
      description:
        'Three days of curated culinary experiences featuring Michelin-starred chefs, local Balinese cuisine masters, and top Indonesian wineries. Cooking classes, tasting sessions, and gala dinners.',
      status: 'published',
      imageUrl: img('Bali Food & Wine Festival', 'b71c1c'),
      imagePid: 'seed/events/bali-food-wine-festival',
      tickets: [
        { name: 'Day Pass', price: 300_000, quota: 200, soldCount: 0 },
        {
          name: '3-Day Festival Pass',
          price: 750_000,
          quota: 100,
          soldCount: 0
        }
      ]
    },
    {
      slug: 'yoga-wellness-retreat-yogyakarta-2026',
      name: 'Yoga & Wellness Retreat Yogyakarta',
      categoryId: cat('health-wellness'),
      eventDate: D('2026-04-05'),
      eventTime: D('2026-04-05T07:00:00Z'),
      endDate: D('2026-04-06'),
      endTime: D('2026-04-06T15:00:00Z'),
      cityId: city('Yogyakarta'),
      venueName: 'Pawon Bumi Retreat',
      venueAddress: 'Jl. Parangtritis KM 7, Bantul, Yogyakarta',
      description:
        "A 2-day yoga and mindfulness retreat surrounded by Yogyakarta's lush countryside. Guided sessions by certified instructors cover Hatha, Vinyasa, and Yin. Organic vegetarian meals, sound bath, and free time included.",
      status: 'published',
      imageUrl: img('Yoga & Wellness Retreat', '388e3c'),
      imagePid: 'seed/events/yoga-wellness-retreat-yogya',
      tickets: [
        { name: 'Day Participant', price: 350_000, quota: 50, soldCount: 0 },
        {
          name: 'Full Retreat (2 Days)',
          description: 'Both days + accommodation + all meals',
          price: 850_000,
          quota: 30,
          soldCount: 0
        }
      ]
    },
    {
      slug: 'street-art-exhibition-bandung-2026',
      name: 'Street Art Exhibition Bandung',
      categoryId: cat('arts-culture'),
      eventDate: D('2026-04-10'),
      eventTime: D('2026-04-10T10:00:00Z'),
      endDate: D('2026-04-12'),
      endTime: D('2026-04-12T21:00:00Z'),
      cityId: city('Bandung'),
      venueName: 'Gedung Sate Outdoor Area',
      venueAddress: 'Jl. Diponegoro No. 22, Bandung',
      description:
        'A 3-day outdoor exhibition showcasing the works of 30 street artists from across Indonesia. Live mural painting, graffiti workshops, and artist talks.',
      status: 'published',
      imageUrl: img('Street Art Exhibition', '4a148c'),
      imagePid: 'seed/events/street-art-exhibition-bandung',
      tickets: [{ name: 'Free Entry', price: 0, quota: 2000, soldCount: 0 }]
    },
    {
      slug: 'badminton-open-tournament-surabaya-2026',
      name: 'Badminton Open Tournament Surabaya',
      categoryId: cat('sports'),
      eventDate: D('2026-04-15'),
      eventTime: D('2026-04-15T08:00:00Z'),
      endDate: D('2026-04-17'),
      endTime: D('2026-04-17T18:00:00Z'),
      cityId: city('Surabaya'),
      venueName: 'GOR Sudirman Surabaya',
      venueAddress: 'Jl. Indrapura No. 7, Surabaya',
      description:
        "Amateur and semi-professional doubles badminton tournament. Categories: mixed doubles, men's doubles, women's doubles. Total prize pool: IDR 50 000 000.",
      status: 'published',
      imageUrl: img('Badminton Open Tournament', '01579b'),
      imagePid: 'seed/events/badminton-open-surabaya',
      tickets: [
        { name: 'Spectator (Daily)', price: 35_000, quota: 500, soldCount: 0 },
        {
          name: 'Spectator (All Days)',
          price: 75_000,
          quota: 200,
          soldCount: 0
        }
      ]
    },
    {
      slug: 'photography-workshop-jakarta-2026',
      name: 'Photography Workshop Jakarta',
      categoryId: cat('education'),
      eventDate: D('2026-04-20'),
      eventTime: D('2026-04-20T09:00:00Z'),
      endDate: D('2026-04-20'),
      endTime: D('2026-04-20T17:00:00Z'),
      cityId: city('Jakarta Pusat'),
      venueName: 'Dia.lo.gue Artspace',
      venueAddress: 'Jl. Kemang Selatan 99a, Jakarta Selatan',
      description:
        'Hands-on full-day photography workshop covering composition, lighting, and post-processing in Lightroom. Suitable for beginners and intermediate photographers.',
      status: 'published',
      imageUrl: img('Photography Workshop', '37474f'),
      imagePid: 'seed/events/photography-workshop-jakarta',
      tickets: [
        { name: 'Regular', price: 250_000, quota: 30, soldCount: 0 },
        {
          name: 'Mentorship',
          description:
            'Includes 1-on-1 photo critique session after the workshop',
          price: 450_000,
          quota: 10,
          soldCount: 0
        }
      ]
    },
    {
      slug: 'community-clean-up-day-jakarta-2026',
      name: 'Community Clean Up Day Jakarta',
      categoryId: cat('community'),
      eventDate: D('2026-04-25'),
      eventTime: D('2026-04-25T07:00:00Z'),
      endDate: D('2026-04-25'),
      endTime: D('2026-04-25T12:00:00Z'),
      cityId: city('Jakarta Pusat'),
      venueName: 'Kali Ciliwung Area',
      venueAddress: 'Jl. Inspeksi Kali Ciliwung, Jakarta Pusat',
      description:
        "Join hundreds of volunteers for a morning clean-up of the Ciliwung riverbank. All equipment provided. Breakfast and refreshments included. Let's make Jakarta cleaner together!",
      status: 'published',
      imageUrl: img('Community Clean Up Day', '33691e'),
      imagePid: 'seed/events/community-cleanup-jakarta',
      tickets: [
        { name: 'Volunteer Registration', price: 0, quota: 500, soldCount: 0 }
      ]
    },
    {
      slug: 'esports-championship-jakarta-2026',
      name: 'National Esports Championship 2026',
      categoryId: cat('gaming-esports'),
      eventDate: D('2026-05-01'),
      eventTime: D('2026-05-01T10:00:00Z'),
      endDate: D('2026-05-03'),
      endTime: D('2026-05-03T21:00:00Z'),
      cityId: city('Jakarta Selatan'),
      venueName: 'ICE BSD Arena',
      venueAddress: 'Jl. BSD Grand Boulevard, Tangerang Selatan',
      description:
        'Three days of epic esports competition across Mobile Legends and PUBG Mobile. Team registration is sold separately. Spectator tickets on sale now.',
      status: 'published',
      imageUrl: img('National Esports Championship', '212121'),
      imagePid: 'seed/events/esports-championship-jakarta',
      tickets: [
        { name: 'Daily Spectator', price: 75_000, quota: 1000, soldCount: 0 },
        {
          name: '3-Day Pass',
          description: 'All 3 days + exclusive merch pack',
          price: 175_000,
          quota: 300,
          soldCount: 0
        }
      ]
    },
    {
      slug: 'mountain-hiking-malang-2026',
      name: 'Semeru Mountain Hiking Expedition',
      categoryId: cat('travel-outdoor'),
      eventDate: D('2026-05-05'),
      eventTime: D('2026-05-05T05:00:00Z'),
      endDate: D('2026-05-07'),
      endTime: D('2026-05-07T15:00:00Z'),
      cityId: city('Malang'),
      venueName: 'Ranu Pani Trailhead',
      venueAddress: 'Desa Ranu Pani, Senduro, Lumajang, Jawa Timur',
      description:
        'Guided 3-day trekking experience to the foothills of Semeru. Certified mountain guides, camping equipment, and meals provided. Physical fitness prerequisite applies.',
      status: 'published',
      imageUrl: img('Mountain Hiking Expedition', '1b5e20'),
      imagePid: 'seed/events/mountain-hiking-malang',
      tickets: [
        { name: 'Standard Package', price: 750_000, quota: 20, soldCount: 0 },
        {
          name: 'Premium Package',
          description: 'Better tent, private guide, and photography service',
          price: 1_200_000,
          quota: 10,
          soldCount: 0
        }
      ]
    },
    {
      slug: 'ai-ml-workshop-jakarta-2026',
      name: 'AI & Machine Learning Workshop',
      categoryId: cat('technology'),
      eventDate: D('2026-05-10'),
      eventTime: D('2026-05-10T09:00:00Z'),
      endDate: D('2026-05-10'),
      endTime: D('2026-05-10T17:00:00Z'),
      cityId: city('Jakarta Pusat'),
      venueName: 'Coworking WeWork Thamrin',
      venueAddress: 'Jl. MH Thamrin, Jakarta Pusat',
      description:
        'Hands-on workshop introducing machine learning fundamentals using Python and TensorFlow. No prior ML experience required. Laptop mandatory.',
      status: 'published',
      imageUrl: img('AI & ML Workshop', '0d47a1'),
      imagePid: 'seed/events/ai-ml-workshop-jakarta',
      tickets: [
        { name: 'Regular', price: 300_000, quota: 40, soldCount: 0 },
        {
          name: 'Premium',
          description: 'Includes cloud credits + 3-month online course access',
          price: 600_000,
          quota: 15,
          soldCount: 0
        }
      ]
    },
    {
      slug: 'rock-concert-night-jakarta-2026',
      name: 'Rock Concert Night Jakarta',
      categoryId: cat('music'),
      eventDate: D('2026-05-15'),
      eventTime: D('2026-05-15T19:00:00Z'),
      endDate: D('2026-05-15'),
      endTime: D('2026-05-15T23:30:00Z'),
      cityId: city('Jakarta Selatan'),
      venueName: 'Tennis Indoor Senayan',
      venueAddress: 'Komplek Gelora Bung Karno, Senayan, Jakarta Selatan',
      description:
        "Indonesia's top rock bands take the stage in one electrifying night. Headlined by Noah and Sheila on 7, with three supporting acts. Bring your loudest cheers!",
      status: 'published',
      imageUrl: img('Rock Concert Night', 'b71c1c'),
      imagePid: 'seed/events/rock-concert-night-jakarta',
      tickets: [
        { name: 'Standing', price: 250_000, quota: 3000, soldCount: 0 },
        { name: 'Seated', price: 400_000, quota: 500, soldCount: 0 },
        {
          name: 'VIP',
          description: 'VIP pit area + meet & greet pass',
          price: 800_000,
          quota: 100,
          soldCount: 0
        }
      ]
    },
    {
      slug: 'entrepreneurs-meetup-surabaya-2026',
      name: 'Entrepreneurs Meetup Surabaya',
      categoryId: cat('business'),
      eventDate: D('2026-05-20'),
      eventTime: D('2026-05-20T18:00:00Z'),
      endDate: D('2026-05-20'),
      endTime: D('2026-05-20T21:00:00Z'),
      cityId: city('Surabaya'),
      venueName: 'Spazio Graha Family',
      venueAddress: 'Jl. Mayjen Yono Soewoyo, Surabaya',
      description:
        'Monthly Surabaya entrepreneurs meetup. This edition focuses on sustainable business models. Speed networking, panel discussion, and refreshments included.',
      status: 'published',
      imageUrl: img('Entrepreneurs Meetup', '1a237e'),
      imagePid: 'seed/events/entrepreneurs-meetup-surabaya',
      tickets: [
        { name: 'Early Bird', price: 100_000, quota: 100, soldCount: 0 },
        { name: 'Regular', price: 150_000, quota: 100, soldCount: 0 }
      ]
    },
    {
      slug: 'kids-painting-workshop-semarang-2026',
      name: 'Kids Painting Workshop Semarang',
      categoryId: cat('arts-culture'),
      eventDate: D('2026-05-25'),
      eventTime: D('2026-05-25T09:00:00Z'),
      endDate: D('2026-05-25'),
      endTime: D('2026-05-25T12:00:00Z'),
      cityId: city('Semarang'),
      venueName: 'Lawang Sewu Pavilion',
      venueAddress: 'Komplek Tugu Muda, Semarang',
      description:
        'A fun painting workshop designed for children aged 5–12. Professional art instructors guide kids through watercolour techniques. All materials provided, parents welcome.',
      status: 'published',
      imageUrl: img('Kids Painting Workshop', 'fbc02d'),
      imagePid: 'seed/events/kids-painting-semarang',
      tickets: [
        { name: 'Child Ticket', price: 85_000, quota: 50, soldCount: 0 }
      ]
    },
    {
      slug: 'volleyball-championship-makassar-2026',
      name: 'Volleyball Championship Makassar',
      categoryId: cat('sports'),
      eventDate: D('2026-06-01'),
      eventTime: D('2026-06-01T08:00:00Z'),
      endDate: D('2026-06-02'),
      endTime: D('2026-06-02T18:00:00Z'),
      cityId: city('Makassar'),
      venueName: 'GOR Sudiang Makassar',
      venueAddress: 'Jl. Perintis Kemerdekaan KM 14, Makassar',
      description:
        'Inter-city volleyball competition featuring 16 teams from Eastern Indonesia. Free spectator access on Day 1. Final match on Day 2 requires ticket.',
      status: 'published',
      imageUrl: img('Volleyball Championship', 'e65100'),
      imagePid: 'seed/events/volleyball-championship-makassar',
      tickets: [
        { name: 'Finals Spectator', price: 40_000, quota: 300, soldCount: 0 }
      ]
    },
    {
      slug: 'online-gaming-tournament-medan-2026',
      name: 'Online Gaming Tournament Medan',
      categoryId: cat('gaming-esports'),
      eventDate: D('2026-06-05'),
      eventTime: D('2026-06-05T10:00:00Z'),
      endDate: D('2026-06-05'),
      endTime: D('2026-06-05T20:00:00Z'),
      cityId: city('Medan'),
      venueName: 'Sun Plaza Medan Hall',
      venueAddress: 'Jl. KH Zainul Arifin No. 7, Medan',
      description:
        'Mobile Legends solo-ranked tournament with a prize pool of IDR 25 000 000. Online registration linked from the ticket purchase page.',
      status: 'published',
      imageUrl: img('Online Gaming Tournament', '004d40'),
      imagePid: 'seed/events/online-gaming-tournament-medan',
      tickets: [
        {
          name: 'Player Registration',
          price: 50_000,
          quota: 256,
          soldCount: 0
        },
        { name: 'Spectator', price: 25_000, quota: 200, soldCount: 0 }
      ]
    },
    {
      slug: 'beach-cleanup-snorkeling-bali-2026',
      name: 'Beach Clean-up & Snorkeling Bali',
      categoryId: cat('travel-outdoor'),
      eventDate: D('2026-06-10'),
      eventTime: D('2026-06-10T07:30:00Z'),
      endDate: D('2026-06-10'),
      endTime: D('2026-06-10T14:00:00Z'),
      cityId: city('Denpasar'),
      venueName: 'Nusa Dua Beach',
      venueAddress: 'Pantai Nusa Dua, Badung, Bali',
      description:
        "Morning beach clean-up followed by a guided snorkelling session in Nusa Dua's crystal-clear waters. Equipment, lunch, and boat fee included.",
      status: 'published',
      imageUrl: img('Beach Cleanup & Snorkeling', '006064'),
      imagePid: 'seed/events/beach-cleanup-bali',
      tickets: [
        { name: 'Participant', price: 175_000, quota: 60, soldCount: 0 }
      ]
    },
    {
      slug: 'mental-health-forum-jakarta-2026',
      name: 'Mental Health Forum Jakarta',
      categoryId: cat('health-wellness'),
      eventDate: D('2026-06-15'),
      eventTime: D('2026-06-15T09:00:00Z'),
      endDate: D('2026-06-15'),
      endTime: D('2026-06-15T17:00:00Z'),
      cityId: city('Jakarta Pusat'),
      venueName: 'Balai Sidang Jakarta',
      venueAddress: 'Jl. Gatot Subroto, Jakarta Pusat',
      description:
        'A public forum shedding light on mental health in Indonesia. Keynote addresses, panel discussions, and breakout workshops led by licensed psychologists and psychiatrists.',
      status: 'published',
      imageUrl: img('Mental Health Forum', '4a148c'),
      imagePid: 'seed/events/mental-health-forum-jakarta',
      tickets: [{ name: 'General', price: 0, quota: 500, soldCount: 0 }]
    },
    {
      slug: 'neighborhood-festival-bandung-2026',
      name: 'Neighborhood Festival Bandung',
      categoryId: cat('community'),
      eventDate: D('2026-06-20'),
      eventTime: D('2026-06-20T10:00:00Z'),
      endDate: D('2026-06-21'),
      endTime: D('2026-06-21T22:00:00Z'),
      cityId: city('Bandung'),
      venueName: 'Dago Car Free Day Area',
      venueAddress: 'Jl. Ir. H. Djuanda (Dago), Bandung',
      description:
        "A family-friendly two-day neighbourhood celebration featuring local UMKM markets, live performances, children's activities, and food stalls.",
      status: 'published',
      imageUrl: img('Neighborhood Festival', 'f57f17'),
      imagePid: 'seed/events/neighborhood-festival-bandung',
      tickets: [{ name: 'Free Entry', price: 0, quota: 3000, soldCount: 0 }]
    },
    {
      slug: 'theater-performance-yogyakarta-2026',
      name: 'Theater Performance: Malin Kundang',
      categoryId: cat('entertainment'),
      eventDate: D('2026-06-25'),
      eventTime: D('2026-06-25T19:30:00Z'),
      endDate: D('2026-06-25'),
      endTime: D('2026-06-25T22:00:00Z'),
      cityId: city('Yogyakarta'),
      venueName: 'Teater Garasi',
      venueAddress: 'Jl. Jomblangan No. 48B, Banguntapan, Yogyakarta',
      description:
        'An avant-garde theatre adaptation of the classic Malin Kundang legend. Direction by Yudi Ahmad Tajudin. Minimalist staging, powerful performances.',
      status: 'published',
      imageUrl: img('Theater Performance', '3e2723'),
      imagePid: 'seed/events/theater-malin-kundang-yogya',
      tickets: [
        { name: 'Regular', price: 120_000, quota: 100, soldCount: 0 },
        {
          name: 'Premium',
          description: 'Priority seating + post-show talk-back session',
          price: 200_000,
          quota: 30,
          soldCount: 0
        }
      ]
    },
    {
      slug: 'pop-music-concert-surabaya-2026',
      name: 'Pop Music Concert Surabaya',
      categoryId: cat('music'),
      eventDate: D('2026-07-01'),
      eventTime: D('2026-07-01T18:30:00Z'),
      endDate: D('2026-07-01'),
      endTime: D('2026-07-01T22:30:00Z'),
      cityId: city('Surabaya'),
      venueName: 'Graha Pena Surabaya',
      venueAddress: 'Jl. Ahmad Yani No. 88, Surabaya',
      description:
        'A night of exciting hits featuring top Indonesian pop and OPM artists. Expect sing-alongs, confetti rains, and fireworks at the grand finale.',
      status: 'published',
      imageUrl: img('Pop Music Concert', 'e91e63'),
      imagePid: 'seed/events/pop-concert-surabaya',
      tickets: [
        { name: 'Tribune', price: 175_000, quota: 1500, soldCount: 0 },
        { name: 'Festival', price: 300_000, quota: 500, soldCount: 0 }
      ]
    },
    {
      slug: 'cloud-computing-summit-jakarta-2026',
      name: 'Cloud Computing Summit Jakarta',
      categoryId: cat('technology'),
      eventDate: D('2026-07-10'),
      eventTime: D('2026-07-10T09:00:00Z'),
      endDate: D('2026-07-10'),
      endTime: D('2026-07-10T17:00:00Z'),
      cityId: city('Jakarta Pusat'),
      venueName: 'Pullman Jakarta Central Park',
      venueAddress: 'Jl. Let. Jend. S. Parman, Jakarta Barat',
      description:
        'Cloud-focused summit featuring representatives from AWS, Google Cloud, and Azure. Sessions on infrastructure, cost optimisation, and cloud-native development.',
      status: 'published',
      imageUrl: img('Cloud Computing Summit', '0277bd'),
      imagePid: 'seed/events/cloud-computing-summit-jakarta',
      tickets: [{ name: 'Attendee', price: 200_000, quota: 200, soldCount: 0 }]
    },
    {
      slug: 'food-photography-masterclass-jakarta-2026',
      name: 'Food Photography Masterclass',
      categoryId: cat('food-drink'),
      eventDate: D('2026-07-15'),
      eventTime: D('2026-07-15T10:00:00Z'),
      endDate: D('2026-07-15'),
      endTime: D('2026-07-15T16:00:00Z'),
      cityId: city('Jakarta Selatan'),
      venueName: 'Studio Kuliner Jakarta',
      venueAddress: 'Jl. Kemang Raya No. 45, Jakarta Selatan',
      description:
        'Learn food styling and photography from a professional food photographer. Props, ingredients, and a premium photography set provided. Suitable for both smartphone and DSLR users.',
      status: 'published',
      imageUrl: img('Food Photography Masterclass', 'ef6c00'),
      imagePid: 'seed/events/food-photography-masterclass',
      tickets: [
        { name: 'Starter', price: 300_000, quota: 20, soldCount: 0 },
        {
          name: 'Pro',
          description: 'Includes professional camera rental + printed lookbook',
          price: 550_000,
          quota: 10,
          soldCount: 0
        }
      ]
    }
  ];

  const createdEvents: Array<{
    id: string;
    name: string;
    ticketTypes: Array<{ id: string; name: string; price: number }>;
  }> = [];

  for (const ed of eventsData) {
    const {
      slug,
      name,
      categoryId,
      eventDate,
      eventTime,
      endDate,
      endTime,
      cityId,
      venueName,
      venueAddress,
      description,
      status,
      imageUrl,
      imagePid,
      tickets
    } = ed;

    const event = await prisma.event.create({
      data: {
        organizerId,
        name,
        slug,
        categoryId,
        eventDate,
        eventTime,
        endDate,
        endTime,
        cityId,
        venueName,
        venueAddress,
        description,
        status,
        eventImages: {
          create: { imageUrl, imagePublicId: imagePid }
        },
        ticketTypes: {
          create: tickets.map(t => ({
            name: t.name,
            description: (t as { description?: string }).description,
            price: t.price,
            quota: t.quota,
            soldCount: t.soldCount
          }))
        }
      },
      include: { ticketTypes: true }
    });

    createdEvents.push({
      id: event.id,
      name: event.name,
      ticketTypes: event.ticketTypes.map(tt => ({
        id: tt.id,
        name: tt.name,
        price: tt.price
      }))
    });

    process.stdout.write(`  ✅ ${name}\n`);
  }

  return createdEvents;
}

// ─── seedVouchers ────────────────────────────────────────────────────────────

async function seedVouchers(techConfId: string, musicFestId: string) {
  console.log('🏷️  Seeding event vouchers...');

  const techConfVoucher = await prisma.eventVoucher.create({
    data: {
      eventId: techConfId,
      voucherCode: 'TECHCONF20',
      voucherName: 'Tech Conference 20% Off',
      discountType: 'percentage',
      discountValue: 20,
      maxUsage: 50,
      usedCount: 1, // charlie used it
      startDate: D('2026-02-01T00:00:00Z'),
      expiredAt: D('2026-03-10T23:59:59Z'),
      isActive: true
    }
  });

  const musicFestVoucher = await prisma.eventVoucher.create({
    data: {
      eventId: musicFestId,
      voucherCode: 'MUSICFEST15',
      voucherName: 'Music Festival 15% Off',
      discountType: 'percentage',
      discountValue: 15,
      maxUsage: 100,
      usedCount: 0,
      startDate: D('2026-02-15T00:00:00Z'),
      expiredAt: D('2026-03-15T23:59:59Z'),
      isActive: true
    }
  });

  console.log('  ✅ TECHCONF20 + MUSICFEST15 created');
  return { techConfVoucher, musicFestVoucher };
}

// ─── seedTransactions ────────────────────────────────────────────────────────

async function seedTransactions(deps: {
  testUser: { id: string };
  eoUser: { id: string };
  alice: { id: string };
  bob: { id: string };
  charlie: { id: string };
  diana: { id: string };
  evan: { id: string };
  fiona: { id: string };
  testUserPoint: { id: string; amount: number };
  aliceCoupon: { id: string; discountType: string; discountValue: number };
  events: Array<{
    id: string;
    name: string;
    ticketTypes: Array<{ id: string; name: string; price: number }>;
  }>;
  techConfVoucherId: string;
}) {
  console.log('💳 Seeding transactions...');

  const existing = await prisma.transaction.count();
  if (existing > 0) {
    console.log(`  ⚠️  Already has ${existing} transactions — skipping.`);
    return;
  }

  const {
    testUser,
    alice,
    bob,
    charlie,
    diana,
    evan,
    fiona,
    testUserPoint,
    aliceCoupon,
    events,
    techConfVoucherId
  } = deps;

  // helper: find event by slug keyword
  const ev = (keyword: string) => {
    const found = events.find(e =>
      e.name.toLowerCase().includes(keyword.toLowerCase())
    );
    if (!found) throw new Error(`Event not found: ${keyword}`);
    return found;
  };
  const tt = (event: (typeof events)[0], ttKeyword: string) => {
    const found = event.ticketTypes.find(t =>
      t.name.toLowerCase().includes(ttKeyword.toLowerCase())
    );
    if (!found)
      throw new Error(`Ticket type not found: ${ttKeyword} in ${event.name}`);
    return found;
  };

  // payment proof placeholder
  const proofUrl = 'https://placehold.co/800x600.png?text=Payment+Proof';

  // Each transaction descriptor
  interface TxDesc {
    n: number; // invoice suffix
    userId: string;
    event: (typeof events)[0];
    items: Array<{
      ticketType: { id: string; price: number };
      quantity: number;
    }>;
    status: string;
    paymentDeadline: Date;
    proofUploadedAt?: Date;
    paymentProofUrl?: string;
    confirmedAt?: Date;
    confirmationDeadline?: Date;
    pointsUsed?: number;
    couponId?: string;
    couponDiscount?: number;
    voucherId?: string;
    voucherDiscount?: number;
    createdAt: Date;
  }

  const jazzEvent = ev('Jazz Night');
  const webDevEvent = ev('Web Dev Bootcamp');
  const foodTruckEvent = ev('Food Truck Festival');
  const funRunEvent = ev('5K Fun Run');
  const comedyEvent = ev('Stand Up Comedy');
  const digiMktEvent = ev('Digital Marketing');
  const indieEvent = ev('Indie Movie');
  const zumbaEvent = ev('Zumba');
  const techConfEvent = ev('Tech Conference 2026');
  const musicFestEvent = ev('Music Festival Nusantara');
  const startupEvent = ev('Startup Summit');

  const transactions: TxDesc[] = [
    // ── Jazz Night ─────────────────────────────────────────────────────────
    {
      n: 1,
      userId: testUser.id,
      event: jazzEvent,
      items: [{ ticketType: tt(jazzEvent, 'General'), quantity: 1 }],
      status: 'done',
      createdAt: D('2026-01-08T10:00:00Z'),
      paymentDeadline: D('2026-01-08T12:00:00Z'),
      proofUploadedAt: D('2026-01-08T11:30:00Z'),
      paymentProofUrl: proofUrl,
      confirmedAt: D('2026-01-09T09:00:00Z'),
      confirmationDeadline: D('2026-01-22T11:30:00Z')
    },
    {
      n: 2,
      userId: bob.id,
      event: jazzEvent,
      items: [{ ticketType: tt(jazzEvent, 'VIP'), quantity: 1 }],
      status: 'done',
      createdAt: D('2026-01-09T14:00:00Z'),
      paymentDeadline: D('2026-01-09T16:00:00Z'),
      proofUploadedAt: D('2026-01-09T15:45:00Z'),
      paymentProofUrl: proofUrl,
      confirmedAt: D('2026-01-10T10:00:00Z'),
      confirmationDeadline: D('2026-01-23T15:45:00Z')
    },
    {
      n: 3,
      userId: charlie.id,
      event: jazzEvent,
      items: [{ ticketType: tt(jazzEvent, 'General'), quantity: 2 }],
      status: 'done',
      createdAt: D('2026-01-10T09:00:00Z'),
      paymentDeadline: D('2026-01-10T11:00:00Z'),
      proofUploadedAt: D('2026-01-10T10:20:00Z'),
      paymentProofUrl: proofUrl,
      confirmedAt: D('2026-01-11T08:00:00Z'),
      confirmationDeadline: D('2026-01-24T10:20:00Z')
    },

    // ── Web Dev Bootcamp ────────────────────────────────────────────────────
    {
      n: 4,
      userId: testUser.id,
      event: webDevEvent,
      items: [{ ticketType: tt(webDevEvent, 'Premium'), quantity: 1 }],
      status: 'done',
      createdAt: D('2026-01-12T10:00:00Z'),
      paymentDeadline: D('2026-01-12T12:00:00Z'),
      proofUploadedAt: D('2026-01-12T11:00:00Z'),
      paymentProofUrl: proofUrl,
      confirmedAt: D('2026-01-13T10:00:00Z'),
      confirmationDeadline: D('2026-01-26T11:00:00Z')
    },
    {
      n: 5,
      userId: alice.id,
      event: webDevEvent,
      items: [{ ticketType: tt(webDevEvent, 'Regular'), quantity: 1 }],
      status: 'done',
      createdAt: D('2026-01-13T08:00:00Z'),
      paymentDeadline: D('2026-01-13T10:00:00Z'),
      proofUploadedAt: D('2026-01-13T09:30:00Z'),
      paymentProofUrl: proofUrl,
      confirmedAt: D('2026-01-14T08:00:00Z'),
      confirmationDeadline: D('2026-01-27T09:30:00Z')
    },
    {
      n: 6,
      userId: diana.id,
      event: webDevEvent,
      items: [{ ticketType: tt(webDevEvent, 'Regular'), quantity: 1 }],
      status: 'done',
      createdAt: D('2026-01-13T11:00:00Z'),
      paymentDeadline: D('2026-01-13T13:00:00Z'),
      proofUploadedAt: D('2026-01-13T12:00:00Z'),
      paymentProofUrl: proofUrl,
      confirmedAt: D('2026-01-14T10:00:00Z'),
      confirmationDeadline: D('2026-01-27T12:00:00Z')
    },
    {
      n: 7,
      userId: evan.id,
      event: webDevEvent,
      items: [{ ticketType: tt(webDevEvent, 'Premium'), quantity: 1 }],
      status: 'done',
      createdAt: D('2026-01-14T15:00:00Z'),
      paymentDeadline: D('2026-01-14T17:00:00Z'),
      proofUploadedAt: D('2026-01-14T16:30:00Z'),
      paymentProofUrl: proofUrl,
      confirmedAt: D('2026-01-15T09:00:00Z'),
      confirmationDeadline: D('2026-01-28T16:30:00Z')
    },

    // ── Food Truck Festival ─────────────────────────────────────────────────
    {
      n: 8,
      userId: bob.id,
      event: foodTruckEvent,
      items: [{ ticketType: tt(foodTruckEvent, 'Visitor'), quantity: 2 }],
      status: 'done',
      createdAt: D('2026-01-18T09:00:00Z'),
      paymentDeadline: D('2026-01-18T11:00:00Z'),
      proofUploadedAt: D('2026-01-18T10:30:00Z'),
      paymentProofUrl: proofUrl,
      confirmedAt: D('2026-01-19T09:00:00Z'),
      confirmationDeadline: D('2026-02-01T10:30:00Z')
    },
    {
      n: 9,
      userId: charlie.id,
      event: foodTruckEvent,
      items: [{ ticketType: tt(foodTruckEvent, 'VIP'), quantity: 1 }],
      status: 'done',
      createdAt: D('2026-01-18T10:00:00Z'),
      paymentDeadline: D('2026-01-18T12:00:00Z'),
      proofUploadedAt: D('2026-01-18T11:00:00Z'),
      paymentProofUrl: proofUrl,
      confirmedAt: D('2026-01-19T10:00:00Z'),
      confirmationDeadline: D('2026-02-01T11:00:00Z')
    },
    {
      n: 10,
      userId: fiona.id,
      event: foodTruckEvent,
      items: [{ ticketType: tt(foodTruckEvent, 'Visitor'), quantity: 1 }],
      status: 'done',
      createdAt: D('2026-01-19T08:00:00Z'),
      paymentDeadline: D('2026-01-19T10:00:00Z'),
      proofUploadedAt: D('2026-01-19T09:30:00Z'),
      paymentProofUrl: proofUrl,
      confirmedAt: D('2026-01-20T09:00:00Z'),
      confirmationDeadline: D('2026-02-02T09:30:00Z')
    },

    // ── 5K Fun Run ──────────────────────────────────────────────────────────
    // testuser pays with 10 000 points
    {
      n: 11,
      userId: testUser.id,
      event: funRunEvent,
      items: [{ ticketType: tt(funRunEvent, 'Regular'), quantity: 1 }],
      status: 'done',
      pointsUsed: 10_000,
      createdAt: D('2026-01-25T08:00:00Z'),
      paymentDeadline: D('2026-01-25T10:00:00Z'),
      proofUploadedAt: D('2026-01-25T09:00:00Z'),
      paymentProofUrl: proofUrl,
      confirmedAt: D('2026-01-26T09:00:00Z'),
      confirmationDeadline: D('2026-02-08T09:00:00Z')
    },
    {
      n: 12,
      userId: alice.id,
      event: funRunEvent,
      items: [{ ticketType: tt(funRunEvent, 'Regular'), quantity: 2 }],
      status: 'done',
      createdAt: D('2026-01-25T09:00:00Z'),
      paymentDeadline: D('2026-01-25T11:00:00Z'),
      proofUploadedAt: D('2026-01-25T10:30:00Z'),
      paymentProofUrl: proofUrl,
      confirmedAt: D('2026-01-26T09:30:00Z'),
      confirmationDeadline: D('2026-02-08T10:30:00Z')
    },
    {
      n: 13,
      userId: charlie.id,
      event: funRunEvent,
      items: [{ ticketType: tt(funRunEvent, 'Premium'), quantity: 1 }],
      status: 'done',
      createdAt: D('2026-01-26T10:00:00Z'),
      paymentDeadline: D('2026-01-26T12:00:00Z'),
      proofUploadedAt: D('2026-01-26T11:30:00Z'),
      paymentProofUrl: proofUrl,
      confirmedAt: D('2026-01-27T09:00:00Z'),
      confirmationDeadline: D('2026-02-09T11:30:00Z')
    },
    {
      n: 14,
      userId: diana.id,
      event: funRunEvent,
      items: [{ ticketType: tt(funRunEvent, 'Regular'), quantity: 1 }],
      status: 'done',
      createdAt: D('2026-01-26T11:00:00Z'),
      paymentDeadline: D('2026-01-26T13:00:00Z'),
      proofUploadedAt: D('2026-01-26T12:30:00Z'),
      paymentProofUrl: proofUrl,
      confirmedAt: D('2026-01-27T10:00:00Z'),
      confirmationDeadline: D('2026-02-09T12:30:00Z')
    },
    {
      n: 15,
      userId: evan.id,
      event: funRunEvent,
      items: [{ ticketType: tt(funRunEvent, 'Premium'), quantity: 1 }],
      status: 'done',
      createdAt: D('2026-01-27T08:00:00Z'),
      paymentDeadline: D('2026-01-27T10:00:00Z'),
      proofUploadedAt: D('2026-01-27T09:30:00Z'),
      paymentProofUrl: proofUrl,
      confirmedAt: D('2026-01-28T08:00:00Z'),
      confirmationDeadline: D('2026-02-10T09:30:00Z')
    },

    // ── Stand Up Comedy ─────────────────────────────────────────────────────
    {
      n: 16,
      userId: bob.id,
      event: comedyEvent,
      items: [{ ticketType: tt(comedyEvent, 'Standard'), quantity: 2 }],
      status: 'done',
      createdAt: D('2026-01-28T14:00:00Z'),
      paymentDeadline: D('2026-01-28T16:00:00Z'),
      proofUploadedAt: D('2026-01-28T15:30:00Z'),
      paymentProofUrl: proofUrl,
      confirmedAt: D('2026-01-29T09:00:00Z'),
      confirmationDeadline: D('2026-02-11T15:30:00Z')
    },
    {
      n: 17,
      userId: diana.id,
      event: comedyEvent,
      items: [{ ticketType: tt(comedyEvent, 'Front Row'), quantity: 1 }],
      status: 'done',
      createdAt: D('2026-01-28T15:00:00Z'),
      paymentDeadline: D('2026-01-28T17:00:00Z'),
      proofUploadedAt: D('2026-01-28T16:00:00Z'),
      paymentProofUrl: proofUrl,
      confirmedAt: D('2026-01-29T10:00:00Z'),
      confirmationDeadline: D('2026-02-11T16:00:00Z')
    },
    {
      n: 18,
      userId: fiona.id,
      event: comedyEvent,
      items: [{ ticketType: tt(comedyEvent, 'Standard'), quantity: 1 }],
      status: 'done',
      createdAt: D('2026-01-29T10:00:00Z'),
      paymentDeadline: D('2026-01-29T12:00:00Z'),
      proofUploadedAt: D('2026-01-29T11:30:00Z'),
      paymentProofUrl: proofUrl,
      confirmedAt: D('2026-01-30T09:00:00Z'),
      confirmationDeadline: D('2026-02-12T11:30:00Z')
    },

    // ── Digital Marketing Seminar ────────────────────────────────────────────
    {
      n: 19,
      userId: testUser.id,
      event: digiMktEvent,
      items: [{ ticketType: tt(digiMktEvent, 'Regular'), quantity: 1 }],
      status: 'done',
      createdAt: D('2026-02-03T09:00:00Z'),
      paymentDeadline: D('2026-02-03T11:00:00Z'),
      proofUploadedAt: D('2026-02-03T10:30:00Z'),
      paymentProofUrl: proofUrl,
      confirmedAt: D('2026-02-04T09:00:00Z'),
      confirmationDeadline: D('2026-02-17T10:30:00Z')
    },
    // alice uses her 10% coupon here (Workshop 450k -> discount 45k = 405k)
    {
      n: 20,
      userId: alice.id,
      event: digiMktEvent,
      items: [{ ticketType: tt(digiMktEvent, 'Workshop'), quantity: 1 }],
      status: 'done',
      couponId: aliceCoupon.id,
      couponDiscount: 45_000,
      createdAt: D('2026-02-04T08:00:00Z'),
      paymentDeadline: D('2026-02-04T10:00:00Z'),
      proofUploadedAt: D('2026-02-04T09:30:00Z'),
      paymentProofUrl: proofUrl,
      confirmedAt: D('2026-02-05T09:00:00Z'),
      confirmationDeadline: D('2026-02-18T09:30:00Z')
    },
    {
      n: 21,
      userId: evan.id,
      event: digiMktEvent,
      items: [{ ticketType: tt(digiMktEvent, 'Regular'), quantity: 1 }],
      status: 'done',
      createdAt: D('2026-02-04T10:00:00Z'),
      paymentDeadline: D('2026-02-04T12:00:00Z'),
      proofUploadedAt: D('2026-02-04T11:30:00Z'),
      paymentProofUrl: proofUrl,
      confirmedAt: D('2026-02-05T10:00:00Z'),
      confirmationDeadline: D('2026-02-18T11:30:00Z')
    },
    {
      n: 22,
      userId: fiona.id,
      event: digiMktEvent,
      items: [{ ticketType: tt(digiMktEvent, 'Workshop'), quantity: 1 }],
      status: 'done',
      createdAt: D('2026-02-04T11:00:00Z'),
      paymentDeadline: D('2026-02-04T13:00:00Z'),
      proofUploadedAt: D('2026-02-04T12:30:00Z'),
      paymentProofUrl: proofUrl,
      confirmedAt: D('2026-02-05T11:00:00Z'),
      confirmationDeadline: D('2026-02-18T12:30:00Z')
    },

    // ── Indie Movie Night ───────────────────────────────────────────────────
    {
      n: 23,
      userId: charlie.id,
      event: indieEvent,
      items: [{ ticketType: tt(indieEvent, 'Couple'), quantity: 1 }],
      status: 'done',
      createdAt: D('2026-02-08T14:00:00Z'),
      paymentDeadline: D('2026-02-08T16:00:00Z'),
      proofUploadedAt: D('2026-02-08T15:30:00Z'),
      paymentProofUrl: proofUrl,
      confirmedAt: D('2026-02-09T09:00:00Z'),
      confirmationDeadline: D('2026-02-22T15:30:00Z')
    },
    {
      n: 24,
      userId: diana.id,
      event: indieEvent,
      items: [{ ticketType: tt(indieEvent, 'Regular'), quantity: 2 }],
      status: 'done',
      createdAt: D('2026-02-09T09:00:00Z'),
      paymentDeadline: D('2026-02-09T11:00:00Z'),
      proofUploadedAt: D('2026-02-09T10:30:00Z'),
      paymentProofUrl: proofUrl,
      confirmedAt: D('2026-02-10T08:00:00Z'),
      confirmationDeadline: D('2026-02-23T10:30:00Z')
    },

    // ── Zumba Fitness Camp ──────────────────────────────────────────────────
    {
      n: 25,
      userId: alice.id,
      event: zumbaEvent,
      items: [{ ticketType: tt(zumbaEvent, 'Early Bird'), quantity: 2 }],
      status: 'done',
      createdAt: D('2026-02-13T08:00:00Z'),
      paymentDeadline: D('2026-02-13T10:00:00Z'),
      proofUploadedAt: D('2026-02-13T09:30:00Z'),
      paymentProofUrl: proofUrl,
      confirmedAt: D('2026-02-14T09:00:00Z'),
      confirmationDeadline: D('2026-02-27T09:30:00Z')
    },
    {
      n: 26,
      userId: bob.id,
      event: zumbaEvent,
      items: [{ ticketType: tt(zumbaEvent, 'Walk-in'), quantity: 1 }],
      status: 'done',
      createdAt: D('2026-02-14T10:00:00Z'),
      paymentDeadline: D('2026-02-14T12:00:00Z'),
      proofUploadedAt: D('2026-02-14T11:30:00Z'),
      paymentProofUrl: proofUrl,
      confirmedAt: D('2026-02-15T09:00:00Z'),
      confirmationDeadline: D('2026-02-28T11:30:00Z')
    },
    {
      n: 27,
      userId: fiona.id,
      event: zumbaEvent,
      items: [{ ticketType: tt(zumbaEvent, 'Early Bird'), quantity: 1 }],
      status: 'done',
      createdAt: D('2026-02-14T09:00:00Z'),
      paymentDeadline: D('2026-02-14T11:00:00Z'),
      proofUploadedAt: D('2026-02-14T10:30:00Z'),
      paymentProofUrl: proofUrl,
      confirmedAt: D('2026-02-15T08:00:00Z'),
      confirmationDeadline: D('2026-02-28T10:30:00Z')
    },

    // ── Tech Conference 2026 (future, mixed statuses) ────────────────────────
    // testuser: waiting_for_payment  (deadline 2h from "now")
    {
      n: 28,
      userId: testUser.id,
      event: techConfEvent,
      items: [{ ticketType: tt(techConfEvent, 'Early Bird'), quantity: 1 }],
      status: 'waiting_for_payment',
      createdAt: D('2026-02-23T10:00:00Z'),
      paymentDeadline: addHours(D('2026-02-23T10:00:00Z'), 2)
    },
    // alice: waiting_for_confirmation with coupon (10% off 500k = 450k)
    {
      n: 29,
      userId: alice.id,
      event: techConfEvent,
      items: [{ ticketType: tt(techConfEvent, 'General'), quantity: 1 }],
      status: 'waiting_for_admin_confirmation',
      couponId: aliceCoupon.id,
      couponDiscount: 50_000,
      createdAt: D('2026-02-22T09:00:00Z'),
      paymentDeadline: D('2026-02-22T11:00:00Z'),
      proofUploadedAt: D('2026-02-22T10:30:00Z'),
      paymentProofUrl: proofUrl,
      confirmationDeadline: addDays(D('2026-02-22T10:30:00Z'), 14)
    },
    // charlie: paid with voucher TECHCONF20 (20% off 500k = 400k)
    {
      n: 30,
      userId: charlie.id,
      event: techConfEvent,
      items: [{ ticketType: tt(techConfEvent, 'General'), quantity: 1 }],
      status: 'done',
      voucherId: techConfVoucherId,
      voucherDiscount: 100_000,
      createdAt: D('2026-02-20T14:00:00Z'),
      paymentDeadline: D('2026-02-20T16:00:00Z'),
      proofUploadedAt: D('2026-02-20T15:30:00Z'),
      paymentProofUrl: proofUrl,
      confirmedAt: D('2026-02-21T09:00:00Z'),
      confirmationDeadline: addDays(D('2026-02-20T15:30:00Z'), 14)
    },
    // bob: paid VIP
    {
      n: 31,
      userId: bob.id,
      event: techConfEvent,
      items: [{ ticketType: tt(techConfEvent, 'VIP'), quantity: 1 }],
      status: 'done',
      createdAt: D('2026-02-21T10:00:00Z'),
      paymentDeadline: D('2026-02-21T12:00:00Z'),
      proofUploadedAt: D('2026-02-21T11:30:00Z'),
      paymentProofUrl: proofUrl,
      confirmedAt: D('2026-02-22T09:00:00Z'),
      confirmationDeadline: addDays(D('2026-02-21T11:30:00Z'), 14)
    },

    // ── Music Festival Nusantara ─────────────────────────────────────────────
    // testuser: paid, used 10 000 points on 200k GA → 190k total
    {
      n: 32,
      userId: testUser.id,
      event: musicFestEvent,
      items: [
        { ticketType: tt(musicFestEvent, 'General Admission'), quantity: 1 }
      ],
      status: 'done',
      pointsUsed: 10_000,
      createdAt: D('2026-02-18T10:00:00Z'),
      paymentDeadline: D('2026-02-18T12:00:00Z'),
      proofUploadedAt: D('2026-02-18T11:00:00Z'),
      paymentProofUrl: proofUrl,
      confirmedAt: D('2026-02-19T09:00:00Z'),
      confirmationDeadline: addDays(D('2026-02-18T11:00:00Z'), 14)
    },
    // charlie: cancelled (VIP 500k)
    {
      n: 33,
      userId: charlie.id,
      event: musicFestEvent,
      items: [
        { ticketType: tt(musicFestEvent, 'VIP Festival Pass'), quantity: 1 }
      ],
      status: 'canceled',
      createdAt: D('2026-02-17T09:00:00Z'),
      paymentDeadline: D('2026-02-17T11:00:00Z')
    },

    // ── Startup Summit Indonesia ─────────────────────────────────────────────
    // diana: paid
    {
      n: 34,
      userId: diana.id,
      event: startupEvent,
      items: [{ ticketType: tt(startupEvent, 'Attendee'), quantity: 1 }],
      status: 'done',
      createdAt: D('2026-02-19T08:00:00Z'),
      paymentDeadline: D('2026-02-19T10:00:00Z'),
      proofUploadedAt: D('2026-02-19T09:30:00Z'),
      paymentProofUrl: proofUrl,
      confirmedAt: D('2026-02-20T09:00:00Z'),
      confirmationDeadline: addDays(D('2026-02-19T09:30:00Z'), 14)
    },
    // evan: waiting_for_confirmation (Investor Pass 700k)
    {
      n: 35,
      userId: evan.id,
      event: startupEvent,
      items: [{ ticketType: tt(startupEvent, 'Investor Pass'), quantity: 1 }],
      status: 'waiting_for_admin_confirmation',
      createdAt: D('2026-02-20T13:00:00Z'),
      paymentDeadline: D('2026-02-20T15:00:00Z'),
      proofUploadedAt: D('2026-02-20T14:30:00Z'),
      paymentProofUrl: proofUrl,
      confirmationDeadline: addDays(D('2026-02-20T14:30:00Z'), 14)
    }
  ];

  let txCount = 0;
  let ticketCount = 0;
  let ticketSeq = 0;

  for (const tx of transactions) {
    const subtotal = tx.items.reduce(
      (sum, item) => sum + item.ticketType.price * item.quantity,
      0
    );

    const couponDiscount = tx.couponDiscount ?? 0;
    const voucherDiscount = tx.voucherDiscount ?? 0;
    const pointsUsed = tx.pointsUsed ?? 0;
    const totalAmount =
      subtotal - couponDiscount - voucherDiscount - pointsUsed;

    const created = await prisma.transaction.create({
      data: {
        userId: tx.userId,
        eventId: tx.event.id,
        invoiceNumber: generateInvoiceNumber(tx.n),
        subtotal,
        pointsUsed,
        couponDiscount,
        voucherDiscount,
        totalAmount,
        paymentStatus: tx.status,
        paymentProofUrl: tx.paymentProofUrl,
        proofUploadedAt: tx.proofUploadedAt,
        confirmedAt: tx.confirmedAt,
        paymentDeadline: tx.paymentDeadline,
        confirmationDeadline: tx.confirmationDeadline,
        userCouponId: tx.couponId,
        eventVoucherId: tx.voucherId,
        createdAt: tx.createdAt
      }
    });

    // ---------- transaction items + tickets ----------
    for (const item of tx.items) {
      const transactionItem = await prisma.transactionItem.create({
        data: {
          transactionId: created.id,
          ticketTypeId: item.ticketType.id,
          quantity: item.quantity,
          unitPrice: item.ticketType.price,
          subtotal: item.ticketType.price * item.quantity
        }
      });

      for (let i = 0; i < item.quantity; i++) {
        ticketSeq++;
        await prisma.ticket.create({
          data: {
            transactionItemId: transactionItem.id,
            ticketCode: generateTicketCode('DEMO', ticketSeq)
          }
        });
        ticketCount++;
      }
    }

    // ---------- point usage (testuser tx #11 & #32) ----------
    if (tx.pointsUsed && tx.pointsUsed > 0) {
      await prisma.userPoint.update({
        where: { id: testUserPoint.id },
        data: { isUsed: true }
      });

      await prisma.pointUsage.create({
        data: {
          userPointId: testUserPoint.id,
          transactionId: created.id,
          amountUsed: pointsUsed
        }
      });
    }

    // ---------- coupon mark as used (first time it appears) ----------
    if (tx.couponId && tx.status === 'done') {
      await prisma.userCoupon.update({
        where: { id: tx.couponId },
        data: { isUsed: true, usedAt: tx.createdAt }
      });
    }

    // ---------- voucher usage (charlie's TechConf) ----------
    if (tx.voucherId && tx.status === 'done') {
      await prisma.eventVoucherUsage.create({
        data: {
          voucherId: tx.voucherId,
          userId: tx.userId,
          transactionId: created.id,
          discountApplied: voucherDiscount
        }
      });
    }

    txCount++;
  }

  console.log(`  ✅ ${txCount} transactions, ${ticketCount} tickets created`);
}

// ─── seedReviews ─────────────────────────────────────────────────────────────

async function seedReviews(deps: {
  testUser: { id: string };
  bob: { id: string };
  alice: { id: string };
  charlie: { id: string };
  diana: { id: string };
  evan: { id: string };
  fiona: { id: string };
  events: Array<{ id: string; name: string }>;
}) {
  console.log('⭐ Seeding reviews...');

  const existing = await prisma.eventReview.count();
  if (existing > 0) {
    console.log(`  ⚠️  Already has ${existing} reviews — skipping.`);
    return;
  }

  const { testUser, bob, alice, charlie, diana, evan, fiona, events } = deps;

  const ev = (kw: string) =>
    events.find(e => e.name.toLowerCase().includes(kw.toLowerCase()))!;

  const reviews = [
    {
      eventId: ev('Jazz Night').id,
      userId: testUser.id,
      rating: 4.5,
      reviewText:
        'Amazing performance! The venue was great and the ambiance was absolutely perfect for a jazz night.'
    },
    {
      eventId: ev('Jazz Night').id,
      userId: bob.id,
      rating: 5.0,
      reviewText:
        'Incredible experience! The VIP section was top-notch and the musicians were world class.'
    },
    {
      eventId: ev('Jazz Night').id,
      userId: charlie.id,
      rating: 4.0,
      reviewText:
        'Great event overall. Arrived a bit late due to traffic but still caught most of the show.'
    },
    {
      eventId: ev('Web Dev Bootcamp').id,
      userId: testUser.id,
      rating: 5.0,
      reviewText:
        'Very comprehensive bootcamp. Learned a ton about modern web development in just 3 days. Highly recommend!'
    },
    {
      eventId: ev('Web Dev Bootcamp').id,
      userId: alice.id,
      rating: 4.5,
      reviewText:
        'Good bootcamp with knowledgeable instructors. The pace was intense but manageable.'
    },
    {
      eventId: ev('5K Fun Run').id,
      userId: testUser.id,
      rating: 4.0,
      reviewText:
        'Fun event! Well organised with great energy from the crowd. Will definitely join next year.'
    },
    {
      eventId: ev('Food Truck Festival').id,
      userId: charlie.id,
      rating: 4.0,
      reviewText:
        'Lots of food variety and good quality. A bit crowded on the first day but manageable after noon.'
    },
    {
      eventId: ev('Stand Up Comedy').id,
      userId: diana.id,
      rating: 5.0,
      reviewText:
        'Hilarious from start to finish! All three comedians were at their absolute best. Front row was worth every rupiah.'
    },
    {
      eventId: ev('Digital Marketing').id,
      userId: testUser.id,
      rating: 4.5,
      reviewText:
        'Great seminar with practical tips I could apply immediately. Certificate of attendance is a nice bonus.'
    },
    {
      eventId: ev('Zumba Fitness Camp').id,
      userId: fiona.id,
      rating: 5.0,
      reviewText:
        'Super fun and energetic! The instructors kept the energy high throughout. Already signed up for next month!'
    }
  ];

  for (const r of reviews) {
    await prisma.eventReview.create({
      data: {
        eventId: r.eventId,
        userId: r.userId,
        rating: r.rating,
        reviewText: r.reviewText
      }
    });
  }

  console.log(`  ✅ ${reviews.length} reviews created`);
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Starting demo seed...\n');

  // 1. Users
  const users = await seedUsers();
  console.log('');

  // 2. Organizer id
  const organizer = await prisma.organizer.findUnique({
    where: { userId: users.eoUser.id }
  });
  if (!organizer) throw new Error('Organizer not found for EO user!');

  // 3. Referral + points + coupon
  const { point: testUserPoint, coupon: aliceCoupon } = await seedReferral(
    users.testUser.id,
    users.alice.id
  );
  console.log('');

  // 4. Events
  const events = await seedEvents(organizer.id);
  console.log(`\n  📌 Total events: ${events.length}`);
  console.log('');

  // 5. Vouchers
  const techConfEvent = events.find(e => e.name === 'Tech Conference 2026')!;
  const musicFestEvent = events.find(
    e => e.name === 'Music Festival Nusantara'
  )!;
  const { techConfVoucher } = await seedVouchers(
    techConfEvent.id,
    musicFestEvent.id
  );
  console.log('');

  // 6. Transactions
  await seedTransactions({
    ...users,
    testUserPoint,
    aliceCoupon,
    events,
    techConfVoucherId: techConfVoucher.id
  });
  console.log('');

  // 7. Reviews
  await seedReviews({ ...users, events });

  console.log('\n🎉 Demo seed completed!');
  console.log('\n📊 Summary of demo accounts:');
  console.log('  Regular user : user@test.com   / Test1234!');
  console.log('  EO user      : eo@test.com     / Test1234!');
  console.log(
    '  Extra users  : alice@test.com, bob@test.com, charlie@test.com,'
  );
  console.log(
    '                 diana@test.com, evan@test.com, fiona@test.com  (all Test1234!)'
  );
  console.log('\n📋 Notable demo data:');
  console.log('  • 32 events (8 past + 24 upcoming) across all 12 categories');
  console.log("  • Referral: alice used testuser's code TSTREF");
  console.log('    → testuser earned 10 000 pts (used on Music Festival GA)');
  console.log(
    '    → alice got 10% coupon ALICE10PCT (used on Digital Marketing Workshop)'
  );
  console.log(
    '  • Voucher TECHCONF20 (20% off) used by charlie on Tech Conference 2026'
  );
  console.log(
    '  • Voucher MUSICFEST15 (15% off) available but unused on Music Festival'
  );
  console.log('  • 35 transactions: paid (27), waiting_for_payment (1),');
  console.log('    waiting_for_confirmation (2), cancelled (1)');
  console.log('  • 10 event reviews on 5 past events');
}

main()
  .catch(e => {
    console.error('❌ Demo seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
