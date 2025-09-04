import React, { useMemo, useState, useEffect } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  LabelList,
  ReferenceLine,
  Cell,
} from "recharts";

/**
 * NK Camp Population Interactive (2020–2025)
 * - 차트 + 표 시각화
 * - 색각친화 팔레트(Okabe–Ito), 다크모드 지원
 * - CSV 내보내기
 */

// 색각친화 팔레트
const COLORS: Record<string, string> = {
  "14호 관리소": "#0072B2",
  "15호 관리소": "#E69F00",
  "16호 관리소": "#009E73",
  "17호 관리소": "#D55E00",
  "18호 관리소": "#CC79A7",
  "25호 관리소": "#56B4E9",
};

const RAW = [
  { year: "2020-03", "14호 관리소": 43000, "15호 관리소": 55000, "16호 관리소": 24000, "17호 관리소": 21000, "18호 관리소": 26000, "25호 관리소": 40000, 합계: 209000 },
  { year: "2021-07", "14호 관리소": 43000, "15호 관리소": 56800, "16호 관리소": 24000, "17호 관리소": 20800, "18호 관리소": 25800, "25호 관리소": 41000, 합계: 211400 },
  { year: "2022-06", "14호 관리소": 36800, "15호 관리소": 42900, "16호 관리소": 28700, "17호 관리소": 41200, "18호 관리소": 20200, "25호 관리소": 36000, 합계: 205800 },
  { year: "2023-06", "14호 관리소": 40200, "15호 관리소": 38500, "16호 관리소": 15900, "17호 관리소": 44000, "18호 관리소": 21800, "25호 관리소": 38500, 합계: 198900 },
  { year: "2024-06", "14호 관리소": 39300, "15호 관리소": 34000, "16호 관리소": 21000, "17호 관리소": 39600, "18호 관리소": 23800, "25호 관리소": 32100, 합계: 189800 },
  { year: "2025-06", "14호 관리소": 39700, "15호 관리소": 33600, "16호 관리소": 24100, "17호 관리소": 39200, "18호 관리소": 24200, "25호 관리소": 31900, 합계: 192700 },
];

const SERIES = Object.keys(COLORS) as Array<keyof typeof COLORS>;

// 숫자 포맷팅
function formatNumber(n: number | null): string {
  if (n == null) return "–";
  return n.toLocaleString("ko-KR");
}

// CSV 이스케이프
function escapeCSV(s: any): string {
  const str = String(s ?? "");
  return str.includes(",") || str.includes("\"") || str.includes("\n") ? `"${str.replace(/"/g, '""')}"` : str;
}

