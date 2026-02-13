import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

interface ProvinceWithCities {
  name: string;
  cities: string[];
}

const indonesiaData: ProvinceWithCities[] = [
  // ==========================================
  // SUMATERA
  // ==========================================
  {
    name: 'Aceh',
    cities: [
      // Kota
      'Banda Aceh',
      'Langsa',
      'Lhokseumawe',
      'Sabang',
      'Subulussalam',
      // Kabupaten
      'Kab. Aceh Barat',
      'Kab. Aceh Barat Daya',
      'Kab. Aceh Besar',
      'Kab. Aceh Jaya',
      'Kab. Aceh Selatan',
      'Kab. Aceh Singkil',
      'Kab. Aceh Tamiang',
      'Kab. Aceh Tengah',
      'Kab. Aceh Tenggara',
      'Kab. Aceh Timur',
      'Kab. Aceh Utara',
      'Kab. Bener Meriah',
      'Kab. Bireuen',
      'Kab. Gayo Lues',
      'Kab. Nagan Raya',
      'Kab. Pidie',
      'Kab. Pidie Jaya',
      'Kab. Simeulue'
    ]
  },
  {
    name: 'Sumatera Utara',
    cities: [
      // Kota
      'Binjai',
      'Gunungsitoli',
      'Medan',
      'Padangsidimpuan',
      'Pematangsiantar',
      'Sibolga',
      'Tanjungbalai',
      'Tebing Tinggi',
      // Kabupaten
      'Kab. Asahan',
      'Kab. Batu Bara',
      'Kab. Dairi',
      'Kab. Deli Serdang',
      'Kab. Humbang Hasundutan',
      'Kab. Karo',
      'Kab. Labuhanbatu',
      'Kab. Labuhanbatu Selatan',
      'Kab. Labuhanbatu Utara',
      'Kab. Langkat',
      'Kab. Mandailing Natal',
      'Kab. Nias',
      'Kab. Nias Barat',
      'Kab. Nias Selatan',
      'Kab. Nias Utara',
      'Kab. Padang Lawas',
      'Kab. Padang Lawas Utara',
      'Kab. Pakpak Bharat',
      'Kab. Samosir',
      'Kab. Serdang Bedagai',
      'Kab. Simalungun',
      'Kab. Tapanuli Selatan',
      'Kab. Tapanuli Tengah',
      'Kab. Tapanuli Utara',
      'Kab. Toba'
    ]
  },
  {
    name: 'Sumatera Barat',
    cities: [
      // Kota
      'Bukittinggi',
      'Padang',
      'Padang Panjang',
      'Pariaman',
      'Payakumbuh',
      'Sawahlunto',
      'Solok',
      // Kabupaten
      'Kab. Agam',
      'Kab. Dharmasraya',
      'Kab. Kepulauan Mentawai',
      'Kab. Lima Puluh Kota',
      'Kab. Padang Pariaman',
      'Kab. Pasaman',
      'Kab. Pasaman Barat',
      'Kab. Pesisir Selatan',
      'Kab. Sijunjung',
      'Kab. Solok',
      'Kab. Solok Selatan',
      'Kab. Tanah Datar'
    ]
  },
  {
    name: 'Riau',
    cities: [
      // Kota
      'Dumai',
      'Pekanbaru',
      // Kabupaten
      'Kab. Bengkalis',
      'Kab. Indragiri Hilir',
      'Kab. Indragiri Hulu',
      'Kab. Kampar',
      'Kab. Kepulauan Meranti',
      'Kab. Kuantan Singingi',
      'Kab. Pelalawan',
      'Kab. Rokan Hilir',
      'Kab. Rokan Hulu',
      'Kab. Siak'
    ]
  },
  {
    name: 'Kepulauan Riau',
    cities: [
      // Kota
      'Batam',
      'Tanjungpinang',
      // Kabupaten
      'Kab. Bintan',
      'Kab. Karimun',
      'Kab. Kepulauan Anambas',
      'Kab. Lingga',
      'Kab. Natuna'
    ]
  },
  {
    name: 'Jambi',
    cities: [
      // Kota
      'Jambi',
      'Sungai Penuh',
      // Kabupaten
      'Kab. Batanghari',
      'Kab. Bungo',
      'Kab. Kerinci',
      'Kab. Merangin',
      'Kab. Muaro Jambi',
      'Kab. Sarolangun',
      'Kab. Tanjung Jabung Barat',
      'Kab. Tanjung Jabung Timur',
      'Kab. Tebo'
    ]
  },
  {
    name: 'Sumatera Selatan',
    cities: [
      // Kota
      'Lubuklinggau',
      'Pagar Alam',
      'Palembang',
      'Prabumulih',
      // Kabupaten
      'Kab. Banyuasin',
      'Kab. Empat Lawang',
      'Kab. Lahat',
      'Kab. Muara Enim',
      'Kab. Musi Banyuasin',
      'Kab. Musi Rawas',
      'Kab. Musi Rawas Utara',
      'Kab. Ogan Ilir',
      'Kab. Ogan Komering Ilir',
      'Kab. Ogan Komering Ulu',
      'Kab. Ogan Komering Ulu Selatan',
      'Kab. Ogan Komering Ulu Timur',
      'Kab. Penukal Abab Lematang Ilir'
    ]
  },
  {
    name: 'Bengkulu',
    cities: [
      // Kota
      'Bengkulu',
      // Kabupaten
      'Kab. Bengkulu Selatan',
      'Kab. Bengkulu Tengah',
      'Kab. Bengkulu Utara',
      'Kab. Kaur',
      'Kab. Kepahiang',
      'Kab. Lebong',
      'Kab. Mukomuko',
      'Kab. Rejang Lebong',
      'Kab. Seluma'
    ]
  },
  {
    name: 'Lampung',
    cities: [
      // Kota
      'Bandar Lampung',
      'Metro',
      // Kabupaten
      'Kab. Lampung Barat',
      'Kab. Lampung Selatan',
      'Kab. Lampung Tengah',
      'Kab. Lampung Timur',
      'Kab. Lampung Utara',
      'Kab. Mesuji',
      'Kab. Pesawaran',
      'Kab. Pesisir Barat',
      'Kab. Pringsewu',
      'Kab. Tanggamus',
      'Kab. Tulang Bawang',
      'Kab. Tulang Bawang Barat',
      'Kab. Way Kanan'
    ]
  },
  {
    name: 'Kepulauan Bangka Belitung',
    cities: [
      // Kota
      'Pangkalpinang',
      // Kabupaten
      'Kab. Bangka',
      'Kab. Bangka Barat',
      'Kab. Bangka Selatan',
      'Kab. Bangka Tengah',
      'Kab. Belitung',
      'Kab. Belitung Timur'
    ]
  },

  // ==========================================
  // JAWA
  // ==========================================
  {
    name: 'DKI Jakarta',
    cities: [
      // Kota Administrasi
      'Jakarta Pusat',
      'Jakarta Utara',
      'Jakarta Barat',
      'Jakarta Selatan',
      'Jakarta Timur',
      // Kabupaten Administrasi
      'Kab. Kepulauan Seribu'
    ]
  },
  {
    name: 'Jawa Barat',
    cities: [
      // Kota
      'Bandung',
      'Banjar',
      'Bekasi',
      'Bogor',
      'Cimahi',
      'Cirebon',
      'Depok',
      'Sukabumi',
      'Tasikmalaya',
      // Kabupaten
      'Kab. Bandung',
      'Kab. Bandung Barat',
      'Kab. Bekasi',
      'Kab. Bogor',
      'Kab. Ciamis',
      'Kab. Cianjur',
      'Kab. Cirebon',
      'Kab. Garut',
      'Kab. Indramayu',
      'Kab. Karawang',
      'Kab. Kuningan',
      'Kab. Majalengka',
      'Kab. Pangandaran',
      'Kab. Purwakarta',
      'Kab. Subang',
      'Kab. Sukabumi',
      'Kab. Sumedang',
      'Kab. Tasikmalaya'
    ]
  },
  {
    name: 'Banten',
    cities: [
      // Kota
      'Cilegon',
      'Serang',
      'Tangerang',
      'Tangerang Selatan',
      // Kabupaten
      'Kab. Lebak',
      'Kab. Pandeglang',
      'Kab. Serang',
      'Kab. Tangerang'
    ]
  },
  {
    name: 'Jawa Tengah',
    cities: [
      // Kota
      'Magelang',
      'Pekalongan',
      'Salatiga',
      'Semarang',
      'Surakarta',
      'Tegal',
      // Kabupaten
      'Kab. Banjarnegara',
      'Kab. Banyumas',
      'Kab. Batang',
      'Kab. Blora',
      'Kab. Boyolali',
      'Kab. Brebes',
      'Kab. Cilacap',
      'Kab. Demak',
      'Kab. Grobogan',
      'Kab. Jepara',
      'Kab. Karanganyar',
      'Kab. Kebumen',
      'Kab. Kendal',
      'Kab. Klaten',
      'Kab. Kudus',
      'Kab. Magelang',
      'Kab. Pati',
      'Kab. Pekalongan',
      'Kab. Pemalang',
      'Kab. Purbalingga',
      'Kab. Purworejo',
      'Kab. Rembang',
      'Kab. Semarang',
      'Kab. Sragen',
      'Kab. Sukoharjo',
      'Kab. Tegal',
      'Kab. Temanggung',
      'Kab. Wonogiri',
      'Kab. Wonosobo'
    ]
  },
  {
    name: 'DI Yogyakarta',
    cities: [
      // Kota
      'Yogyakarta',
      // Kabupaten
      'Kab. Bantul',
      'Kab. Gunungkidul',
      'Kab. Kulon Progo',
      'Kab. Sleman'
    ]
  },
  {
    name: 'Jawa Timur',
    cities: [
      // Kota
      'Batu',
      'Blitar',
      'Kediri',
      'Madiun',
      'Malang',
      'Mojokerto',
      'Pasuruan',
      'Probolinggo',
      'Surabaya',
      // Kabupaten
      'Kab. Bangkalan',
      'Kab. Banyuwangi',
      'Kab. Blitar',
      'Kab. Bojonegoro',
      'Kab. Bondowoso',
      'Kab. Gresik',
      'Kab. Jember',
      'Kab. Jombang',
      'Kab. Kediri',
      'Kab. Lamongan',
      'Kab. Lumajang',
      'Kab. Madiun',
      'Kab. Magetan',
      'Kab. Malang',
      'Kab. Mojokerto',
      'Kab. Nganjuk',
      'Kab. Ngawi',
      'Kab. Pacitan',
      'Kab. Pamekasan',
      'Kab. Pasuruan',
      'Kab. Ponorogo',
      'Kab. Probolinggo',
      'Kab. Sampang',
      'Kab. Sidoarjo',
      'Kab. Situbondo',
      'Kab. Sumenep',
      'Kab. Trenggalek',
      'Kab. Tuban',
      'Kab. Tulungagung'
    ]
  },

  // ==========================================
  // BALI & NUSA TENGGARA
  // ==========================================
  {
    name: 'Bali',
    cities: [
      // Kota
      'Denpasar',
      // Kabupaten
      'Kab. Badung',
      'Kab. Bangli',
      'Kab. Buleleng',
      'Kab. Gianyar',
      'Kab. Jembrana',
      'Kab. Karangasem',
      'Kab. Klungkung',
      'Kab. Tabanan'
    ]
  },
  {
    name: 'Nusa Tenggara Barat',
    cities: [
      // Kota
      'Bima',
      'Mataram',
      // Kabupaten
      'Kab. Bima',
      'Kab. Dompu',
      'Kab. Lombok Barat',
      'Kab. Lombok Tengah',
      'Kab. Lombok Timur',
      'Kab. Lombok Utara',
      'Kab. Sumbawa',
      'Kab. Sumbawa Barat'
    ]
  },
  {
    name: 'Nusa Tenggara Timur',
    cities: [
      // Kota
      'Kupang',
      // Kabupaten
      'Kab. Alor',
      'Kab. Belu',
      'Kab. Ende',
      'Kab. Flores Timur',
      'Kab. Kupang',
      'Kab. Lembata',
      'Kab. Malaka',
      'Kab. Manggarai',
      'Kab. Manggarai Barat',
      'Kab. Manggarai Timur',
      'Kab. Nagekeo',
      'Kab. Ngada',
      'Kab. Rote Ndao',
      'Kab. Sabu Raijua',
      'Kab. Sikka',
      'Kab. Sumba Barat',
      'Kab. Sumba Barat Daya',
      'Kab. Sumba Tengah',
      'Kab. Sumba Timur',
      'Kab. Timor Tengah Selatan',
      'Kab. Timor Tengah Utara'
    ]
  },

  // ==========================================
  // KALIMANTAN
  // ==========================================
  {
    name: 'Kalimantan Barat',
    cities: [
      // Kota
      'Pontianak',
      'Singkawang',
      // Kabupaten
      'Kab. Bengkayang',
      'Kab. Kapuas Hulu',
      'Kab. Kayong Utara',
      'Kab. Ketapang',
      'Kab. Kubu Raya',
      'Kab. Landak',
      'Kab. Melawi',
      'Kab. Mempawah',
      'Kab. Sambas',
      'Kab. Sanggau',
      'Kab. Sekadau',
      'Kab. Sintang'
    ]
  },
  {
    name: 'Kalimantan Tengah',
    cities: [
      // Kota
      'Palangka Raya',
      // Kabupaten
      'Kab. Barito Selatan',
      'Kab. Barito Timur',
      'Kab. Barito Utara',
      'Kab. Gunung Mas',
      'Kab. Kapuas',
      'Kab. Katingan',
      'Kab. Kotawaringin Barat',
      'Kab. Kotawaringin Timur',
      'Kab. Lamandau',
      'Kab. Murung Raya',
      'Kab. Pulang Pisau',
      'Kab. Seruyan',
      'Kab. Sukamara'
    ]
  },
  {
    name: 'Kalimantan Selatan',
    cities: [
      // Kota
      'Banjarbaru',
      'Banjarmasin',
      // Kabupaten
      'Kab. Balangan',
      'Kab. Banjar',
      'Kab. Barito Kuala',
      'Kab. Hulu Sungai Selatan',
      'Kab. Hulu Sungai Tengah',
      'Kab. Hulu Sungai Utara',
      'Kab. Kotabaru',
      'Kab. Tabalong',
      'Kab. Tanah Bumbu',
      'Kab. Tanah Laut',
      'Kab. Tapin'
    ]
  },
  {
    name: 'Kalimantan Timur',
    cities: [
      // Kota
      'Balikpapan',
      'Bontang',
      'Samarinda',
      // Kabupaten
      'Kab. Berau',
      'Kab. Kutai Barat',
      'Kab. Kutai Kartanegara',
      'Kab. Kutai Timur',
      'Kab. Mahakam Ulu',
      'Kab. Paser',
      'Kab. Penajam Paser Utara'
    ]
  },
  {
    name: 'Kalimantan Utara',
    cities: [
      // Kota
      'Tarakan',
      // Kabupaten
      'Kab. Bulungan',
      'Kab. Malinau',
      'Kab. Nunukan',
      'Kab. Tana Tidung'
    ]
  },

  // ==========================================
  // SULAWESI
  // ==========================================
  {
    name: 'Sulawesi Utara',
    cities: [
      // Kota
      'Bitung',
      'Kotamobagu',
      'Manado',
      'Tomohon',
      // Kabupaten
      'Kab. Bolaang Mongondow',
      'Kab. Bolaang Mongondow Selatan',
      'Kab. Bolaang Mongondow Timur',
      'Kab. Bolaang Mongondow Utara',
      'Kab. Kepulauan Sangihe',
      'Kab. Kepulauan Siau Tagulandang Biaro',
      'Kab. Kepulauan Talaud',
      'Kab. Minahasa',
      'Kab. Minahasa Selatan',
      'Kab. Minahasa Tenggara',
      'Kab. Minahasa Utara'
    ]
  },
  {
    name: 'Sulawesi Tengah',
    cities: [
      // Kota
      'Palu',
      // Kabupaten
      'Kab. Banggai',
      'Kab. Banggai Kepulauan',
      'Kab. Banggai Laut',
      'Kab. Buol',
      'Kab. Donggala',
      'Kab. Morowali',
      'Kab. Morowali Utara',
      'Kab. Parigi Moutong',
      'Kab. Poso',
      'Kab. Sigi',
      'Kab. Tojo Una-Una',
      'Kab. Tolitoli'
    ]
  },
  {
    name: 'Sulawesi Selatan',
    cities: [
      // Kota
      'Makassar',
      'Palopo',
      'Parepare',
      // Kabupaten
      'Kab. Bantaeng',
      'Kab. Barru',
      'Kab. Bone',
      'Kab. Bulukumba',
      'Kab. Enrekang',
      'Kab. Gowa',
      'Kab. Jeneponto',
      'Kab. Kepulauan Selayar',
      'Kab. Luwu',
      'Kab. Luwu Timur',
      'Kab. Luwu Utara',
      'Kab. Maros',
      'Kab. Pangkajene dan Kepulauan',
      'Kab. Pinrang',
      'Kab. Sidenreng Rappang',
      'Kab. Sinjai',
      'Kab. Soppeng',
      'Kab. Takalar',
      'Kab. Tana Toraja',
      'Kab. Toraja Utara',
      'Kab. Wajo'
    ]
  },
  {
    name: 'Sulawesi Tenggara',
    cities: [
      // Kota
      'Baubau',
      'Kendari',
      // Kabupaten
      'Kab. Bombana',
      'Kab. Buton',
      'Kab. Buton Selatan',
      'Kab. Buton Tengah',
      'Kab. Buton Utara',
      'Kab. Kolaka',
      'Kab. Kolaka Timur',
      'Kab. Kolaka Utara',
      'Kab. Konawe',
      'Kab. Konawe Kepulauan',
      'Kab. Konawe Selatan',
      'Kab. Konawe Utara',
      'Kab. Muna',
      'Kab. Muna Barat',
      'Kab. Wakatobi'
    ]
  },
  {
    name: 'Gorontalo',
    cities: [
      // Kota
      'Gorontalo',
      // Kabupaten
      'Kab. Boalemo',
      'Kab. Bone Bolango',
      'Kab. Gorontalo',
      'Kab. Gorontalo Utara',
      'Kab. Pohuwato'
    ]
  },
  {
    name: 'Sulawesi Barat',
    cities: [
      // Kabupaten (no kota in this province)
      'Kab. Majene',
      'Kab. Mamasa',
      'Kab. Mamuju',
      'Kab. Mamuju Tengah',
      'Kab. Pasangkayu',
      'Kab. Polewali Mandar'
    ]
  },

  // ==========================================
  // MALUKU
  // ==========================================
  {
    name: 'Maluku',
    cities: [
      // Kota
      'Ambon',
      'Tual',
      // Kabupaten
      'Kab. Buru',
      'Kab. Buru Selatan',
      'Kab. Kepulauan Aru',
      'Kab. Kepulauan Tanimbar',
      'Kab. Maluku Barat Daya',
      'Kab. Maluku Tengah',
      'Kab. Maluku Tenggara',
      'Kab. Seram Bagian Barat',
      'Kab. Seram Bagian Timur'
    ]
  },
  {
    name: 'Maluku Utara',
    cities: [
      // Kota
      'Ternate',
      'Tidore Kepulauan',
      // Kabupaten
      'Kab. Halmahera Barat',
      'Kab. Halmahera Selatan',
      'Kab. Halmahera Tengah',
      'Kab. Halmahera Timur',
      'Kab. Halmahera Utara',
      'Kab. Kepulauan Sula',
      'Kab. Pulau Morotai',
      'Kab. Pulau Taliabu'
    ]
  },

  // ==========================================
  // PAPUA
  // ==========================================
  {
    name: 'Papua',
    cities: [
      // Kota
      'Jayapura',
      // Kabupaten
      'Kab. Biak Numfor',
      'Kab. Jayapura',
      'Kab. Keerom',
      'Kab. Kepulauan Yapen',
      'Kab. Mamberamo Raya',
      'Kab. Sarmi',
      'Kab. Supiori',
      'Kab. Waropen'
    ]
  },
  {
    name: 'Papua Barat',
    cities: [
      // Kabupaten (no kota in this province after pemekaran)
      'Kab. Fakfak',
      'Kab. Kaimana',
      'Kab. Manokwari',
      'Kab. Manokwari Selatan',
      'Kab. Pegunungan Arfak',
      'Kab. Teluk Bintuni',
      'Kab. Teluk Wondama'
    ]
  },
  {
    name: 'Papua Selatan',
    cities: [
      // Kabupaten (no kota in this province)
      'Kab. Asmat',
      'Kab. Boven Digoel',
      'Kab. Mappi',
      'Kab. Merauke'
    ]
  },
  {
    name: 'Papua Tengah',
    cities: [
      // Kabupaten (no kota in this province)
      'Kab. Deiyai',
      'Kab. Dogiyai',
      'Kab. Intan Jaya',
      'Kab. Mimika',
      'Kab. Nabire',
      'Kab. Paniai',
      'Kab. Puncak',
      'Kab. Puncak Jaya'
    ]
  },
  {
    name: 'Papua Pegunungan',
    cities: [
      // Kabupaten (no kota in this province)
      'Kab. Jayawijaya',
      'Kab. Lanny Jaya',
      'Kab. Mamberamo Tengah',
      'Kab. Nduga',
      'Kab. Pegunungan Bintang',
      'Kab. Tolikara',
      'Kab. Yahukimo',
      'Kab. Yalimo'
    ]
  },
  {
    name: 'Papua Barat Daya',
    cities: [
      // Kota
      'Sorong',
      // Kabupaten
      'Kab. Maybrat',
      'Kab. Raja Ampat',
      'Kab. Sorong',
      'Kab. Sorong Selatan',
      'Kab. Tambrauw'
    ]
  }
];

