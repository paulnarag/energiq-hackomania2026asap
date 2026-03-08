import React from 'react';
import { X, Zap } from 'lucide-react';

// Current date: 2026-03-07 (Saturday)
const TODAY = new Date(2026, 2, 7); // month is 0-indexed

// Mock streak data — which days the user logged in (last 28 days)
const loginDays = new Set([
    '2026-02-08', '2026-02-10', '2026-02-11', '2026-02-12',
    '2026-02-15', '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19',
    '2026-02-22', '2026-02-24', '2026-02-25', '2026-02-26', '2026-02-27', '2026-02-28',
    '2026-03-01', '2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05', '2026-03-06', '2026-03-07',
]);

// Weekly usage reduction achievements (true = usage went down that week)
const weeklyReductions = [false, true, true, true]; // last 4 weeks

// Monthly AI coach question asked
const askedAIThisMonth = true;

// ---- Score computation ----
const loginStreakDays = 7; // current consecutive streak (Mar 1-7)
const loginScore = loginStreakDays * 5;
const weeklyScore = weeklyReductions.filter(Boolean).length * 10;
const aiScore = askedAIThisMonth ? 5 : 0;
const totalBonusScore = loginScore + weeklyScore + aiScore;

// Build calendar for last 4 weeks
const buildCalendar = () => {
    const days = [];
    for (let i = 27; i >= 0; i--) {
        const d = new Date(TODAY);
        d.setDate(TODAY.getDate() - i);
        const key = d.toISOString().split('T')[0];
        const isToday = i === 0;
        days.push({ date: d, key, loggedIn: loginDays.has(key), isToday });
    }
    return days;
};

const calendarDays = buildCalendar();


const DAYS_OF_WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const StreakModal = ({
    onClose,
    onNavigateHome,
    streakDays = loginStreakDays,
    bonusScore = totalBonusScore,
    userName = 'Alex',
}) => {
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            padding: '0',
        }}
            onClick={onClose}
        >
            <div
                style={{
                    width: '100%', maxWidth: 480,
                    background: 'var(--bg-secondary)',
                    borderRadius: '24px 24px 0 0',
                    padding: '24px 20px 40px',
                    display: 'flex', flexDirection: 'column', gap: '20px',
                    border: '1px solid var(--glass-border)',
                    maxHeight: '90vh', overflowY: 'auto',
                    animation: 'slideUp 0.3s ease-out',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#fff', margin: 0 }}>
                            🔥 {streakDays}-Day Streak!
                        </h2>
                        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>Keep it up, {userName}! You're on a roll.</span>
                    </div>
                    <button onClick={onClose} style={{ background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', flexShrink: 0 }}>
                        <X size={18} />
                    </button>
                </div>

                {/* Energy Score Bonus Banner */}
                <div style={{ background: 'linear-gradient(135deg, var(--accent-primary), #7c3aed)', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bonus Energy Score</span>
                        <span style={{ fontSize: '32px', fontWeight: 'bold', color: '#fff', lineHeight: 1 }}>+{bonusScore} pts</span>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>This period</span>
                    </div>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Zap size={28} color="#fff" />
                    </div>
                </div>

                {/* Calendar */}
                <div
                    style={{ display: 'flex', flexDirection: 'column', gap: '8px', cursor: 'pointer' }}
                    onClick={onNavigateHome}
                    title="View streak on Dashboard"
                >
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Login Calendar</span>
                    {/* Day-of-week header */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '2px' }}>
                        {DAYS_OF_WEEK.map((d, i) => (
                            <div key={i} style={{ textAlign: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>{d}</div>
                        ))}
                    </div>
                    {/* Calendar grid — pad the front to align to correct weekday */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px' }}>
                        {/* Padding cells for alignment (first day = Sunday Feb 8 = index 0) */}
                        {Array.from({ length: calendarDays[0].date.getDay() }).map((_, i) => (
                            <div key={`pad-${i}`} />
                        ))}
                        {calendarDays.map((day) => (
                            <div key={day.key} title={day.key} style={{
                                aspectRatio: '1',
                                borderRadius: '8px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '12px', fontWeight: day.isToday ? 'bold' : 'normal',
                                background: day.isToday
                                    ? 'var(--accent-primary)'
                                    : day.loggedIn
                                        ? 'rgba(99,179,237,0.3)'
                                        : 'rgba(255,255,255,0.06)',
                                color: day.loggedIn || day.isToday ? '#fff' : 'rgba(255,255,255,0.3)',
                                border: day.isToday ? '2px solid var(--accent-primary)' : '1px solid transparent',
                                position: 'relative',
                            }}>
                                {day.date.getDate()}
                                {day.loggedIn && !day.isToday && (
                                    <div style={{ position: 'absolute', bottom: 2, width: 4, height: 4, borderRadius: '50%', background: 'var(--success)' }} />
                                )}
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'row', gap: '12px', marginTop: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div style={{ width: 10, height: 10, borderRadius: '3px', background: 'rgba(99,179,237,0.3)' }} />
                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Logged in</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div style={{ width: 10, height: 10, borderRadius: '3px', background: 'var(--accent-primary)' }} />
                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Today</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div style={{ width: 10, height: 10, borderRadius: '3px', background: 'rgba(255,255,255,0.06)' }} />
                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Missed</span>
                        </div>
                    </div>
                </div>


                {/* CTA */}

            </div>

            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(100%); opacity: 0; }
                    to   { transform: translateY(0);    opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default StreakModal;
