import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { MOCK_WEATHER_DATA, DataCuacaHarian } from './mockData';

// Retrieve keys from environment variables
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;
let isRealConnected = false;

if (supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://your-supabase-project.supabase.co') {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    isRealConnected = true;
  } catch (error) {
    console.error("Gagal memulakan klien Supabase:", error);
  }
}

export { supabase };

/**
 * Checks if the actual Supabase database connection is active and configured.
 */
export function isSupabaseConnected(): boolean {
  return isRealConnected;
}

/**
 * Fetch weather records. If keys are absent or query fails,
 * it returns the offline mock data dataset automatically.
 */
export async function getWeatherData(filters?: {
  negeriList?: string[];
  daerahList?: string[];
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<{
  data: DataCuacaHarian[];
  fromRealDb: boolean;
  error?: string;
}> {
  if (!supabase) {
    return {
      data: MOCK_WEATHER_DATA,
      fromRealDb: false,
      error: "Supabase tidak dikonfigurasikan atau kunci tidak sah. Menunjukkan data simulasi berskala penuh."
    };
  }

  try {
    let query = supabase.from('data_cuaca_harian').select('*');

    // Apply Filters in Supabase to handle the 349k rows on server side
    if (filters) {
      if (filters.negeriList && filters.negeriList.length > 0) {
        query = query.in('negeri', filters.negeriList);
      }
      if (filters.daerahList && filters.daerahList.length > 0) {
        query = query.in('daerah', filters.daerahList);
      }
      if (filters.startDate) {
        query = query.gte('tarikh', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('tarikh', filters.endDate);
      }
    }

    // Default sorting and limits
    // If we have date filters, sort ascending to make sure Recharts charts are ordered correctly chronologically.
    // If not, sort descending to fetch the latest records, then sort ascending in frontend.
    const hasDateFilters = !!(filters?.startDate || filters?.endDate);
    if (hasDateFilters) {
      query = query.order('tarikh', { ascending: true });
    } else {
      query = query.order('tarikh', { ascending: false });
    }

    const limitVal = filters?.limit || 15000;
    query = query.limit(limitVal);

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    if (data && data.length > 0) {
      // Normalize response keys to lowercase
      const formattedData: DataCuacaHarian[] = data.map((item: any) => {
        const normalized: any = {};
        Object.keys(item).forEach((key) => {
          normalized[key.toLowerCase()] = item[key];
        });
        return normalized as DataCuacaHarian;
      });

      // If we sorted descending for latest entries, reverse it or sort ascending for consistent chronologies on dashboard
      if (!hasDateFilters) {
        formattedData.sort((a, b) => a.tarikh.localeCompare(b.tarikh));
      }

      return {
        data: formattedData,
        fromRealDb: true
      };
    } else {
      return {
        data: MOCK_WEATHER_DATA,
        fromRealDb: false,
        error: "Jadual 'data_cuaca_harian' dijumpai tetapi kosong untuk tapisan dipilih. Menunjukkan data simulasi berskala penuh."
      };
    }
  } catch (err: any) {
    console.warn("Ralat memuatkan data dari Supabase (menggunakan mock data):", err);
    return {
      data: MOCK_WEATHER_DATA,
      fromRealDb: false,
      error: `Gagal membaca pangkalan data: ${err.message || err}. Menunjukkan data simulasi tempatan.`
    };
  }
}
