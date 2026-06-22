/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useRef, MouseEvent } from 'react';
import { 
  CloudSun, Wind, Droplets, Calendar, MapPin, Search, RefreshCw, 
  Download, AlertTriangle, Database, ArrowUp, ArrowDown, 
  LineChart as ChartIcon, Layers, Sun, Moon, Droplet 
} from 'lucide-react';
import { 
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip as RechartsTooltip, Legend 
} from 'recharts';

// PASTIKAN SEMUA FAIL INI WUJUD DI FOLDER ANDA
import { getWeatherData, isSupabaseConnected } from './supabaseClient';
import { MALAYSIA_STATES, DataCuacaHarian, NEGERI_DAERAH } from './mockData';
import { geoMercator, geoPath } from "d3-geo";
import malaysiaStateGeoJSONRaw from './malaysia-state.geojson?raw';
const malaysiaStateGeoJSON = JSON.parse(malaysiaStateGeoJSONRaw);

function getTemperatureBgClass(temp: number, isDarkMode: boolean = true) {
  if (isDarkMode) {
    if (temp <= 25) return 'bg-cyan-950/40 text-cyan-400 border-cyan-800/40';
    if (temp <= 28) return 'bg-teal-950/40 text-teal-400 border-teal-800/40';
    if (temp <= 30) return 'bg-amber-950/40 text-amber-400 border-amber-800/40';
    if (temp <= 32) return 'bg-orange-950/40 text-orange-400 border-orange-800/40';
    return 'bg-rose-950/40 text-rose-400 border-rose-800/40';
  } else {
    if (temp <= 25) return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    if (temp <= 28) return 'bg-teal-50 text-teal-700 border-teal-200';
    if (temp <= 30) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (temp <= 32) return 'bg-orange-50 text-orange-700 border-orange-200';
    return 'bg-rose-50 text-rose-700 border-rose-200';
  }
}

