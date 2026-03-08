import React, { useState } from 'react';
import { Target, Leaf, Zap } from 'lucide-react';

const ApplianceBreakdownChart = ({ appliances, acTemp, unplugStandby }) => {
    // Calculate appliance impacts based on simulator settings
    const processedAppliances = appliances.map(app => {
        let resultKwh = app.kwh;
        let resultCost = app.cost;
        const isAC = app.name.toLowerCase().includes('air') || app.name.toLowerCase().includes('ac');
        const isStandby = app.name.toLowerCase().includes('tv') || app.name.toLowerCase().includes('entertainment') || app.name.toLowerCase().includes('media');

        // AC savings: 10% per 1°C above baseline
        if (isAC && acTemp !== 23) {
            const acReduction = (acTemp - 23) * 0.10; // negative = savings
            resultKwh = resultKwh * (1 + acReduction);
            resultCost = resultKwh * 0.3278;
        }

        // Standby savings: 60% reduction if unplugged
        if (isStandby && unplugStandby) {
            resultKwh = resultKwh * 0.4; // 60% reduction
            resultCost = resultKwh * 0.3278;
        }

        return {
            ...app,
            resultKwh: Number(resultKwh.toFixed(1)),
            resultCost: Number(resultCost.toFixed(2)),
            isSaved: (isAC && acTemp !== 23) || (isStandby && unplugStandby),
            isAffected: isAC || isStandby,
        };
    });

    const maxKwh = Math.max(...appliances.map(a => a.kwh), 1);
    const colors = ['var(--accent-primary)', 'var(--warning)', 'var(--info)', 'var(--text-secondary)'];

    return (
        <div className="flex-col gap-4">
            <h3 className="h3">Monthly Appliance Breakdown</h3>
            <div className="glass-panel flex-col gap-4 p-4">
                {processedAppliances.map((app, idx) => {
                    const currentWidth = (app.kwh / maxKwh) * 100;
                    const resultWidth = (app.resultKwh / maxKwh) * 100;
                    const saved = app.kwh - app.resultKwh;
                    const showSavings = saved > 0.05;

                    return (
                        <div key={idx} className="flex-col gap-2">
                            <div className="flex-row justify-between items-start">
                                <div className="flex-col gap-1">
                                    <span className="body-text font-semibold">{app.name}</span>
                                    <span className="small-text">{app.pct}% of total</span>
                                </div>
                                <div className="flex-col items-end gap-1">
                                    {showSavings ? (
                                        <div className="flex-row items-center gap-1">
                                            <span className="small-text" style={{ textDecoration: 'line-through', opacity: 0.6 }}>
                                                {app.kwh} kWh
                                            </span>
                                            <span className="small-text text-success font-semibold">→ {app.resultKwh} kWh</span>
                                        </div>
                                    ) : (
                                        <span className="small-text">{app.kwh} kWh</span>
                                    )}
                                    <span className="small-text font-semibold">S${showSavings ? app.resultCost : app.cost}</span>
                                </div>
                            </div>
                            <div className="flex-col gap-1">
                                <div style={{
                                    height: '8px',
                                    background: 'var(--bg-secondary)',
                                    borderRadius: '4px',
                                    overflow: 'hidden',
                                }}>
                                    <div style={{
                                        width: `${currentWidth}%`,
                                        height: '100%',
                                        background: colors[idx % colors.length],
                                        opacity: app.isSaved ? 0.5 : 1,
                                        transition: 'all 0.3s ease',
                                    }} />
                                </div>
                                {showSavings && (
                                    <span className="small-text text-success flex-row items-center gap-1">
                                        <Zap size={12} /> Saved {saved.toFixed(1)} kWh (~S${(saved * 0.3278).toFixed(2)})
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const FullApplianceBreakdown = ({ appliances }) => {
    if (!Array.isArray(appliances) || appliances.length === 0) return null;

    const totalKwh = appliances.reduce((sum, appliance) => sum + Number(appliance.kwh || 0), 0);

    return (
        <div className="glass-panel p-4 flex-col gap-3">
            <h3 className="h3">Full Appliance Breakdown (Baseline)</h3>
            {appliances.map((appliance) => {
                const kwh = Number(appliance.kwh || 0);
                const pct = totalKwh > 0 ? (kwh / totalKwh) * 100 : 0;
                const monthlyTrend = Array.isArray(appliance.monthly)
                    ? appliance.monthly.slice(-4).map((entry) => `${entry.month}:${Number(entry.kwh || 0).toFixed(0)}kWh`).join(' | ')
                    : 'No trend data';

                return (
                    <div key={appliance.key || appliance.name} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                        padding: '0.75rem 0',
                        borderBottom: '1px solid var(--bg-tertiary)',
                    }}>
                        <div className="flex-col" style={{ gap: '0.3rem' }}>
                            <span className="body-text" style={{ fontWeight: 700 }}>{appliance.name}</span>
                            <span className="small-text">Last 4 months: {monthlyTrend}</span>
                        </div>
                        <div className="flex-col items-end" style={{ gap: '0.2rem' }}>
                            <span className="body-text" style={{ fontWeight: 700 }}>{kwh.toFixed(1)} kWh</span>
                            <span className="small-text">{pct.toFixed(1)}%</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const SimulatorScreen = ({ data, onNavigate }) => {
    const halfHourlyUsageDataRaw = Array.isArray(data?.halfHourlyUsageData) ? data.halfHourlyUsageData : [];
    const halfHourlyUsageData = halfHourlyUsageDataRaw.map((row, idx) => {
        const time = typeof row?.time === 'string'
            ? row.time
            : typeof row?.label === 'string'
                ? row.label
                : `${String(Math.floor(idx / 2)).padStart(2, '0')}:${idx % 2 === 0 ? '00' : '30'}`;
        const kWh = Number(row?.kWh ?? row?.value ?? 0);
        return {
            ...row,
            time,
            kWh: Number.isFinite(kWh) ? kWh : 0,
        };
    });
    const applianceBreakdown = Array.isArray(data?.applianceBreakdown) ? data.applianceBreakdown : [];
    const [acTemp, setAcTemp] = useState(23);
    const [unplugStandby, setUnplugStandby] = useState(false);

    // Standby power from TV/Entertainment devices (11pm–7am)
    // TV/Media = 18 kWh/month out of 152 kWh non-AC total → ~11.8% share
    // Apply that fraction to the nighttime half-hourly data to isolate entertainment standby
    const TV_MEDIA_KWH = 18;
    const NON_AC_TOTAL_KWH = 45 + 38 + 24 + 18 + 15 + 12; // 152 kWh
    const tvFraction = TV_MEDIA_KWH / NON_AC_TOTAL_KWH;

    const nighttimeSlots = halfHourlyUsageData.filter((d) => {
        const [hourText] = String(d.time || '').split(':');
        const h = Number(hourText);
        if (!Number.isFinite(h)) return false;
        return h >= 23 || h < 7;
    });
    const totalNightKwh = nighttimeSlots.reduce((s, d) => s + Number(d.kWh || 0), 0);
    const standbyKwhPerNight = parseFloat((totalNightKwh * tvFraction).toFixed(2));
    const standbyKwhPerMonth = parseFloat((standbyKwhPerNight * 30).toFixed(1));
    const standbyDollarsPerMonth = parseFloat((standbyKwhPerMonth * 0.2671).toFixed(2));

    // Simple simulator logic based on hackathon doc specs
    const calculateSavings = () => {
        let kwhSaved = 0;
        let dollarsSaved = 0;

        // AC Savings: every 1°C increase above 23°C baseline reduces cooling energy by 10%
        // Air Con monthly baseline = 142 kWh at 23°C
        const AC_BASELINE_KWH = 142;
        const RATE_PER_KWH = 0.2671; // SGD
        const diff = acTemp - 23;
        const acKwhSaved = parseFloat((AC_BASELINE_KWH * 0.10 * diff).toFixed(1));
        const acDollarsSaved = parseFloat((acKwhSaved * RATE_PER_KWH).toFixed(2));
        kwhSaved += acKwhSaved;
        dollarsSaved += acDollarsSaved;

        // Standby: derived from user's 11pm–7am smart meter data
        if (unplugStandby) {
            kwhSaved += standbyKwhPerMonth;
            dollarsSaved += standbyDollarsPerMonth;
        }

        return {
            kwhOptions: kwhSaved,
            dollarStrs: dollarsSaved.toFixed(2),
            dollarSaved: dollarsSaved,
            points: Math.floor(Math.abs(dollarsSaved) * 2.5)
        };
    };

    const results = calculateSavings();

    return (
        <div className="flex-col gap-6 p-4 animate-fade-in">
            <div className="flex-col gap-1 mb-2">
                <h2 className="h2">Energy Simulator</h2>
                <span className="body-text">See how small changes impact your bill.</span>
            </div>

            <div className="glass-panel text-center flex-col items-center p-6 bg-accent-light border border-accent/20" style={{ position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -20, left: -20, opacity: 0.1 }}>
                    <Leaf size={120} />
                </div>
                <span className="small-text uppercase font-semibold text-accent mb-2" style={{ letterSpacing: '0.05em' }}>Estimated Monthly Impact</span>
                <h1 style={{ fontSize: '48px', fontWeight: 'bold', color: results.dollarSaved < 0 ? 'var(--danger)' : 'var(--text-primary)', marginBottom: '8px' }}>
                    {results.dollarSaved < 0 ? '+' : '-'}${Math.abs(parseFloat(results.dollarStrs)).toFixed(2)}
                </h1>
                <div className="flex-row gap-4 items-center justify-center">
                    <span className="body-text bg-bg-primary" style={{ padding: '4px 12px', borderRadius: '12px' }}>
                        {results.kwhOptions} kWh Saved
                    </span>
                    <span className="text-success font-semibold flex-row items-center gap-1 bg-success-light" style={{ padding: '4px 12px', borderRadius: '12px' }}>
                        <Target size={14} /> +{results.points} Score
                    </span>
                </div>
            </div>

            <div className="flex-col gap-4 mt-2">
                <h3 className="h3">Action Plan</h3>

                <button
                    className="btn-primary"
                    onClick={() => {
                        if (onNavigate) onNavigate('streak');
                    }}
                    style={{ alignSelf: 'flex-start' }}
                >
                    View Streak Bonus
                </button>

                <div className="glass-panel">
                    <label className="flex-col gap-4 w-full cursor-pointer">
                        <div className="flex-row justify-between items-center">
                            <div className="flex-col">
                                <span className="h3">Air-Conditioning</span>
                                <span className="small-text">{acTemp < 23 ? `${23 - acTemp}°C below baseline — using more energy` : acTemp === 23 ? 'At baseline (23°C)' : `${acTemp - 23}°C above baseline — saving energy`}</span>
                            </div>
                            <div className="h2 text-accent">{acTemp}°C</div>
                        </div>
                        <input
                            type="range"
                            min="18"
                            max="30"
                            step="1"
                            value={acTemp}
                            onChange={(e) => setAcTemp(parseInt(e.target.value))}
                            style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
                        />
                        <div className="flex-row justify-between small-text">
                            <span>18°C (Coldest)</span>
                            <span style={{ color: 'var(--accent-primary)' }}>23°C ·Baseline</span>
                            <span>30°C (Eco)</span>
                        </div>
                    </label>
                </div>


                <label className="glass-panel flex-row justify-between items-center cursor-pointer">
                    <div className="flex-col">
                        <span className="h3">Kill Standby Power</span>
                        <span className="small-text">11pm–7am usage: {standbyKwhPerNight} kWh/night · ~{standbyKwhPerMonth} kWh/mo</span>
                    </div>
                    <input
                        type="checkbox"
                        checked={unplugStandby}
                        onChange={(e) => setUnplugStandby(e.target.checked)}
                        style={{ width: 24, height: 24, accentColor: 'var(--accent-primary)' }}
                    />
                </label>

            </div>

            {applianceBreakdown.length > 0 && (
                <ApplianceBreakdownChart 
                    appliances={applianceBreakdown} 
                    acTemp={acTemp} 
                    unplugStandby={unplugStandby} 
                />
            )}

            <FullApplianceBreakdown appliances={applianceBreakdown} />
        </div>
    );
};

export default SimulatorScreen;
