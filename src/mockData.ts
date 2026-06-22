/**
 * Mock data generator for Malaysian weather.
 * Provides rich historical data from May 1, 2026 to June 15, 2026
 * for Johor, Selangor, Kedah, and Penang.
 */

export interface DataCuacaHarian {
  id: number;
  lokasi_id: number | null;
  negeri: string;
  daerah: string;
  lokaliti: string | null;
  tarikh: string; // date format: YYYY-MM-DD
  jenis_data: string | null;
  suhu_maksimum: number | null;
  suhu_minimum: number | null;
  kelembapan_tanah_permukaan: number | null;
  kelembapan_zon_akar_tanah: number | null;
  kelajuan_angin: number | null;
  kelembapan: number | null;
  taburan_hujan: number | null;
  sejatan: number | null;
  sinaran_global: number | null;
  heat_stress: number | null;
  cold_stress: number | null;
  created_at?: string;
}

export const NEGERI_DAERAH: Record<string, string[]> = {
  "JOHOR": ["BATU PAHAT", "JOHOR BAHRU", "MUAR", "KLUANG", "PONTIAN", "KOTA TINGGI"],
  "SELANGOR": ["PETALING", "KLANG", "GOMBAK", "HULU LANGAT", "SEPANG", "KUALA SELANGOR"],
  "KEDAH": ["KOTA SETAR", "KUBANG PASU", "BALING", "LANGKAWI", "SIK"],
  "PULAU PINANG": ["TIMUR LAUT", "BARAT DAYA", "SEBERANG PERAI UTARA", "SEBERANG PERAI SELATAN"],
  "PAHANG": ["KUANTAN", "TEMERLOH", "BENTONG", "PEKAN", "CAMERON HIGHLANDS"],
  "KELANTAN": ["KOTA BHARU", "PASIR MAS", "TUMPAT", "KUALA KRAI"],
  "TERENGGANU": ["KUALA TERENGGANU", "KEMAMAN", "DUNGUN", "BESUT"],
  "PERAK": ["KINTA", "LARUT MATANG DAN SELAMA", "MANJUNG", "HILIR PERAK"],
  "SARAWAK": ["KUCHING", "MIRI", "SIBU", "BINTULU"],
  "SABAH": ["KOTA KINABALU", "SANDAKAN", "TAWAU", "PENAMPANG"]
};

// State coordinates for dynamic map representation (stylized relative positioning)
export interface StateGeo {
  id: string;
  name: string;
  x: number; // 0 to 100 on canvas
  y: number; // 0 to 100 on canvas
  dx: number; // width
  dy: number; // height
  poly: string; // Simple visual polygon paths representing the state
}

export const MALAYSIA_STATES: StateGeo[] = [
  { id: "PRL", name: "PERLIS", x: 61, y: 68, dx: 15, dy: 12, poly: "62,70 76,68 78,74 72,82 61,80 62,70" },
  { id: "KDH", name: "KEDAH", x: 75, y: 88, dx: 20, dy: 15, poly: "61,80 72,82 78,74 76,68 88,72 96,65 104,78 110,95 102,112 80,112 78,102 68,98 61,80" },
  { id: "PNG", name: "PULAU PINANG", x: 50, y: 104, dx: 14, dy: 12, poly: "58,103 66,101 68,114 62,115 56,110" },
  { id: "PRK", name: "PERAK", x: 105, y: 150, dx: 20, dy: 20, poly: "80,112 102,112 110,95 125,120 142,125 152,156 140,172 152,205 122,216 100,210 90,175 80,150 80,112" },
  { id: "KTN", name: "KELANTAN", x: 140, y: 95, dx: 20, dy: 20, poly: "104,78 142,70 178,75 198,90 185,112 188,135 174,158 142,125 125,120 110,95 104,78" },
  { id: "TRG", name: "TERENGGANU", x: 200, y: 120, dx: 20, dy: 20, poly: "178,75 220,95 242,125 240,152 230,172 214,188 174,158 188,135 185,112 178,75" },
  { id: "PHG", name: "PAHANG", x: 190, y: 200, dx: 30, dy: 20, poly: "152,156 174,158 214,188 230,172 240,152 258,185 272,212 284,242 248,258 222,260 210,248 182,248 140,172 152,156" },
  { id: "SLG", name: "SELANGOR", x: 122, y: 235, dx: 20, dy: 20, poly: "122,216 152,205 140,172 182,248 180,268 152,274 134,265 110,250 116,224 122,216" },
  { id: "KLP", name: "KUALA LUMPUR", x: 142, y: 242, dx: 12, dy: 8, poly: "142,242 152,240 154,248 144,250 142,242" },
  { id: "NSN", name: "NEGERI SEMBILAN", x: 185, y: 254, dx: 15, dy: 15, poly: "182,248 210,248 212,274 186,280 180,268 182,248" },
  { id: "MLK", name: "MELAKA", x: 188, y: 285, dx: 15, dy: 10, poly: "186,280 212,274 218,284 198,296 186,280" },
  { id: "JHR", name: "JOHOR", x: 245, y: 285, dx: 30, dy: 30, poly: "210,248 222,260 248,258 284,242 312,298 288,348 252,328 232,316 218,284 212,274 210,248" },
  { id: "SRW", name: "SARAWAK", x: 490, y: 265, dx: 80, dy: 40, poly: "430,285 450,270 495,255 530,230 565,225 590,210 615,222 626,242 620,265 628,272 585,320 520,338 460,332 430,312 430,285" },
  { id: "SAB", name: "SABAH", x: 705, y: 170, dx: 40, dy: 40, poly: "615,222 628,212 638,218 630,202 642,174 670,162 692,130 735,134 768,124 785,152 790,185 754,236 695,258 642,250 626,242 615,222" },
  { id: "LBN", name: "LABUAN", x: 602, y: 182, dx: 15, dy: 12, poly: "618,198 626,195 631,200 628,206 620,206 618,198" }
];

