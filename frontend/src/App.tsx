import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { 
  Settings as SettingsIcon, 
  PlusCircle, 
  LayoutDashboard, 
  TrendingUp, 
  Calendar,
  Save,
  ChevronRight,
  ChevronLeft,
  AlertCircle
} from 'lucide-react';
import { format, differenceInDays, addDays, subDays, subMonths, subYears, parseISO, isAfter, isBefore, startOfDay } from 'date-fns';

const API_URL = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:3006`;

interface Settings {
  startDate: string;
  durationMonths: number;
  annualKm: number;
  allowanceKm: number;
  excessRate1: number;
  excessRate2: number;
  excessThreshold: number;
  underRate1: number;
  underRate2: number;
  underThreshold: number;
}

interface MileageLog {
  date: string;
  km: number;
}

type ChartRange = 'all' | 'year' | '6months' | '3months' | 'month' | 'week' | 'day';

const App = () => {
  const [view, setView] = useState<'dashboard' | 'settings' | 'log'>('dashboard');
  const [chartRange, setChartRange] = useState<ChartRange>('all');
  const [settings, setSettings] = useState<Settings>({
    startDate: format(new Date(), 'yyyy-MM-dd'),
    durationMonths: 36,
    annualKm: 10000,
    allowanceKm: 2500,
    excessRate1: 0.0566,
    excessRate2: 0.0792,
    excessThreshold: 37501,
    underRate1: 0.0340,
    underRate2: 0.0204,
    underThreshold: 22500
  });
  const [logs, setLogs] = useState<MileageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [useAllowance, setUseAllowance] = useState(() => {
    const saved = localStorage.getItem('useAllowance');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    localStorage.setItem('useAllowance', JSON.stringify(useAllowance));
  }, [useAllowance]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [settingsRes, logsRes] = await Promise.all([
        axios.get(`${API_URL}/api/settings`),
        axios.get(`${API_URL}/api/mileage`)
      ]);
      
      if (Object.keys(settingsRes.data).length > 0) {
        setSettings({
          startDate: settingsRes.data.startDate || format(new Date(), 'yyyy-MM-dd'),
          durationMonths: parseInt(settingsRes.data.durationMonths) || 36,
          annualKm: parseInt(settingsRes.data.annualKm) || 10000,
          allowanceKm: parseInt(settingsRes.data.allowanceKm) || 2500,
          excessRate1: parseFloat(settingsRes.data.excessRate1) || 0.0566,
          excessRate2: parseFloat(settingsRes.data.excessRate2) || 0.0792,
          excessThreshold: parseInt(settingsRes.data.excessThreshold) || 37501,
          underRate1: parseFloat(settingsRes.data.underRate1) || 0.0340,
          underRate2: parseFloat(settingsRes.data.underRate2) || 0.0204,
          underThreshold: parseInt(settingsRes.data.underThreshold) || 22500,
        });
      }
      setLogs(logsRes.data);
    } catch (err) {
      console.error('Error fetching data', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateFinancials = (totalKm: number, agreedKm: number, allowanceKm: number) => {
    const diff = totalKm - agreedKm;
    if (Math.abs(diff) <= allowanceKm) return 0;

    if (diff > 0) {
      const payable = diff - allowanceKm;
      const totalWithPayable = agreedKm + allowanceKm + payable;
      
      let cost = 0;
      if (totalWithPayable <= settings.excessThreshold) {
        cost = payable * settings.excessRate1;
      } else {
        const tier1Limit = settings.excessThreshold;
        const tier1Payable = Math.max(0, tier1Limit - (agreedKm + allowanceKm));
        const tier2Payable = totalWithPayable - tier1Limit;
        cost = (tier1Payable * settings.excessRate1) + (tier2Payable * settings.excessRate2);
      }
      return -cost;
    } else {
      const refundable = Math.abs(diff) - allowanceKm;
      const totalWithRefundable = agreedKm - allowanceKm - refundable;
      
      let refund = 0;
      if (totalWithRefundable >= settings.underThreshold) {
        refund = refundable * settings.underRate1;
      } else {
        const tier1Limit = settings.underThreshold;
        const tier1Refundable = Math.max(0, (agreedKm - allowanceKm) - tier1Limit);
        const tier2Refundable = tier1Limit - totalWithRefundable;
        refund = (tier1Refundable * settings.underRate1) + (tier2Refundable * settings.underRate2);
      }
      return refund;
    }
  };

  const metrics = useMemo(() => {
    const start = parseISO(settings.startDate);
    const end = addDays(start, (settings.durationMonths / 12) * 365.25);
    const totalDays = differenceInDays(end, start);
    const daysPassed = Math.max(0, Math.min(totalDays, differenceInDays(new Date(), start)));
    
    const currentAllowance = useAllowance ? settings.allowanceKm : 0;
    const totalAgreedKm = settings.annualKm * (settings.durationMonths / 12);
    const totalBudget = totalAgreedKm + currentAllowance;
    const targetKm = (daysPassed / totalDays) * totalBudget;
    
    const lastLog = logs.length > 0 ? logs[logs.length - 1] : { km: 0, date: settings.startDate };
    const diff = lastLog.km - targetKm;
    const status = diff > 0 ? 'exceeded' : 'on-track';

    // Projection
    const projectionFactor = daysPassed > 0 ? totalDays / daysPassed : 0;
    const projectedFinalKm = lastLog.km * projectionFactor;
    
    // Financials
    const currentBalance = calculateFinancials(lastLog.km, totalAgreedKm, settings.allowanceKm);
    const projectedBalance = calculateFinancials(projectedFinalKm, totalAgreedKm, settings.allowanceKm);

    // Current Over-Target Cost (requested by user)
    // The user wants to see the cost of the CURRENT overage.
    // We prorate the allowance as well to see the cost "right now".
    const proratedAllowance = (daysPassed / totalDays) * settings.allowanceKm;
    const currentExcessKm = Math.max(0, lastLog.km - (targetKm + proratedAllowance));
    
    let currentExcessCost = 0;
    if (currentExcessKm > 0) {
        // Simple linear calculation for the current snapshot
        currentExcessCost = currentExcessKm * settings.excessRate1;
    }

    // Weekly/Monthly Quotas
    const dailyTarget = totalBudget / totalDays;
    
    const getActualForPeriod = (days: number) => {
        if (logs.length < 1) return 0;
        
        const sortedLogs = [...logs].sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
        const lastLog = sortedLogs[sortedLogs.length - 1];
        const now = new Date();
        const periodStart = days === 1 ? startOfDay(now) : subDays(now, days);
        const contractStart = parseISO(settings.startDate);
        
        // Find logs before the period to get a baseline
        const logsBeforePeriod = sortedLogs.filter(l => isBefore(parseISO(l.date), periodStart));
        
        let startKm = 0;
        if (isAfter(contractStart, periodStart)) {
            // Contract started within period
            startKm = 0;
        } else if (logsBeforePeriod.length > 0) {
            // Baseline is the last log BEFORE the period started
            startKm = logsBeforePeriod[logsBeforePeriod.length - 1].km;
        } else if (sortedLogs.length > 0) {
            // No logs before period, use the very first log as baseline
            startKm = sortedLogs[0].km;
        }
        
        return Math.max(0, lastLog.km - startKm);
    };

    return {
      targetKm,
      currentKm: lastLog.km,
      diff,
      status,
      daysPassed,
      totalDays,
      progress: (daysPassed / totalDays) * 100,
      projectedFinalKm,
      currentBalance,
      projectedBalance,
      currentExcessCost,
      quotas: {
        day: { target: dailyTarget, actual: getActualForPeriod(1) },
        week: { target: dailyTarget * 7, actual: getActualForPeriod(7) },
        month: { target: dailyTarget * 30.44, actual: getActualForPeriod(30) },
        year: { target: settings.annualKm, actual: getActualForPeriod(365) }
      }
    };
  }, [settings, logs, useAllowance]);

  const chartData = useMemo(() => {
    if (logs.length === 0) return [];
    
    const start = parseISO(settings.startDate);
    const currentAllowance = useAllowance ? settings.allowanceKm : 0;
    const totalAgreedKm = settings.annualKm * (settings.durationMonths / 12);
    const totalBudget = totalAgreedKm + currentAllowance;
    const end = addDays(start, (settings.durationMonths / 12) * 365.25);
    const totalDays = differenceInDays(end, start);

    // Filter logs based on range
    let filteredLogs = [...logs].sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
    const now = new Date();
    
    if (chartRange !== 'all') {
      let rangeStart: Date;
      switch (chartRange) {
        case 'day': rangeStart = startOfDay(now); break;
        case 'week': rangeStart = subDays(now, 7); break;
        case 'month': rangeStart = subMonths(now, 1); break;
        case '3months': rangeStart = subMonths(now, 3); break;
        case '6months': rangeStart = subMonths(now, 6); break;
        case 'year': rangeStart = subYears(now, 1); break;
        default: rangeStart = start;
      }
      filteredLogs = filteredLogs.filter(log => !isBefore(parseISO(log.date), rangeStart));
    }

    // Linear target line
    const data = filteredLogs.map(log => {
      const days = differenceInDays(parseISO(log.date), start);
      const target = (days / totalDays) * totalBudget;
      return {
        date: format(parseISO(log.date), 'dd.MM.'),
        actual: log.km,
        target: Math.round(target)
      };
    });

    return data;
  }, [settings, logs, useAllowance, chartRange]);

  const updateSettings = async (newSettings: Settings) => {
    try {
      await axios.post(`${API_URL}/api/settings`, { settings: newSettings });
      setSettings(newSettings);
      setView('dashboard');
    } catch (err: any) {
      console.error('Error updating settings:', err);
      alert(`Error updating settings: ${err.message}`);
    }
  };

  const addLog = async (date: string, km: number) => {
    try {
      await axios.post(`${API_URL}/api/mileage`, { date, km });
      await fetchData();
      setView('dashboard');
    } catch (err) {
      alert('Error adding log');
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans pb-20">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <TrendingUp className="text-blue-500" />
            LeaseFlow
          </h1>
          <button 
            onClick={() => setView('settings')}
            className="p-2 hover:bg-gray-800 rounded-full transition-colors"
          >
            <SettingsIcon size={24} />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        {view === 'dashboard' && (
          <div className="space-y-6">
            {/* Toggle Switch */}
            <div className="flex items-center justify-between bg-gray-900 p-4 rounded-2xl border border-gray-800">
              <div className="flex items-center gap-2">
                <AlertCircle size={20} className="text-blue-500" />
                <span className="text-sm font-medium">Include {settings.allowanceKm}km Allowance</span>
              </div>
              <button 
                onClick={() => setUseAllowance(!useAllowance)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${useAllowance ? 'bg-blue-600' : 'bg-gray-700'}`}
              >
                <span 
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useAllowance ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
            </div>

            {/* Status Card */}
            <div className={`p-6 rounded-2xl border ${metrics.status === 'on-track' ? 'bg-green-900/20 border-green-800/50' : 'bg-red-900/20 border-red-800/50'}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm text-gray-400">Current Status</p>
                  <h2 className={`text-3xl font-bold ${metrics.status === 'on-track' ? 'text-green-400' : 'text-red-400'}`}>
                    {metrics.status === 'on-track' ? 'On Track' : 'Over Budget'}
                  </h2>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${metrics.status === 'on-track' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {Math.abs(Math.round(metrics.diff))} km {metrics.diff > 0 ? 'over' : 'under'}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-900/50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase">Target</p>
                  <p className="text-xl font-semibold">{Math.round(metrics.targetKm)} km</p>
                </div>
                <div className="bg-gray-900/50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase">Actual</p>
                  <p className="text-xl font-semibold">{metrics.currentKm} km</p>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex justify-between text-xs text-gray-500 mb-2">
                  <span>Progress ({Math.round(metrics.progress)}%)</span>
                  <span>{metrics.daysPassed} / {metrics.totalDays} days</span>
                </div>
                <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-blue-600 h-full transition-all duration-1000" 
                    style={{ width: `${metrics.progress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Financial Projection */}
            <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="text-blue-500" />
                <h3 className="text-sm font-medium text-gray-400">Financial Projection</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-950/50 p-4 rounded-xl border border-gray-800/50">
                  <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Projected End Odometer</p>
                  <p className="text-xl font-bold">{Math.round(metrics.projectedFinalKm).toLocaleString()} km</p>
                  <p className="text-[10px] text-gray-500 mt-1">
                    Based on current driving habits
                  </p>
                </div>
                
                <div className={`p-4 rounded-xl border ${metrics.projectedBalance < 0 ? 'bg-red-900/10 border-red-800/30' : 'bg-green-900/10 border-green-800/30'}`}>
                  <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Projected Final Balance</p>
                  <p className={`text-xl font-bold ${metrics.projectedBalance < 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {metrics.projectedBalance < 0 ? '-' : '+'}{Math.abs(metrics.projectedBalance).toFixed(2)} €
                  </p>
                  <p className="text-[10px] text-gray-500 mt-1">
                    {metrics.projectedBalance < 0 ? `Cost after ${settings.allowanceKm}km allowance` : `Refund after ${settings.allowanceKm}km allowance`}
                  </p>
                </div>
              </div>

              {metrics.diff > 0 && (
                <div className="bg-gray-800/30 p-4 rounded-xl border border-gray-700/50">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-400">Current Overage Cost</span>
                    <span className={`text-sm font-bold ${metrics.currentExcessCost > 0 ? 'text-red-400' : 'text-gray-100'}`}>
                      {metrics.currentExcessCost > 0 ? '-' : ''}{metrics.currentExcessCost.toFixed(2)} €
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500">
                    Cost of exceeding prorated target + prorated allowance ({Math.round(metrics.targetKm + (metrics.daysPassed / metrics.totalDays) * settings.allowanceKm)}km)
                  </p>
                </div>
              )}
            </div>

            {/* Quota breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <QuotaCard label="Daily" target={metrics.quotas.day.target} actual={metrics.quotas.day.actual} />
              <QuotaCard label="Weekly" target={metrics.quotas.week.target} actual={metrics.quotas.week.actual} />
              <QuotaCard label="Monthly" target={metrics.quotas.month.target} actual={metrics.quotas.month.actual} />
              <QuotaCard label="Yearly" target={metrics.quotas.year.target} actual={metrics.quotas.year.actual} />
            </div>

            {/* Chart */}
            <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <h3 className="text-sm font-medium text-gray-400">Mileage Projection</h3>
                <div className="flex flex-wrap gap-1 bg-gray-950 p-1 rounded-xl border border-gray-800">
                  <RangeButton active={chartRange === 'all'} onClick={() => setChartRange('all')} label="All" />
                  <RangeButton active={chartRange === 'year'} onClick={() => setChartRange('year')} label="1Y" />
                  <RangeButton active={chartRange === '6months'} onClick={() => setChartRange('6months')} label="6M" />
                  <RangeButton active={chartRange === '3months'} onClick={() => setChartRange('3months')} label="3M" />
                  <RangeButton active={chartRange === 'month'} onClick={() => setChartRange('month')} label="1M" />
                  <RangeButton active={chartRange === 'week'} onClick={() => setChartRange('week')} label="1W" />
                  <RangeButton active={chartRange === 'day'} onClick={() => setChartRange('day')} label="1D" />
                </div>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                    <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px' }}
                    />
                    <Legend verticalAlign="top" align="right" />
                    <Line type="monotone" dataKey="target" stroke="#3b82f6" strokeWidth={2} dot={false} name="Target" />
                    <Line type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} name="Actual" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick Actions */}
            <button 
              onClick={() => setView('log')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 transition-all active:scale-95"
            >
              <PlusCircle size={24} />
              Log Mileage
            </button>
          </div>
        )}

        {view === 'settings' && (
          <SettingsForm 
            initialSettings={settings} 
            onSave={updateSettings} 
            onCancel={() => setView('dashboard')} 
          />
        )}

        {view === 'log' && (
          <LogForm 
            onSave={addLog} 
            onCancel={() => setView('dashboard')} 
            lastKm={metrics.currentKm}
          />
        )}
      </main>

      {/* Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 p-2 flex justify-around items-center max-w-4xl mx-auto rounded-t-2xl shadow-2xl">
        <NavButton active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<LayoutDashboard size={20} />} label="Dashboard" />
        <NavButton active={view === 'log'} onClick={() => setView('log')} icon={<PlusCircle size={20} />} label="Log" />
        <NavButton active={view === 'settings'} onClick={() => setView('settings')} icon={<SettingsIcon size={20} />} label="Settings" />
      </nav>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 p-2 min-w-[80px] rounded-xl transition-colors ${active ? 'text-blue-500 bg-blue-500/10' : 'text-gray-500 hover:text-gray-300'}`}
  >
    {icon}
    <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
  </button>
);

