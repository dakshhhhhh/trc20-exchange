import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import * as XLSX from 'xlsx';
import * as API from './api';

const AuthCtx = createContext(null);
const useAdmin = () => useContext(AuthCtx);

// ── HELPERS ──────────────────────────────────────────────────
const fmtDate = d => d ? new Date(d).toLocaleString('en-IN') : '—';
const fmtDateShort = d => d ? new Date(d).toLocaleDateString('en-IN') : '—';
const fmtINR = n => `₹${parseFloat(n||0).toLocaleString('en-IN', {maximumFractionDigits:2})}`;
const fmtUSDT = n => `$${parseFloat(n||0).toFixed(2)}`;

const StatusBadge = ({ s }) => {
  const M = { pending:{bg:'#FEF3C7',c:'#92400E'}, processing:{bg:'#DBEAFE',c:'#1E40AF'},
    approved:{bg:'#D1FAE5',c:'#065F46'}, rejected:{bg:'#FEE2E2',c:'#991B1B'}, expired:{bg:'#F3F4F6',c:'#6B7280'} };
  const m = M[s] || M.pending;
  return <span style={{background:m.bg,color:m.c,padding:'2px 10px',borderRadius:8,fontSize:12,fontWeight:700,textTransform:'capitalize',whiteSpace:'nowrap'}}>{s}</span>;
};

const Card = ({ children, style = {} }) => (
  <div style={{background:'#fff',borderRadius:16,padding:24,boxShadow:'0 2px 12px rgba(0,0,0,.06)',...style}}>{children}</div>
);

const Btn = ({ onClick, children, variant = 'primary', size = 'md', disabled = false, style = {} }) => {
  const V = { primary:{bg:'#1D4ED8',c:'#fff'}, success:{bg:'#10B981',c:'#fff'}, danger:{bg:'#EF4444',c:'#fff'}, secondary:{bg:'#F3F4F6',c:'#374151'}, outline:{bg:'#fff',c:'#1D4ED8',border:'1px solid #1D4ED8'}, warning:{bg:'#F59E0B',c:'#fff'} };
  const S = { sm:{padding:'5px 12px',fontSize:12}, md:{padding:'8px 18px',fontSize:14}, lg:{padding:'12px 28px',fontSize:16} };
  const v = V[variant] || V.primary; const s = S[size];
  return (
    <button onClick={onClick} disabled={disabled} style={{background:v.bg,color:v.c,border:v.border||'none',borderRadius:10,fontWeight:600,cursor:disabled?'not-allowed':'pointer',opacity:disabled?.6:1,whiteSpace:'nowrap',...s,...style}}>
      {children}
    </button>
  );
};

const Input = ({ label, ...p }) => (
  <div style={{marginBottom:14}}>
    {label && <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:5}}>{label}</label>}
    <input style={{width:'100%',padding:'9px 13px',border:'1.5px solid #E5E7EB',borderRadius:10,fontSize:14,outline:'none',boxSizing:'border-box'}} {...p} />
  </div>
);

