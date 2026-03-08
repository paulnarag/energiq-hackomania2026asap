import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Bot, User } from 'lucide-react';

// Scripted AI responses (keyed by topic)
const buildResponse = (q, u) => {
    const q_lower = q.toLowerCase();

    if (q_lower.includes('peak') || q_lower.includes('off-peak') || q_lower.includes('time')) {
        return `Based on your data, your peak usage window is **${u.peakPeriod}**. I recommend shifting high-load appliances like your washing machine and dishwasher to after 11pm. On a Time-of-Use plan, you could save up to 35% on the energy consumed during that window.`;
    }
    if (q_lower.includes('air con') || q_lower.includes('ac') || q_lower.includes('air conditioning') || q_lower.includes('cooling')) {
        return `Your Air Conditioner is typically the top energy consumer in a Singapore home. Setting it 1°C higher (e.g., from 23°C to 24°C) reduces cooling energy by roughly 10%, saving you ~$7.50/month. Over the year, that's $90 back in your pocket!`;
    }
    if (q_lower.includes('smart meter') || q_lower.includes('half') || q_lower.includes('interval')) {
        return `Your smart meter records usage every 30 minutes. Use the 24-Hour Monitor chart on the Home tab to spot irregular intervals, especially late-night spikes which often indicate standby power drain from devices like TVs and gaming consoles.`;
    }
    if (q_lower.includes('score') || q_lower.includes('energy score') || q_lower.includes('rating')) {
        return `Your current Energy Score is **${u.energyScore}/100**, which puts you in the top ${100 - u.percentile}% of similar households. To improve your score: reduce peak-hour usage, unplug standby devices at night, and shift laundry to off-peak windows.`;
    }
    if (q_lower.includes('save') || q_lower.includes('reduce') || q_lower.includes('lower') || q_lower.includes('cut')) {
        return `Your usage this month is **${u.usage} kWh**. That's ${u.change}% ${u.change > 0 ? 'more' : 'less'} than last month's ${u.lastMonth} kWh. Here's my top 3 picks to bring it down:\n\n1. **Cool smarter**: Raise AC to 25°C, save ~$15/mo.\n2. **Shift laundry off-peak**: Save ~$14/mo on a TOU plan.\n3. **Kill standby power**: Unplug TV/console at night, save ~$8/mo.`;
    }
    if (q_lower.includes('carbon') || q_lower.includes('tax') || q_lower.includes('green') || q_lower.includes('environment')) {
        return `The 2026 carbon tax is $45/tonne, adding about $3 to your monthly bill. The best way to offset this is to shift 70-80% of your usage to off-peak hours. This also benefits the national grid by smoothing out demand spikes.`;
    }
    if (q_lower.includes('appliance') || q_lower.includes('fridge') || q_lower.includes('washer') || q_lower.includes('device')) {
        return `Based on typical usage patterns for your home size, your top energy consumers are:\n\n1. **Air Con** – ~142 kWh/mo (largest!)\n2. **Fridge** – ~45 kWh/mo\n3. **Water Heater** – ~38 kWh/mo\n4. **Washer** – ~24 kWh/mo\n\nView the full breakdown in the Insights tab → Energy Consumption.`;
    }
    // Generic fallback
    return `That's a great question! Based on your current usage of **${u.usage} kWh** this month, I'd suggest starting with shifting your heaviest appliances to off-peak hours (11pm–7am) and raising your AC temperature by 1-2°C. Together, these two changes alone could shave $20–$30 off your monthly bill. Would you like to explore any specific appliance or habit?`;
};

const SUGGESTED_QUESTIONS = [
    'How can I reduce my energy usage?',
    'When are my peak hours?',
    'How can I improve my energy score?',
    'Which appliances use the most electricity?',
    'How does the carbon tax affect my bill?',
];