export function generateMockWeatherData(): DataCuacaHarian[] {
  const dataset: DataCuacaHarian[] = [];
  let idCounter = 1;

  // Generate for several days: May 1 to June 15, 2026
  const startDate = new Date("2026-05-01");
  const endDate = new Date("2026-06-15");

  const dates: string[] = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split("T")[0]);
  }

  // Generate standard random parameters centered around typical Malaysian values
  // Typical Malaysian temp is 24C to 34C, high rainfall, high humidity
  Object.keys(NEGERI_DAERAH).forEach((negeri) => {
    const districts = NEGERI_DAERAH[negeri];
    
    // Base temperature level for this state
    let stateTempBaseMax = 31.0 + (Math.sin(negeri.charCodeAt(0)) * 1.5);
    let stateTempBaseMin = 23.5 + (Math.cos(negeri.charCodeAt(0)) * 1.0);

    districts.forEach((daerah, dIndex) => {
      // Small local variance
      const localVariance = Math.sin(dIndex) * 0.8;
      
      dates.forEach((tarikh) => {
        const dateObj = new Date(tarikh);
        const dayOfYear = dateObj.getDate();
        
        // Cyclic pattern over time representing true weather trends
        const timeFactor = Math.sin(dayOfYear * 0.15) * 1.5;
        const rainFactor = Math.cos(dayOfYear * 0.2) > 0.3 ? 1 : 0; // Rain days
        
        const suhu_maksimum = parseFloat((stateTempBaseMax + localVariance + timeFactor - (rainFactor * 2.0) + (Math.random() * 1.0 - 0.5)).toFixed(1));
        const suhu_minimum = parseFloat((stateTempBaseMin + localVariance + (timeFactor * 0.5) - (rainFactor * 0.5) + (Math.random() * 0.8 - 0.4)).toFixed(1));
        
        const taburan_hujan = rainFactor ? parseFloat((Math.random() * 45 + 5).toFixed(2)) : 0;
        const kelajuan_angin = parseFloat((1.5 + Math.random() * 4.5 + (rainFactor * 1.5)).toFixed(2));
        const kelembapan = parseFloat((75 + (rainFactor * 15) - (timeFactor * 2) + Math.random() * 5).toFixed(1));
        
        const kelembapan_tanah_permukaan = parseFloat((0.2 + (rainFactor * 0.4) + Math.random() * 0.15).toFixed(3));
        const kelembapan_zon_akar_tanah = parseFloat((0.25 + (rainFactor * 0.3) + Math.random() * 0.1).toFixed(3));
        
        const sejatan = parseFloat((2.5 + (suhu_maksimum - 30) * 0.5 - (rainFactor * 1.5)).toFixed(2));
        const sinaran_global = parseFloat((12 + (suhu_maksimum - 28) * 2 - (rainFactor * 6) + Math.random() * 3).toFixed(2));
        
        // Calculate heat stress and cold stress based on temperature threshold
        const heat_stress = suhu_maksimum > 33.5 ? Math.floor((suhu_maksimum - 33.5) * 2) : 0;
        const cold_stress = suhu_minimum < 22.5 ? Math.floor((22.5 - suhu_minimum) * 3) : 0;

        dataset.push({
          id: idCounter++,
          lokasi_id: 100 + idCounter,
          negeri,
          daerah,
          lokaliti: `${daerah} Utama`,
          tarikh,
          jenis_data: "HISTORICAL DATA",
          suhu_maksimum,
          suhu_minimum,
          kelembapan_tanah_permukaan,
          kelembapan_zon_akar_tanah,
          kelajuan_angin,
          kelembapan: Math.min(100, Math.max(40, kelembapan)),
          taburan_hujan,
          sejatan: Math.max(0.1, sejatan),
          sinaran_global: Math.max(1, sinaran_global),
          heat_stress,
          cold_stress
        });
      });
    });
  });

  return dataset;
}

export const MOCK_WEATHER_DATA = generateMockWeatherData();