const Modal = ({ open, onClose, title, children, wide }) => {
  if (!open) return null;
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:20,padding:28,width:'100%',maxWidth:wide?720:480,maxHeight:'85vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <h3 style={{fontSize:18,fontWeight:700}}>{title}</h3>
          <button onClick={onClose} style={{fontSize:22,background:'none',border:'none',cursor:'pointer',color:'#6B7280'}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

const SearchBox = ({ value, onChange, onSearch, placeholder }) => (
  <div style={{display:'flex',gap:8}}>
    <input value={value} onChange={e=>onChange(e.target.value)} onKeyDown={e=>e.key==='Enter'&&onSearch()}
      placeholder={placeholder || 'Search by name, phone, email, order ID...'}
      style={{padding:'9px 14px',border:'1.5px solid #E5E7EB',borderRadius:10,fontSize:14,width:320}} />
    <Btn onClick={onSearch}>🔍 Search</Btn>
  </div>
);

// ── LOGIN ──────────────────────────────────────────────────
function Login() {
  const { setToken } = useAdmin();
  const [f, setF] = useState({ u: '', p: '' });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    setLoading(true); setErr('');
    try {
      const d = await API.adminLogin(f.u, f.p);
      localStorage.setItem('admin_token', d.token);
      localStorage.setItem('admin_user', JSON.stringify(d.admin));
      setToken(d.token);
    } catch(e) { setErr(e.message); }
    setLoading(false);
  };

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg,#1E3A8A,#1D4ED8)'}}>
      <Card style={{width:380,borderRadius:24}}>
        <div style={{textAlign:'center',marginBottom:28}}>
          <div style={{width:56,height:56,borderRadius:16,background:'#1D4ED8',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',fontSize:24,color:'#fff'}}>⟨⟩</div>
          <h2 style={{fontSize:22,fontWeight:800,color:'#111827'}}>TRC20 Admin</h2>
          <p style={{color:'#6B7280',fontSize:13,marginTop:4}}>Sign in to control panel</p>
        </div>
        {err && <div style={{background:'#FEE2E2',color:'#991B1B',padding:'10px 14px',borderRadius:10,marginBottom:16,fontSize:13}}>{err}</div>}
        <Input label="Username" value={f.u} onChange={e=>setF(p=>({...p,u:e.target.value}))} placeholder="admin" />
        <Input label="Password" type="password" value={f.p} onChange={e=>setF(p=>({...p,p:e.target.value}))} placeholder="••••••••" onKeyDown={e=>e.key==='Enter'&&submit()} />
        <Btn onClick={submit} disabled={loading} size="lg" style={{width:'100%',marginTop:8}}>
          {loading ? 'Signing in...' : 'Sign In'}
        </Btn>
      </Card>
    </div>
  );
}

// ── SIDEBAR ──────────────────────────────────────────────────
const NAV = [
  { path: '/overview', icon: '📊', label: 'Overview' },
  { path: '/transactions', icon: '🔍', label: 'Transactions' },
  { path: '/purchases', icon: '📥', label: 'Purchases' },
  { path: '/withdrawals', icon: '📤', label: 'Withdrawals' },
  { path: '/users', icon: '👥', label: 'Users' },
  { path: '/settings', icon: '⚙️', label: 'Settings' },
];

function Sidebar() {
  const loc = useLocation();
  const { logout } = useAdmin();
  return (
    <div style={{width:220,minHeight:'100vh',background:'linear-gradient(180deg,#1E3A8A,#1B3080)',color:'#fff',display:'flex',flexDirection:'column',flexShrink:0,position:'sticky',top:0,height:'100vh',overflowY:'auto'}}>
      <div style={{padding:'24px 20px 20px',borderBottom:'1px solid rgba(255,255,255,.1)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:38,height:38,borderRadius:10,background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>⟨⟩</div>
          <div>
            <div style={{fontWeight:800,fontSize:16}}>TRC20</div>
            <div style={{fontSize:11,opacity:.6}}>Admin Panel</div>
          </div>
        </div>
      </div>
      <nav style={{padding:'16px 12px',flex:1}}>
        {NAV.map(n => (
          <Link key={n.path} to={n.path} style={{textDecoration:'none'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,marginBottom:4,background:loc.pathname===n.path?'rgba(255,255,255,.15)':'transparent',color:'#fff',fontSize:14,fontWeight:loc.pathname===n.path?700:400,opacity:loc.pathname===n.path?1:.8,transition:'all .15s'}}>
              <span style={{fontSize:18}}>{n.icon}</span> {n.label}
            </div>
          </Link>
        ))}
      </nav>
      <div style={{padding:'16px 12px',borderTop:'1px solid rgba(255,255,255,.1)'}}>
        <button onClick={logout} style={{width:'100%',background:'rgba(255,255,255,.1)',color:'#fff',border:'none',borderRadius:10,padding:'10px',fontSize:14,cursor:'pointer',fontWeight:500}}>
          → Sign Out
        </button>
      </div>
    </div>
  );
}

// ── OVERVIEW ──────────────────────────────────────────────────
function Overview() {
  const [d, setD] = useState(null);
  useEffect(() => {
    getDash();
    const interval = setInterval(getDash, 30000); // auto-reload every 30s
    return () => clearInterval(interval);
  }, []);
  const getDash = async () => { try { const r = await API.getDashboard(); setD(r); } catch {} };

  if (!d) return <div style={{padding:32,textAlign:'center'}}>Loading...</div>;
  const { stats, recentOrders, recentWithdrawals } = d;

  const StatCard = ({ icon, label, value, color = '#1D4ED8', big }) => (
    <Card style={{padding:18}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div>
          <div style={{fontSize:big?26:22,fontWeight:800,color}}>{value}</div>
          <div style={{fontSize:12,color:'#6B7280',marginTop:4}}>{label}</div>
        </div>
        <div style={{fontSize:22}}>{icon}</div>
      </div>
    </Card>
  );

  return (
    <div>
      <h1 style={{fontSize:24,fontWeight:800,marginBottom:6}}>Overview</h1>
      <p style={{color:'#6B7280',fontSize:13,marginBottom:24}}>Full snapshot of your platform's activity</p>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:14,marginBottom:16}}>
        <StatCard icon="👥" label="Total Users" value={stats.totalUsers} big />
        <StatCard icon="🆕" label="New Users Today" value={stats.newUsersToday} color="#10B981" />
        <StatCard icon="🚫" label="Banned Users" value={stats.bannedUsers} color="#EF4444" />
        <StatCard icon="🎫" label="Pending Tickets" value={stats.pendingTickets} color="#F59E0B" big />
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:14,marginBottom:16}}>
        <StatCard icon="📥" label="Pending Deposits" value={stats.pendingPurchases} color="#F59E0B" />
        <StatCard icon="📤" label="Pending Withdrawals" value={stats.pendingWithdrawals} color="#F59E0B" />
        <StatCard icon="✅" label="Approved Deposits" value={stats.approvedPurchases} color="#10B981" />
        <StatCard icon="✅" label="Approved Withdrawals" value={stats.approvedWithdrawalsCount} color="#10B981" />
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:14,marginBottom:28}}>
        <StatCard icon="💰" label="Total INR Deposited (volume)" value={fmtINR(stats.totalRevenue)} color="#1D4ED8" big />
        <StatCard icon="💵" label="Total USDT Sold" value={fmtUSDT(stats.totalUsdtSold)} color="#1D4ED8" big />
        <StatCard icon="🏦" label="Total USDT Withdrawn" value={fmtUSDT(stats.totalUsdtWithdrawn)} color="#1D4ED8" big />
        <StatCard icon="🪙" label="Total User Balances (liability)" value={fmtUSDT(stats.totalUserBalances)} color="#7C3AED" big />
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
        <Card>
          <h3 style={{fontSize:16,fontWeight:700,marginBottom:16}}>Recent Purchases</h3>
          {recentOrders.slice(0,8).map(o => (
            <div key={o.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid #F3F4F6'}}>
              <div>
                <div style={{fontSize:13,fontWeight:600}}>{o.users?.name || '—'}</div>
                <div style={{fontSize:11,color:'#9CA3AF'}}>{o.order_id}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:13,fontWeight:700,color:'#10B981'}}>{fmtUSDT(o.amount_usdt)}</div>
                <StatusBadge s={o.status} />
              </div>
            </div>
          ))}
        </Card>
        <Card>
          <h3 style={{fontSize:16,fontWeight:700,marginBottom:16}}>Recent Withdrawals</h3>
          {recentWithdrawals.slice(0,8).map(o => (
            <div key={o.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid #F3F4F6'}}>
              <div>
                <div style={{fontSize:13,fontWeight:600}}>{o.users?.name || '—'}</div>
                <div style={{fontSize:11,color:'#9CA3AF'}}>{o.order_id}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:13,fontWeight:700,color:'#F59E0B'}}>{fmtUSDT(o.amount_usdt)}</div>
                <StatusBadge s={o.status} />
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ── TRANSACTIONS (combined audit page) ──────────────────────────────────────────────────
function Transactions() {
  const [txs, setTxs] = useState([]);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await API.getTransactions({ search, type, status, page: 1, limit: 100 });
      setTxs(r.transactions); setTotal(r.total);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [search, type, status]);

  return (
    <div>
      <h1 style={{fontSize:24,fontWeight:800,marginBottom:6}}>Transactions</h1>
      <p style={{color:'#6B7280',fontSize:13,marginBottom:20}}>Audit every deposit and withdrawal across all users — {total} total</p>

      <div style={{display:'flex',gap:10,marginBottom:18,flexWrap:'wrap',alignItems:'center'}}>
        <SearchBox value={searchInput} onChange={setSearchInput} onSearch={()=>setSearch(searchInput)} placeholder="Search name, phone, email, order ID, UTR, wallet..." />
        <select value={type} onChange={e=>setType(e.target.value)} style={{padding:'9px 12px',border:'1.5px solid #E5E7EB',borderRadius:10,fontSize:14}}>
          <option value="">All Types</option>
          <option value="purchase">Deposits Only</option>
          <option value="withdrawal">Withdrawals Only</option>
        </select>
        <select value={status} onChange={e=>setStatus(e.target.value)} style={{padding:'9px 12px',border:'1.5px solid #E5E7EB',borderRadius:10,fontSize:14}}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="expired">Expired</option>
        </select>
        <Btn variant="secondary" onClick={load}>↻ Refresh</Btn>
      </div>

      <Card style={{padding:0,overflow:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',minWidth:1100}}>
          <thead>
            <tr style={{borderBottom:'2px solid #F3F4F6'}}>
              {['Type','User','Order ID','Amount','Rate/Fee','UTR / Wallet','Status','Date','Action'].map(h=>(
                <th key={h} style={{textAlign:'left',padding:'10px 14px',fontSize:11,fontWeight:700,color:'#6B7280',textTransform:'uppercase',whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={9} style={{textAlign:'center',padding:30,color:'#9CA3AF'}}>Loading...</td></tr> :
             txs.length===0 ? <tr><td colSpan={9} style={{textAlign:'center',padding:30,color:'#9CA3AF'}}>No transactions found</td></tr> :
             txs.map(o=>(
              <tr key={o.id} style={{borderBottom:'1px solid #F9FAFB'}}>
                <td style={{padding:'10px 14px'}}>
                  {o.txType==='purchase'
                    ? <span style={{background:'#DBEAFE',color:'#1E40AF',padding:'2px 8px',borderRadius:6,fontSize:11,fontWeight:700}}>↓ Deposit</span>
                    : <span style={{background:'#FEF3C7',color:'#92400E',padding:'2px 8px',borderRadius:6,fontSize:11,fontWeight:700}}>↑ Withdraw</span>}
                </td>
                <td style={{padding:'10px 14px'}}>
                  <div style={{fontSize:13,fontWeight:600}}>{o.users?.name||'—'}</div>
                  <div style={{fontSize:11,color:'#9CA3AF'}}>{o.users?.phone}</div>
                </td>
                <td style={{padding:'10px 14px',fontSize:12,fontWeight:600,color:'#1D4ED8'}}>{o.order_id}</td>
                <td style={{padding:'10px 14px'}}>
                  {o.txType==='purchase' ? (
                    <>
                      <div style={{fontSize:13,fontWeight:700,color:'#10B981'}}>{fmtUSDT(o.amount_usdt)}</div>
                      <div style={{fontSize:11,color:'#6B7280'}}>{fmtINR(o.amount_inr)}</div>
                    </>
                  ) : (
                    <>
                      <div style={{fontSize:13,fontWeight:700,color:'#F59E0B'}}>{fmtUSDT(o.amount_usdt)}</div>
                      <div style={{fontSize:11,color:'#6B7280'}}>Recv: {fmtUSDT(o.amount_after_fee)}</div>
                    </>
                  )}
                </td>
                <td style={{padding:'10px 14px',fontSize:12,color:'#6B7280'}}>
                  {o.txType==='purchase' ? `₹${o.rate_used}/USDT` : `Fee: ${o.fee_usdt} USDT`}
                </td>
                <td style={{padding:'10px 14px',fontSize:11,color:'#6B7280',maxWidth:140,overflow:'hidden',textOverflow:'ellipsis'}}>
                  {o.txType==='purchase' ? (o.utr_number||'—') : `${o.wallet_address?.substring(0,10)}...`}
                </td>
                <td style={{padding:'10px 14px'}}><StatusBadge s={o.status} /></td>
                <td style={{padding:'10px 14px',fontSize:11,color:'#9CA3AF',whiteSpace:'nowrap'}}>{fmtDateShort(o.created_at)}</td>
                <td style={{padding:'10px 14px'}}><Btn size="sm" variant="outline" onClick={()=>setSelected(o)}>View</Btn></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={!!selected} onClose={()=>setSelected(null)} title={`${selected?.txType==='purchase'?'Deposit':'Withdrawal'}: ${selected?.order_id}`}>
        {selected && (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            {[
              ['User',selected.users?.name],['Phone',selected.users?.phone],['Email',selected.users?.email],
              ['Amount USDT',fmtUSDT(selected.amount_usdt)],
              selected.txType==='purchase' ? ['Amount INR',fmtINR(selected.amount_inr)] : ['Amount After Fee',fmtUSDT(selected.amount_after_fee)],
              selected.txType==='purchase' ? ['Rate Used',`₹${selected.rate_used}`] : ['Fee',`${selected.fee_usdt} USDT`],
              selected.txType==='purchase' ? ['UTR Number',selected.utr_number||'—'] : ['Wallet Address',selected.wallet_address],
              ['Status',selected.status],['Created',fmtDate(selected.created_at)]
            ].map(([l,v])=>(
              <div key={l}>
                <div style={{fontSize:10,color:'#9CA3AF',fontWeight:700,textTransform:'uppercase',marginBottom:2}}>{l}</div>
                <div style={{fontSize:13,fontWeight:600,wordBreak:'break-all'}}>{v||'—'}</div>
              </div>
            ))}
            {selected.screenshot_url && (
              <div style={{gridColumn:'1/-1'}}>
                <div style={{fontSize:10,color:'#9CA3AF',fontWeight:700,textTransform:'uppercase',marginBottom:8}}>Screenshot</div>
                <img src={selected.screenshot_url} style={{width:'100%',borderRadius:10}} />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── PURCHASES ──────────────────────────────────────────────────
function Purchases() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => { try { const r = await API.getPurchases(1, filter, search); setOrders(r.orders); } catch {} };
  useEffect(() => { load(); }, [filter, search]);

  const approve = async (id) => {
    setLoading(true);
    try { await API.approvePurchase(id, note); setSelected(null); setNote(''); load(); } catch(e) { alert(e.message); }
    setLoading(false);
  };
  const reject = async (id) => {
    if (!note.trim()) { alert('Please enter a reason'); return; }
    setLoading(true);
    try { await API.rejectPurchase(id, note); setSelected(null); setNote(''); load(); } catch(e) { alert(e.message); }
    setLoading(false);
  };

  const FILTERS = ['', 'pending', 'processing', 'approved', 'rejected'];

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:10}}>
        <h1 style={{fontSize:24,fontWeight:800}}>Purchase Orders</h1>
        <div style={{display:'flex',gap:8}}>
          {FILTERS.map(f => (
            <Btn key={f} variant={filter===f?'primary':'secondary'} size="sm" onClick={() => setFilter(f)}>
              {f || 'All'}
            </Btn>
          ))}
        </div>
      </div>
      <div style={{marginBottom:16}}>
        <SearchBox value={searchInput} onChange={setSearchInput} onSearch={()=>setSearch(searchInput)} placeholder="Search user name, phone, order ID, UTR..." />
      </div>
      <Card style={{padding:0,overflow:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',minWidth:900}}>
          <thead>
            <tr style={{borderBottom:'2px solid #F3F4F6'}}>
              {['Order ID','User','INR','USDT','Rate','Status','Submitted','Action'].map(h=>(
                <th key={h} style={{textAlign:'left',padding:'10px 14px',fontSize:12,fontWeight:700,color:'#6B7280',textTransform:'uppercase'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id} style={{borderBottom:'1px solid #F9FAFB'}}>
                <td style={{padding:'12px 14px',fontSize:13,fontWeight:600,color:'#1D4ED8'}}>{o.order_id}</td>
                <td style={{padding:'12px 14px'}}>
                  <div style={{fontSize:13,fontWeight:600}}>{o.users?.name || '—'}</div>
                  <div style={{fontSize:11,color:'#9CA3AF'}}>{o.users?.phone}</div>
                </td>
                <td style={{padding:'12px 14px',fontSize:13,fontWeight:600}}>{fmtINR(o.amount_inr)}</td>
                <td style={{padding:'12px 14px',fontSize:13,fontWeight:700,color:'#10B981'}}>{fmtUSDT(o.amount_usdt)}</td>
                <td style={{padding:'12px 14px',fontSize:12,color:'#6B7280'}}>₹{parseFloat(o.rate_used).toFixed(2)}</td>
                <td style={{padding:'12px 14px'}}><StatusBadge s={o.status} /></td>
                <td style={{padding:'12px 14px',fontSize:12,color:'#9CA3AF'}}>{fmtDate(o.submitted_at)}</td>
                <td style={{padding:'12px 14px'}}>
                  <Btn size="sm" variant="outline" onClick={() => { setSelected(o); setNote(''); }}>View</Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Order: ${selected?.order_id}`}>
        {selected && (
          <div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20}}>
              {[['User',selected.users?.name],['Email',selected.users?.email],['Phone',selected.users?.phone],['Amount INR',fmtINR(selected.amount_inr)],['Amount USDT',fmtUSDT(selected.amount_usdt)],['Rate',`₹${selected.rate_used}`],['UTR Number',selected.utr_number||'Not submitted'],['Status',selected.status]].map(([l,v])=>(
                <div key={l}>
                  <div style={{fontSize:11,color:'#9CA3AF',fontWeight:700,textTransform:'uppercase',marginBottom:3}}>{l}</div>
                  <div style={{fontSize:14,fontWeight:600}}>{v||'—'}</div>
                </div>
              ))}
            </div>
            {selected.screenshot_url && (
              <div style={{marginBottom:20}}>
                <div style={{fontSize:11,color:'#9CA3AF',fontWeight:700,textTransform:'uppercase',marginBottom:8}}>Payment Screenshot</div>
                <img src={selected.screenshot_url} alt="proof" style={{width:'100%',borderRadius:12,border:'1px solid #E5E7EB'}} />
              </div>
            )}
            {selected.admin_note && (
              <div style={{background:'#FEF3C7',borderRadius:10,padding:12,marginBottom:16,fontSize:13}}>
                <strong>Admin Note:</strong> {selected.admin_note}
              </div>
            )}
            {['pending','processing'].includes(selected.status) && (
              <div>
                <div style={{marginBottom:12}}>
                  <label style={{display:'block',fontSize:13,fontWeight:600,marginBottom:6}}>Note (optional for approve, required for reject)</label>
                  <textarea value={note} onChange={e=>setNote(e.target.value)} rows={3}
                    style={{width:'100%',border:'1.5px solid #E5E7EB',borderRadius:10,padding:'10px',fontSize:14,resize:'vertical',boxSizing:'border-box'}}
                    placeholder="Enter note..." />
                </div>
                <div style={{display:'flex',gap:10}}>
                  <Btn variant="success" onClick={() => approve(selected.id)} disabled={loading} style={{flex:1}}>
                    {loading ? 'Processing...' : '✅ Approve & Credit USDT'}
                  </Btn>
                  <Btn variant="danger" onClick={() => reject(selected.id)} disabled={loading} style={{flex:1}}>
                    {loading ? '...' : '❌ Reject'}
                  </Btn>
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
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selected, setSelected] = useState(null);
  const [txHash, setTxHash] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => { try { const r = await API.getWithdrawals(1, filter, search); setOrders(r.orders); } catch {} };
  useEffect(() => { load(); }, [filter, search]);

  const approve = async (id) => {
    setLoading(true);
    try { await API.approveWithdrawal(id, txHash, note); setSelected(null); load(); } catch(e) { alert(e.message); }
    setLoading(false);
  };
  const reject = async (id) => {
    setLoading(true);
    try { await API.rejectWithdrawal(id, note); setSelected(null); load(); } catch(e) { alert(e.message); }
    setLoading(false);
  };

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:10}}>
        <h1 style={{fontSize:24,fontWeight:800}}>Withdrawal Orders</h1>
        <div style={{display:'flex',gap:8}}>
          {['','pending','approved','rejected'].map(f=>(
            <Btn key={f} variant={filter===f?'primary':'secondary'} size="sm" onClick={()=>setFilter(f)}>
              {f||'All'}
            </Btn>
          ))}
        </div>
      </div>
      <div style={{marginBottom:16}}>
        <SearchBox value={searchInput} onChange={setSearchInput} onSearch={()=>setSearch(searchInput)} placeholder="Search user name, phone, order ID, wallet..." />
      </div>
      <Card style={{padding:0,overflow:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',minWidth:900}}>
          <thead>
            <tr style={{borderBottom:'2px solid #F3F4F6'}}>
              {['Order ID','User','USDT','After Fee','Wallet','Free?','Status','Action'].map(h=>(
                <th key={h} style={{textAlign:'left',padding:'10px 14px',fontSize:12,fontWeight:700,color:'#6B7280',textTransform:'uppercase'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map(o=>(
              <tr key={o.id} style={{borderBottom:'1px solid #F9FAFB'}}>
                <td style={{padding:'12px 14px',fontSize:13,fontWeight:600,color:'#1D4ED8'}}>{o.order_id}</td>
                <td style={{padding:'12px 14px'}}>
                  <div style={{fontSize:13,fontWeight:600}}>{o.users?.name||'—'}</div>
                  <div style={{fontSize:11,color:'#9CA3AF'}}>{o.users?.user_code}</div>
                </td>
                <td style={{padding:'12px 14px',fontSize:13,fontWeight:700,color:'#F59E0B'}}>{fmtUSDT(o.amount_usdt)}</td>
                <td style={{padding:'12px 14px',fontSize:13,fontWeight:600,color:'#10B981'}}>{fmtUSDT(o.amount_after_fee)}</td>
                <td style={{padding:'12px 14px',fontSize:12,color:'#6B7280'}}>{o.wallet_address?.substring(0,12)}...</td>
                <td style={{padding:'12px 14px'}}>{o.is_free_withdrawal?<span style={{color:'#10B981',fontWeight:700}}>🎁 Free</span>:'Paid'}</td>
                <td style={{padding:'12px 14px'}}><StatusBadge s={o.status}/></td>
                <td style={{padding:'12px 14px'}}><Btn size="sm" variant="outline" onClick={()=>{setSelected(o);setTxHash('');setNote('');}}>View</Btn></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={!!selected} onClose={()=>setSelected(null)} title={`Withdrawal: ${selected?.order_id}`}>
        {selected&&(
          <div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20}}>
              {[['User',selected.users?.name],['Email',selected.users?.email],['Amount',fmtUSDT(selected.amount_usdt)],['After Fee',fmtUSDT(selected.amount_after_fee)],['Fee',`${selected.fee_usdt} USDT`],['Free?',selected.is_free_withdrawal?'Yes':'No'],['Status',selected.status]].map(([l,v])=>(
                <div key={l}>
                  <div style={{fontSize:11,color:'#9CA3AF',fontWeight:700,textTransform:'uppercase',marginBottom:3}}>{l}</div>
                  <div style={{fontSize:14,fontWeight:600}}>{v||'—'}</div>
                </div>
              ))}
            </div>
            <div style={{background:'#F0F4FF',borderRadius:10,padding:12,marginBottom:16}}>
              <div style={{fontSize:11,color:'#6B7280',fontWeight:700,textTransform:'uppercase',marginBottom:4}}>Wallet Address (TRC20)</div>
              <div style={{fontSize:13,fontFamily:'monospace',wordBreak:'break-all',fontWeight:600}}>{selected.wallet_address}</div>
            </div>
            {selected.status==='pending'&&(
              <div>
                <Input label="TX Hash (optional, fill after sending)" value={txHash} onChange={e=>setTxHash(e.target.value)} placeholder="Transaction hash..." />
                <Input label="Admin Note (optional)" value={note} onChange={e=>setNote(e.target.value)} placeholder="Note..." />
                <div style={{display:'flex',gap:10,marginTop:8}}>
                  <Btn variant="success" onClick={()=>approve(selected.id)} disabled={loading} style={{flex:1}}>
                    {loading?'...':'✅ Approve Withdrawal'}
                  </Btn>
                  <Btn variant="danger" onClick={()=>reject(selected.id)} disabled={loading} style={{flex:1}}>
                    {loading?'...':'❌ Reject & Refund'}
                  </Btn>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── USERS ──────────────────────────────────────────────────
function Users() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [editBal, setEditBal] = useState('');
  const [adjustAmt, setAdjustAmt] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name:'', email:'', phone:'', password:'', availableBalance:'0' });
  const [showPwdId, setShowPwdId] = useState(null);

  const load = async (s = search) => { try { const r = await API.getUsers(1, s); setUsers(r.users); } catch {} };
  useEffect(() => { load(); }, []);

  const viewUser = async (u) => {
    setSelected(u);
    setAdjustAmt(''); setAdjustReason(''); setNewPwd('');
    try { const r = await API.getUserDetail(u.id); setDetail(r); setEditBal(u.available_balance); } catch {}
  };

  const saveUser = async () => {
    setLoading(true);
    try {
      const updates = { availableBalance: parseFloat(editBal) };
      if (newPwd.trim()) updates.newPassword = newPwd.trim();
      await API.updateUser(selected.id, updates);
      alert('User updated!'); load(); setSelected(null);
    } catch(e) { alert(e.message); }
    setLoading(false);
  };

  const applyAdjustment = async () => {
    if (!adjustAmt || parseFloat(adjustAmt) === 0) { alert('Enter a non-zero amount'); return; }
    setLoading(true);
    try {
      await API.updateUser(selected.id, { adjustAmount: parseFloat(adjustAmt), adjustReason });
      alert(`Balance adjusted by ${adjustAmt} USDT`);
      setAdjustAmt(''); setAdjustReason('');
      load(); viewUser(selected);
    } catch(e) { alert(e.message); }
    setLoading(false);
  };

  const toggleBan = async (u) => {
    try { await API.updateUser(u.id, { isBanned: !u.is_banned }); load(); } catch(e) { alert(e.message); }
  };

  const handleDelete = async (u) => {
    if (!confirm(`Permanently delete user "${u.name}" (${u.email})? This cannot be undone.`)) return;
    try { await API.deleteUser(u.id); load(); setSelected(null); } catch(e) { alert(e.message); }
  };

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.phone || !newUser.password) { alert('All fields required'); return; }
    setLoading(true);
    try {
      await API.createUser(newUser);
      alert('User created!');
      setAddOpen(false);
      setNewUser({ name:'', email:'', phone:'', password:'', availableBalance:'0' });
      load();
    } catch(e) { alert(e.message); }
    setLoading(false);
  };

  const handleExport = async () => {
    try {
      const r = await API.exportAllUsers();
      const rows = r.users.map(u => ({
        Name: u.name, Phone: u.phone, Email: u.email, 'User ID': u.user_code,
        Password: u.password_plain || '(not available)',
        Registered: fmtDate(u.created_at), 'Last Login': fmtDate(u.last_login),
        Transactions: u.totalTransactions, 'Current USDT Balance': u.available_balance,
        'Total INR Deposited': u.totalInrDeposited, 'Total USDT Bought': u.totalUsdtBought,
        'Total USDT Withdrawn': u.totalWithdrawn, Status: u.is_banned ? 'Banned' : 'Active'
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Users');
      XLSX.writeFile(wb, `trc20-users-${new Date().toISOString().slice(0,10)}.xlsx`);
    } catch(e) { alert(e.message); }
  };

  const handleClearOldData = async () => {
    if (!confirm('Delete all rejected/expired orders older than 30 days? This cannot be undone.')) return;
    try {
      const r = await API.clearOldData();
      alert(`Cleared ${r.deletedPurchases} purchase orders and ${r.deletedWithdrawals} withdrawal orders.`);
    } catch(e) { alert(e.message); }
  };

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap',gap:10}}>
        <h1 style={{fontSize:24,fontWeight:800}}>Users</h1>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <Btn variant="primary" onClick={()=>setAddOpen(true)}>+ Add User</Btn>
          <Btn variant="success" onClick={handleExport}>⬇ Export Excel</Btn>
          <Btn variant="warning" onClick={handleClearOldData}>🗑 Clear Old Data</Btn>
          <Btn variant="secondary" onClick={()=>load()}>↻ Refresh</Btn>
        </div>
      </div>
      <div style={{marginBottom:16}}>
        <SearchBox value={search} onChange={setSearch} onSearch={()=>load(search)} placeholder="Search name, email, phone, user ID..." />
      </div>
      <Card style={{padding:0,overflow:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',minWidth:1300}}>
          <thead>
            <tr style={{borderBottom:'2px solid #F3F4F6'}}>
              {['Name','Phone','User ID','Password','Registered','Balance','Status','Action'].map(h=>(
                <th key={h} style={{textAlign:'left',padding:'10px 14px',fontSize:11,fontWeight:700,color:'#6B7280',textTransform:'uppercase',whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u=>(
              <tr key={u.id} style={{borderBottom:'1px solid #F9FAFB'}}>
                <td style={{padding:'12px 14px'}}>
                  <div style={{fontSize:14,fontWeight:600}}>{u.name}</div>
                  <div style={{fontSize:11,color:'#9CA3AF'}}>{u.email}</div>
                </td>
                <td style={{padding:'12px 14px',fontSize:13,color:'#6B7280'}}>{u.phone}</td>
                <td style={{padding:'12px 14px',fontSize:13,fontWeight:700,color:'#1D4ED8'}}>{u.user_code}</td>
                <td style={{padding:'12px 14px',fontSize:13,fontFamily:'monospace'}}>
                  {showPwdId===u.id
                    ? <span onClick={()=>setShowPwdId(null)} style={{cursor:'pointer'}}>{u.password_plain||'—'}</span>
                    : <span onClick={()=>setShowPwdId(u.id)} style={{cursor:'pointer',color:'#9CA3AF'}}>•••••• 👁</span>}
                </td>
                <td style={{padding:'12px 14px',fontSize:12,color:'#9CA3AF',whiteSpace:'nowrap'}}>{fmtDateShort(u.created_at)}</td>
                <td style={{padding:'12px 14px',fontSize:14,fontWeight:700,color:'#10B981'}}>{fmtUSDT(u.available_balance)}</td>
                <td style={{padding:'12px 14px'}}>
                  {u.is_banned
                    ? <span style={{background:'#FEE2E2',color:'#991B1B',padding:'2px 10px',borderRadius:8,fontSize:12,fontWeight:700}}>Banned</span>
                    : <span style={{background:'#D1FAE5',color:'#065F46',padding:'2px 10px',borderRadius:8,fontSize:12,fontWeight:700}}>Active</span>
                  }
                </td>
                <td style={{padding:'12px 14px'}}>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                    <Btn size="sm" variant="outline" onClick={()=>viewUser(u)}>Edit</Btn>
                    <Btn size="sm" variant={u.is_banned?'success':'danger'} onClick={()=>toggleBan(u)}>
                      {u.is_banned?'Unban':'Ban'}
                    </Btn>
                    <Btn size="sm" variant="danger" onClick={()=>handleDelete(u)}>Delete</Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* ADD USER MODAL */}
      <Modal open={addOpen} onClose={()=>setAddOpen(false)} title="Add New User">
        <Input label="Full Name" value={newUser.name} onChange={e=>setNewUser(p=>({...p,name:e.target.value}))} />
        <Input label="Email" value={newUser.email} onChange={e=>setNewUser(p=>({...p,email:e.target.value}))} />
        <Input label="Phone" value={newUser.phone} onChange={e=>setNewUser(p=>({...p,phone:e.target.value}))} />
        <Input label="Password" type="text" value={newUser.password} onChange={e=>setNewUser(p=>({...p,password:e.target.value}))} />
        <Input label="Starting USDT Balance" type="number" value={newUser.availableBalance} onChange={e=>setNewUser(p=>({...p,availableBalance:e.target.value}))} />
        <Btn onClick={handleCreateUser} disabled={loading} size="lg" style={{width:'100%',marginTop:8}}>
          {loading ? 'Creating...' : '+ Create User'}
        </Btn>
      </Modal>

      {/* EDIT USER MODAL */}
      <Modal open={!!selected} onClose={()=>{setSelected(null);setDetail(null);}} title={`Edit User: ${selected?.name}`} wide>
        {selected&&(
          <div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,background:'#F9FAFB',borderRadius:12,padding:14,marginBottom:18}}>
              {[['Name',selected.name],['Email',selected.email],['Phone',selected.phone],['User ID',selected.user_code],['Referral Code',selected.referral_code],['Joined',fmtDate(selected.created_at)],['Last Login',selected.last_login?fmtDate(selected.last_login):'Never'],['Current Password',selected.password_plain||'—']].map(([l,v])=>(
                <div key={l}>
                  <div style={{fontSize:10,color:'#9CA3AF',fontWeight:700,textTransform:'uppercase',marginBottom:2}}>{l}</div>
                  <div style={{fontSize:13,fontWeight:600,wordBreak:'break-all'}}>{v}</div>
                </div>
              ))}
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
              <div>
                <h4 style={{fontSize:14,fontWeight:700,marginBottom:10}}>Set Exact Balance</h4>
                <Input label="Available Balance (USDT $)" type="number" value={editBal} onChange={e=>setEditBal(e.target.value)} />
                <Input label="Set New Password (leave blank to keep)" type="text" value={newPwd} onChange={e=>setNewPwd(e.target.value)} placeholder="New password..." />
                <Btn onClick={saveUser} disabled={loading} style={{width:'100%'}}>
                  {loading?'Saving...':'💾 Save Changes'}
                </Btn>
              </div>
              <div>
                <h4 style={{fontSize:14,fontWeight:700,marginBottom:10}}>Quick Adjust (Add/Subtract)</h4>
                <Input label="Amount (use negative to subtract)" type="number" value={adjustAmt} onChange={e=>setAdjustAmt(e.target.value)} placeholder="e.g. 50 or -20" />
                <Input label="Reason (optional)" value={adjustReason} onChange={e=>setAdjustReason(e.target.value)} placeholder="e.g. Bonus, correction..." />
                <Btn variant="success" onClick={applyAdjustment} disabled={loading} style={{width:'100%'}}>
                  {loading?'...':'⚡ Apply Adjustment'}
                </Btn>
              </div>
            </div>

            {detail&&(
              <div style={{marginTop:24}}>
                <div style={{fontSize:14,fontWeight:700,marginBottom:10}}>Recent Purchases ({detail.purchases?.length||0})</div>
                {(detail.purchases||[]).slice(0,5).map(o=>(
                  <div key={o.id} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #F3F4F6',fontSize:13}}>
                    <span style={{color:'#6B7280'}}>{o.order_id}</span>
                    <span style={{fontWeight:700,color:'#10B981'}}>{fmtUSDT(o.amount_usdt)}</span>
                    <StatusBadge s={o.status}/>
                  </div>
                ))}
                <div style={{fontSize:14,fontWeight:700,marginTop:16,marginBottom:10}}>Recent Withdrawals ({detail.withdrawals?.length||0})</div>
                {(detail.withdrawals||[]).slice(0,5).map(o=>(
                  <div key={o.id} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #F3F4F6',fontSize:13}}>
                    <span style={{color:'#6B7280'}}>{o.order_id}</span>
                    <span style={{fontWeight:700,color:'#F59E0B'}}>{fmtUSDT(o.amount_usdt)}</span>
                    <StatusBadge s={o.status}/>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── SETTINGS ──────────────────────────────────────────────────
function Settings() {
  const [s, setS] = useState(null);
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [addMethod, setAddMethod] = useState(false);
  const [newMethod, setNewMethod] = useState({ name:'', type:'upi', upiId:'', bankName:'', accountNumber:'', ifscCode:'', accountHolder:'', qrImageUrl:'' });
  const fileInputRef = useRef(null);

  useEffect(() => { loadSettings(); }, []);
  const loadSettings = async () => {
    try { const r = await API.getSettings(); setS(r.settings); setMethods(r.paymentMethods||[]); } catch {}
  };

  const save = async () => {
    setLoading(true);
    try {
      await API.updateSettings({
        usdt_buy_rate: parseFloat(s.usdt_buy_rate),
        usdt_market_rate: parseFloat(s.usdt_market_rate),
        min_buy_inr: parseFloat(s.min_buy_inr),
        max_buy_inr: parseFloat(s.max_buy_inr),
        min_withdraw_usdt: parseFloat(s.min_withdraw_usdt),
        max_withdraw_usdt: parseFloat(s.max_withdraw_usdt),
        withdrawal_fee: parseFloat(s.withdrawal_fee),
        free_withdrawals_count: parseInt(s.free_withdrawals_count),
        network_fee_inr: parseFloat(s.network_fee_inr||0),
        support_whatsapp: s.support_whatsapp,
        support_telegram: s.support_telegram,
        telegram_support: s.telegram_support,
        is_maintenance: s.is_maintenance,
        maintenance_message: s.maintenance_message,
        pause_deposits: s.pause_deposits,
        pause_withdrawals: s.pause_withdrawals,
        admin_upi_id: s.admin_upi_id,
        referral_commission_usdt: parseFloat(s.referral_commission_usdt||50),
        referral_min_deposit_inr: parseFloat(s.referral_min_deposit_inr||500),
        referral_terms: s.referral_terms||''
      });
      alert('Settings saved!');
    } catch(e) { alert(e.message); }
    setLoading(false);
  };

  const handleQrUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingQr(true);
    try {
      const r = await API.uploadQR(file);
      setS(p => ({ ...p, admin_qr_url: r.url }));
      alert('QR code uploaded! Click "Save All Settings" to confirm.');
    } catch(err) { alert(err.message); }
    setUploadingQr(false);
  };

  const addPM = async () => {
    try { await API.addPaymentMethod(newMethod); loadSettings(); setAddMethod(false); } catch(e) { alert(e.message); }
  };

  const togglePM = async (m) => {
    try { await API.updatePaymentMethod(m.id, { isActive: !m.is_active }); loadSettings(); } catch(e) { alert(e.message); }
  };

  const deletePM = async (id) => {
    if (!confirm('Delete this payment method?')) return;
    try { await API.deletePaymentMethod(id); loadSettings(); } catch(e) { alert(e.message); }
  };

  if (!s) return <div style={{padding:32,textAlign:'center'}}>Loading...</div>;

  const F = ({label,field,type='text'}) => (
    <div style={{marginBottom:14}}>
      <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:5}}>{label}</label>
      <input type={type} value={s[field]||''} onChange={e=>setS(p=>({...p,[field]:e.target.value}))}
        style={{width:'100%',padding:'9px 13px',border:'1.5px solid #E5E7EB',borderRadius:10,fontSize:14,boxSizing:'border-box'}} />
    </div>
  );

  const Toggle = ({label,field,danger}) => (
    <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14,padding:'10px 14px',background:s[field]?(danger?'#FEE2E2':'#FEF3C7'):'#F9FAFB',borderRadius:10}}>
      <input type="checkbox" checked={s[field]||false} onChange={e=>setS(p=>({...p,[field]:e.target.checked}))} style={{width:18,height:18,cursor:'pointer'}} />
      <span style={{fontSize:14,fontWeight:600,flex:1}}>{label}</span>
      <span style={{fontSize:12,fontWeight:700,color:s[field]?(danger?'#EF4444':'#D97706'):'#10B981'}}>{s[field]?'ON':'OFF'}</span>
    </div>
  );

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24,flexWrap:'wrap',gap:10}}>
        <h1 style={{fontSize:24,fontWeight:800}}>Settings</h1>
        <Btn onClick={save} disabled={loading} size="lg">{loading?'Saving...':'💾 Save All Settings'}</Btn>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>
        <Card>
          <h3 style={{fontSize:16,fontWeight:700,marginBottom:18}}>💹 USDT Rates</h3>
          <F label="USDT Buy Rate (₹ per USDT — what user pays)" field="usdt_buy_rate" type="number" />
          <F label="USDT Market Rate (₹ — reference rate shown)" field="usdt_market_rate" type="number" />
          <F label="Network Fee (₹, added on deposits — optional)" field="network_fee_inr" type="number" />
          <div style={{background:'#EFF6FF',borderRadius:10,padding:12,fontSize:13,color:'#1E40AF'}}>
            💡 Example: user deposits ₹{s.min_buy_inr} → gets {(parseFloat(s.min_buy_inr||0)/parseFloat(s.usdt_buy_rate||1)).toFixed(2)} USDT at current rate.
          </div>
        </Card>
        <Card>
          <h3 style={{fontSize:16,fontWeight:700,marginBottom:18}}>🛒 Limits & Fees</h3>
          <F label="Minimum Purchase (₹ INR)" field="min_buy_inr" type="number" />
          <F label="Maximum Purchase (₹ INR)" field="max_buy_inr" type="number" />
          <F label="Min Withdrawal (USDT)" field="min_withdraw_usdt" type="number" />
          <F label="Max Withdrawal (USDT)" field="max_withdraw_usdt" type="number" />
          <F label="Withdrawal Fee (USDT, after free count used)" field="withdrawal_fee" type="number" />
          <F label="Free Withdrawals Count" field="free_withdrawals_count" type="number" />
        </Card>

        <Card>
          <h3 style={{fontSize:16,fontWeight:700,marginBottom:18}}>💳 Receiving Payment Details</h3>
          <F label="Your UPI ID (shown to users)" field="admin_upi_id" />
          <div style={{marginBottom:14}}>
            <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:8}}>QR Code Image</label>
            {s.admin_qr_url && (
              <img src={s.admin_qr_url} alt="QR" style={{width:140,height:140,borderRadius:10,border:'1px solid #E5E7EB',marginBottom:10,display:'block'}} />
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleQrUpload} style={{display:'none'}} />
            <Btn variant="outline" onClick={()=>fileInputRef.current.click()} disabled={uploadingQr}>
              {uploadingQr ? 'Uploading...' : (s.admin_qr_url ? '📷 Replace QR Code' : '📷 Upload QR Code')}
            </Btn>
          </div>
        </Card>

        <Card>
          <h3 style={{fontSize:16,fontWeight:700,marginBottom:18}}>🔧 Platform Controls</h3>
          <Toggle label="Maintenance Mode (disables entire app)" field="is_maintenance" danger />
          <Toggle label="Pause All Deposits" field="pause_deposits" />
          <Toggle label="Pause All Withdrawals" field="pause_withdrawals" />
          <F label="Maintenance Message" field="maintenance_message" />
        </Card>

        <Card>
          <h3 style={{fontSize:16,fontWeight:700,marginBottom:18}}>🎁 Referral System</h3>
          <F label="Commission per Referral (USDT) — credited on referred user's first deposit" field="referral_commission_usdt" type="number" />
          <F label="Minimum Deposit for Referral to Qualify (₹ INR)" field="referral_min_deposit_inr" type="number" />
          <div style={{marginBottom:14}}>
            <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:5}}>Referral Terms & Conditions (shown to users)</label>
            <textarea value={s.referral_terms||''} onChange={e=>setS(p=>({...p,referral_terms:e.target.value}))} rows={4}
              style={{width:'100%',padding:'9px 13px',border:'1.5px solid #E5E7EB',borderRadius:10,fontSize:14,resize:'vertical',boxSizing:'border-box'}} />
          </div>
          <div style={{background:'#EFF6FF',borderRadius:10,padding:12,fontSize:13,color:'#1E40AF'}}>
            💡 Commission is only paid ONCE per referred user — on their first approved deposit. Automatically tracked.
          </div>
        </Card>

        <Card>
          <h3 style={{fontSize:16,fontWeight:700,marginBottom:18}}>💬 Support Links</h3>
          <F label="Telegram Support (username or full link)" field="telegram_support" />
          <F label="WhatsApp Support Number (optional)" field="support_whatsapp" />
        </Card>
      </div>

      <Card>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
          <h3 style={{fontSize:16,fontWeight:700}}>💳 Additional Payment Methods</h3>
          <Btn onClick={()=>setAddMethod(true)} size="sm">+ Add Method</Btn>
        </div>
        {methods.length===0 && <p style={{color:'#9CA3AF',textAlign:'center',padding:20}}>No additional payment methods added yet.</p>}
        {methods.map(m=>(
          <div key={m.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px',border:'1.5px solid #E5E7EB',borderRadius:12,marginBottom:10,flexWrap:'wrap',gap:10}}>
            <div>
              <div style={{fontSize:14,fontWeight:700}}>{m.name} <span style={{fontSize:12,color:'#6B7280',background:'#F3F4F6',padding:'2px 8px',borderRadius:6,fontWeight:400,marginLeft:6}}>{m.type.toUpperCase()}</span></div>
              {m.upi_id&&<div style={{fontSize:13,color:'#1D4ED8',marginTop:2}}>UPI: {m.upi_id}</div>}
              {m.bank_name&&<div style={{fontSize:13,color:'#6B7280',marginTop:2}}>{m.bank_name} · {m.account_number}</div>}
            </div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <span style={{fontSize:12,fontWeight:700,color:m.is_active?'#10B981':'#EF4444'}}>{m.is_active?'Active':'Inactive'}</span>
              <Btn size="sm" variant={m.is_active?'secondary':'success'} onClick={()=>togglePM(m)}>{m.is_active?'Disable':'Enable'}</Btn>
              <Btn size="sm" variant="danger" onClick={()=>deletePM(m.id)}>Delete</Btn>
            </div>
          </div>
        ))}
      </Card>

      <Modal open={addMethod} onClose={()=>setAddMethod(false)} title="Add Payment Method">
        <Input label="Name" value={newMethod.name} onChange={e=>setNewMethod(p=>({...p,name:e.target.value}))} placeholder="e.g. Main UPI" />
        <div style={{marginBottom:14}}>
          <label style={{display:'block',fontSize:13,fontWeight:600,marginBottom:5}}>Type</label>
          <select value={newMethod.type} onChange={e=>setNewMethod(p=>({...p,type:e.target.value}))} style={{width:'100%',padding:'9px 13px',border:'1.5px solid #E5E7EB',borderRadius:10,fontSize:14}}>
            <option value="upi">UPI</option>
            <option value="bank">Bank Account</option>
            <option value="qr">QR Code</option>
          </select>
        </div>
        {newMethod.type==='upi'&&<Input label="UPI ID" value={newMethod.upiId} onChange={e=>setNewMethod(p=>({...p,upiId:e.target.value}))} placeholder="yourname@upi" />}
        {newMethod.type==='bank'&&<>
          <Input label="Bank Name" value={newMethod.bankName} onChange={e=>setNewMethod(p=>({...p,bankName:e.target.value}))} />
          <Input label="Account Number" value={newMethod.accountNumber} onChange={e=>setNewMethod(p=>({...p,accountNumber:e.target.value}))} />
          <Input label="IFSC Code" value={newMethod.ifscCode} onChange={e=>setNewMethod(p=>({...p,ifscCode:e.target.value}))} />
          <Input label="Account Holder" value={newMethod.accountHolder} onChange={e=>setNewMethod(p=>({...p,accountHolder:e.target.value}))} />
        </>}
        <Btn onClick={addPM} size="lg" style={{width:'100%',marginTop:8}}>Add Payment Method</Btn>
      </Modal>
    </div>
  );
}

// ── ROOT APP ──────────────────────────────────────────────────
function Layout({ children }) {
  return (
    <div style={{display:'flex',minHeight:'100vh'}}>
      <Sidebar />
      <div style={{flex:1,padding:32,overflowY:'auto',minWidth:0}}>{children}</div>
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('admin_token'));
  const logout = () => { localStorage.removeItem('admin_token'); localStorage.removeItem('admin_user'); setToken(null); };

  return (
    <AuthCtx.Provider value={{ token, setToken, logout }}>
      <BrowserRouter>
        {!token ? <Login /> : (
          <Layout>
            <Routes>
              <Route path="/" element={<Navigate to="/overview" />} />
              <Route path="/dashboard" element={<Navigate to="/overview" />} />
              <Route path="/overview" element={<Overview />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/purchases" element={<Purchases />} />
              <Route path="/withdrawals" element={<Withdrawals />} />
              <Route path="/users" element={<Users />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Layout>
        )}
      </BrowserRouter>
    </AuthCtx.Provider>
  );
}