interface EventCategoryData {
  name: string;
  slug: string;
}

const eventCategoriesData: EventCategoryData[] = [
  { name: 'Music', slug: 'music' },
  { name: 'Sports', slug: 'sports' },
  { name: 'Technology', slug: 'technology' },
  { name: 'Arts & Culture', slug: 'arts-culture' },
  { name: 'Food & Drink', slug: 'food-drink' },
  { name: 'Education', slug: 'education' },
  { name: 'Business', slug: 'business' },
  { name: 'Health & Wellness', slug: 'health-wellness' },
  { name: 'Entertainment', slug: 'entertainment' },
  { name: 'Community', slug: 'community' },
  { name: 'Gaming & Esports', slug: 'gaming-esports' },
  { name: 'Travel & Outdoor', slug: 'travel-outdoor' }
];

async function seedLocations() {
  console.log('📍 Seeding locations...');

  const existingProvinces = await prisma.province.count();
  if (existingProvinces > 0) {
    console.log(`  ⚠️  Already has ${existingProvinces} provinces. Skipping.`);
    return;
  }

  let totalProvinces = 0;
  let totalCities = 0;

  for (const provinceData of indonesiaData) {
    const province = await prisma.province.create({
      data: {
        name: provinceData.name
      }
    });

    totalProvinces++;

    const cityCreateData = provinceData.cities.map(cityName => ({
      name: cityName,
      provinceId: province.id
    }));

    const result = await prisma.city.createMany({
      data: cityCreateData
    });

    totalCities += result.count;

    console.log(`  ✅ ${provinceData.name}: ${result.count} cities/kabupaten`);
  }

  console.log(`  📍 Provinces: ${totalProvinces}`);
  console.log(`  🏙️  Cities/Kabupaten: ${totalCities}`);
}

async function seedEventCategories() {
  console.log('🏷️  Seeding event categories...');

  const existingCategories = await prisma.eventCategory.count();
  if (existingCategories > 0) {
    console.log(
      `  ⚠️  Already has ${existingCategories} categories. Skipping.`
    );
    return;
  }

  const result = await prisma.eventCategory.createMany({
    data: eventCategoriesData
  });

  console.log(`  ✅ Created ${result.count} event categories`);
}

async function main() {
  console.log('🌱 Starting seed...\n');

  await seedLocations();
  console.log('');
  await seedEventCategories();

  console.log('\n🎉 Seed completed!');
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