// CSV 내보내기
function downloadCsv(data: any[], filename: string) {
  const header = Object.keys(data[0]);
  const rows = data.map((r) => Object.values(r));
  const esc = (v: any) => escapeCSV(v);
  const lines = [header.join(",")].concat(rows.map((r) => header.map((k) => esc((r as any)[k])).join(",")));
  const csv = lines.join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

// CSV 테스트
function runCsvTests() {
  const testCases = [
    { input: 'hello', expected: 'hello' },
    { input: 'hello,world', expected: '"hello,world"' },
    { input: 'say "hello"', expected: '"say ""hello"""' },
    { input: 'line\nbreak', expected: '"line\nbreak"' },
  ];
  
  testCases.forEach(({ input, expected }) => {
    const result = escapeCSV(input);
    if (result !== expected) {
      console.error(`CSV escape test failed: input="${input}" expected="${expected}" got="${result}"`);
    }
  });
}

export default function NKCampInteractive() {
  const [active, setActive] = useState(new Set(SERIES));
  const [normalize, setNormalize] = useState(false);
  const [grid, setGrid] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // 시스템 다크모드 감지
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(mediaQuery.matches);
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  useEffect(() => { try { runCsvTests(); } catch {} }, []);

  const base = RAW[0];

  // 합계 검증
  const audit = useMemo(() => {
    const mismatches: { year: string; provided: number; computed: number }[] = [];
    RAW.forEach((row) => {
      const sum = (SERIES as unknown as string[]).reduce((acc, key) => acc + ((row as any)[key] || 0), 0);
      if (sum !== (row as any)["합계"]) {
        mismatches.push({ year: (row as any).year, provided: (row as any)["합계"], computed: sum });
      }
    });
    return { pass: mismatches.length === 0, mismatches };
  }, []);

  // 차트 데이터 준비
  const prepared = useMemo(() => {
    if (normalize) {
      return RAW.map((row) => {
        const result: any = { year: row.year };
        (SERIES as unknown as string[]).forEach((key) => {
          const current = (row as any)[key];
          const base_val = (base as any)[key];
          result[key] = base_val > 0 ? (current / base_val) * 100 : null;
        });
        return result;
      });
    }
    return RAW.map((row) => {
      const result: any = { year: row.year };
      (SERIES as unknown as string[]).forEach((key) => {
        result[key] = (row as any)[key];
      });
      return result;
    });
  }, [normalize, base]);

  // 합계 데이터 (바차트용)
  const totalsData = useMemo(() => {
    return RAW.map((row, idx) => {
      const prevTotal = idx > 0 ? RAW[idx - 1].합계 : row.합계;
      const yoy = idx > 0 ? ((row.합계 - prevTotal) / prevTotal * 100) : 0;
      return {
        year: row.year as string,
        합계: row.합계,
        yoy: idx > 0 ? yoy : null,
      };
    });
  }, []);

  const toggleSeries = (key: string) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const activeKeys = (SERIES as unknown as string[]).filter((s) => active.has(s));

  return (
    <div className={`min-h-screen transition-all duration-300 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 text-neutral-100' 
        : 'bg-gradient-to-br from-neutral-50 via-white to-neutral-100 text-neutral-900'
    }`}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className={`h-full w-full ${
          isDarkMode 
            ? 'bg-[radial-gradient(circle_at_30%_20%,_rgba(59,130,246,0.1)_0%,_transparent_50%),radial-gradient(circle_at_70%_80%,_rgba(147,51,234,0.1)_0%,_transparent_50%)]'
            : 'bg-[radial-gradient(circle_at_30%_20%,_rgba(59,130,246,0.05)_0%,_transparent_50%),radial-gradient(circle_at_70%_80%,_rgba(147,51,234,0.05)_0%,_transparent_50%)]'
        }`}></div>
      </div>
      
      <div className="relative container mx-auto px-6 py-12 max-w-7xl space-y-10">
        
      {/* Header */}
      <div className="text-center space-y-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex-1"></div>
          <div className="flex-1">
            <h1 className="text-4xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              북한 주요 관리소 수감 인원 추정치
            </h1>
          </div>
          <div className="flex-1 flex justify-end">
            {/* Apple-style Dark Mode Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`relative inline-flex items-center h-8 w-14 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                isDarkMode ? 'bg-blue-600' : 'bg-gray-200'
              }`}
              aria-label="다크모드 토글"
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform duration-200 ease-in-out ${
                  isDarkMode ? 'translate-x-7' : 'translate-x-1'
                }`}
              >
                <span className="flex items-center justify-center h-full w-full text-xs">
                  {isDarkMode ? '🌙' : '☀️'}
                </span>
              </span>
            </button>
          </div>
        </div>
        
        <div className="space-y-3">
          <p className={`text-xl font-medium ${
            isDarkMode ? 'text-neutral-300' : 'text-neutral-600'
          }`}>2020년 3월 ~ 2025년 6월</p>
          
          <div className="flex items-center justify-center gap-4">
            <p className={`text-sm ${
              isDarkMode ? 'text-neutral-400' : 'text-neutral-500'
            }`}>
              출처: 사용자 제공 표
            </p>
            
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
              audit.pass 
                ? (isDarkMode ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800' : 'bg-emerald-50 text-emerald-700 border border-emerald-200')
                : (isDarkMode ? 'bg-red-900/30 text-red-400 border border-red-800' : 'bg-red-50 text-red-700 border border-red-200')
            }`}>
              <span className={audit.pass ? 'text-emerald-500' : 'text-red-500'}>
                {audit.pass ? '●' : '●'}
              </span>
              {audit.pass ? "데이터 검증 통과" : `데이터 불일치 ${audit.mismatches.length}건`}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className={`backdrop-blur-xl rounded-3xl border shadow-xl p-6 transition-all duration-300 ${
        isDarkMode 
          ? 'bg-neutral-800/70 border-neutral-700/50 shadow-black/20' 
          : 'bg-white/70 border-neutral-200/50 shadow-neutral-300/20'
      }`}>
        <div className="space-y-6">
          
          {/* Series Toggle Pills */}
          <div>
            <h3 className={`text-sm font-semibold mb-3 ${
              isDarkMode ? 'text-neutral-300' : 'text-neutral-700'
            }`}>관리소 선택</h3>
            <div className="flex flex-wrap gap-2">
              {(SERIES as unknown as string[]).map((key) => (
                <button
                  key={key}
                  onClick={() => toggleSeries(key)}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 transform hover:scale-105 ${
                    active.has(key)
                      ? 'shadow-lg'
                      : (isDarkMode ? 'hover:bg-neutral-700/50' : 'hover:bg-neutral-100/80')
                  }`}
                  style={{
                    backgroundColor: active.has(key) ? COLORS[key] + '20' : 'transparent',
                    borderWidth: '1.5px',
                    borderColor: active.has(key) ? COLORS[key] : (isDarkMode ? '#525252' : '#d1d5db'),
                    color: active.has(key) ? COLORS[key] : (isDarkMode ? '#a3a3a3' : '#6b7280')
                  }}
                >
                  <div 
                    className="w-2.5 h-2.5 rounded-full shadow-sm" 
                    style={{ backgroundColor: active.has(key) ? COLORS[key] : (isDarkMode ? '#525252' : '#9ca3af') }}
                  />
                  <span>{key}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Settings & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-4">
              {/* Toggle Switches */}
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                  normalize ? 'bg-blue-600' : (isDarkMode ? 'bg-neutral-600' : 'bg-neutral-300')
                }`}>
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-200 ${
                      normalize ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                  <input
                    type="checkbox"
                    checked={normalize}
                    onChange={(e) => setNormalize(e.target.checked)}
                    className="sr-only"
                  />
                </div>
                <span className={`text-sm font-medium group-hover:text-blue-600 transition-colors ${
                  isDarkMode ? 'text-neutral-300' : 'text-neutral-700'
                }`}>
                  정규화 모드
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                  grid ? 'bg-blue-600' : (isDarkMode ? 'bg-neutral-600' : 'bg-neutral-300')
                }`}>
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-200 ${
                      grid ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                  <input
                    type="checkbox"
                    checked={grid}
                    onChange={(e) => setGrid(e.target.checked)}
                    className="sr-only"
                  />
                </div>
                <span className={`text-sm font-medium group-hover:text-blue-600 transition-colors ${
                  isDarkMode ? 'text-neutral-300' : 'text-neutral-700'
                }`}>
                  격자선 표시
                </span>
              </label>
            </div>

            {/* CSV Download Button */}
            <button 
              onClick={() => downloadCsv(RAW, "nk-camp-population.csv")}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg ${
                isDarkMode 
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-blue-900/30' 
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white shadow-blue-500/30'
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              CSV 다운로드
            </button>
          </div>
        </div>
        
        {!audit.pass && (
          <div className={`mt-4 p-3 rounded-lg ${
            isDarkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'
          }`}>
            <h4 className={`text-sm font-medium ${
              isDarkMode ? 'text-red-400' : 'text-red-700'
            }`}>합계 불일치 발견:</h4>
            <ul className="mt-2 space-y-1">
              {audit.mismatches.map((m) => (
                <li key={m.year} className={`text-xs ${
                  isDarkMode ? 'text-red-300' : 'text-red-600'
                }`}>
                  {m.year}: 제공값 {formatNumber(m.provided)} ≠ 계산값 {formatNumber(m.computed)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Line Chart */}
      <div className={`backdrop-blur-xl rounded-3xl border shadow-2xl p-8 transition-all duration-300 ${
        isDarkMode 
          ? 'bg-neutral-800/70 border-neutral-700/50 shadow-black/30' 
          : 'bg-white/80 border-neutral-200/50 shadow-neutral-300/30'
      }`}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className={`text-2xl font-semibold mb-2 ${
              isDarkMode ? 'text-neutral-100' : 'text-neutral-800'
            }`}>관리소별 추이</h3>
            <p className={`text-sm font-medium ${
              isDarkMode ? 'text-neutral-400' : 'text-neutral-500'
            }`}>{normalize ? "2020-03 기준 정규화 (%)" : "수감 인원 (명)"}</p>
          </div>
          <div className={`px-4 py-2 rounded-full text-xs font-medium ${
            isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-700'
          }`}>
            📈 시계열 분석
          </div>
        </div>
        <div style={{ width: "100%", height: "400px" }}>
          <ResponsiveContainer>
            <LineChart data={prepared} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              {grid && <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#404040' : '#e0e0e0'} />}
              <XAxis 
                dataKey="year" 
                tick={{ fontSize: 12, fill: isDarkMode ? '#a3a3a3' : '#525252' }}
                axisLine={{ stroke: isDarkMode ? '#525252' : '#d1d5db' }}
                tickLine={{ stroke: isDarkMode ? '#525252' : '#d1d5db' }}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: isDarkMode ? '#a3a3a3' : '#525252' }}
                axisLine={{ stroke: isDarkMode ? '#525252' : '#d1d5db' }}
                tickLine={{ stroke: isDarkMode ? '#525252' : '#d1d5db' }}
                tickFormatter={(v) => normalize ? `${v}%` : formatNumber(v)}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: isDarkMode ? '#262626' : '#ffffff',
                  border: `1px solid ${isDarkMode ? '#404040' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  color: isDarkMode ? '#f5f5f5' : '#1f2937'
                }}
                formatter={(value: any) => [normalize ? `${Number(value).toFixed(1)}%` : formatNumber(value), ""]}
                labelStyle={{ color: isDarkMode ? '#d1d5db' : '#6b7280' }}
              />
              <Legend wrapperStyle={{ position: "relative" }} payload={activeKeys.map((k) => ({ value: k, id: k, type: "line", color: COLORS[k] }))} />
              {normalize && <ReferenceLine y={100} stroke={isDarkMode ? '#ef4444' : '#dc2626'} strokeDasharray="5 5" />}
              {activeKeys.map((key) => (
                <Line 
                  key={key} 
                  type="monotone" 
                  dataKey={key} 
                  stroke={COLORS[key]} 
                  strokeWidth={2} 
                  dot={{ fill: COLORS[key], strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: COLORS[key], strokeWidth: 2, fill: isDarkMode ? '#1f2937' : '#ffffff' }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bar Chart */}
      <div className={`backdrop-blur-xl rounded-3xl border shadow-2xl p-8 transition-all duration-300 ${
        isDarkMode 
          ? 'bg-neutral-800/70 border-neutral-700/50 shadow-black/30' 
          : 'bg-white/80 border-neutral-200/50 shadow-neutral-300/30'
      }`}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className={`text-2xl font-semibold mb-2 ${
              isDarkMode ? 'text-neutral-100' : 'text-neutral-800'
            }`}>연도별 합계</h3>
            <p className={`text-sm font-medium ${
              isDarkMode ? 'text-neutral-400' : 'text-neutral-500'
            }`}>전체 수감 인원 합계 및 전년대비 증감률</p>
          </div>
          <div className="flex gap-2">
            <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${
              isDarkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
            }`}>
              🟢 감소
            </div>
            <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${
              isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-700'
            }`}>
              🔴 증가
            </div>
          </div>
        </div>
        <div style={{ width: "100%", height: "300px" }}>
          <ResponsiveContainer>
            <BarChart data={totalsData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              {grid && <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#404040' : '#e0e0e0'} />}
              <XAxis 
                dataKey="year" 
                tick={{ fontSize: 12, fill: isDarkMode ? '#a3a3a3' : '#525252' }}
                axisLine={{ stroke: isDarkMode ? '#525252' : '#d1d5db' }}
                tickLine={{ stroke: isDarkMode ? '#525252' : '#d1d5db' }}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: isDarkMode ? '#a3a3a3' : '#525252' }}
                axisLine={{ stroke: isDarkMode ? '#525252' : '#d1d5db' }}
                tickLine={{ stroke: isDarkMode ? '#525252' : '#d1d5db' }}
                tickFormatter={formatNumber}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: isDarkMode ? '#262626' : '#ffffff',
                  border: `1px solid ${isDarkMode ? '#404040' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  color: isDarkMode ? '#f5f5f5' : '#1f2937'
                }}
                formatter={(value: any, name: any) => {
                  if (name === 'yoy') return [`${Number(value).toFixed(1)}%`, '전년대비'];
                  return [formatNumber(value), '합계'];
                }}
                labelStyle={{ color: isDarkMode ? '#d1d5db' : '#6b7280' }}
              />
              <Bar dataKey="합계" radius={[4, 4, 0, 0]}>
                {totalsData.map((entry, index) => {
                  const yoy = entry.yoy;
                  let fillColor;
                  if (yoy == null || yoy === 0) {
                    fillColor = isDarkMode ? '#6b7280' : '#9ca3af'; // 회색 (첫 해 또는 변화 없음)
                  } else if (yoy > 0) {
                    fillColor = isDarkMode ? '#dc2626' : '#ef4444'; // 빨강 (증가)
                  } else {
                    fillColor = isDarkMode ? '#16a34a' : '#22c55e'; // 초록 (감소)
                  }
                  return <Cell key={`cell-${index}`} fill={fillColor} />;
                })}
                <LabelList 
                  dataKey="yoy" 
                  position="middle" 
                  formatter={(value: any) => value != null ? `${value >= 0 ? '+' : ''}${Number(value).toFixed(1)}%` : ''} 
                  style={{ 
                    fontSize: '13px', 
                    fontWeight: 'bold',
                    fill: isDarkMode ? '#ffffff' : '#ffffff'
                  }} 
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Data Table */}
      <div className={`backdrop-blur-xl rounded-3xl border shadow-2xl p-8 transition-all duration-300 ${
        isDarkMode 
          ? 'bg-neutral-800/70 border-neutral-700/50 shadow-black/30' 
          : 'bg-white/80 border-neutral-200/50 shadow-neutral-300/30'
      }`}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className={`text-2xl font-semibold mb-2 ${
              isDarkMode ? 'text-neutral-100' : 'text-neutral-800'
            }`}>데이터 표</h3>
            <p className={`text-sm font-medium ${
              isDarkMode ? 'text-neutral-400' : 'text-neutral-500'
            }`}>상세 수치 데이터</p>
          </div>
          <div className={`px-4 py-2 rounded-full text-xs font-medium ${
            isDarkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-50 text-purple-700'
          }`}>
            📊 테이블 뷰
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className={`rounded-2xl border ${
            isDarkMode ? 'border-neutral-600/50' : 'border-neutral-200/50'
          }`}>
            <table className="min-w-full">
              <thead className={`${
                isDarkMode ? 'bg-neutral-700/50' : 'bg-neutral-50/50'
              }`}>
                <tr>
                  <th className={`text-left text-sm font-semibold px-6 py-4 rounded-tl-2xl ${
                    isDarkMode ? 'text-neutral-300' : 'text-neutral-700'
                  }`}>연도</th>
                  {activeKeys.map((key, index) => (
                    <th key={key} className="text-right text-sm font-semibold px-4 py-4" style={{ color: COLORS[key] }}>
                      {key}
                    </th>
                  ))}
                  {!normalize && (
                    <th className={`text-right text-sm font-semibold px-6 py-4 rounded-tr-2xl ${
                      isDarkMode ? 'text-neutral-300' : 'text-neutral-700'
                    }`}>합계</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/20">
                {prepared.map((row, rowIndex) => (
                  <tr key={row.year as string} className={`group hover:scale-[1.01] transition-all duration-200 ${
                    isDarkMode 
                      ? 'hover:bg-neutral-700/30' 
                      : 'hover:bg-neutral-50/50'
                  }`}>
                    <td className={`px-6 py-4 text-base font-medium ${
                      rowIndex === prepared.length - 1 ? 'rounded-bl-2xl' : ''
                    } ${isDarkMode ? 'text-neutral-200' : 'text-neutral-800'}`}>
                      {row.year as string}
                    </td>
                    {activeKeys.map((key) => (
                      <td key={key} className="text-right px-4 py-4 text-base tabular-nums font-medium" style={{ color: COLORS[key] }}>
                        {normalize ? (row[key] != null ? Number(row[key]).toFixed(1) + '%' : "–") : formatNumber(row[key] as number)}
                      </td>
                    ))}
                    {!normalize && (
                      <td className={`text-right px-6 py-4 text-base tabular-nums font-semibold ${
                        rowIndex === prepared.length - 1 ? 'rounded-br-2xl' : ''
                      } ${isDarkMode ? 'text-neutral-200' : 'text-neutral-800'}`}>
                        {formatNumber(RAW.find((r) => r.year === row.year)?.합계 ?? null)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      </div>
    </div>
  );
}