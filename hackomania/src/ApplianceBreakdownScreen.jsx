import React, { useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from 'recharts';
import { ArrowLeft, Zap, Tv, Snowflake, Coffee, ChevronRight } from 'lucide-react';

const MONTHS = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
const RATE = 0.2671; // SGD per kWh

// Generate mock 6-month timeseries per appliance
const makeMonthly = (baseKwh, variance = 0.15) =>
    MONTHS.map(month => {
        const kwh = parseFloat((baseKwh * (1 + (Math.random() - 0.5) * variance * 2)).toFixed(1));
        return { month, kwh, cost: parseFloat((kwh * RATE).toFixed(2)) };
    });

const applianceData = [
    { name: 'Air Con', kwh: 142, icon: Snowflake, color: 'var(--danger)', monthly: makeMonthly(142, 0.2) },
    { name: 'Fridge', kwh: 45, icon: Snowflake, color: 'var(--warning)', monthly: makeMonthly(45, 0.08) },
    { name: 'Water Heater', kwh: 38, icon: Zap, color: 'var(--accent-primary)', monthly: makeMonthly(38, 0.1) },
    { name: 'Washer', kwh: 24, icon: Zap, color: 'var(--info)', monthly: makeMonthly(24, 0.25) },
    { name: 'TV/Media', kwh: 18, icon: Tv, color: 'var(--success)', monthly: makeMonthly(18, 0.12) },
    { name: 'Kitchen', kwh: 15, icon: Coffee, color: '#1a7bb3', monthly: makeMonthly(15, 0.18) },
    { name: 'Lighting', kwh: 12, icon: Zap, color: 'var(--text-secondary)', monthly: makeMonthly(12, 0.05) },
];

const colorMap = {
    'Air Con': 'var(--danger)',
    Fridge: 'var(--warning)',
    'Water Heater': 'var(--accent-primary)',
    Washer: 'var(--info)',
    'TV/Media': 'var(--success)',
    Kitchen: '#1a7bb3',
    Lighting: 'var(--text-secondary)',
};

const iconMap = {
    'Air Con': Snowflake,
    Fridge: Snowflake,
    'Water Heater': Zap,
    Washer: Zap,
    'TV/Media': Tv,
    Kitchen: Coffee,
    Lighting: Zap,
};

// --- Drill-Down Detail Panel ---
const ApplianceDetail = ({ appliance, onBack }) => {
    const [metric, setMetric] = useState('kwh'); // 'kwh' or 'cost'
    const Icon = appliance.icon || Zap;

    const latest = appliance.monthly[appliance.monthly.length - 1];
    const prev = appliance.monthly[appliance.monthly.length - 2];
    const trend = (latest && prev && prev.kwh)
        ? ((latest.kwh - prev.kwh) / prev.kwh * 100).toFixed(1)
        : '0.0';
    const isUp = parseFloat(trend) > 0;
    const totalKwh = appliance.monthly.reduce((s, d) => s + d.kwh, 0).toFixed(1);
    const totalCost = appliance.monthly.reduce((s, d) => s + d.cost, 0).toFixed(2);

    return (
        <div className="flex-col gap-6 p-4 animate-fade-in" style={{ paddingBottom: '100px' }}>
            {/* Header */}
            <div className="flex-row items-center gap-4">
                <button onClick={onBack} style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)', flexShrink: 0 }}>
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-row items-center gap-3 flex-1">
                    <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'var(--bg-primary)', border: `2px solid ${appliance.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: appliance.color }}>
                        <Icon size={22} />
                    </div>
                    <div className="flex-col">
                        <h2 className="h2">{appliance.name}</h2>
                        <span className="small-text">6-Month Trend</span>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="flex-row gap-3">
                <div className="glass-panel flex-1 flex-col gap-1" style={{ padding: '12px 16px' }}>
                    <span className="small-text">6-Month Total</span>
                    <span className="h2">{totalKwh} <span className="small-text">kWh</span></span>
                </div>
                <div className="glass-panel flex-1 flex-col gap-1" style={{ padding: '12px 16px' }}>
                    <span className="small-text">6-Month Cost</span>
                    <span className="h2" style={{ color: 'var(--success)' }}>${totalCost}</span>
                </div>
                <div className="glass-panel flex-1 flex-col gap-1" style={{ padding: '12px 16px' }}>
                    <span className="small-text">vs Last Month</span>
                    <span className="h2" style={{ color: isUp ? 'var(--danger)' : 'var(--success)' }}>
                        {isUp ? '+' : ''}{trend}%
                    </span>
                </div>
            </div>

            {/* Chart */}
            <div className="glass-panel">
                {/* Metric Toggle */}
                <div className="flex-row justify-between items-center mb-4">
                    <span className="h3">Monthly Breakdown</span>
                    <div style={{ display: 'flex', border: '1px solid var(--glass-border)', borderRadius: '8px', overflow: 'hidden' }}>
                        {['kwh', 'cost'].map(m => (
                            <button
                                key={m}
                                onClick={() => setMetric(m)}
                                style={{ padding: '4px 12px', fontSize: '12px', cursor: 'pointer', border: 'none', background: metric === m ? 'var(--accent-primary)' : 'transparent', color: '#fff', fontWeight: metric === m ? 'bold' : 'normal' }}
                            >
                                {m === 'kwh' ? 'kWh' : 'SGD $'}
                            </button>
                        ))}
                    </div>
                </div>
                <div style={{ width: '100%', height: 220 }}>
                    <ResponsiveContainer>
                        <LineChart data={appliance.monthly} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: 'none', borderRadius: 8, color: '#fff' }}
                                itemStyle={{ color: '#fff' }}
                                labelStyle={{ color: '#fff' }}
                                formatter={(val) => metric === 'kwh' ? [`${val} kWh`, 'Consumption'] : [`$${val}`, 'Cost']}
                            />
                            <Line
                                type="monotone"
                                dataKey={metric}
                                stroke={appliance.color}
                                strokeWidth={3}
                                dot={{ fill: appliance.color, r: 5, strokeWidth: 0 }}
                                activeDot={{ r: 7, fill: appliance.color }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Monthly Table */}
            <div className="glass-panel flex-col" style={{ gap: 0, padding: 0, overflow: 'hidden' }}>
                <div className="flex-row justify-between p-4" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <span className="small-text uppercase font-bold">Month</span>
                    <span className="small-text uppercase font-bold">kWh</span>
                    <span className="small-text uppercase font-bold">Cost (SGD)</span>
                </div>
                {appliance.monthly.map((row, i) => (
                    <div key={i} className="flex-row justify-between p-4" style={{ borderBottom: i < appliance.monthly.length - 1 ? '1px solid var(--glass-border)' : 'none', background: row.month === 'Oct' ? 'var(--accent-light)' : 'transparent' }}>
                        <span className="body-text font-semibold" style={{ color: row.month === 'Oct' ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{row.month}{row.month === 'Oct' && ' ●'}</span>
                        <span className="body-text">{row.kwh} kWh</span>
                        <span className="body-text text-success">${row.cost}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Main Breakdown List ---
const ApplianceBreakdownScreen = ({ onBack, data }) => {
    const [selected, setSelected] = useState(null);
    const applianceWindowLabel = data?.applianceWindowLabel || 'Latest period';

    const resolvedData = Array.isArray(data?.applianceBreakdown) && data.applianceBreakdown.length
        ? data.applianceBreakdown.map((item) => ({
            ...item,
            color: colorMap[item.name] || 'var(--accent-primary)',
            icon: iconMap[item.name] || Zap,
        }))
        : applianceData;

    if (selected) {
        return <ApplianceDetail appliance={selected} onBack={() => setSelected(null)} />;
    }

    return (
        <div className="flex-col gap-6 p-4 animate-fade-in" style={{ paddingBottom: '100px' }}>
            {/* Header */}
            <div className="flex-row items-center gap-4 mb-2">
                <button onClick={onBack} style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)', flexShrink: 0 }}>
                    <ArrowLeft size={24} />
                </button>
                <div className="flex-col">
                    <h2 className="h2">Appliance Breakdown</h2>
                    <span className="body-text">{applianceWindowLabel} · Tap to drill down</span>
                </div>
            </div>

            {/* Overview Bar Chart */}
            <div className="glass-panel">
                <div className="flex-row justify-between items-center mb-6">
                    <span className="h3">Energy Hogs</span>
                    <span className="small-text">This Month</span>
                </div>
                <div style={{ width: '100%', height: 280 }}>
                    <ResponsiveContainer>
                        <BarChart data={resolvedData} layout="vertical" margin={{ top: 0, right: 0, left: 30, bottom: 0 }}>
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} width={80} />
                            <Tooltip
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: 'none', borderRadius: 8, color: '#fff' }}
                                itemStyle={{ color: '#fff' }}
                                labelStyle={{ color: '#fff' }}
                                formatter={(v) => [`${v} kWh`, 'Consumption']}
                            />
                            <Bar dataKey="kwh" radius={[0, 4, 4, 0]} barSize={22}>
                                {resolvedData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Clickable Appliance List */}
            <div className="flex-col gap-3">
                <h3 className="h3 mb-1">Detailed Breakdown</h3>
                {resolvedData.map((item, index) => {
                    const Icon = item.icon || Zap;
                    return (
                        <button
                            key={index}
                            onClick={() => setSelected(item)}
                            className="glass-panel"
                            style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '16px', width: '100%', cursor: 'pointer', textAlign: 'left', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)' }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
                                <div style={{ padding: '10px', borderRadius: '12px', backgroundColor: 'var(--bg-primary)', border: `1px solid ${item.color}40`, color: item.color, display: 'flex' }}>
                                    <Icon size={20} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span className="h3" style={{ color: '#fff' }}>{item.name}</span>
                                    {item.name === 'Air Con' && <span style={{ fontSize: '10px', color: 'var(--danger)', fontWeight: 'bold', textTransform: 'uppercase' }}>Top Consumer</span>}
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                    <span className="h3" style={{ color: '#fff' }}>{item.kwh} <span className="small-text" style={{ color: '#fff' }}>kWh</span></span>
                                    <span className="small-text" style={{ color: 'rgba(255,255,255,0.6)' }}>${(item.kwh * RATE).toFixed(2)}</span>
                                </div>
                                <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default ApplianceBreakdownScreen;