export default function App() {
  // Database States
  const [allWeatherData, setAllWeatherData] = useState<DataCuacaHarian[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [dbStatusMsg, setDbStatusMsg] = useState<string | null>(null);

  // Filter States
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [selectedStates, setSelectedStates] = useState<string[]>(["JOHOR"]);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Map Hover and Interaction States
  const [tooltip, setTooltip] = useState<{
    visible: boolean; x: number; y: number; title: string; negeri: string; daerah: string;
    suhu_maksimum: number | null; suhu_minimum: number | null; kelembapan: number | null;
    kelajuan_angin: number | null; taburan_hujan: number | null; 
    kelembapan_tanah_permukaan: number | null; kelembapan_zon_akar_tanah: number | null;
    sejatan: number | null; sinaran_global: number | null; heat_stress: number | null;
    cold_stress: number | null; tarikh: string;
  } | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const isInitializedRef = useRef<boolean>(false);

  // Load weather data on init
  const loadDatabaseData = async () => {
    setIsLoading(true);
    try {
      const connected = isSupabaseConnected();
      setIsConnected(connected);

      let initialStart = "2026-05-15";
      let initialEnd = "2026-06-15";

      if (connected) {
        const { supabase } = await import('./supabaseClient');
        if (supabase) {
          const { data } = await supabase
            .from('data_cuaca_harian')
            .select('tarikh')
            .order('tarikh', { ascending: false })
            .limit(1);
          
          if (data && data.length > 0) {
            const latestDateStr = data[0].tarikh;
            const latestDateObj = new Date(latestDateStr);
            const thirtyDaysAgo = new Date(latestDateObj);
            thirtyDaysAgo.setDate(latestDateObj.getDate() - 30);
            
            initialStart = thirtyDaysAgo.toISOString().split('T')[0];
            initialEnd = latestDateStr;
          }
        }
      } else {
        initialStart = "2026-05-01";
        initialEnd = "2026-06-15";
      }

      setStartDate(initialStart);
      setEndDate(initialEnd);

      const result = await getWeatherData({
        negeriList: ["JOHOR"], daerahList: [], startDate: initialStart, endDate: initialEnd, limit: 15000
      });

      setAllWeatherData(result.data);
      setIsConnected(result.fromRealDb);
      setDbStatusMsg(result.error || null);
      isInitializedRef.current = true;
    } catch (err: any) {
      console.error(err);
      setDbStatusMsg("Gagal berhubung dengan pangkalan data.");
      isInitializedRef.current = true;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDatabaseData();
  }, []);

  const availableStates = useMemo(() => MALAYSIA_STATES.map(s => s.name).sort(), []);

  const availableDistricts = useMemo(() => {
    const staticDistricts: string[] = [];
    selectedStates.forEach(state => {
      const stateDistricts = NEGERI_DAERAH[state] || [];
      staticDistricts.push(...stateDistricts);
    });

    const dynamicDistricts = allWeatherData
      .filter(item => selectedStates.includes(item.negeri))
      .map(item => item.daerah);

    const combined = [...staticDistricts, ...dynamicDistricts];
    return Array.from(new Set(combined)).sort();
  }, [allWeatherData, selectedStates]);

  useEffect(() => {
    setSelectedDistricts(prev => prev.filter(d => availableDistricts.includes(d)));
  }, [selectedStates, availableDistricts]);

  useEffect(() => {
    if (!isInitializedRef.current || !startDate || !endDate) return;

    const delayDebounceFn = setTimeout(async () => {
      setIsLoading(true);
      try {
        const result = await getWeatherData({
          negeriList: selectedStates, daerahList: selectedDistricts, startDate, endDate, limit: 15000
        });
        setAllWeatherData(result.data);
        setIsConnected(result.fromRealDb);
        setDbStatusMsg(result.error || null);
      } catch (err: any) {
        setDbStatusMsg("Ralat mengekstrak data tapisan.");
      } finally {
        setIsLoading(false);
      }
    }, 450);

    return () => clearTimeout(delayDebounceFn);
  }, [selectedStates, selectedDistricts, startDate, endDate]);

  const filteredData = useMemo(() => {
    return allWeatherData.filter(item => {
      const matchState = selectedStates.length === 0 || selectedStates.includes(item.negeri);
      const matchDistrict = selectedDistricts.length === 0 || selectedDistricts.includes(item.daerah);
      const matchStartDate = !startDate || item.tarikh >= startDate;
      const matchEndDate = !endDate || item.tarikh <= endDate;
      
      const searchLower = searchQuery.toLowerCase();
      const matchSearch = !searchLower || 
        item.negeri.toLowerCase().includes(searchLower) ||
        item.daerah.toLowerCase().includes(searchLower) ||
        (item.lokaliti?.toLowerCase().includes(searchLower)); 

      return matchState && matchDistrict && matchStartDate && matchEndDate && matchSearch;
    });
  }, [allWeatherData, selectedStates, selectedDistricts, startDate, endDate, searchQuery]);

  const averages = useMemo(() => {
    if (filteredData.length === 0) return { minTemp: 0, maxTemp: 0, rain: 0, wind: 0, humidity: 0 };
    
    let sumMin = 0, sumMax = 0, sumRain = 0, sumWind = 0, sumHumid = 0;
    let countMin = 0, countMax = 0, countRain = 0, countWind = 0, countHumid = 0;

    filteredData.forEach(d => {
      if (d.suhu_minimum !== null) { sumMin += d.suhu_minimum; countMin++; }
      if (d.suhu_maksimum !== null) { sumMax += d.suhu_maksimum; countMax++; }
      if (d.taburan_hujan !== null) { sumRain += d.taburan_hujan; countRain++; }
      if (d.kelajuan_angin !== null) { sumWind += d.kelajuan_angin; countWind++; }
      if (d.kelembapan !== null) { sumHumid += d.kelembapan; countHumid++; }
    });

    return {
      minTemp: countMin > 0 ? parseFloat((sumMin / countMin).toFixed(1)) : 0,
      maxTemp: countMax > 0 ? parseFloat((sumMax / countMax).toFixed(1)) : 0,
      rain: countRain > 0 ? parseFloat((sumRain / countRain).toFixed(2)) : 0,
      wind: countWind > 0 ? parseFloat((sumWind / countWind).toFixed(2)) : 0,
      humidity: countHumid > 0 ? parseFloat((sumHumid / countHumid).toFixed(1)) : 0,
    };
  }, [filteredData]);

  const districtAverages = useMemo(() => {
    const districtMap: Record<string, { total: number; count: number }> = {};
    allWeatherData.forEach(d => {
      if (d.suhu_maksimum !== null && (!startDate || d.tarikh >= startDate) && (!endDate || d.tarikh <= endDate)) {
        const key = d.daerah.toUpperCase();
        if (!districtMap[key]) { districtMap[key] = { total: 0, count: 0 }; }
        districtMap[key].total += d.suhu_maksimum;
        districtMap[key].count += 1;
      }
    });

    const output: Record<string, number> = {};
    Object.keys(districtMap).forEach(daerah => {
      output[daerah] = parseFloat((districtMap[daerah].total / districtMap[daerah].count).toFixed(1));
    });
    return output;
  }, [allWeatherData, startDate, endDate]);

  const STATE_CODE_TO_NAME = useMemo(() => ({
    "JHR": "JOHOR", "KDH": "KEDAH", "KTN": "KELANTAN", "MLK": "MELAKA",
    "NSN": "NEGERI SEMBILAN", "PHG": "PAHANG", "PRK": "PERAK", "PLS": "PERLIS",
    "PNG": "PULAU PINANG", "SBH": "SABAH", "SWK": "SARAWAK", "SGR": "SELANGOR",
    "TRG": "TERENGGANU", "KUL": "W.P. KUALA LUMPUR", "LBN": "W.P. LABUAN", "PJY": "W.P. PUTRAJAYA"
  }), []);

  const handleMapMouseMove = (e: MouseEvent, record: Partial<DataCuacaHarian> & { title: string }) => {
    if (!mapContainerRef.current) return;
    const rect = mapContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + 15;
    const y = e.clientY - rect.top - 180;

    const stateDataSubset = filteredData.filter(d => d.negeri === record.negeri);
    const primaryRecord = stateDataSubset[stateDataSubset.length - 1] || null;

    setTooltip({
      visible: true, x, y, title: record.title, negeri: record.negeri || 'TIADA',
      daerah: primaryRecord?.daerah || 'Daerah Utama', suhu_maksimum: primaryRecord?.suhu_maksimum ?? 31.5,
      suhu_minimum: primaryRecord?.suhu_minimum ?? 24.0, kelembapan: primaryRecord?.kelembapan ?? 82.0,
      kelajuan_angin: primaryRecord?.kelajuan_angin ?? 2.8, taburan_hujan: primaryRecord?.taburan_hujan ?? 4.5,
      kelembapan_tanah_permukaan: primaryRecord?.kelembapan_tanah_permukaan ?? 0.354,
      kelembapan_zon_akar_tanah: primaryRecord?.kelembapan_zon_akar_tanah ?? 0.412,
      sejatan: primaryRecord?.sejatan ?? 3.2, sinaran_global: primaryRecord?.sinaran_global ?? 16.4,
      heat_stress: primaryRecord?.heat_stress ?? 0, cold_stress: primaryRecord?.cold_stress ?? 0,
      tarikh: primaryRecord?.tarikh || endDate,
    });
  };

  const toggleStateSelection = (stateName: string) => {
    setSelectedStates(prev => {
      if (prev.includes(stateName)) {
        if (prev.length === 1) return prev; 
        return prev.filter(s => s !== stateName);
      }
      return [...prev, stateName];
    });
  };

  const toggleDistrictSelection = (districtName: string) => {
    setSelectedDistricts(prev => {
      if (prev.includes(districtName)) return prev.filter(d => d !== districtName);
      return [...prev, districtName];
    });
  };

  const chartDataGrouped = useMemo(() => {
    const map: Record<string, { tarikh: string; maximum: number; minimum: number; count: number; hujan: number; kelembapan: number; angin: number }> = {};
    filteredData.forEach(d => {
      if (!map[d.tarikh]) {
        map[d.tarikh] = { tarikh: d.tarikh, maximum: 0, minimum: 0, count: 0, hujan: 0, kelembapan: 0, angin: 0 };
      }
      const entry = map[d.tarikh];
      if (d.suhu_maksimum) entry.maximum += d.suhu_maksimum;
      if (d.suhu_minimum) entry.minimum += d.suhu_minimum;
      if (d.taburan_hujan) entry.hujan += d.taburan_hujan;
      if (d.kelembapan) entry.kelembapan += d.kelembapan;
      if (d.kelajuan_angin) entry.angin += d.kelajuan_angin;
      entry.count += 1;
    });

    return Object.keys(map).sort().map(key => {
      const avg = map[key];
      return {
        tarikhStr: new Date(avg.tarikh).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short' }),
        'Suhu Maksimum (°C)': parseFloat((avg.maximum / avg.count).toFixed(1)),
        'Suhu Minimum (°C)': parseFloat((avg.minimum / avg.count).toFixed(1)),
        'Taburan Hujan (mm)': parseFloat((avg.hujan / avg.count).toFixed(2)),
        'Kelembapan (%)': parseFloat((avg.kelembapan / avg.count).toFixed(1)),
        'Kelajuan Angin (m/s)': parseFloat((avg.angin / avg.count).toFixed(2)),
      };
    });
  }, [filteredData]);

  const exportToCSV = () => {
    if (filteredData.length === 0) return;
    const headers = [
      "ID", "Negeri", "Daerah", "Lokaliti", "Tarikh", "Suhu Maksimum (°C)", "Suhu Minimum (°C)", 
      "Kelembapan Permukaan", "Kelembapan Akar Tanah", "Kelajuan Angin (m/s)", "Kelembapan Udara (%)", 
      "Taburan Hujan (mm)", "Sejatan (mm)", "Sinaran Global (MJ/m2)", "Heat Stress", "Cold Stress"
    ];
    const rows = filteredData.map(d => [
      d.id, d.negeri, d.daerah, d.lokaliti, d.tarikh, d.suhu_maksimum, d.suhu_minimum, d.kelembapan_tanah_permukaan,
      d.kelembapan_zon_akar_tanah, d.kelajuan_angin, d.kelembapan, d.taburan_hujan, d.sejatan, d.sinaran_global,
      d.heat_stress, d.cold_stress
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `data_cuaca_malaysia_${startDate}_ke_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="weather-dashboard-root" className={`min-h-screen font-sans antialiased p-4 lg:p-8 transition-colors duration-300 ${isDarkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-800"}`}>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* TOP STATUS HEADER */}
        <header className={`flex flex-col md:flex-row justify-between items-start md:items-center border p-6 rounded-2xl shadow-lg gap-4 transition-colors duration-300 ${isDarkMode ? "bg-slate-900/50 border-slate-800/60" : "bg-white border-slate-200/80"}`}>
          <div>
            <div className="flex items-center gap-3">
              <span className={`p-2.5 rounded-xl border transition-colors duration-300 ${isDarkMode ? "bg-cyan-950/40 text-cyan-400 border-cyan-800/50" : "bg-cyan-50 text-cyan-600 border-cyan-200"}`}>
                <CloudSun className="w-7 h-7" />
              </span>
              <div>
                <h1 className={`text-2xl lg:text-3xl font-extrabold tracking-tight uppercase transition-colors duration-300 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                  DASHBOARD <span className="text-cyan-500">CUACA</span> MALAYSIA
                </h1>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Theme Toggle Button */}
            <div className={`flex items-center gap-1 p-1 rounded-xl border transition-all duration-300 ${isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-100 border-slate-200 shadow-sm'}`}>
              <button
                type="button"
                onClick={() => setIsDarkMode(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${isDarkMode ? 'bg-slate-800 text-cyan-400 border border-slate-700/50 shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
              >
                <Moon className="w-3.5 h-3.5" /> Gelap
              </button>
              <button
                type="button"
                onClick={() => setIsDarkMode(false)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${!isDarkMode ? 'bg-white text-cyan-600 border border-slate-200 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Sun className="w-3.5 h-3.5" /> Cerah
              </button>
            </div>

            {/* Supabase Status */}
            <div className={`p-4 rounded-xl border flex items-center gap-3 transition-colors ${isConnected ? isDarkMode ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700' : isDarkMode ? 'bg-amber-950/40 border-amber-800/60 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
              <div className="relative">
                {isConnected ? (
                  <span className="flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                  </span>
                ) : (
                  <Database className={`w-5 h-5 animate-pulse ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`} />
                )}
              </div>
              <div className="text-xs">
                <div className="font-bold">{isConnected ? "SISTEM LIVE (SUPABASE)" : "SISTEM SIMULASI"}</div>
                <div className={`text-[10px] font-normal ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {isConnected ? "Berjaya disambung ke pangkalan data" : "Menunjukkan set data simulasi luar talian"}
                </div>
              </div>
            </div>

            <button onClick={loadDatabaseData} disabled={isLoading} className="flex items-center justify-center gap-2 px-4 py-3 bg-cyan-500 hover:bg-cyan-600 text-slate-950 rounded-xl font-bold text-sm transition-all cursor-pointer disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Suaikan Data
            </button>
          </div>
        </header>

        {/* Database Warning */}
        {dbStatusMsg && (
          <div className={`border-l-4 p-4 rounded-xl flex items-start gap-3 shadow-md transition-colors ${isDarkMode ? 'bg-amber-950/40 border-amber-500 border-slate-850/60 text-amber-200' : 'bg-amber-50 border-amber-500 border-amber-200 text-amber-900'}`}>
            <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`} />
            <div className="text-xs">
              <span className="font-bold">Makluman:</span> {dbStatusMsg}
            </div>
          </div>
        )}

        <section className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* CONTROL FILTERS BAR */}
          <div className={`p-5 rounded-2xl border shadow-xl space-y-5 h-full transition-colors duration-300 ${isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-200"}`}>
            <div className={`flex items-center gap-2 border-b pb-3 transition-colors ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <Layers className="w-4.5 h-4.5 text-cyan-500" />
              <h2 className={`text-base font-bold uppercase tracking-wider transition-colors ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Tapisan Meteorologi</h2>
            </div>

            <div className="space-y-4">
              {/* State Selection */}
              <div>
                <label className={`block text-xs font-bold mb-2 transition-colors ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  NEGERI ({selectedStates.length})
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableStates.map(state => (
                    <button
                      key={state}
                      onClick={() => toggleStateSelection(state)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border ${selectedStates.includes(state) ? (isDarkMode ? 'bg-cyan-600 text-white border-cyan-500 shadow-md' : 'bg-cyan-100 text-cyan-800 border-cyan-200') : (isDarkMode ? 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900')}`}
                    >
                      {state}
                    </button>
                  ))}
                </div>
              </div>

              {/* District Selection */}
              <div>
                <label className={`block text-xs font-bold mb-2 transition-colors ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  DAERAH ({selectedDistricts.length || "Semua"})
                </label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar pr-2">
                  {availableDistricts.length === 0 ? (
                    <span className={`text-xs ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>Sila pilih negeri...</span>
                  ) : (
                    availableDistricts.map(district => (
                      <button
                        key={district}
                        onClick={() => toggleDistrictSelection(district)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all cursor-pointer border ${selectedDistricts.includes(district) ? (isDarkMode ? 'bg-cyan-600 text-white border-cyan-500 shadow-md' : 'bg-cyan-100 text-cyan-800 border-cyan-200') : (isDarkMode ? 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900')}`}
                      >
                        {district}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Date Pickers */}
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  <Calendar className="w-3.5 h-3.5" /><span>TAPISAN TARIKH</span>
                </label>
                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <span className={`text-[10px] block mb-0.5 transition-colors ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Mula:</span>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`w-full text-xs p-2.5 border rounded-lg focus:ring-2 focus:ring-cyan-500 transition outline-none ${isDarkMode ? 'border-slate-800 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-800'}`} />
                  </div>
                  <div>
                    <span className={`text-[10px] block mb-0.5 transition-colors ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Akhir:</span>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={`w-full text-xs p-2.5 border rounded-lg focus:ring-2 focus:ring-cyan-500 transition outline-none ${isDarkMode ? 'border-slate-800 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-800'}`} />
                  </div>
                </div>
                {/* Quick date range buttons */}
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {[{ label: '7 Hari Terakhir', days: 7 }, { label: '30 Hari Terakhir', days: 30 }].map(({ label, days }) => {
                    const end = endDate || new Date().toISOString().split('T')[0];
                    const start = new Date(new Date(end).setDate(new Date(end).getDate() - days + 1)).toISOString().split('T')[0];
                    const isActive = startDate === start && endDate === end;
                    return (
                      <button
                        key={days}
                        type="button"
                        onClick={() => { setStartDate(start); setEndDate(end); }}
                        className={`text-[10px] font-semibold px-2 py-2 rounded-lg border transition-all cursor-pointer ${
                          isActive
                            ? isDarkMode ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-cyan-100 text-cyan-800 border-cyan-300'
                            : isDarkMode ? 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Search */}
              <div className={`space-y-2 pt-2 border-t transition-colors ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  <Search className="w-3.5 h-3.5" /><span>CARIAN KLUSTER</span>
                </label>
                <div className="relative">
                  <input type="text" placeholder="Cari daerah, lokaliti..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`w-full text-xs pl-8 pr-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors ${isDarkMode ? 'border-slate-800 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-800'}`} />
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-3" />
                </div>
              </div>
            </div>
          </div>

          {/* KPI CARDS & MAP */}
          <div className="lg:col-span-3 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className={`border-t-4 border-t-rose-500/80 p-4 rounded-xl flex flex-col justify-between transition-colors duration-300 ${isDarkMode ? "bg-slate-900/50 border border-slate-800" : "bg-white border border-slate-200 shadow-sm"}`}>
                <div className="flex justify-between items-start">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>SUHU MAKS</span>
                  <ArrowUp className={`w-4 h-4 ${isDarkMode ? "text-rose-400" : "text-rose-600"}`} />
                </div>
                <div className="mt-2.5">
                  <div className={`text-xl lg:text-2xl font-black ${isDarkMode ? "text-white" : "text-slate-900"}`}>{averages.maxTemp} °C</div>
                </div>
              </div>
              
              <div className={`border-t-4 border-t-sky-500/80 p-4 rounded-xl flex flex-col justify-between transition-colors duration-300 ${isDarkMode ? "bg-slate-900/50 border border-slate-800" : "bg-white border border-slate-200 shadow-sm"}`}>
                <div className="flex justify-between items-start">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>SUHU MIN</span>
                  <ArrowDown className={`w-4 h-4 ${isDarkMode ? "text-sky-400" : "text-sky-600"}`} />
                </div>
                <div className="mt-2.5">
                  <div className={`text-xl lg:text-2xl font-black ${isDarkMode ? "text-white" : "text-slate-900"}`}>{averages.minTemp} °C</div>
                </div>
              </div>

              <div className={`border-t-4 border-t-blue-500/85 p-4 rounded-xl flex flex-col justify-between transition-colors duration-300 ${isDarkMode ? "bg-slate-900/50 border border-slate-800" : "bg-white border border-slate-200 shadow-sm"}`}>
                <div className="flex justify-between items-start">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>TABURAN HUJAN</span>
                  <Droplet className={`w-4 h-4 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
                </div>
                <div className="mt-2.5">
                  <div className={`text-xl lg:text-2xl font-black ${isDarkMode ? "text-white" : "text-slate-900"}`}>{averages.rain} mm</div>
                </div>
              </div>

              <div className={`border-t-4 border-t-purple-550/80 p-4 rounded-xl flex flex-col justify-between transition-colors duration-300 ${isDarkMode ? "bg-slate-900/50 border border-slate-800" : "bg-white border border-slate-200 shadow-sm"}`}>
                <div className="flex justify-between items-start">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>KELAJUAN ANGIN</span>
                  <Wind className={`w-4 h-4 ${isDarkMode ? "text-purple-400" : "text-purple-600"}`} />
                </div>
                <div className="mt-2.5">
                  <div className={`text-xl lg:text-2xl font-black ${isDarkMode ? "text-white" : "text-slate-900"}`}>{averages.wind} m/s</div>
                </div>
              </div>

              <div className={`border-t-4 border-t-emerald-550/80 p-4 rounded-xl flex flex-col justify-between transition-colors duration-300 ${isDarkMode ? "bg-slate-900/50 border border-slate-800" : "bg-white border border-slate-200 shadow-sm"}`}>
                <div className="flex justify-between items-start">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>KELEMBAPAN</span>
                  <Droplets className={`w-4 h-4 ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`} />
                </div>
                <div className="mt-2.5">
                  <div className={`text-xl lg:text-2xl font-black ${isDarkMode ? "text-white" : "text-slate-900"}`}>{averages.humidity} %</div>
                </div>
              </div>
            </div>

            {/* D3 MAP COMPONENT */}
            <div className={`p-5 rounded-2xl border shadow-xl flex flex-col relative w-full min-h-[500px] transition-colors duration-300 ${isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-200"}`}>
              <div className={`flex items-center justify-between border-b pb-3 mb-4 transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4.5 h-4.5 text-rose-500" />
                  <h3 className={`text-sm font-bold uppercase tracking-wider ${isDarkMode ? "text-white" : "text-slate-800"}`}>Peta Geografi Cuaca Malaysia 🇲🇾</h3>
                </div>
              </div>

              <div ref={mapContainerRef} className={`relative rounded-2xl border shadow-2xl overflow-hidden transition-all duration-300 ${isDarkMode ? "border-slate-800/80 bg-teal-950/5" : "border-slate-200 bg-teal-50/5"}`} style={{ height: '500px' }}>
                <MalaysiaSVGMap 
                  isDarkMode={isDarkMode} selectedStates={selectedStates} setSelectedStates={setSelectedStates}
                  districtAverages={districtAverages} STATE_CODE_TO_NAME={STATE_CODE_TO_NAME}
                  filteredData={filteredData} endDate={endDate}
                />
              </div>
            </div>

            {/* GRID DAERAH */}
            <div className={`p-5 rounded-2xl border shadow-xl flex flex-col justify-between transition-colors duration-300 ${isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-200"}`}>
              <div className={`flex items-center gap-2 border-b pb-3 mb-4 transition-colors ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                <Layers className="w-4.5 h-4.5 text-cyan-500" />
                <h3 className={`text-sm font-bold uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Maklumat Daerah</h3>
              </div>

              {filteredData.length === 0 ? (
                <div className={`text-center py-12 text-xs border border-dashed rounded-xl ${isDarkMode ? 'text-slate-500 border-slate-800' : 'text-slate-550 border-slate-300'}`}>Tiada rekod data dijumpai padanan tapisan semasa.</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 overflow-y-auto max-h-[420px] custom-scrollbar" onMouseLeave={() => setTooltip(null)}>
                  {(() => {
                    const distSet: Record<string, { raw: DataCuacaHarian }> = {};
                    filteredData.forEach(d => {
                      const existing = distSet[d.daerah];
                      if (!existing || d.tarikh.localeCompare(existing.raw.tarikh) > 0) {
                        distSet[d.daerah] = { raw: d };
                      }
                    });

                    return Object.keys(distSet).map(daerahName => {
                      const value = distSet[daerahName];
                      const latestSuhuPurata = parseFloat((((value.raw.suhu_maksimum ?? 30) + (value.raw.suhu_minimum ?? 24)) / 2).toFixed(1));
                      const isDistrictFilteredSelected = selectedDistricts.includes(daerahName);

                      return (
                        <div key={daerahName} onClick={() => toggleDistrictSelection(daerahName)}
                          onMouseEnter={(e) => handleMapMouseMove(e as unknown as MouseEvent, { ...value.raw, title: `${daerahName} (${value.raw.negeri})` })}
                          className={`p-3.5 rounded-xl border cursor-pointer select-none transition-all duration-200 ${isDistrictFilteredSelected ? isDarkMode ? 'bg-cyan-950/80 text-cyan-200 border-cyan-500/85 shadow-md ring-2 ring-cyan-500/20' : 'bg-cyan-50 text-cyan-950 border-cyan-550 shadow-sm ring-2 ring-cyan-550/10' : isDarkMode ? 'bg-slate-950/40 hover:bg-slate-850/80 text-slate-100 border-slate-850' : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-sm'}`}
                        >
                          <div className={`text-[10px] font-bold uppercase truncate ${isDarkMode ? 'text-slate-450' : 'text-slate-500'}`}>{value.raw.negeri}</div>
                          <div className={`text-xs font-black truncate mt-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{daerahName}</div>
                          <div className="mt-3 flex items-end justify-between">
                            <div className={`text-xs px-2 py-0.5 rounded font-bold border ${isDistrictFilteredSelected ? 'bg-cyan-900 border-cyan-800 text-cyan-300' : getTemperatureBgClass(latestSuhuPurata, isDarkMode)}`}>{latestSuhuPurata} °C</div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* CHARTS */}
        <section className={`p-6 rounded-2xl border shadow-xl transition-colors duration-300 ${isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-200"}`}>
          <div className={`flex items-center gap-2 border-b pb-4 mb-6 transition-colors ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
            <ChartIcon className="w-5 h-5 text-cyan-500" />
            <h3 className={`text-base font-bold uppercase tracking-wider ${isDarkMode ? "text-white" : "text-slate-900"}`}>Analisis Trend & Hubungan Meteorologi</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-2">
              <h4 className={`text-xs font-bold tracking-wider uppercase mb-2 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>Analisis Suhu</h4>
              <div className="h-64 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartDataGrouped} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#1E293B" : "#E2E8F0"} />
                    <XAxis dataKey="tarikhStr" tick={{ fontSize: 10, fill: isDarkMode ? '#94A3B8' : '#475569' }} />
                    <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: isDarkMode ? '#94A3B8' : '#475569' }} />
                    <RechartsTooltip contentStyle={{ fontSize: 11, backgroundColor: isDarkMode ? '#0F172A' : '#FFFFFF', color: isDarkMode ? '#F8FAFC' : '#1E293B' }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="Suhu Maksimum (°C)" stroke="#EF4444" strokeWidth={3} />
                    <Line type="monotone" dataKey="Suhu Minimum (°C)" stroke="#38BDF8" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className={`text-xs font-bold tracking-wider uppercase mb-2 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>Taburan Hujan</h4>
              <div className="h-64 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDataGrouped} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#1E293B" : "#E2E8F0"} />
                    <XAxis dataKey="tarikhStr" tick={{ fontSize: 10, fill: isDarkMode ? '#94A3B8' : '#475569' }} />
                    <YAxis tick={{ fontSize: 10, fill: isDarkMode ? '#94A3B8' : '#475569' }} />
                    <RechartsTooltip contentStyle={{ fontSize: 11, backgroundColor: isDarkMode ? '#0F172A' : '#FFFFFF', color: isDarkMode ? '#F8FAFC' : '#1E293B' }} />
                    <Bar dataKey="Taburan Hujan (mm)" fill="#38BDF8" radius={[4, 4, 0, 0]} opacity={0.8} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>

        {/* TABULAR LISTING */}
        <section className={`p-6 rounded-2xl border shadow-xl transition-colors duration-300 ${isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-200"}`}>
          <div className="flex justify-between items-center border-b pb-4 mb-6">
            <h3 className={`text-base font-bold uppercase tracking-wider ${isDarkMode ? "text-white" : "text-slate-900"}`}>Log Profil Cuaca Terperinci</h3>
            <button onClick={exportToCSV} disabled={filteredData.length === 0} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl font-bold text-xs">
              <Download className="w-4 h-4" /> Muat Turun CSV
            </button>
          </div>

          <div className={`overflow-x-auto rounded-xl border ${isDarkMode ? "border-slate-800 bg-slate-950/40" : "border-slate-200 bg-slate-50"}`}>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className={`font-bold border-b ${isDarkMode ? "bg-slate-950 text-slate-300 border-slate-800" : "bg-slate-200/60 text-slate-700 border-slate-300"}`}>
                  <th className="p-3.5">TARIKH</th><th className="p-3.5">NEGERI</th><th className="p-3.5">DAERAH</th>
                  <th className="p-3.5">LOKALITI</th><th className="p-3.5 text-center">SUHU MAKS</th>
                  <th className="p-3.5 text-center">SUHU MIN</th><th className="p-3.5 text-center">HUJAN</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? "divide-slate-850" : "divide-slate-200"}`}>
                {filteredData.slice(0, 50).map((record) => (
                  <tr key={record.id} className={`${isDarkMode ? "hover:bg-slate-850/60 text-slate-300" : "hover:bg-slate-100/80 text-slate-700"}`}>
                    <td className="p-3.5 whitespace-nowrap">{record.tarikh}</td>
                    <td className="p-3.5">{record.negeri}</td><td className="p-3.5">{record.daerah}</td>
                    <td className="p-3.5">{record.lokaliti || '-'}</td>
                    <td className="p-3.5 text-center text-rose-500">{record.suhu_maksimum ?? '-'}</td>
                    <td className="p-3.5 text-center text-sky-500">{record.suhu_minimum ?? '-'}</td>
                    <td className="p-3.5 text-center">{record.taburan_hujan ?? '0'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* FLOATING TOOLTIP */}
      {tooltip && tooltip.visible && (
        <div className={`fixed z-50 px-3 py-2 rounded-lg text-xs shadow-xl pointer-events-none border ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
             style={{ left: tooltip.x, top: tooltip.y }}>
          <div className="font-bold">{tooltip.title}</div>
          <div className={isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}>Suhu: {tooltip.suhu_maksimum}°C</div>
        </div>
      )}
    </div>
  );
}

// Komponen Peta D3 SVG
function MalaysiaSVGMap({ isDarkMode, selectedStates, setSelectedStates, districtAverages, STATE_CODE_TO_NAME, filteredData, endDate }: any) {
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);

  const stateFeatures = useMemo(() => (malaysiaStateGeoJSON as any).features || [], []);
  const peninsularFeatures = stateFeatures.filter((f: any) => ['KDH','KTN','PRK','PNG','KUL','NSN','MLK','PLS','PHG','TRG','JHR','SGR','PJY'].includes(f.id));
  const eastFeatures = stateFeatures.filter((f: any) => ['SBH','SWK','LBN'].includes(f.id));

  const STATE_NAME_MAP: Record<string, string> = {
    "KDH": "KEDAH", "KTN": "KELANTAN", "PRK": "PERAK", "PNG": "PULAU PINANG",
    "KUL": "W.P. KUALA LUMPUR", "NSN": "NEGERI SEMBILAN", "MLK": "MELAKA",
    "PLS": "PERLIS", "PHG": "PAHANG", "TRG": "TERENGGANU", "JHR": "JOHOR",
    "SGR": "SELANGOR", "SBH": "SABAH", "SWK": "SARAWAK", "LBN": "W.P. LABUAN", "PJY": "W.P. PUTRAJAYA"
  };

  const getStateFill = (stateCode: string) => {
    const stateName = STATE_NAME_MAP[stateCode] || '';
    const isSelected = selectedStates.includes(stateName);
    const isHovered = hoveredState === stateCode;
    const temp = districtAverages[stateName] || 0;

    if (isSelected) return isDarkMode ? '#06b6d4' : '#0891b2';
    if (isHovered) return isDarkMode ? '#164e63' : '#cffafe';
    if (temp > 32) return isDarkMode ? '#7f1d1d' : '#fecaca';
    if (temp > 30) return isDarkMode ? '#431407' : '#fed7aa';
    if (temp > 28) return isDarkMode ? '#422006' : '#fef08a';
    if (temp > 25) return isDarkMode ? '#064e3b' : '#bbf7d0';
    return isDarkMode ? '#1e293b' : '#e2e8f0';
  };

  // Peninsular: ~5.5° wide x 9.5° tall  → portrait, pad to 260×460
  // East Malaysia: ~10° wide x 6.5° tall → landscape, pad to 460×300
  const PAD = 12;
  const peninsularProjection = useMemo(() =>
    geoMercator().fitExtent([[PAD,PAD],[260-PAD,460-PAD]], { type:'FeatureCollection', features: peninsularFeatures }),
  [peninsularFeatures]);
  const eastProjection = useMemo(() =>
    geoMercator().fitExtent([[PAD,PAD],[460-PAD,300-PAD]], { type:'FeatureCollection', features: eastFeatures }),
  [eastFeatures]);
  const peninsularPath = useMemo(() => geoPath().projection(peninsularProjection), [peninsularProjection]);
  const eastPath       = useMemo(() => geoPath().projection(eastProjection),       [eastProjection]);

  const renderFeatures = (features: any[], pathGen: any) =>
    features.map((f: any) => {
      const stateCode = f.id || '';
      const stateName = STATE_NAME_MAP[stateCode] || '';
      const centroid = pathGen.centroid(f);
      const hasCentroid = centroid && !isNaN(centroid[0]) && !isNaN(centroid[1]);
      // Short label for display
      const SHORT_LABEL: Record<string, string> = {
        'KDH':'Kedah','KTN':'Kelantan','PRK':'Perak','PNG':'P. Pinang',
        'KUL':'KL','NSN':'N. Sembilan','MLK':'Melaka','PLS':'Perlis',
        'PHG':'Pahang','TRG':'Terengganu','JHR':'Johor','SGR':'Selangor',
        'SBH':'Sabah','SWK':'Sarawak','LBN':'Labuan','PJY':'Putrajaya',
      };
      const label = SHORT_LABEL[stateCode] || stateCode;
      return (
        <g key={stateCode}>
          <path d={pathGen(f) as string} fill={getStateFill(stateCode)}
            stroke={isDarkMode ? '#475569' : '#94a3b8'} strokeWidth={0.6}
            className="cursor-pointer transition-colors duration-150"
            onMouseEnter={(e: React.MouseEvent) => {
              setHoveredState(stateCode);
              if (svgContainerRef.current) {
                const rect = svgContainerRef.current.getBoundingClientRect();
                setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
              }
            }}
            onMouseMove={(e: React.MouseEvent) => {
              if (svgContainerRef.current) {
                const rect = svgContainerRef.current.getBoundingClientRect();
                setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
              }
            }}
            onMouseLeave={() => { setHoveredState(null); setTooltipPos(null); }}
            onClick={() => {
              if (!stateName) return;
              setSelectedStates((prev: string[]) => prev.includes(stateName) ? prev.filter(s => s !== stateName) : [...prev, stateName]);
            }}
          />
          {hasCentroid && (
            <text
              x={centroid[0]} y={centroid[1]}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={stateCode === 'KUL' || stateCode === 'PJY' || stateCode === 'LBN' ? 4 : stateCode === 'MLK' || stateCode === 'PLS' ? 6 : 8}
              fontWeight="600"
              fill={isDarkMode ? '#e2e8f0' : '#1e293b'}
              stroke={isDarkMode ? '#0f172a' : '#ffffff'}
              strokeWidth={2}
              paintOrder="stroke"
              pointerEvents="none"
              style={{ userSelect: 'none' }}
            >
              {label}
            </text>
          )}
        </g>
      );
    });

  // Build tooltip data for hovered state
  const hoveredStateName = hoveredState ? STATE_NAME_MAP[hoveredState] : null;
  const hoveredStateData = useMemo(() => {
    if (!hoveredStateName || !filteredData?.length) return null;
    const stateRecords = filteredData.filter((d: any) => d.negeri === hoveredStateName);
    if (!stateRecords.length) return null;
    // Get latest date records
    const latest = stateRecords.reduce((a: any, b: any) => a.tarikh > b.tarikh ? a : b);
    const sameDay = stateRecords.filter((d: any) => d.tarikh === latest.tarikh);
    const avg = (key: string) => {
      const vals = sameDay.map((d: any) => d[key]).filter((v: any) => v !== null && v !== undefined);
      if (!vals.length) return null;
      return parseFloat((vals.reduce((a: number, b: number) => a + b, 0) / vals.length).toFixed(1));
    };
    return {
      negeri: hoveredStateName,
      tarikh: latest.tarikh,
      suhu_maksimum: avg('suhu_maksimum'),
      suhu_minimum: avg('suhu_minimum'),
      kelembapan: avg('kelembapan'),
      taburan_hujan: avg('taburan_hujan'),
      kelajuan_angin: avg('kelajuan_angin'),
      kelembapan_tanah_permukaan: avg('kelembapan_tanah_permukaan'),
    };
  }, [hoveredStateName, filteredData]);

  return (
    <div ref={svgContainerRef} className="w-full h-full flex flex-row gap-2 p-2 items-stretch relative">
      {/* Semenanjung — portrait 260×460 viewBox */}
      <div className="flex items-center justify-center" style={{ width: '42%' }}>
        <svg viewBox="0 0 260 460" style={{ width: '100%', height: '100%', maxHeight: '100%' }} preserveAspectRatio="xMidYMid meet">
          {renderFeatures(peninsularFeatures, peninsularPath)}
        </svg>
      </div>
      {/* Malaysia Timur — landscape 460×300 viewBox */}
      <div className="flex flex-col items-center justify-center gap-1" style={{ width: '58%' }}>
        <svg viewBox="0 0 460 300" style={{ width: '100%', maxHeight: '70%' }} preserveAspectRatio="xMidYMid meet">
          {renderFeatures(eastFeatures, eastPath)}
        </svg>
        <span className={`text-[9px] font-semibold uppercase tracking-widest ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>Sabah &amp; Sarawak</span>
      </div>

      {/* Hover Tooltip */}
      {hoveredStateData && tooltipPos && (
        <div
          className={`absolute z-50 pointer-events-none rounded-xl border shadow-2xl p-3 min-w-[180px] text-xs transition-none ${
            isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}
          style={{
            left: tooltipPos.x + 14,
            top: tooltipPos.y - 10,
            transform: tooltipPos.x > 350 ? 'translateX(-110%)' : undefined,
          }}
        >
          {/* Header */}
          <div className={`font-extrabold text-[11px] uppercase tracking-wide mb-2 pb-1.5 border-b ${
            isDarkMode ? 'text-cyan-400 border-slate-700' : 'text-cyan-700 border-slate-200'
          }`}>
            🗺️ {hoveredStateData.negeri}
          </div>
          <div className={`text-[10px] mb-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Tarikh: <span className={`font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{hoveredStateData.tarikh}</span>
          </div>
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            <div className={`rounded-lg p-1.5 ${isDarkMode ? 'bg-rose-950/40' : 'bg-rose-50'}`}>
              <div className={`text-[9px] uppercase font-bold ${isDarkMode ? 'text-rose-400' : 'text-rose-600'}`}>Suhu Maks</div>
              <div className={`font-black text-sm ${isDarkMode ? 'text-rose-300' : 'text-rose-700'}`}>{hoveredStateData.suhu_maksimum ?? '–'}°C</div>
            </div>
            <div className={`rounded-lg p-1.5 ${isDarkMode ? 'bg-sky-950/40' : 'bg-sky-50'}`}>
              <div className={`text-[9px] uppercase font-bold ${isDarkMode ? 'text-sky-400' : 'text-sky-600'}`}>Suhu Min</div>
              <div className={`font-black text-sm ${isDarkMode ? 'text-sky-300' : 'text-sky-700'}`}>{hoveredStateData.suhu_minimum ?? '–'}°C</div>
            </div>
            <div className={`rounded-lg p-1.5 ${isDarkMode ? 'bg-teal-950/40' : 'bg-teal-50'}`}>
              <div className={`text-[9px] uppercase font-bold ${isDarkMode ? 'text-teal-400' : 'text-teal-600'}`}>Kelembapan</div>
              <div className={`font-black text-sm ${isDarkMode ? 'text-teal-300' : 'text-teal-700'}`}>{hoveredStateData.kelembapan ?? '–'}%</div>
            </div>
            <div className={`rounded-lg p-1.5 ${isDarkMode ? 'bg-blue-950/40' : 'bg-blue-50'}`}>
              <div className={`text-[9px] uppercase font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>Hujan</div>
              <div className={`font-black text-sm ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>{hoveredStateData.taburan_hujan ?? '–'} mm</div>
            </div>
            <div className={`rounded-lg p-1.5 ${isDarkMode ? 'bg-purple-950/40' : 'bg-purple-50'}`}>
              <div className={`text-[9px] uppercase font-bold ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>Kelajuan Angin</div>
              <div className={`font-black text-sm ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>{hoveredStateData.kelajuan_angin ?? '–'} m/s</div>
            </div>
            <div className={`rounded-lg p-1.5 ${isDarkMode ? 'bg-emerald-950/40' : 'bg-emerald-50'}`}>
              <div className={`text-[9px] uppercase font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>Humid Tanah</div>
              <div className={`font-black text-sm ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>{hoveredStateData.kelembapan_tanah_permukaan ?? '–'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}