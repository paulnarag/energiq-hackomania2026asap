import React from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine, Brush } from 'recharts';
import { Zap, TrendingUp, TrendingDown, AlertTriangle, DollarSign, Droplet, Flame, Wind, Lightbulb, Info } from 'lucide-react';

const DashboardScreen = ({ data }) => {
    const dashboardMetrics = data?.dashboardMetrics || {
        currentMonthUsage: 0,
        lastMonthUsage: 0,
        percentageChange: 0,
        peakPeriod: '6:00 PM - 10:00 PM',
        percentile: 50,
    };
    const dailyUsageData = Array.isArray(data?.dailyUsageData) ? data.dailyUsageData : [];
    const halfHourlyUsageData = Array.isArray(data?.halfHourlyUsageData) ? data.halfHourlyUsageData : [];
    const avgDailyKwh = dailyUsageData.length
        ? Number((dailyUsageData.reduce((sum, row) => sum + Number(row.kWh || 0), 0) / dailyUsageData.length).toFixed(1))
        : 0;
    // additional metrics - use actual API values
    const todayUsage = dailyUsageData.length ? dailyUsageData[dailyUsageData.length - 1].kWh : 0;
    const estimatedBill = Number((dashboardMetrics.currentMonthUsage * 0.3278).toFixed(2));
    const tariff = 0.3278;
    const peakRatio = Number(dashboardMetrics.peak_ratio_pct || 0).toFixed(1);
    const standbyCost = Number(dashboardMetrics.standby_monthly_cost || 0).toFixed(2);
    const weekendUplift = Number(dashboardMetrics.weekend_uplift_pct || 0).toFixed(1);
    const halfHourlyLatest = halfHourlyUsageData.length ? halfHourlyUsageData[halfHourlyUsageData.length - 1].kWh : 0;
    const anomaliesCount = Number(dashboardMetrics.anomaly_count || 0);
    const userPoints = Number(dashboardMetrics.userPoints || data?.userPoints || 0);
    const flatType = String(data?.householdBenchmark?.flatType || 'HDB flat');
    const avgFlatSpend = Number(data?.householdBenchmark?.avgMonthlySpend || 0);

    const percentageChange = Number(dashboardMetrics.percentageChange || 0);
    const pointsTone = (points) => {
        if (points >= 1200) return '#1dd1a1';
        if (points >= 700) return '#22d3ee';
        return '#f4c95d';
    };

    return (
        <div className="flex-col gap-6 p-4 animate-fade-in">
            {/* Reward Points */}
            <div className="glass-panel p-6 flex-row items-center justify-between">
                <div className="flex-col gap-2">
                    <span className="h3">Rewards Points</span>
                    <span className="small-text">Points are awarded automatically from positive usage improvements.</span>
                </div>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    border: `5px solid ${pointsTone(userPoints)}`,
                    fontSize: 28,
                    fontWeight: 'bold',
                    color: pointsTone(userPoints),
                    position: 'relative',
                }}>
                    {userPoints}
                    <span style={{
                        position: 'absolute',
                        fontSize: '12px',
                        bottom: '8px',
                        fontWeight: 'normal',
                    }}>pts</span>
                </div>
            </div>

            <div className="glass-panel p-4">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <DollarSign size={18} color="var(--accent-primary)" />
                    <span className="h3">{flatType} Average Spend</span>
                </div>
                <p className="body-text">
                    Average monthly spend for this flat profile: <strong>{avgFlatSpend > 0 ? `S$${avgFlatSpend.toFixed(2)}` : 'Unavailable'}</strong>
                </p>
                <p className="small-text" style={{ marginTop: '0.5rem' }}>
                    Your current estimate is S${estimatedBill.toFixed(2)} this month.
                </p>
            </div>

            {/* 24-Hour Chart */}
            <div className="glass-panel">
                <div className="flex-row justify-between items-center mb-6">
                    <span className="h3">24-Hour Monitor</span>
                    <span className="small-text">Half-Hourly Intervals</span>
                </div>
                <div style={{ width: '100%', height: 320 }}>
                    <ResponsiveContainer>
                        <LineChart data={halfHourlyUsageData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                            <XAxis
                                dataKey="time"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                                interval={'preserveStartEnd'}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                            />
                            <Tooltip
                                cursor={{ stroke: 'var(--text-secondary)', strokeWidth: 2, opacity: 0.2 }}
                                contentStyle={{
                                    backgroundColor: 'var(--panel)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: 8,
                                    color: 'var(--text-primary)',
                                }}
                                itemStyle={{ color: 'var(--accent-primary)' }}
                                labelStyle={{ color: 'var(--text-primary)' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="kWh"
                                stroke="#5eead4"
                                strokeWidth={4}
                                dot={false}
                                isAnimationActive={true}
                            />
                            <Brush
                                dataKey="time"
                                height={24}
                                stroke="#4d6b8d"
                                travellerWidth={10}
                                fill="rgba(94, 234, 212, 0.12)"
                                tickFormatter={() => ''}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 7-Day Trend */}
            <div className="glass-panel">
                <div className="flex-row justify-between items-center mb-6">
                    <span className="h3">7-Day Analysis</span>
                    <span className="small-text">Daily Avg: {avgDailyKwh} kWh</span>
                </div>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <BarChart data={dailyUsageData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                            <XAxis
                                dataKey="day"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                            />
                            <Tooltip
                                cursor={{ fill: 'var(--accent-light)', opacity: 0.3 }}
                                contentStyle={{
                                    backgroundColor: 'var(--panel)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: 8,
                                    color: 'var(--text-primary)',
                                }}
                                itemStyle={{ color: 'var(--accent-primary)' }}
                                labelStyle={{ color: 'var(--text-primary)' }}
                            />
                            <ReferenceLine y={avgDailyKwh} stroke="var(--text-secondary)" strokeDasharray="5 5" opacity={0.5} />
                            <Bar dataKey="kWh" radius={[6, 6, 0, 0]} isAnimationActive={true}>
                                {dailyUsageData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.kWh > avgDailyKwh ? 'var(--danger)' : 'var(--accent-primary)'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Anomalies Card */}
            <div className="glass-panel p-4">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <AlertTriangle size={18} color={anomaliesCount > 0 ? 'var(--danger)' : 'var(--success)'} />
                    <span className="h3">Anomalies</span>
                </div>
                {anomaliesCount > 0 ? (
                    <p className="body-text" style={{ color: 'var(--danger)' }}>{anomaliesCount} unusual spike(s) detected this week</p>
                ) : (
                    <p className="body-text" style={{ color: 'var(--success)' }}>✓ No anomalies detected</p>
                )}
            </div>

            {/* Peak Demand Card */}
            <div className="glass-panel p-4">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <Flame size={18} color="var(--warning)" />
                    <span className="h3">Peak Demand</span>
                </div>
                <p className="body-text">Peak hour ratio: <strong>{peakRatio}%</strong> (district avg: 45%)</p>
                <p className="small-text" style={{ marginTop: '0.5rem', color: peakRatio > 45 ? 'var(--danger)' : 'var(--success)' }}>
                    {peakRatio > 45 ? '↑ Above average - shift loads to save' : '✓ Below average - good habits!'}
                </p>
            </div>

            {/* Billing History */}
            {data?.billingHistory && Array.isArray(data.billingHistory) && data.billingHistory.length > 0 && (
                <div className="glass-panel p-4">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <DollarSign size={18} color="var(--accent-primary)" />
                        <span className="h3">Billing History</span>
                    </div>
                    {data.billingHistory.slice(-3).map((row, idx) => (
                        <div key={idx} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '0.5rem 0',
                            borderBottom: idx < data.billingHistory.slice(-3).length - 1 ? '1px solid var(--bg-tertiary)' : 'none',
                        }}>
                            <span className="small-text">{row.billing_period || `Month ${idx + 1}`}</span>
                            <span className="body-text" style={{ fontWeight: '600' }}>S${(row.est_cost_sgd || row.amount || 0).toFixed(2)}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Savings Potential */}
            <div className="glass-panel p-4">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <TrendingDown size={18} color="var(--success)" />
                    <span className="h3">Savings Potential</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '0.5rem',
                        backgroundColor: 'var(--bg-tertiary)',
                        borderRadius: '6px',
                    }}>
                        <span className="small-text">Peak shift:</span>
                        <span className="body-text" style={{ fontWeight: '700', color: 'var(--success)' }}>S${Number(data?.savings?.peak || 0).toFixed(2)}/mo</span>
                    </div>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '0.5rem',
                        backgroundColor: 'var(--bg-tertiary)',
                        borderRadius: '6px',
                    }}>
                        <span className="small-text">Standby reduction:</span>
                        <span className="body-text" style={{ fontWeight: '700', color: 'var(--success)' }}>S${Number(data?.savings?.standby || 0).toFixed(2)}/mo</span>
                    </div>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '0.5rem',
                        backgroundColor: 'var(--bg-tertiary)',
                        borderRadius: '6px',
                    }}>
                        <span className="small-text">AC optimization:</span>
                        <span className="body-text" style={{ fontWeight: '700', color: 'var(--success)' }}>S${Number(data?.savings?.ac || 0).toFixed(2)}/mo</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardScreen;
