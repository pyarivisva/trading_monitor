import { useState, useEffect } from 'react'
import axios from 'axios'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { DATA_MASTER } from './accounts';

// --- CONFIGURATION ---
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/dashboard';

function App() {
  const [realData, setRealData] = useState({ mt4: {}, mt5: {} })
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  // TEMA
  const theme = {
    bg: darkMode ? '#0f172a' : '#f8fafc',
    text: darkMode ? '#e2e8f0' : '#1e293b',
    subText: darkMode ? '#94a3b8' : '#64748b',
    cardBg: darkMode ? '#1e293b' : '#ffffff',
    cardShadow: darkMode ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.05)',
    border: darkMode ? '#334155' : '#e2e8f0',
    barBg: darkMode ? '#334155' : '#e0f2fe',
    accent: '#3b82f6',
    alertBg: darkMode ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
    alertText: darkMode ? '#fca5a5' : '#ef4444'
  };

  useEffect(() => {
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    document.body.style.backgroundColor = theme.bg;
  }, [darkMode, theme.bg]);

  // DATA FETCH
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(API_URL)
        setRealData(res.data)
      } catch (err) {
        console.error("Gagal konek server:", API_URL, err)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // MAPPING DATA
  const allAccounts = Object.keys(DATA_MASTER).map(id => {
    const master = DATA_MASTER[id];
    const dataServer = realData.mt4[id] || realData.mt5[id] || realData.mt5[Number(id)] || realData.mt5[String(id)];
    
    const vals = [
      dataServer?.equity || 0,
      dataServer?.profit_total || 0,
      dataServer?.initial_deposit || 0,
      dataServer?.top_up_only || 0,
      dataServer?.pure_initial_deposit || 0,
      dataServer?.withdrawals || 0
    ];
    const maxVal = Math.max(...vals, 1);

    return {
      id: id,
      namaDisplay: master.nama,
      broker: master.broker || 'Broker Info',
      platform: dataServer?.platform || (realData.mt4[id] ? "MT4" : "MT5"),
      isConnected: !!dataServer,
      growth: dataServer?.growth || 0,
      floating: dataServer?.floating || 0,
      equity: dataServer?.equity || 0,
      profit_total: dataServer?.profit_total || 0,
      withdrawals: dataServer?.withdrawals || 0,
      
      // DATA UTAMA
      initial_deposit: dataServer?.initial_deposit || 0,
      pure_initial_deposit: dataServer?.pure_initial_deposit || 0,
      top_up_only: dataServer?.top_up_only || 0,

      monthly_history: dataServer?.monthly_history || [], 
      maxVal: maxVal,
      radarData: [
        { subject: 'Profit Trades', A: dataServer?.win_rate || 0 },
        { subject: 'Loss Trades', A: dataServer?.loss_rate || 0 },
        { subject: 'Trading activity', A: dataServer?.activity || 0 },
        { subject: 'Max deposit load', A: 50 },
        { subject: 'Maximum drawdown', A: 20 },
        { subject: 'Algo trading', A: dataServer?.algo_ratio || 0 },
      ]
    };
  });

  const StatRow = ({ label, value, maxVal, color = '#60a5fa' }) => {
    const percentage = Math.min((Math.abs(value) / maxVal) * 100, 100);
    return (
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', fontSize: '11px' }}>
        <div style={{ width: '110px', color: theme.subText }}>{label}</div>
        <div style={{ flex: 1, textAlign: 'right', fontWeight: 'bold', marginRight: '8px', color: theme.text }}>
          {parseFloat(value).toLocaleString()} USD
        </div>
        <div style={{ width: '50px', height: '7px', background: theme.barBg, borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ width: `${percentage}%`, height: '100%', background: color, transition: 'width 0.5s ease' }}></div>
        </div>
      </div>
    );
  }

  const MonthlyProfitRow = ({ month, profit, initial_depo }) => {
    if (profit === null) {
      return (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '11px' }}>
          <div style={{ color: theme.subText }}>{month}</div>
          <div style={{ color: theme.subText, fontStyle: 'italic', fontSize: '10px', opacity: 0.7 }}>
            Not yet actively trading
          </div>
        </div>
      );
    }
    const percentage = initial_depo > 0 ? ((profit / initial_depo) * 100).toFixed(1) : 0;
    const isPositive = profit >= 0;
    
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '11px' }}>
        <div style={{ color: theme.subText }}>{month}</div>
        <div style={{ fontWeight: 'bold', color: isPositive ? '#22c55e' : '#ef4444' }}>
          {parseFloat(profit).toLocaleString()} USD ({isPositive ? '+' : ''}{percentage}%)
        </div>
      </div>
    );
  };

  const KartuPro = ({ akun }) => (
    <div style={{ 
      background: theme.cardBg, borderRadius: '12px', padding: '18px', boxShadow: theme.cardShadow, 
      transition: 'all 0.3s ease', position: 'relative', overflow: 'hidden',
      flex: '1 1 320px', maxWidth: '380px', minWidth: '300px'
    }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ fontWeight: 'bold', color: theme.text, fontSize: '15px' }}>{akun.namaDisplay}</div>
            <span style={{ 
              fontSize: '8px', padding: '2px 5px', borderRadius: '4px', 
              background: akun.platform === 'MT5' ? '#8b5cf6' : '#3b82f6', 
              color: 'white', fontWeight: '900'
            }}>
              {akun.platform}
            </span>
          </div>
          <div style={{ fontSize: '10px', color: theme.subText }}>ID: {akun.id} | {akun.broker}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {akun.isConnected ? (
            <div style={{ fontSize: '18px', fontWeight: '800', color: akun.growth >= 0 ? '#22c55e' : '#ef4444' }}>
              {parseFloat(akun.growth).toFixed(1)}%
              <div style={{ fontSize: '9px', color: theme.subText, fontWeight: 'normal' }}>Growth</div>
            </div>
          ) : (
            <div style={{ padding: '3px 6px', background: theme.subText, color: 'white', borderRadius: '4px', fontSize: '9px', fontWeight: 'bold' }}>OFFLINE</div>
          )}
        </div>
      </div>

      {akun.isConnected ? (
        <>
          <div style={{ 
            textAlign: 'center', margin: '10px 0', padding: '8px', borderRadius: '6px',
            background: akun.floating >= 0 ? (darkMode ? 'rgba(34, 197, 94, 0.1)' : '#f0fdf4') : (darkMode ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2')
          }}>
            <small style={{ color: theme.subText, fontSize: '10px' }}>Floating Profit</small>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: akun.floating >= 0 ? '#22c55e' : '#ef4444' }}>
              {akun.floating >= 0 ? '+' : ''} ${parseFloat(akun.floating).toLocaleString()}
            </div>
          </div>

          <div style={{ height: '280px', width: '100%', margin: '5px 0' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="55%" data={akun.radarData}>
                <PolarGrid stroke={darkMode ? '#475569' : '#e2e8f0'} />
                <PolarAngleAxis 
                  dataKey="subject" 
                  tick={({ payload, x, y, textAnchor }) => {
                    const dataPoint = akun.radarData.find(d => d.subject === payload.value);
                    return (
                      <g>
                        <text x={x} y={y} textAnchor={textAnchor} fontSize={9} fill={theme.subText}>
                          <tspan x={x} dy="-4">{payload.value}:</tspan>
                          <tspan x={x} dy="11" fontWeight="bold" fill={theme.text}>
                            {dataPoint ? `${dataPoint.A.toFixed(1)}%` : '0%'}
                          </tspan>
                        </text>
                      </g>
                    );
                  }}
                />
                <PolarRadiusAxis 
                  angle={75} 
                  domain={[0, 100]} 
                  tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 'bold' }} 
                  axisLine={false}
                  tickFormatter={(t) => t === 100 ? '100+%' : `${t}%`}
                  ticks={[0, 50, 100]} 
                />
                <Radar dataKey="A" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.4} isAnimationActive={false} dot={{ r: 3, fill: '#0ea5e9', fillOpacity: 1 }} style={{ outline: 'none' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ marginTop: '10px', borderTop: `1px solid ${theme.border}`, paddingTop: '12px' }}>
            <StatRow label="Equity" value={akun.equity} maxVal={akun.maxVal} color="#0ea5e9" />
            <StatRow label="Profit" value={akun.profit_total} maxVal={akun.maxVal} color="#3b82f6" />
            
            {/* INVESTMENT (NET) */}
            <StatRow label="Investment" value={akun.initial_deposit} maxVal={akun.maxVal} color="#94a3b8" />
            
            {/* INITIAL DEPOSIT */}
            <StatRow label="Initial Deposit" value={akun.pure_initial_deposit} maxVal={akun.maxVal} color="#64748b" />
            
            {/* WITHDRAWALS */}
            <StatRow label="Withdrawals" value={akun.withdrawals} maxVal={akun.maxVal} color="#ef4444" />
            
            {/* DEPOSITS */}
            <StatRow label="Deposits" value={akun.top_up_only} maxVal={akun.maxVal} color="#22c55e" />
          </div>

          <div style={{ marginTop: '15px', padding: '10px', background: darkMode ? 'rgba(255,255,255,0.03)' : '#f1f5f9', borderRadius: '8px' }}>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: theme.subText, marginBottom: '8px', textTransform: 'uppercase' }}>
              Last 3 Month Profit
            </div>
            {akun.monthly_history && akun.monthly_history.length > 0 ? (
              akun.monthly_history.map((m, i) => (
                <MonthlyProfitRow key={i} month={m.month} profit={m.profit} initial_depo={akun.initial_deposit} />
              ))
            ) : (
              <div style={{ fontSize: '10px', color: theme.subText }}>Menunggu data...</div>
            )}
          </div>
        </>
      ) : (
        <div style={{ marginTop: '15px', padding: '40px 10px', background: theme.alertBg, border: `1px dashed ${theme.alertText}`, borderRadius: '10px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px' }}>⚠️</div>
          <h3 style={{ color: theme.alertText, margin: '8px 0', fontSize: '13px' }}>Menunggu Koneksi</h3>
          <p style={{ color: theme.subText, fontSize: '11px' }}>Script bridge belum dijalankan.</p>
        </div>
      )}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, padding: '25px', transition: 'all 0.3s' }}>
      <div style={{ maxWidth: '1300px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div>
            <h1 style={{ color: theme.text, fontSize: '22px', fontWeight: '800', margin: 0 }}>DASHBOARD MT</h1>
            <p style={{ color: theme.subText, fontSize: '12px' }}>Realtime Monitoring System</p>
          </div>
          <button onClick={() => setDarkMode(!darkMode)} style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, padding: '8px 16px', borderRadius: '30px', color: theme.text, cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }}>
            {darkMode ? '🌙 Dark' : '☀️ Light'}
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '20px' }}>
          {allAccounts.map(akun => <KartuPro key={akun.id} akun={akun} />)}
        </div>
      </div>
    </div>
  )
}

export default App