const ChatScreen = ({ onBack, data }) => {
    const PERSONALIZED_CONTEXT = {
        usage: Number(data?.dashboardMetrics?.currentMonthUsage || 0),
        lastMonth: Number(data?.dashboardMetrics?.lastMonthUsage || 0),
        change: Number(data?.dashboardMetrics?.percentageChange || 0),
        peakPeriod: data?.dashboardMetrics?.peakPeriod || '6:00 PM - 10:00 PM',
        energyScore: Number(data?.dashboardMetrics?.energyScore || 0),
        percentile: Number(data?.dashboardMetrics?.percentile || 50),
    };
    const [messages, setMessages] = useState([
        {
            id: 1,
            sender: 'ai',
            text: `Hi! I'm **EnergiQ**, your personal energy coach 🌱. Based on your smart meter data, you used **${PERSONALIZED_CONTEXT.usage} kWh** this month. That's ${PERSONALIZED_CONTEXT.change}% ${PERSONALIZED_CONTEXT.change > 0 ? 'more' : 'less'} than last month. How can I help you save on your next bill?`,
        }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const sendMessage = (text) => {
        const userMsg = { id: Date.now(), sender: 'user', text };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        // Simulate AI "thinking" delay
        setTimeout(() => {
            const aiResponse = buildResponse(text, PERSONALIZED_CONTEXT);
            setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'ai', text: aiResponse }]);
            setIsTyping(false);
        }, 1000);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!input.trim()) return;
        sendMessage(input.trim());
    };

    // Simple markdown-like bold rendering
    const renderText = (text) => {
        const parts = text.split(/(\*\*[^*]+\*\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i}>{part.slice(2, -2)}</strong>;
            }
            return part.split('\n').map((line, j) => (
                <React.Fragment key={`${i}-${j}`}>
                    {line}
                    {j < part.split('\n').length - 1 && <br />}
                </React.Fragment>
            ));
        });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-primary)' }}>
            {/* Header */}
            <div className="flex-row items-center gap-4 p-4" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <button
                    onClick={onBack}
                    className="p-2" style={{ borderRadius: '50%', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-row items-center gap-3 flex-1">
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', border: '2px solid var(--accent-primary)' }}>
                        <Bot size={20} />
                    </div>
                    <div className="flex-col">
                        <span className="h3">EnergiQ AI</span>
                        <span className="small-text text-success">● Online</span>
                    </div>
                </div>
            </div>

            {/* Scrollable Chat Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {messages.map(msg => (
                    <div key={msg.id} style={{
                        display: 'flex',
                        flexDirection: msg.sender === 'ai' ? 'row' : 'row-reverse',
                        alignItems: 'flex-end',
                        gap: '8px'
                    }}>
                        {/* Avatar */}
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: msg.sender === 'ai' ? 'var(--accent-light)' : 'var(--bg-secondary)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: msg.sender === 'ai' ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                            {msg.sender === 'ai' ? <Bot size={14} /> : <User size={14} />}
                        </div>
                        {/* Bubble */}
                        <div style={{
                            maxWidth: '78%',
                            padding: '10px 14px',
                            borderRadius: msg.sender === 'ai' ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
                            background: msg.sender === 'ai' ? 'var(--bg-secondary)' : 'var(--accent-primary)',
                            color: msg.sender === 'ai' ? 'var(--text-primary)' : '#fff',
                            fontSize: '14px',
                            lineHeight: 1.6,
                            border: '1px solid var(--glass-border)',
                        }}>
                            {renderText(msg.text)}
                        </div>
                    </div>
                ))}

                {/* AI Typing Indicator */}
                {isTyping && (
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: '8px' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-light)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                            <Bot size={14} />
                        </div>
                        <div style={{ padding: '10px 14px', borderRadius: '16px 16px 16px 4px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', display: 'flex', gap: '4px', alignItems: 'center' }}>
                            {[0, 1, 2].map(i => (
                                <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-primary)', animation: 'pulse 1s infinite', animationDelay: `${i * 0.2}s` }} />
                            ))}
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Suggested Questions */}
            {messages.length <= 1 && !isTyping && (
                <div style={{ padding: '0 16px 8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {SUGGESTED_QUESTIONS.map((q, i) => (
                        <button
                            key={i}
                            onClick={() => sendMessage(q)}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '20px',
                                border: '1px solid var(--accent-primary)',
                                background: 'var(--accent-light)',
                                color: 'var(--accent-primary)',
                                fontSize: '12px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {q}
                        </button>
                    ))}
                </div>
            )}

            {/* Input Bar */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px', padding: '12px 16px', borderTop: '1px solid var(--glass-border)', background: 'var(--bg-secondary)', paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}>
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Ask about your energy usage..."
                    style={{
                        flex: 1,
                        padding: '10px 14px',
                        borderRadius: '24px',
                        border: '1px solid var(--glass-border)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '14px',
                        outline: 'none',
                    }}
                />
                <button
                    type="submit"
                    style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--accent-primary)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                >
                    <Send size={18} color="#fff" />
                </button>
            </form>
        </div>
    );
};

export default ChatScreen;