const RangeButton = ({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) => (
  <button 
    onClick={onClick}
    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900'}`}
  >
    {label}
  </button>
);

const QuotaCard = ({ label, target, actual }: { label: string, target: number, actual: number }) => {
  const isOver = actual > target;
  return (
    <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
      <p className="text-[10px] text-gray-500 uppercase font-bold mb-2 tracking-widest">{label} Budget</p>
      <div className="flex justify-between items-end">
        <div>
          <p className="text-lg font-bold">{Math.round(actual)} <span className="text-[10px] text-gray-500 uppercase font-normal">km</span></p>
          <p className="text-[10px] text-gray-500 mt-0.5">Target: {Math.round(target)} km</p>
        </div>
        <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isOver ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
          {isOver ? '+' : ''}{Math.round(actual - target)}
        </div>
      </div>
      <div className="mt-3 w-full bg-gray-800 h-1 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-1000 ${isOver ? 'bg-red-500' : 'bg-green-500'}`}
          style={{ width: `${Math.min(100, (actual / target) * 100)}%` }}
        />
      </div>
    </div>
  );
};

const SettingsForm = ({ initialSettings, onSave, onCancel }: { initialSettings: Settings, onSave: (s: Settings) => void, onCancel: () => void }) => {
  const [formData, setFormData] = useState(initialSettings);

  return (
    <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <SettingsIcon className="text-blue-500" />
        <h2 className="text-xl font-bold">Contract Settings</h2>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs text-gray-500 uppercase font-bold">Contract Start Date</label>
          <input 
            type="date" 
            value={formData.startDate}
            onChange={e => setFormData({...formData, startDate: e.target.value})}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-gray-500 uppercase font-bold">Duration (Months)</label>
            <input 
              type="number" 
              value={formData.durationMonths}
              onChange={e => setFormData({...formData, durationMonths: parseInt(e.target.value)})}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500 uppercase font-bold">Annual Km</label>
            <input 
              type="number" 
              value={formData.annualKm}
              onChange={e => setFormData({...formData, annualKm: parseInt(e.target.value)})}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-gray-500 uppercase font-bold">Allowance (Freigrenze km)</label>
          <input 
            type="number" 
            value={formData.allowanceKm}
            onChange={e => setFormData({...formData, allowanceKm: parseInt(e.target.value)})}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-gray-500 uppercase font-bold">Excess Rate 1 (€/km)</label>
            <input 
              type="number" 
              step="0.0001"
              value={formData.excessRate1}
              onChange={e => setFormData({...formData, excessRate1: parseFloat(e.target.value)})}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500 uppercase font-bold">Excess Rate 2 (€/km)</label>
            <input 
              type="number" 
              step="0.0001"
              value={formData.excessRate2}
              onChange={e => setFormData({...formData, excessRate2: parseFloat(e.target.value)})}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-gray-500 uppercase font-bold">Excess Threshold (Total km)</label>
          <input 
            type="number" 
            value={formData.excessThreshold}
            onChange={e => setFormData({...formData, excessThreshold: parseInt(e.target.value)})}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-gray-500 uppercase font-bold">Under Rate 1 (€/km)</label>
            <input 
              type="number" 
              step="0.0001"
              value={formData.underRate1}
              onChange={e => setFormData({...formData, underRate1: parseFloat(e.target.value)})}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500 uppercase font-bold">Under Rate 2 (€/km)</label>
            <input 
              type="number" 
              step="0.0001"
              value={formData.underRate2}
              onChange={e => setFormData({...formData, underRate2: parseFloat(e.target.value)})}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-gray-500 uppercase font-bold">Under Threshold (Total km)</label>
          <input 
            type="number" 
            value={formData.underThreshold}
            onChange={e => setFormData({...formData, underThreshold: parseInt(e.target.value)})}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button 
          onClick={onCancel}
          className="flex-1 bg-gray-800 hover:bg-gray-700 py-3 rounded-xl font-medium transition-colors"
        >
          Cancel
        </button>
        <button 
          onClick={() => onSave(formData)}
          className="flex-1 bg-blue-600 hover:bg-blue-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
        >
          <Save size={18} />
          Save Settings
        </button>
      </div>
    </div>
  );
};

const LogForm = ({ onSave, onCancel, lastKm }: { onSave: (date: string, km: number) => void, onCancel: () => void, lastKm: number }) => {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [km, setKm] = useState(lastKm || 0);

  return (
    <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <PlusCircle className="text-green-500" />
        <h2 className="text-xl font-bold">Log New Mileage</h2>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs text-gray-500 uppercase font-bold">Date</label>
          <input 
            type="date" 
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-gray-500 uppercase font-bold">Current Odometer (km)</label>
          <div className="relative">
            <input 
              type="number" 
              value={km}
              onChange={e => setKm(parseInt(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl p-4 text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold uppercase text-xs">km</div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button 
          onClick={onCancel}
          className="flex-1 bg-gray-800 hover:bg-gray-700 py-3 rounded-xl font-medium transition-colors"
        >
          Cancel
        </button>
        <button 
          onClick={() => onSave(date, km)}
          className="flex-1 bg-green-600 hover:bg-green-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
        >
          <Save size={18} />
          Save Entry
        </button>
      </div>
    </div>
  );
};

export default App;
