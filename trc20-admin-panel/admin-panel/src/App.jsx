import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import * as XLSX from 'xlsx';
import * as API from './api';

const AuthCtx = createContext(null);
const useAdmin = () => useContext(AuthCtx);

// ── HELPERS ──────────────────────────────────────────────────
const fmtDate = d => d ? new Date(d).toLocaleString('en-IN') : '—';
const fmtDateShort = d => d ? new Date(d).toLocaleDateString('en-IN') : '—';
const fmtINR = n => `₹${parseFloat(n||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`;
const fmtUSDT = n => `$${parseFloat(n||0).toFixed(2)}`;

const StatusBadge = ({ s }) => {
  const M = { pending:{bg:'#FEF3C7',c:'#92400E'},processing:{bg:'#DBEAFE',c:'#1E40AF'},approved:{bg:'#D1FAE5',c:'#065F46'},rejected:{bg:'#FEE2E2',c:'#991B1B'},expired:{bg:'#F3F4F6',c:'#6B7280'} };
  const m = M[s]||M.pending;
  return <span style={{background:m.bg,color:m.c,padding:'2px 10px',borderRadius:8,fontSize:12,fontWeight:700,textTransform:'capitalize',whiteSpace:'nowrap'}}>{s}</span>;
};
const Card = ({ children, style={} }) => <div style={{background:'#fff',borderRadius:16,padding:24,boxShadow:'0 2px 12px rgba(0,0,0,.06)',...style}}>{children}</div>;
const Btn = ({ onClick,children,variant='primary',size='md',disabled=false,style={} }) => {
  const V = {primary:{bg:'#1D4ED8',c:'#fff'},success:{bg:'#10B981',c:'#fff'},danger:{bg:'#EF4444',c:'#fff'},secondary:{bg:'#F3F4F6',c:'#374151'},outline:{bg:'#fff',c:'#1D4ED8',border:'1px solid #1D4ED8'},warning:{bg:'#F59E0B',c:'#fff'}};
  const S = {sm:{padding:'5px 12px',fontSize:12},md:{padding:'8px 18px',fontSize:14},lg:{padding:'12px 28px',fontSize:16}};
  const v=V[variant]||V.primary; const s=S[size];
  return <button onClick={onClick} disabled={disabled} style={{background:v.bg,color:v.c,border:v.border||'none',borderRadius:10,fontWeight:600,cursor:disabled?'not-allowed':'pointer',opacity:disabled?.6:1,whiteSpace:'nowrap',...s,...style}}>{children}</button>;
};
const Input = ({ label,...p }) => (
  <div style={{marginBottom:14}}>
    {label&&<label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:5}}>{label}</label>}
    <input style={{width:'100%',padding:'9px 13px',border:'1.5px solid #E5E7EB',borderRadius:10,fontSize:14,outline:'none',boxSizing:'border-box'}} {...p}/>
  </div>
);
const Modal = ({ open,onClose,title,children,wide }) => {
  if (!open) return null;
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:20,padding:28,width:'100%',maxWidth:wide?760:480,maxHeight:'88vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <h3 style={{fontSize:18,fontWeight:700}}>{title}</h3>
          <button onClick={onClose} style={{fontSize:22,background:'none',border:'none',cursor:'pointer',color:'#6B7280'}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};
const SearchBox = ({ value,onChange,onSearch,placeholder }) => (
  <div style={{display:'flex',gap:8}}>
    <input value={value} onChange={e=>onChange(e.target.value)} onKeyDown={e=>e.key==='Enter'&&onSearch()}
      placeholder={placeholder||'Search...'} style={{padding:'9px 14px',border:'1.5px solid #E5E7EB',borderRadius:10,fontSize:14,width:320}}/>
    <Btn onClick={onSearch}>🔍 Search</Btn>
  </div>
);

// ── LOGIN ──────────────────────────────────────────────────
function Login() {
  const { setToken } = useAdmin();
  const [f,setF]=useState({u:'',p:''});
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState('');
  const submit = async () => {
    setLoading(true); setErr('');
    try { const d=await API.adminLogin(f.u,f.p); localStorage.setItem('admin_token',d.token); localStorage.setItem('admin_user',JSON.stringify(d.admin)); setToken(d.token); }
    catch(e) { setErr(e.message); }
    setLoading(false);
  };
  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg,#1E3A8A,#1D4ED8)'}}>
      <Card style={{width:380,borderRadius:24}}>
        <div style={{textAlign:'center',marginBottom:28}}>
          <div style={{width:56,height:56,borderRadius:16,background:'#1D4ED8',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',fontSize:24,color:'#fff'}}>⟨⟩</div>
          <h2 style={{fontSize:22,fontWeight:800}}>CRYPTO Admin</h2>
          <p style={{color:'#6B7280',fontSize:13,marginTop:4}}>Sign in to control panel</p>
        </div>
        {err&&<div style={{background:'#FEE2E2',color:'#991B1B',padding:'10px 14px',borderRadius:10,marginBottom:16,fontSize:13}}>{err}</div>}
        <Input label="Username" value={f.u} onChange={e=>setF(p=>({...p,u:e.target.value}))} placeholder="admin"/>
        <Input label="Password" type="password" value={f.p} onChange={e=>setF(p=>({...p,p:e.target.value}))} placeholder="••••••••" onKeyDown={e=>e.key==='Enter'&&submit()}/>
        <Btn onClick={submit} disabled={loading} size="lg" style={{width:'100%',marginTop:8}}>{loading?'Signing in...':'Sign In'}</Btn>
      </Card>
    </div>
  );
}

// ── SIDEBAR ──────────────────────────────────────────────────
const NAV = [
  {path:'/overview',icon:'📊',label:'Overview'},
  {path:'/analytics',icon:'📈',label:'Analytics'},
  {path:'/purchases',icon:'📥',label:'Purchases'},
  {path:'/withdrawals',icon:'📤',label:'Withdrawals'},
  {path:'/transactions',icon:'🔍',label:'Transactions'},
  {path:'/users',icon:'👥',label:'Users'},
  {path:'/referrals',icon:'🎁',label:'Referrals'},
  {path:'/settings',icon:'⚙️',label:'Settings'},
];

function Sidebar() {
  const loc=useLocation(); const {logout}=useAdmin();
  return (
    <div style={{width:220,minHeight:'100vh',background:'linear-gradient(180deg,#1E3A8A,#1B3080)',color:'#fff',display:'flex',flexDirection:'column',flexShrink:0,position:'sticky',top:0,height:'100vh',overflowY:'auto'}}>
      <div style={{padding:'24px 20px 20px',borderBottom:'1px solid rgba(255,255,255,.1)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:38,height:38,borderRadius:10,background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>⟨⟩</div>
          <div><div style={{fontWeight:800,fontSize:16}}>TRC20</div><div style={{fontSize:11,opacity:.6}}>Admin Panel</div></div>
        </div>
      </div>
      <nav style={{padding:'16px 12px',flex:1}}>
        {NAV.map(n=>(
          <Link key={n.path} to={n.path} style={{textDecoration:'none'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,marginBottom:4,background:loc.pathname===n.path?'rgba(255,255,255,.15)':'transparent',color:'#fff',fontSize:14,fontWeight:loc.pathname===n.path?700:400,opacity:loc.pathname===n.path?1:.8,transition:'all .15s'}}>
              <span style={{fontSize:18}}>{n.icon}</span>{n.label}
            </div>
          </Link>
        ))}
      </nav>
      <div style={{padding:'16px 12px',borderTop:'1px solid rgba(255,255,255,.1)'}}>
        <button onClick={logout} style={{width:'100%',background:'rgba(255,255,255,.1)',color:'#fff',border:'none',borderRadius:10,padding:'10px',fontSize:14,cursor:'pointer',fontWeight:500}}>→ Sign Out</button>
      </div>
    </div>
  );
}

// ── OVERVIEW ──────────────────────────────────────────────────
function Overview() {
  const [d,setD]=useState(null);
  useEffect(()=>{ const fn=async()=>{try{const r=await API.getDashboard();setD(r);}catch{}}; fn(); const i=setInterval(fn,30000); return()=>clearInterval(i); },[]);
  if(!d) return <div style={{padding:32,textAlign:'center'}}>Loading...</div>;
  const {stats,recentOrders,recentWithdrawals}=d;
  const StatCard=({icon,label,value,color='#1D4ED8'})=>(
    <Card style={{padding:18}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div><div style={{fontSize:26,fontWeight:800,color}}>{value}</div><div style={{fontSize:12,color:'#6B7280',marginTop:4}}>{label}</div></div>
        <div style={{fontSize:22}}>{icon}</div>
      </div>
    </Card>
  );
  return (
    <div>
      <h1 style={{fontSize:24,fontWeight:800,marginBottom:6}}>Overview</h1>
      <p style={{color:'#6B7280',fontSize:13,marginBottom:20}}>Live snapshot · auto-refreshes every 30s</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:14,marginBottom:14}}>
        <StatCard icon="👥" label="Total Users" value={stats.totalUsers}/>
        <StatCard icon="🆕" label="New Today" value={stats.newUsersToday} color="#10B981"/>
        <StatCard icon="🚫" label="Banned" value={stats.bannedUsers} color="#EF4444"/>
        <StatCard icon="🎫" label="Pending Tickets" value={stats.pendingTickets} color="#F59E0B"/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:14,marginBottom:14}}>
        <StatCard icon="📥" label="Pending Deposits" value={stats.pendingPurchases} color="#F59E0B"/>
        <StatCard icon="📤" label="Pending Withdrawals" value={stats.pendingWithdrawals} color="#F59E0B"/>
        <StatCard icon="✅" label="Approved Deposits" value={stats.approvedPurchases} color="#10B981"/>
        <StatCard icon="✅" label="Approved Withdrawals" value={stats.approvedWithdrawalsCount} color="#10B981"/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:14,marginBottom:24}}>
        <StatCard icon="💰" label="Total INR Volume" value={fmtINR(stats.totalRevenue)} color="#1D4ED8"/>
        <StatCard icon="💵" label="Total USDT Sold" value={fmtUSDT(stats.totalUsdtSold)} color="#1D4ED8"/>
        <StatCard icon="🏦" label="Total USDT Withdrawn" value={fmtUSDT(stats.totalUsdtWithdrawn)} color="#1D4ED8"/>
        <StatCard icon="🪙" label="Platform Liability" value={fmtUSDT(stats.totalUserBalances)} color="#7C3AED"/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
        <Card>
          <h3 style={{fontSize:16,fontWeight:700,marginBottom:16}}>Recent Purchases</h3>
          {recentOrders.slice(0,8).map(o=>(
            <div key={o.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid #F3F4F6'}}>
              <div><div style={{fontSize:13,fontWeight:600}}>{o.users?.name||'—'}</div><div style={{fontSize:11,color:'#9CA3AF'}}>{o.order_id}</div></div>
              <div style={{textAlign:'right'}}><div style={{fontSize:13,fontWeight:700,color:'#10B981'}}>{fmtUSDT(o.amount_usdt)}</div><StatusBadge s={o.status}/></div>
            </div>
          ))}
        </Card>
        <Card>
          <h3 style={{fontSize:16,fontWeight:700,marginBottom:16}}>Recent Withdrawals</h3>
          {recentWithdrawals.slice(0,8).map(o=>(
            <div key={o.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid #F3F4F6'}}>
              <div><div style={{fontSize:13,fontWeight:600}}>{o.users?.name||'—'}</div><div style={{fontSize:11,color:'#9CA3AF'}}>{o.order_id}</div></div>
              <div style={{textAlign:'right'}}><div style={{fontSize:13,fontWeight:700,color:'#F59E0B'}}>{fmtUSDT(o.amount_usdt)}</div><StatusBadge s={o.status}/></div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ── ANALYTICS ──────────────────────────────────────────────────
function Analytics() {
  const [period,setPeriod]=useState('30d');
  const [from,setFrom]=useState('');
  const [to,setTo]=useState('');
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(true);

  const load = async (p=period,f=from,t=to) => {
    setLoading(true);
    try { const r=await API.getAnalytics(p,f,t); if(r.success) setData(r); }
    catch(e){alert(e.message);}
    setLoading(false);
  };

  useEffect(()=>{load();},[]);

  const BarChart = ({data:d,valueKey,color='#1D4ED8',height=100}) => {
    if(!d||d.length===0) return <div style={{height,display:'flex',alignItems:'center',justifyContent:'center',color:'#9CA3AF',fontSize:13}}>No data</div>;
    const max=Math.max(...d.map(x=>x[valueKey]||0),1);
    return (
      <div style={{display:'flex',alignItems:'flex-end',gap:2,height,paddingTop:8}}>
        {d.map((x,i)=>(
          <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',height:'100%'}}>
            <div title={`${x.date}: ${x[valueKey]?.toFixed?.(2)||x[valueKey]}`}
              style={{width:'100%',background:color,borderRadius:'3px 3px 0 0',height:`${Math.max((x[valueKey]/max)*85,x[valueKey]>0?2:0)}%`,minHeight:x[valueKey]>0?2:0,transition:'height 0.3s',cursor:'pointer'}}/>
            {d.length<=15&&<div style={{fontSize:8,color:'#9CA3AF',marginTop:2,transform:'rotate(-40deg)',transformOrigin:'center',whiteSpace:'nowrap'}}>{x.date?.slice(5)}</div>}
          </div>
        ))}
      </div>
    );
  };

  const StatCard=({icon,label,value,sub,color='#1D4ED8'})=>(
    <Card style={{padding:16}}>
      <div style={{fontSize:11,color:'#6B7280',fontWeight:600,textTransform:'uppercase',letterSpacing:0.5,marginBottom:6}}>{icon} {label}</div>
      <div style={{fontSize:22,fontWeight:800,color}}>{value}</div>
      {sub&&<div style={{fontSize:11,color:'#9CA3AF',marginTop:3}}>{sub}</div>}
    </Card>
  );

  const PERIODS=[{k:'1d',l:'Today'},{k:'7d',l:'7 Days'},{k:'30d',l:'30 Days'},{k:'90d',l:'90 Days'}];

  const exportAnalytics = () => {
    if(!data) return;
    const rows=data.dailyData.map(d=>({'Date':d.date,'Deposits (₹)':d.depositsInr.toFixed(2),'USDT Sold':d.depositsUsdt.toFixed(2),'Deposit Count':d.depositsCount,'Approved':d.approvedD,'Rejected':d.rejectedD,'Withdrawals (USDT)':d.withdrawalsUsdt.toFixed(2),'Withdrawal Count':d.withdrawalsCount,'New Users':d.newUsers}));
    const ws=XLSX.utils.json_to_sheet(rows); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Analytics'); XLSX.writeFile(wb,`trc20-analytics-${period}-${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  if(loading) return <div style={{padding:40,textAlign:'center'}}>Loading analytics...</div>;
  const s=data?.summary||{}; const daily=data?.dailyData||[]; const top=data?.topUsers||[]; const sb=data?.statusBreakdown||{};

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap',gap:10}}>
        <div><h1 style={{fontSize:24,fontWeight:800,marginBottom:4}}>Analytics</h1><p style={{color:'#6B7280',fontSize:13}}>Complete audit — every metric, unfakeable</p></div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
          {PERIODS.map(p=><Btn key={p.k} variant={period===p.k?'primary':'secondary'} size="sm" onClick={()=>{setPeriod(p.k);setFrom('');setTo('');load(p.k,'','');}}>{p.l}</Btn>)}
          <div style={{display:'flex',gap:4,alignItems:'center'}}>
            <input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={{padding:'7px 10px',border:'1.5px solid #E5E7EB',borderRadius:8,fontSize:13}}/>
            <span style={{color:'#6B7280'}}>to</span>
            <input type="date" value={to} onChange={e=>setTo(e.target.value)} style={{padding:'7px 10px',border:'1.5px solid #E5E7EB',borderRadius:8,fontSize:13}}/>
            <Btn size="sm" onClick={()=>{setPeriod('custom');load('custom',from,to);}}>Apply</Btn>
          </div>
          <Btn variant="success" size="sm" onClick={exportAnalytics}>⬇ Export</Btn>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:14,marginBottom:20}}>
        <StatCard icon="💰" label="Total Revenue" value={fmtINR(s.totalRevenue)} color="#1D4ED8"/>
        <StatCard icon="💵" label="USDT Sold" value={fmtUSDT(s.totalUsdtSold)} color="#10B981"/>
        <StatCard icon="🏦" label="USDT Withdrawn" value={fmtUSDT(s.totalWithdrawn)} color="#F59E0B"/>
        <StatCard icon="💸" label="Withdrawal Fees" value={fmtUSDT(s.totalFees)} color="#7C3AED"/>
        <StatCard icon="🎁" label="Referral Commission" value={fmtUSDT(s.totalCommission)} color="#EC4899"/>
        <StatCard icon="🪙" label="Platform Liability" value={fmtUSDT(s.platformLiability)} color="#EF4444" sub="Total USDT owed to users"/>
        <StatCard icon="👥" label="New Users" value={s.newUsersCount} color="#10B981"/>
        <StatCard icon="✅" label="Approval Rate" value={`${s.approvalRate}%`} color={parseFloat(s.approvalRate)>80?'#10B981':'#F59E0B'}/>
      </div>

      {/* Charts */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>
        <Card>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <h3 style={{fontSize:15,fontWeight:700}}>Daily INR Deposits (₹)</h3>
            <span style={{fontSize:12,color:'#6B7280'}}>{daily.length} days</span>
          </div>
          <BarChart data={daily} valueKey="depositsInr" color="#1D4ED8" height={120}/>
        </Card>
        <Card>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <h3 style={{fontSize:15,fontWeight:700}}>Daily USDT Sold</h3>
          </div>
          <BarChart data={daily} valueKey="depositsUsdt" color="#10B981" height={120}/>
        </Card>
        <Card>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <h3 style={{fontSize:15,fontWeight:700}}>Daily USDT Withdrawn</h3>
          </div>
          <BarChart data={daily} valueKey="withdrawalsUsdt" color="#F59E0B" height={120}/>
        </Card>
        <Card>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <h3 style={{fontSize:15,fontWeight:700}}>Daily New Users</h3>
          </div>
          <BarChart data={daily} valueKey="newUsers" color="#7C3AED" height={120}/>
        </Card>
      </div>

      {/* Status Breakdown */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>
        <Card>
          <h3 style={{fontSize:15,fontWeight:700,marginBottom:16}}>Deposit Status Breakdown</h3>
          {[['Approved',sb.purchases?.approved,'#10B981'],['Pending',sb.purchases?.pending,'#F59E0B'],['Rejected',sb.purchases?.rejected,'#EF4444'],['Expired',sb.purchases?.expired,'#9CA3AF']].map(([l,v,c])=>{
            const total=(sb.purchases?.approved||0)+(sb.purchases?.pending||0)+(sb.purchases?.rejected||0)+(sb.purchases?.expired||0)||1;
            return <div key={l} style={{marginBottom:12}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:4}}><span style={{fontWeight:600}}>{l}</span><span style={{fontWeight:700,color:c}}>{v||0} ({((v||0)/total*100).toFixed(1)}%)</span></div>
              <div style={{height:8,background:'#F3F4F6',borderRadius:4,overflow:'hidden'}}><div style={{height:'100%',background:c,width:`${(v||0)/total*100}%`,borderRadius:4,transition:'width 0.5s'}}/></div>
            </div>;
          })}
        </Card>
        <Card>
          <h3 style={{fontSize:15,fontWeight:700,marginBottom:16}}>Withdrawal Status Breakdown</h3>
          {[['Approved',sb.withdrawals?.approved,'#10B981'],['Pending',sb.withdrawals?.pending,'#F59E0B'],['Rejected',sb.withdrawals?.rejected,'#EF4444']].map(([l,v,c])=>{
            const total=(sb.withdrawals?.approved||0)+(sb.withdrawals?.pending||0)+(sb.withdrawals?.rejected||0)||1;
            return <div key={l} style={{marginBottom:12}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:4}}><span style={{fontWeight:600}}>{l}</span><span style={{fontWeight:700,color:c}}>{v||0} ({((v||0)/total*100).toFixed(1)}%)</span></div>
              <div style={{height:8,background:'#F3F4F6',borderRadius:4,overflow:'hidden'}}><div style={{height:'100%',background:c,width:`${(v||0)/total*100}%`,borderRadius:4,transition:'width 0.5s'}}/></div>
            </div>;
          })}
        </Card>
      </div>

      {/* Top Users */}
      <Card style={{marginBottom:20}}>
        <h3 style={{fontSize:15,fontWeight:700,marginBottom:16}}>Top 10 Users by Deposit Volume</h3>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',minWidth:600}}>
            <thead><tr style={{borderBottom:'2px solid #F3F4F6'}}>
              {['#','Name','Phone','Email','Deposits','Total INR','Total USDT'].map(h=><th key={h} style={{textAlign:'left',padding:'8px 12px',fontSize:11,fontWeight:700,color:'#6B7280',textTransform:'uppercase'}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {top.map((u,i)=>(
                <tr key={i} style={{borderBottom:'1px solid #F9FAFB'}}>
                  <td style={{padding:'10px 12px',fontWeight:800,color:i<3?'#F59E0B':'#374151',fontSize:14}}>{i+1}</td>
                  <td style={{padding:'10px 12px',fontSize:13,fontWeight:600}}>{u.user?.name||'—'}</td>
                  <td style={{padding:'10px 12px',fontSize:13,color:'#6B7280'}}>{u.user?.phone||'—'}</td>
                  <td style={{padding:'10px 12px',fontSize:12,color:'#6B7280'}}>{u.user?.email||'—'}</td>
                  <td style={{padding:'10px 12px',fontSize:13,fontWeight:600}}>{u.count}</td>
                  <td style={{padding:'10px 12px',fontSize:13,fontWeight:700,color:'#1D4ED8'}}>{fmtINR(u.totalInr)}</td>
                  <td style={{padding:'10px 12px',fontSize:13,fontWeight:700,color:'#10B981'}}>{fmtUSDT(u.totalUsdt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Daily Breakdown Table */}
      <Card>
        <h3 style={{fontSize:15,fontWeight:700,marginBottom:16}}>Daily Breakdown Table</h3>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',minWidth:800}}>
            <thead><tr style={{borderBottom:'2px solid #F3F4F6',background:'#F9FAFB'}}>
              {['Date','Deposits Count','Approved','Rejected','INR Volume','USDT Sold','Withdrawals','USDT Out','New Users'].map(h=><th key={h} style={{textAlign:'left',padding:'10px 12px',fontSize:11,fontWeight:700,color:'#6B7280',textTransform:'uppercase',whiteSpace:'nowrap'}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {[...daily].reverse().map((d,i)=>(
                <tr key={i} style={{borderBottom:'1px solid #F9FAFB',background:i%2===0?'#FFF':'#FAFAFA'}}>
                  <td style={{padding:'9px 12px',fontSize:13,fontWeight:700}}>{d.date}</td>
                  <td style={{padding:'9px 12px',fontSize:13}}>{d.depositsCount}</td>
                  <td style={{padding:'9px 12px',fontSize:13,color:'#10B981',fontWeight:600}}>{d.approvedD}</td>
                  <td style={{padding:'9px 12px',fontSize:13,color:'#EF4444',fontWeight:600}}>{d.rejectedD}</td>
                  <td style={{padding:'9px 12px',fontSize:13,fontWeight:700,color:'#1D4ED8'}}>{fmtINR(d.depositsInr)}</td>
                  <td style={{padding:'9px 12px',fontSize:13,fontWeight:600,color:'#10B981'}}>{fmtUSDT(d.depositsUsdt)}</td>
                  <td style={{padding:'9px 12px',fontSize:13}}>{d.withdrawalsCount}</td>
                  <td style={{padding:'9px 12px',fontSize:13,color:'#F59E0B',fontWeight:600}}>{fmtUSDT(d.withdrawalsUsdt)}</td>
                  <td style={{padding:'9px 12px',fontSize:13}}>{d.newUsers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ── PURCHASES (with bulk approve) ──────────────────────────────────────────────────
function Purchases() {
  const [orders,setOrders]=useState([]);
  const [filter,setFilter]=useState('');
  const [search,setSearch]=useState('');
  const [searchInput,setSearchInput]=useState('');
  const [selected,setSelected]=useState(null);
  const [note,setNote]=useState('');
  const [loading,setLoading]=useState(false);
  const [checked,setChecked]=useState({});
  const [bulkNote,setBulkNote]=useState('');
  const [bulkLoading,setBulkLoading]=useState(false);

  const load=async()=>{try{const r=await API.getPurchases(1,filter,search);setOrders(r.orders);setChecked({});}catch{}};
  useEffect(()=>{load();},[filter,search]);

  const approve=async(id)=>{ setLoading(true); try{await API.approvePurchase(id,note);setSelected(null);setNote('');load();}catch(e){alert(e.message);} setLoading(false); };
  const reject=async(id)=>{ if(!note.trim()){alert('Enter a reason');return;} setLoading(true); try{await API.rejectPurchase(id,note);setSelected(null);setNote('');load();}catch(e){alert(e.message);} setLoading(false); };

  const checkedIds=Object.keys(checked).filter(k=>checked[k]);
  const allChecked=orders.filter(o=>['pending','processing'].includes(o.status)).length>0&&orders.filter(o=>['pending','processing'].includes(o.status)).every(o=>checked[o.id]);

  const toggleAll=()=>{
    const pending=orders.filter(o=>['pending','processing'].includes(o.status));
    if(allChecked){setChecked({});}else{const m={};pending.forEach(o=>m[o.id]=true);setChecked(m);}
  };

  const bulkApprove=async()=>{
    if(checkedIds.length===0){alert('Select orders first');return;}
    if(!confirm(`Approve ${checkedIds.length} orders?`)) return;
    setBulkLoading(true);
    try{const r=await API.bulkApprovePurchases(checkedIds,bulkNote);alert(r.message);load();}catch(e){alert(e.message);}
    setBulkLoading(false);
  };

  const FILTERS=['','pending','processing','approved','rejected'];
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:10}}>
        <h1 style={{fontSize:24,fontWeight:800}}>Purchase Orders</h1>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {FILTERS.map(f=><Btn key={f} variant={filter===f?'primary':'secondary'} size="sm" onClick={()=>setFilter(f)}>{f||'All'}</Btn>)}
        </div>
      </div>

      <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
        <SearchBox value={searchInput} onChange={setSearchInput} onSearch={()=>setSearch(searchInput)} placeholder="Search name, phone, order ID, UTR..."/>
        {checkedIds.length>0&&(
          <div style={{display:'flex',gap:8,alignItems:'center',background:'#EFF6FF',padding:'8px 14px',borderRadius:10,border:'1px solid #BFDBFE'}}>
            <span style={{fontSize:13,fontWeight:600,color:'#1D4ED8'}}>{checkedIds.length} selected</span>
            <input placeholder="Bulk note (optional)" value={bulkNote} onChange={e=>setBulkNote(e.target.value)} style={{padding:'5px 10px',border:'1px solid #BFDBFE',borderRadius:7,fontSize:13,width:180}}/>
            <Btn variant="success" size="sm" onClick={bulkApprove} disabled={bulkLoading}>{bulkLoading?'Approving...':'✅ Bulk Approve'}</Btn>
          </div>
        )}
        <Btn variant="secondary" size="sm" onClick={load}>↻ Refresh</Btn>
      </div>

      <Card style={{padding:0,overflow:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',minWidth:900}}>
          <thead>
            <tr style={{borderBottom:'2px solid #F3F4F6'}}>
              <th style={{padding:'10px 14px'}}><input type="checkbox" checked={allChecked} onChange={toggleAll} style={{width:16,height:16}}/></th>
              {['Order ID','User','INR','USDT','Rate','UTR','Status','Submitted','Action'].map(h=><th key={h} style={{textAlign:'left',padding:'10px 14px',fontSize:11,fontWeight:700,color:'#6B7280',textTransform:'uppercase'}}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {orders.map(o=>(
              <tr key={o.id} style={{borderBottom:'1px solid #F9FAFB',background:checked[o.id]?'#EFF6FF':'#FFF'}}>
                <td style={{padding:'10px 14px'}}>{['pending','processing'].includes(o.status)&&<input type="checkbox" checked={!!checked[o.id]} onChange={e=>setChecked(p=>({...p,[o.id]:e.target.checked}))} style={{width:16,height:16}}/>}</td>
                <td style={{padding:'10px 14px',fontSize:13,fontWeight:600,color:'#1D4ED8'}}>{o.order_id}</td>
                <td style={{padding:'10px 14px'}}><div style={{fontSize:13,fontWeight:600}}>{o.users?.name||'—'}</div><div style={{fontSize:11,color:'#9CA3AF'}}>{o.users?.phone}</div></td>
                <td style={{padding:'10px 14px',fontSize:13,fontWeight:600}}>{fmtINR(o.amount_inr)}</td>
                <td style={{padding:'10px 14px',fontSize:13,fontWeight:700,color:'#10B981'}}>{fmtUSDT(o.amount_usdt)}</td>
                <td style={{padding:'10px 14px',fontSize:12,color:'#6B7280'}}>₹{parseFloat(o.rate_used).toFixed(2)}</td>
                <td style={{padding:'10px 14px',fontSize:12,color:'#6B7280',maxWidth:120,overflow:'hidden',textOverflow:'ellipsis'}}>{o.utr_number||'—'}</td>
                <td style={{padding:'10px 14px'}}><StatusBadge s={o.status}/></td>
                <td style={{padding:'10px 14px',fontSize:11,color:'#9CA3AF',whiteSpace:'nowrap'}}>{fmtDateShort(o.submitted_at)}</td>
                <td style={{padding:'10px 14px'}}><Btn size="sm" variant="outline" onClick={()=>{setSelected(o);setNote('');}}>View</Btn></td>
              </tr>
            ))}
            {orders.length===0&&<tr><td colSpan={10} style={{textAlign:'center',padding:30,color:'#9CA3AF'}}>No orders found</td></tr>}
          </tbody>
        </table>
      </Card>

      <Modal open={!!selected} onClose={()=>setSelected(null)} title={`Order: ${selected?.order_id}`} wide>
        {selected&&(
          <div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20}}>
              {[['User',selected.users?.name],['Phone',selected.users?.phone],['Email',selected.users?.email],['Amount INR',fmtINR(selected.amount_inr)],['Amount USDT',fmtUSDT(selected.amount_usdt)],['Rate',`₹${selected.rate_used}`],['UTR Number',selected.utr_number||'Not submitted'],['Status',selected.status],['Submitted',fmtDate(selected.submitted_at)],['Admin Note',selected.admin_note||'—']].map(([l,v])=>(
                <div key={l}><div style={{fontSize:10,color:'#9CA3AF',fontWeight:700,textTransform:'uppercase',marginBottom:2}}>{l}</div><div style={{fontSize:14,fontWeight:600,wordBreak:'break-all'}}>{v||'—'}</div></div>
              ))}
            </div>
            {selected.screenshot_url&&<div style={{marginBottom:20}}><div style={{fontSize:11,color:'#9CA3AF',fontWeight:700,textTransform:'uppercase',marginBottom:8}}>Payment Screenshot</div><img src={selected.screenshot_url} alt="proof" style={{width:'100%',borderRadius:12,border:'1px solid #E5E7EB'}}/></div>}
            {['pending','processing'].includes(selected.status)&&(
              <div>
                <label style={{display:'block',fontSize:13,fontWeight:600,marginBottom:6}}>Note (optional for approve, required for reject)</label>
                <textarea value={note} onChange={e=>setNote(e.target.value)} rows={3} style={{width:'100%',border:'1.5px solid #E5E7EB',borderRadius:10,padding:'10px',fontSize:14,resize:'vertical',boxSizing:'border-box'}} placeholder="Enter note..."/>
                <div style={{display:'flex',gap:10,marginTop:12}}>
                  <Btn variant="success" onClick={()=>approve(selected.id)} disabled={loading} style={{flex:1}}>{loading?'Processing...':'✅ Approve & Credit USDT'}</Btn>
                  <Btn variant="danger" onClick={()=>reject(selected.id)} disabled={loading} style={{flex:1}}>{loading?'...':'❌ Reject'}</Btn>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── WITHDRAWALS ──────────────────────────────────────────────────
function Withdrawals() {
  const [orders,setOrders]=useState([]);
  const [filter,setFilter]=useState('');
  const [search,setSearch]=useState('');
  const [searchInput,setSearchInput]=useState('');
  const [selected,setSelected]=useState(null);
  const [txHash,setTxHash]=useState('');
  const [note,setNote]=useState('');
  const [loading,setLoading]=useState(false);

  const load=async()=>{try{const r=await API.getWithdrawals(1,filter,search);setOrders(r.orders);}catch{}};
  useEffect(()=>{load();},[filter,search]);

  const approve=async(id)=>{ setLoading(true); try{await API.approveWithdrawal(id,txHash,note);setSelected(null);load();}catch(e){alert(e.message);} setLoading(false); };
  const reject=async(id)=>{ setLoading(true); try{await API.rejectWithdrawal(id,note);setSelected(null);load();}catch(e){alert(e.message);} setLoading(false); };

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:10}}>
        <h1 style={{fontSize:24,fontWeight:800}}>Withdrawal Orders</h1>
        <div style={{display:'flex',gap:8}}>
          {['','pending','approved','rejected'].map(f=><Btn key={f} variant={filter===f?'primary':'secondary'} size="sm" onClick={()=>setFilter(f)}>{f||'All'}</Btn>)}
        </div>
      </div>
      <div style={{marginBottom:14}}><SearchBox value={searchInput} onChange={setSearchInput} onSearch={()=>setSearch(searchInput)} placeholder="Search name, phone, order ID, wallet..."/></div>
      <Card style={{padding:0,overflow:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',minWidth:900}}>
          <thead><tr style={{borderBottom:'2px solid #F3F4F6'}}>
            {['Order ID','User','USDT','After Fee','Wallet','Free?','Status','Action'].map(h=><th key={h} style={{textAlign:'left',padding:'10px 14px',fontSize:11,fontWeight:700,color:'#6B7280',textTransform:'uppercase'}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {orders.map(o=>(
              <tr key={o.id} style={{borderBottom:'1px solid #F9FAFB'}}>
                <td style={{padding:'10px 14px',fontSize:13,fontWeight:600,color:'#1D4ED8'}}>{o.order_id}</td>
                <td style={{padding:'10px 14px'}}><div style={{fontSize:13,fontWeight:600}}>{o.users?.name||'—'}</div><div style={{fontSize:11,color:'#9CA3AF'}}>{o.users?.phone}</div></td>
                <td style={{padding:'10px 14px',fontSize:13,fontWeight:700,color:'#F59E0B'}}>{fmtUSDT(o.amount_usdt)}</td>
                <td style={{padding:'10px 14px',fontSize:13,fontWeight:600,color:'#10B981'}}>{fmtUSDT(o.amount_after_fee)}</td>
                <td style={{padding:'10px 14px',fontSize:11,color:'#6B7280'}}>{o.wallet_address?.substring(0,12)}...</td>
                <td style={{padding:'10px 14px'}}>{o.is_free_withdrawal?<span style={{color:'#10B981',fontWeight:700}}>🎁 Free</span>:'Paid'}</td>
                <td style={{padding:'10px 14px'}}><StatusBadge s={o.status}/></td>
                <td style={{padding:'10px 14px'}}><Btn size="sm" variant="outline" onClick={()=>{setSelected(o);setTxHash('');setNote('');}}>View</Btn></td>
              </tr>
            ))}
            {orders.length===0&&<tr><td colSpan={8} style={{textAlign:'center',padding:30,color:'#9CA3AF'}}>No orders found</td></tr>}
          </tbody>
        </table>
      </Card>
      <Modal open={!!selected} onClose={()=>setSelected(null)} title={`Withdrawal: ${selected?.order_id}`}>
        {selected&&(
          <div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
              {[['User',selected.users?.name],['Phone',selected.users?.phone],['Amount',fmtUSDT(selected.amount_usdt)],['After Fee',fmtUSDT(selected.amount_after_fee)],['Fee',`${selected.fee_usdt} USDT`],['Free?',selected.is_free_withdrawal?'Yes':'No'],['Status',selected.status]].map(([l,v])=>(
                <div key={l}><div style={{fontSize:10,color:'#9CA3AF',fontWeight:700,textTransform:'uppercase',marginBottom:2}}>{l}</div><div style={{fontSize:14,fontWeight:600}}>{v||'—'}</div></div>
              ))}
            </div>
            <div style={{background:'#F0F4FF',borderRadius:10,padding:12,marginBottom:16}}><div style={{fontSize:10,color:'#6B7280',fontWeight:700,textTransform:'uppercase',marginBottom:4}}>Wallet Address</div><div style={{fontSize:13,fontFamily:'monospace',wordBreak:'break-all',fontWeight:600}}>{selected.wallet_address}</div></div>
            {selected.status==='pending'&&(
              <div>
                <Input label="TX Hash (optional)" value={txHash} onChange={e=>setTxHash(e.target.value)} placeholder="Transaction hash..."/>
                <Input label="Admin Note (optional)" value={note} onChange={e=>setNote(e.target.value)} placeholder="Note..."/>
                <div style={{display:'flex',gap:10,marginTop:8}}>
                  <Btn variant="success" onClick={()=>approve(selected.id)} disabled={loading} style={{flex:1}}>{loading?'...':'✅ Approve'}</Btn>
                  <Btn variant="danger" onClick={()=>reject(selected.id)} disabled={loading} style={{flex:1}}>{loading?'...':'❌ Reject & Refund'}</Btn>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── TRANSACTIONS ──────────────────────────────────────────────────
function Transactions() {
  const [txs,setTxs]=useState([]);
  const [search,setSearch]=useState('');
  const [searchInput,setSearchInput]=useState('');
  const [type,setType]=useState('');
  const [status,setStatus]=useState('');
  const [total,setTotal]=useState(0);
  const [loading,setLoading]=useState(true);
  const [selected,setSelected]=useState(null);

  const load=async()=>{ setLoading(true); try{const r=await API.getTransactions({search,type,status,page:1,limit:100});setTxs(r.transactions);setTotal(r.total);}catch{} setLoading(false); };
  useEffect(()=>{load();},[search,type,status]);

  const exportTx=()=>{
    const rows=txs.map(o=>({'Type':o.txType,'Order ID':o.order_id,'User':o.users?.name,'Phone':o.users?.phone,'Email':o.users?.email,'Amount USDT':o.txType==='purchase'?o.amount_usdt:o.amount_usdt,'Amount INR':o.amount_inr||'—','Rate':o.rate_used||'—','UTR/Wallet':o.txType==='purchase'?(o.utr_number||'—'):(o.wallet_address||'—'),'Fee':o.fee_usdt||'—','Status':o.status,'Date':fmtDate(o.created_at)}));
    const ws=XLSX.utils.json_to_sheet(rows); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Transactions'); XLSX.writeFile(wb,`trc20-transactions-${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:10}}>
        <div><h1 style={{fontSize:24,fontWeight:800}}>Transactions</h1><p style={{color:'#6B7280',fontSize:13}}>{total} total transactions</p></div>
        <Btn variant="success" size="sm" onClick={exportTx}>⬇ Export Excel</Btn>
      </div>
      <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}>
        <SearchBox value={searchInput} onChange={setSearchInput} onSearch={()=>setSearch(searchInput)} placeholder="Search name, phone, order ID, UTR, wallet..."/>
        <select value={type} onChange={e=>setType(e.target.value)} style={{padding:'9px 12px',border:'1.5px solid #E5E7EB',borderRadius:10,fontSize:14}}>
          <option value="">All Types</option><option value="purchase">Deposits</option><option value="withdrawal">Withdrawals</option>
        </select>
        <select value={status} onChange={e=>setStatus(e.target.value)} style={{padding:'9px 12px',border:'1.5px solid #E5E7EB',borderRadius:10,fontSize:14}}>
          <option value="">All Status</option><option value="pending">Pending</option><option value="processing">Processing</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
        </select>
        <Btn variant="secondary" onClick={load}>↻ Refresh</Btn>
      </div>
      <Card style={{padding:0,overflow:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',minWidth:1100}}>
          <thead><tr style={{borderBottom:'2px solid #F3F4F6'}}>
            {['Type','User','Order ID','Amount','Rate/Fee','UTR/Wallet','Status','Date','Action'].map(h=><th key={h} style={{textAlign:'left',padding:'10px 14px',fontSize:11,fontWeight:700,color:'#6B7280',textTransform:'uppercase',whiteSpace:'nowrap'}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {loading?<tr><td colSpan={9} style={{textAlign:'center',padding:30,color:'#9CA3AF'}}>Loading...</td></tr>:
             txs.length===0?<tr><td colSpan={9} style={{textAlign:'center',padding:30,color:'#9CA3AF'}}>No transactions found</td></tr>:
             txs.map(o=>(
              <tr key={o.id} style={{borderBottom:'1px solid #F9FAFB'}}>
                <td style={{padding:'10px 14px'}}>{o.txType==='purchase'?<span style={{background:'#DBEAFE',color:'#1E40AF',padding:'2px 8px',borderRadius:6,fontSize:11,fontWeight:700}}>↓ Deposit</span>:<span style={{background:'#FEF3C7',color:'#92400E',padding:'2px 8px',borderRadius:6,fontSize:11,fontWeight:700}}>↑ Withdraw</span>}</td>
                <td style={{padding:'10px 14px'}}><div style={{fontSize:13,fontWeight:600}}>{o.users?.name||'—'}</div><div style={{fontSize:11,color:'#9CA3AF'}}>{o.users?.phone}</div></td>
                <td style={{padding:'10px 14px',fontSize:12,fontWeight:600,color:'#1D4ED8'}}>{o.order_id}</td>
                <td style={{padding:'10px 14px'}}>{o.txType==='purchase'?<><div style={{fontSize:13,fontWeight:700,color:'#10B981'}}>{fmtUSDT(o.amount_usdt)}</div><div style={{fontSize:11,color:'#6B7280'}}>{fmtINR(o.amount_inr)}</div></>:<><div style={{fontSize:13,fontWeight:700,color:'#F59E0B'}}>{fmtUSDT(o.amount_usdt)}</div><div style={{fontSize:11,color:'#6B7280'}}>Recv:{fmtUSDT(o.amount_after_fee)}</div></>}</td>
                <td style={{padding:'10px 14px',fontSize:12,color:'#6B7280'}}>{o.txType==='purchase'?`₹${o.rate_used}/USDT`:`Fee:${o.fee_usdt}`}</td>
                <td style={{padding:'10px 14px',fontSize:11,color:'#6B7280',maxWidth:120,overflow:'hidden',textOverflow:'ellipsis'}}>{o.txType==='purchase'?(o.utr_number||'—'):`${o.wallet_address?.substring(0,10)}...`}</td>
                <td style={{padding:'10px 14px'}}><StatusBadge s={o.status}/></td>
                <td style={{padding:'10px 14px',fontSize:11,color:'#9CA3AF',whiteSpace:'nowrap'}}>{fmtDateShort(o.created_at)}</td>
                <td style={{padding:'10px 14px'}}><Btn size="sm" variant="outline" onClick={()=>setSelected(o)}>View</Btn></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Modal open={!!selected} onClose={()=>setSelected(null)} title={`${selected?.txType==='purchase'?'Deposit':'Withdrawal'}: ${selected?.order_id}`}>
        {selected&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          {[['User',selected.users?.name],['Phone',selected.users?.phone],['Email',selected.users?.email],['Amount USDT',fmtUSDT(selected.amount_usdt)],selected.txType==='purchase'?['INR',fmtINR(selected.amount_inr)]:['After Fee',fmtUSDT(selected.amount_after_fee)],selected.txType==='purchase'?['Rate',`₹${selected.rate_used}`]:['Fee',`${selected.fee_usdt} USDT`],selected.txType==='purchase'?['UTR',selected.utr_number||'—']:['Wallet',selected.wallet_address],['Status',selected.status],['Date',fmtDate(selected.created_at)]].map(([l,v])=>(
            <div key={l}><div style={{fontSize:10,color:'#9CA3AF',fontWeight:700,textTransform:'uppercase',marginBottom:2}}>{l}</div><div style={{fontSize:13,fontWeight:600,wordBreak:'break-all'}}>{v||'—'}</div></div>
          ))}
          {selected.screenshot_url&&<div style={{gridColumn:'1/-1'}}><div style={{fontSize:10,color:'#9CA3AF',fontWeight:700,textTransform:'uppercase',marginBottom:8}}>Screenshot</div><img src={selected.screenshot_url} style={{width:'100%',borderRadius:10}}/></div>}
        </div>}
      </Modal>
    </div>
  );
}

// ── REFERRALS ──────────────────────────────────────────────────
function Referrals() {
  const [data,setData]=useState(null);
  const [search,setSearch]=useState('');
  const [searchInput,setSearchInput]=useState('');
  const [status,setStatus]=useState('');
  const [expanded,setExpanded]=useState({});
  const [showPwd,setShowPwd]=useState({});

  const load=async()=>{try{const r=await API.getReferrals(search,status);if(r.success)setData(r);}catch{}};
  useEffect(()=>{load();},[search,status]);

  const exportReferrals=()=>{
    if(!data) return;
    const rows=[];
    data.referrers.forEach(item=>{
      item.referredUsers.forEach(u=>{
        rows.push({'Referrer Name':item.referrer.name,'Referrer Phone':item.referrer.phone,'Referrer Email':item.referrer.email,'Referrer Balance':item.referrer.available_balance,'Referrer Commission Earned':item.totalCommissionEarned,'Referred Name':u.name,'Referred Phone':u.phone,'Referred Email':u.email,'Referred Password':u.password_plain||'—','Referred Joined':fmtDate(u.created_at),'Qualified (Deposited)':u.referral_commission_paid?'Yes':'No'});
      });
    });
    const ws=XLSX.utils.json_to_sheet(rows); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Referrals'); XLSX.writeFile(wb,`trc20-referrals-${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const s=data?.summary||{};

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:10}}>
        <div><h1 style={{fontSize:24,fontWeight:800}}>Referrals Audit</h1><p style={{color:'#6B7280',fontSize:13}}>Complete referral tree with all user data</p></div>
        <Btn variant="success" size="sm" onClick={exportReferrals}>⬇ Export Excel</Btn>
      </div>

      {/* Summary */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:14,marginBottom:20}}>
        {[['👥','Total Referrers',s.totalReferrers,'#1D4ED8'],['🔗','Total Referred',s.totalReferredUsers,'#7C3AED'],['✅','Qualified',s.totalQualified,'#10B981'],['⏳','Pending',s.totalPending,'#F59E0B'],['💰','Commission Paid',fmtUSDT(s.totalCommissionPaid),'#EC4899']].map(([icon,label,value,color])=>(
          <Card key={label} style={{padding:16}}>
            <div style={{fontSize:11,color:'#6B7280',fontWeight:600,marginBottom:6}}>{icon} {label}</div>
            <div style={{fontSize:20,fontWeight:800,color}}>{value}</div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}>
        <SearchBox value={searchInput} onChange={setSearchInput} onSearch={()=>setSearch(searchInput)} placeholder="Search referrer name, phone, email, user ID..."/>
        <select value={status} onChange={e=>setStatus(e.target.value)} style={{padding:'9px 12px',border:'1.5px solid #E5E7EB',borderRadius:10,fontSize:14}}>
          <option value="">All Status</option><option value="qualified">Has Qualified Referrals</option><option value="pending">None Qualified Yet</option>
        </select>
        <Btn variant="secondary" onClick={load}>↻ Refresh</Btn>
      </div>

      {!data?<div style={{padding:30,textAlign:'center'}}>Loading...</div>:
       data.referrers.length===0?<Card style={{textAlign:'center',padding:40,color:'#9CA3AF'}}>No referrals found</Card>:
       data.referrers.map((item,idx)=>(
        <Card key={idx} style={{marginBottom:12,padding:0,overflow:'hidden'}}>
          {/* Referrer Header */}
          <div style={{padding:'14px 18px',background:'#F8FAFF',borderBottom:'1px solid #E5E7EB',display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
            <div style={{flex:1,minWidth:200}}>
              <div style={{fontSize:15,fontWeight:800,color:'#111827'}}>{item.referrer.name}</div>
              <div style={{fontSize:12,color:'#6B7280'}}>{item.referrer.phone} · {item.referrer.email}</div>
              <div style={{fontSize:11,color:'#9CA3AF',marginTop:2}}>ID: {item.referrer.user_code} · Joined: {fmtDateShort(item.referrer.created_at)}</div>
            </div>
            <div style={{display:'flex',gap:20,flexWrap:'wrap'}}>
              <div style={{textAlign:'center'}}><div style={{fontSize:18,fontWeight:800,color:'#1D4ED8'}}>{item.totalReferred}</div><div style={{fontSize:10,color:'#6B7280'}}>Referred</div></div>
              <div style={{textAlign:'center'}}><div style={{fontSize:18,fontWeight:800,color:'#10B981'}}>{item.qualifiedCount}</div><div style={{fontSize:10,color:'#6B7280'}}>Qualified</div></div>
              <div style={{textAlign:'center'}}><div style={{fontSize:18,fontWeight:800,color:'#F59E0B'}}>{item.pendingCount}</div><div style={{fontSize:10,color:'#6B7280'}}>Pending</div></div>
              <div style={{textAlign:'center'}}><div style={{fontSize:18,fontWeight:800,color:'#EC4899'}}>{fmtUSDT(item.totalCommissionEarned)}</div><div style={{fontSize:10,color:'#6B7280'}}>Earned</div></div>
              <div style={{textAlign:'center'}}><div style={{fontSize:18,fontWeight:800,color:'#7C3AED'}}>{fmtUSDT(item.referrer.available_balance)}</div><div style={{fontSize:10,color:'#6B7280'}}>Balance</div></div>
            </div>
            <Btn size="sm" variant={expanded[idx]?'primary':'outline'} onClick={()=>setExpanded(p=>({...p,[idx]:!p[idx]}))}>
              {expanded[idx]?'▲ Hide':'▼ View Users'}
            </Btn>
          </div>

          {/* Referred Users List */}
          {expanded[idx]&&(
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',minWidth:800}}>
                <thead><tr style={{background:'#F9FAFB'}}>
                  {['Name','Phone','Email','Password','Balance','Joined','Status','Commission'].map(h=><th key={h} style={{textAlign:'left',padding:'8px 14px',fontSize:11,fontWeight:700,color:'#6B7280',textTransform:'uppercase'}}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {item.referredUsers.map((u,i)=>(
                    <tr key={i} style={{borderTop:'1px solid #F3F4F6',background:u.referral_commission_paid?'#F0FDF4':'#FFFBEB'}}>
                      <td style={{padding:'10px 14px',fontSize:13,fontWeight:600}}>{u.name}</td>
                      <td style={{padding:'10px 14px',fontSize:13}}>{u.phone}</td>
                      <td style={{padding:'10px 14px',fontSize:12,color:'#6B7280'}}>{u.email}</td>
                      <td style={{padding:'10px 14px',fontSize:13,fontFamily:'monospace',cursor:'pointer'}} onClick={()=>setShowPwd(p=>({...p,[u.id]:!p[u.id]}))}>
                        {showPwd[u.id]?(u.password_plain||'—'):<span style={{color:'#9CA3AF'}}>•••••• 👁</span>}
                      </td>
                      <td style={{padding:'10px 14px',fontSize:13,fontWeight:700,color:'#10B981'}}>{fmtUSDT(u.available_balance)}</td>
                      <td style={{padding:'10px 14px',fontSize:12,color:'#9CA3AF',whiteSpace:'nowrap'}}>{fmtDateShort(u.created_at)}</td>
                      <td style={{padding:'10px 14px'}}>
                        {u.referral_commission_paid
                          ?<span style={{background:'#D1FAE5',color:'#065F46',padding:'2px 10px',borderRadius:8,fontSize:12,fontWeight:700}}>✅ Qualified</span>
                          :<span style={{background:'#FEF3C7',color:'#92400E',padding:'2px 10px',borderRadius:8,fontSize:12,fontWeight:700}}>⏳ Pending</span>}
                      </td>
                      <td style={{padding:'10px 14px',fontSize:13,fontWeight:700,color:u.referral_commission_paid?'#EC4899':'#9CA3AF'}}>
                        {u.referral_commission_paid?`+5 USDT`:'—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
       ))
      }
    </div>
  );
}

// ── USERS ──────────────────────────────────────────────────
function Users() {
  const [users,setUsers]=useState([]);
  const [search,setSearch]=useState('');
  const [selected,setSelected]=useState(null);
  const [detail,setDetail]=useState(null);
  const [editBal,setEditBal]=useState('');
  const [adjustAmt,setAdjustAmt]=useState('');
  const [adjustReason,setAdjustReason]=useState('');
  const [newPwd,setNewPwd]=useState('');
  const [loading,setLoading]=useState(false);
  const [addOpen,setAddOpen]=useState(false);
  const [newUser,setNewUser]=useState({name:'',email:'',phone:'',password:'',availableBalance:'0'});
  const [showPwdId,setShowPwdId]=useState(null);

  const load=async(s=search)=>{try{const r=await API.getUsers(1,s);setUsers(r.users);}catch{}};
  useEffect(()=>{load();},[]);

  const viewUser=async(u)=>{setSelected(u);setAdjustAmt('');setAdjustReason('');setNewPwd('');try{const r=await API.getUserDetail(u.id);setDetail(r);setEditBal(u.available_balance);}catch{}};
  const saveUser=async()=>{ setLoading(true); try{const up={availableBalance:parseFloat(editBal)};if(newPwd.trim())up.newPassword=newPwd.trim();await API.updateUser(selected.id,up);alert('User updated!');load();setSelected(null);}catch(e){alert(e.message);} setLoading(false); };
  const applyAdj=async()=>{ if(!adjustAmt||parseFloat(adjustAmt)===0){alert('Enter amount');return;} setLoading(true); try{await API.updateUser(selected.id,{adjustAmount:parseFloat(adjustAmt),adjustReason});setAdjustAmt('');setAdjustReason('');load();viewUser(selected);}catch(e){alert(e.message);} setLoading(false); };
  const toggleBan=async(u)=>{try{await API.updateUser(u.id,{isBanned:!u.is_banned});load();}catch(e){alert(e.message);}};
  const handleDelete=async(u)=>{if(!confirm(`Permanently delete "${u.name}"?`))return;try{await API.deleteUser(u.id);load();setSelected(null);}catch(e){alert(e.message);}};
  const handleCreate=async()=>{ if(!newUser.name||!newUser.email||!newUser.phone||!newUser.password){alert('All fields required');return;} setLoading(true); try{await API.createUser(newUser);setAddOpen(false);setNewUser({name:'',email:'',phone:'',password:'',availableBalance:'0'});load();}catch(e){alert(e.message);} setLoading(false); };
  const handleExport=async()=>{try{const r=await API.exportAllUsers();const rows=r.users.map(u=>({'Name':u.name,'Phone':u.phone,'Email':u.email,'User ID':u.user_code,'Password':u.password_plain||'—','Balance':u.available_balance,'Registered':fmtDate(u.created_at),'Last Login':fmtDate(u.last_login),'Transactions':u.totalTransactions,'INR Deposited':u.totalInrDeposited,'USDT Bought':u.totalUsdtBought,'USDT Withdrawn':u.totalWithdrawn,'Status':u.is_banned?'Banned':'Active'}));const ws=XLSX.utils.json_to_sheet(rows);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Users');XLSX.writeFile(wb,`users-${new Date().toISOString().slice(0,10)}.xlsx`);}catch(e){alert(e.message);}};
  const handleClearOld=async()=>{if(!confirm('Clear rejected/expired orders older than 30 days?'))return;try{const r=await API.clearOldData();alert(r.message);}catch(e){alert(e.message);}};

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:10}}>
        <h1 style={{fontSize:24,fontWeight:800}}>Users</h1>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <Btn variant="primary" onClick={()=>setAddOpen(true)}>+ Add User</Btn>
          <Btn variant="success" onClick={handleExport}>⬇ Export Excel</Btn>
          <Btn variant="warning" onClick={handleClearOld}>🗑 Clear Old Data</Btn>
          <Btn variant="secondary" onClick={()=>load()}>↻ Refresh</Btn>
        </div>
      </div>
      <div style={{marginBottom:16}}><SearchBox value={search} onChange={setSearch} onSearch={()=>load(search)} placeholder="Search name, email, phone, user ID..."/></div>
      <Card style={{padding:0,overflow:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',minWidth:1200}}>
          <thead><tr style={{borderBottom:'2px solid #F3F4F6'}}>
            {['Name','Phone','User ID','Password','Balance','Registered','Status','Actions'].map(h=><th key={h} style={{textAlign:'left',padding:'10px 14px',fontSize:11,fontWeight:700,color:'#6B7280',textTransform:'uppercase',whiteSpace:'nowrap'}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {users.map(u=>(
              <tr key={u.id} style={{borderBottom:'1px solid #F9FAFB'}}>
                <td style={{padding:'10px 14px'}}><div style={{fontSize:14,fontWeight:600}}>{u.name}</div><div style={{fontSize:11,color:'#9CA3AF'}}>{u.email}</div></td>
                <td style={{padding:'10px 14px',fontSize:13}}>{u.phone}</td>
                <td style={{padding:'10px 14px',fontSize:13,fontWeight:700,color:'#1D4ED8'}}>{u.user_code}</td>
                <td style={{padding:'10px 14px',fontSize:13,fontFamily:'monospace',cursor:'pointer'}} onClick={()=>setShowPwdId(showPwdId===u.id?null:u.id)}>
                  {showPwdId===u.id?(u.password_plain||'—'):<span style={{color:'#9CA3AF'}}>•••••• 👁</span>}
                </td>
                <td style={{padding:'10px 14px',fontSize:14,fontWeight:700,color:'#10B981'}}>{fmtUSDT(u.available_balance)}</td>
                <td style={{padding:'10px 14px',fontSize:12,color:'#9CA3AF',whiteSpace:'nowrap'}}>{fmtDateShort(u.created_at)}</td>
                <td style={{padding:'10px 14px'}}>{u.is_banned?<span style={{background:'#FEE2E2',color:'#991B1B',padding:'2px 10px',borderRadius:8,fontSize:12,fontWeight:700}}>Banned</span>:<span style={{background:'#D1FAE5',color:'#065F46',padding:'2px 10px',borderRadius:8,fontSize:12,fontWeight:700}}>Active</span>}</td>
                <td style={{padding:'10px 14px'}}><div style={{display:'flex',gap:6}}><Btn size="sm" variant="outline" onClick={()=>viewUser(u)}>Edit</Btn><Btn size="sm" variant={u.is_banned?'success':'danger'} onClick={()=>toggleBan(u)}>{u.is_banned?'Unban':'Ban'}</Btn><Btn size="sm" variant="danger" onClick={()=>handleDelete(u)}>Del</Btn></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={addOpen} onClose={()=>setAddOpen(false)} title="Add New User">
        <Input label="Name" value={newUser.name} onChange={e=>setNewUser(p=>({...p,name:e.target.value}))}/>
        <Input label="Email" value={newUser.email} onChange={e=>setNewUser(p=>({...p,email:e.target.value}))}/>
        <Input label="Phone" value={newUser.phone} onChange={e=>setNewUser(p=>({...p,phone:e.target.value}))}/>
        <Input label="Password" value={newUser.password} onChange={e=>setNewUser(p=>({...p,password:e.target.value}))}/>
        <Input label="Starting Balance (USDT)" type="number" value={newUser.availableBalance} onChange={e=>setNewUser(p=>({...p,availableBalance:e.target.value}))}/>
        <Btn onClick={handleCreate} disabled={loading} size="lg" style={{width:'100%'}}>{loading?'Creating...':'+ Create User'}</Btn>
      </Modal>

      <Modal open={!!selected} onClose={()=>{setSelected(null);setDetail(null);}} title={`Edit: ${selected?.name}`} wide>
        {selected&&(
          <div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,background:'#F9FAFB',borderRadius:12,padding:14,marginBottom:18}}>
              {[['Name',selected.name],['Email',selected.email],['Phone',selected.phone],['User ID',selected.user_code],['Referral Code',selected.referral_code],['Joined',fmtDate(selected.created_at)],['Last Login',selected.last_login?fmtDate(selected.last_login):'Never'],['Password',selected.password_plain||'—']].map(([l,v])=>(
                <div key={l}><div style={{fontSize:10,color:'#9CA3AF',fontWeight:700,textTransform:'uppercase',marginBottom:2}}>{l}</div><div style={{fontSize:13,fontWeight:600,wordBreak:'break-all'}}>{v}</div></div>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
              <div>
                <h4 style={{fontSize:14,fontWeight:700,marginBottom:10}}>Set Balance</h4>
                <Input label="Exact Balance (USDT)" type="number" value={editBal} onChange={e=>setEditBal(e.target.value)}/>
                <Input label="New Password (blank = keep)" type="text" value={newPwd} onChange={e=>setNewPwd(e.target.value)}/>
                <Btn onClick={saveUser} disabled={loading} style={{width:'100%'}}>{loading?'Saving...':'💾 Save'}</Btn>
              </div>
              <div>
                <h4 style={{fontSize:14,fontWeight:700,marginBottom:10}}>Quick Adjust</h4>
                <Input label="Amount (negative to subtract)" type="number" value={adjustAmt} onChange={e=>setAdjustAmt(e.target.value)} placeholder="e.g. 50 or -20"/>
                <Input label="Reason" value={adjustReason} onChange={e=>setAdjustReason(e.target.value)} placeholder="Bonus, correction..."/>
                <Btn variant="success" onClick={applyAdj} disabled={loading} style={{width:'100%'}}>⚡ Apply Adjustment</Btn>
              </div>
            </div>
            {detail&&<div style={{marginTop:20}}>
              <div style={{fontSize:14,fontWeight:700,marginBottom:8}}>Recent Purchases ({detail.purchases?.length||0})</div>
              {(detail.purchases||[]).slice(0,4).map(o=><div key={o.id} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #F3F4F6',fontSize:13}}><span style={{color:'#6B7280'}}>{o.order_id}</span><span style={{fontWeight:700,color:'#10B981'}}>{fmtUSDT(o.amount_usdt)}</span><StatusBadge s={o.status}/></div>)}
            </div>}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── SETTINGS ──────────────────────────────────────────────────
function Settings() {
  const [s,setS]=useState(null);
  const [methods,setMethods]=useState([]);
  const [loading,setLoading]=useState(false);
  const [uploadingQr,setUploadingQr]=useState(false);
  const [addMethod,setAddMethod]=useState(false);
  const [newMethod,setNewMethod]=useState({name:'',type:'upi',upiId:'',bankName:'',accountNumber:'',ifscCode:'',accountHolder:'',qrImageUrl:''});
  const fileInputRef=useRef(null);

  useEffect(()=>{loadSettings();},[]);
  const loadSettings=async()=>{try{const r=await API.getSettings();setS(r.settings);setMethods(r.paymentMethods||[]);}catch{}};

  const save=async()=>{ setLoading(true); try{await API.updateSettings({usdt_buy_rate:parseFloat(s.usdt_buy_rate),usdt_market_rate:parseFloat(s.usdt_market_rate),min_buy_inr:parseFloat(s.min_buy_inr),max_buy_inr:parseFloat(s.max_buy_inr),min_withdraw_usdt:parseFloat(s.min_withdraw_usdt),max_withdraw_usdt:parseFloat(s.max_withdraw_usdt),withdrawal_fee:parseFloat(s.withdrawal_fee),free_withdrawals_count:parseInt(s.free_withdrawals_count),network_fee_inr:parseFloat(s.network_fee_inr||0),support_whatsapp:s.support_whatsapp,support_telegram:s.support_telegram,telegram_support:s.telegram_support,is_maintenance:s.is_maintenance,maintenance_message:s.maintenance_message,pause_deposits:s.pause_deposits,pause_withdrawals:s.pause_withdrawals,admin_upi_id:s.admin_upi_id,referral_commission_usdt:parseFloat(s.referral_commission_usdt||5),referral_min_deposit_inr:parseFloat(s.referral_min_deposit_inr||10000),referral_terms:s.referral_terms||''});alert('Settings saved!');}catch(e){alert(e.message);} setLoading(false); };
  const handleQrUpload=async(e)=>{ const file=e.target.files[0];if(!file)return;setUploadingQr(true);try{const r=await API.uploadQR(file);setS(p=>({...p,admin_qr_url:r.url}));alert('QR uploaded! Save settings.');}catch(err){alert(err.message);}setUploadingQr(false); };
  const addPM=async()=>{try{await API.addPaymentMethod(newMethod);loadSettings();setAddMethod(false);}catch(e){alert(e.message);}};
  const togglePM=async(m)=>{try{await API.updatePaymentMethod(m.id,{isActive:!m.is_active});loadSettings();}catch(e){alert(e.message);}};
  const deletePM=async(id)=>{if(!confirm('Delete?'))return;try{await API.deletePaymentMethod(id);loadSettings();}catch(e){alert(e.message);}};

  if(!s) return <div style={{padding:32,textAlign:'center'}}>Loading...</div>;
  const F=({label,field,type='text'})=>(<div style={{marginBottom:14}}><label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:5}}>{label}</label><input type={type} value={s[field]||''} onChange={e=>setS(p=>({...p,[field]:e.target.value}))} style={{width:'100%',padding:'9px 13px',border:'1.5px solid #E5E7EB',borderRadius:10,fontSize:14,boxSizing:'border-box'}}/></div>);
  const Toggle=({label,field,danger})=>(<div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14,padding:'10px 14px',background:s[field]?(danger?'#FEE2E2':'#FEF3C7'):'#F9FAFB',borderRadius:10}}><input type="checkbox" checked={s[field]||false} onChange={e=>setS(p=>({...p,[field]:e.target.checked}))} style={{width:18,height:18,cursor:'pointer'}}/><span style={{fontSize:14,fontWeight:600,flex:1}}>{label}</span><span style={{fontSize:12,fontWeight:700,color:s[field]?(danger?'#EF4444':'#D97706'):'#10B981'}}>{s[field]?'ON':'OFF'}</span></div>);

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24,flexWrap:'wrap',gap:10}}>
        <h1 style={{fontSize:24,fontWeight:800}}>Settings</h1>
        <Btn onClick={save} disabled={loading} size="lg">{loading?'Saving...':'💾 Save All Settings'}</Btn>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>
        <Card><h3 style={{fontSize:16,fontWeight:700,marginBottom:18}}>💹 USDT Rates</h3><F label="Buy Rate (₹/USDT — what users pay)" field="usdt_buy_rate" type="number"/><F label="Market Rate (₹/USDT — reference)" field="usdt_market_rate" type="number"/><div style={{background:'#EFF6FF',borderRadius:10,padding:12,fontSize:13,color:'#1E40AF'}}>💡 ₹{s.min_buy_inr} → {(parseFloat(s.min_buy_inr||0)/parseFloat(s.usdt_buy_rate||1)).toFixed(2)} USDT</div></Card>
        <Card><h3 style={{fontSize:16,fontWeight:700,marginBottom:18}}>🛒 Limits & Fees</h3><F label="Min Purchase (₹)" field="min_buy_inr" type="number"/><F label="Max Purchase (₹)" field="max_buy_inr" type="number"/><F label="Min Withdrawal (USDT)" field="min_withdraw_usdt" type="number"/><F label="Max Withdrawal (USDT)" field="max_withdraw_usdt" type="number"/><F label="Withdrawal Fee (USDT)" field="withdrawal_fee" type="number"/><F label="Free Withdrawals Count" field="free_withdrawals_count" type="number"/></Card>
        <Card><h3 style={{fontSize:16,fontWeight:700,marginBottom:18}}>💳 Payment Details</h3><F label="Your UPI ID" field="admin_upi_id"/><div style={{marginBottom:14}}><label style={{display:'block',fontSize:13,fontWeight:600,marginBottom:8}}>QR Code Image</label>{s.admin_qr_url&&<img src={s.admin_qr_url} alt="QR" style={{width:120,height:120,borderRadius:10,border:'1px solid #E5E7EB',marginBottom:10,display:'block'}}/>}<input ref={fileInputRef} type="file" accept="image/*" onChange={handleQrUpload} style={{display:'none'}}/><Btn variant="outline" onClick={()=>fileInputRef.current.click()} disabled={uploadingQr}>{uploadingQr?'Uploading...':s.admin_qr_url?'📷 Replace QR':'📷 Upload QR'}</Btn></div></Card>
        <Card><h3 style={{fontSize:16,fontWeight:700,marginBottom:18}}>🔧 Platform Controls</h3><Toggle label="Maintenance Mode" field="is_maintenance" danger/><Toggle label="Pause All Deposits" field="pause_deposits"/><Toggle label="Pause All Withdrawals" field="pause_withdrawals"/><F label="Maintenance Message" field="maintenance_message"/></Card>
        <Card><h3 style={{fontSize:16,fontWeight:700,marginBottom:18}}>🎁 Referral System</h3><F label="Commission per Referral (USDT)" field="referral_commission_usdt" type="number"/><F label="Min Deposit to Qualify (₹ INR)" field="referral_min_deposit_inr" type="number"/><div style={{marginBottom:14}}><label style={{display:'block',fontSize:13,fontWeight:600,marginBottom:5}}>Referral Terms</label><textarea value={s.referral_terms||''} onChange={e=>setS(p=>({...p,referral_terms:e.target.value}))} rows={3} style={{width:'100%',padding:'9px 13px',border:'1.5px solid #E5E7EB',borderRadius:10,fontSize:14,resize:'vertical',boxSizing:'border-box'}}/></div><div style={{background:'#EFF6FF',borderRadius:10,padding:12,fontSize:13,color:'#1E40AF'}}>💡 Currently: {s.referral_commission_usdt} USDT per referral with min ₹{s.referral_min_deposit_inr} deposit</div></Card>
        <Card><h3 style={{fontSize:16,fontWeight:700,marginBottom:18}}>💬 Support</h3><F label="Telegram Support (username or link)" field="telegram_support"/><F label="WhatsApp Number (optional)" field="support_whatsapp"/></Card>
      </div>

      <Card>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
          <h3 style={{fontSize:16,fontWeight:700}}>💳 Payment Methods</h3>
          <Btn onClick={()=>setAddMethod(true)} size="sm">+ Add</Btn>
        </div>
        {methods.length===0&&<p style={{color:'#9CA3AF',textAlign:'center',padding:20}}>No payment methods added yet.</p>}
        {methods.map(m=>(
          <div key={m.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:14,border:'1.5px solid #E5E7EB',borderRadius:12,marginBottom:10,flexWrap:'wrap',gap:10}}>
            <div><div style={{fontSize:14,fontWeight:700}}>{m.name} <span style={{fontSize:11,color:'#6B7280',background:'#F3F4F6',padding:'2px 8px',borderRadius:6,marginLeft:6}}>{m.type.toUpperCase()}</span></div>{m.upi_id&&<div style={{fontSize:13,color:'#1D4ED8',marginTop:2}}>{m.upi_id}</div>}{m.bank_name&&<div style={{fontSize:12,color:'#6B7280',marginTop:2}}>{m.bank_name}·{m.account_number}</div>}</div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}><span style={{fontSize:12,fontWeight:700,color:m.is_active?'#10B981':'#EF4444'}}>{m.is_active?'Active':'Off'}</span><Btn size="sm" variant={m.is_active?'secondary':'success'} onClick={()=>togglePM(m)}>{m.is_active?'Disable':'Enable'}</Btn><Btn size="sm" variant="danger" onClick={()=>deletePM(m.id)}>Del</Btn></div>
          </div>
        ))}
      </Card>

      <Modal open={addMethod} onClose={()=>setAddMethod(false)} title="Add Payment Method">
        <Input label="Name" value={newMethod.name} onChange={e=>setNewMethod(p=>({...p,name:e.target.value}))} placeholder="e.g. Main UPI"/>
        <div style={{marginBottom:14}}><label style={{display:'block',fontSize:13,fontWeight:600,marginBottom:5}}>Type</label><select value={newMethod.type} onChange={e=>setNewMethod(p=>({...p,type:e.target.value}))} style={{width:'100%',padding:'9px 13px',border:'1.5px solid #E5E7EB',borderRadius:10,fontSize:14}}><option value="upi">UPI</option><option value="bank">Bank Account</option><option value="qr">QR Code</option></select></div>
        {newMethod.type==='upi'&&<Input label="UPI ID" value={newMethod.upiId} onChange={e=>setNewMethod(p=>({...p,upiId:e.target.value}))} placeholder="name@upi"/>}
        {newMethod.type==='bank'&&<><Input label="Bank Name" value={newMethod.bankName} onChange={e=>setNewMethod(p=>({...p,bankName:e.target.value}))}/><Input label="Account Number" value={newMethod.accountNumber} onChange={e=>setNewMethod(p=>({...p,accountNumber:e.target.value}))}/><Input label="IFSC" value={newMethod.ifscCode} onChange={e=>setNewMethod(p=>({...p,ifscCode:e.target.value}))}/><Input label="Account Holder" value={newMethod.accountHolder} onChange={e=>setNewMethod(p=>({...p,accountHolder:e.target.value}))}/></>}
        <Btn onClick={addPM} size="lg" style={{width:'100%',marginTop:8}}>Add Payment Method</Btn>
      </Modal>
    </div>
  );
}

function Layout({children}) {
  return (
    <div style={{display:'flex',minHeight:'100vh'}}>
      <Sidebar/>
      <div style={{flex:1,padding:32,overflowY:'auto',minWidth:0}}>{children}</div>
    </div>
  );
}

export default function App() {
  const [token,setToken]=useState(localStorage.getItem('admin_token'));
  const logout=()=>{localStorage.removeItem('admin_token');localStorage.removeItem('admin_user');setToken(null);};
  return (
    <AuthCtx.Provider value={{token,setToken,logout}}>
      <BrowserRouter>
        {!token?<Login/>:(
          <Layout>
            <Routes>
              <Route path="/" element={<Navigate to="/overview"/>}/>
              <Route path="/overview" element={<Overview/>}/>
              <Route path="/analytics" element={<Analytics/>}/>
              <Route path="/purchases" element={<Purchases/>}/>
              <Route path="/withdrawals" element={<Withdrawals/>}/>
              <Route path="/transactions" element={<Transactions/>}/>
              <Route path="/users" element={<Users/>}/>
              <Route path="/referrals" element={<Referrals/>}/>
              <Route path="/settings" element={<Settings/>}/>
            </Routes>
          </Layout>
        )}
      </BrowserRouter>
    </AuthCtx.Provider>
  );
}
