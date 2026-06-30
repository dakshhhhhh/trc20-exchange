import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import * as API from './api';

const AuthCtx = createContext(null);
const useAdmin = () => useContext(AuthCtx);

// ── HELPERS ──────────────────────────────────────────────────
const fmtDate = d => d ? new Date(d).toLocaleString('en-IN') : '—';
const fmtINR = n => `₹${parseFloat(n||0).toLocaleString('en-IN')}`;
const fmtUSDT = n => `$${parseFloat(n||0).toFixed(2)}`;

const StatusBadge = ({ s }) => {
  const M = { pending:{bg:'#FEF3C7',c:'#92400E'}, processing:{bg:'#DBEAFE',c:'#1E40AF'},
    approved:{bg:'#D1FAE5',c:'#065F46'}, rejected:{bg:'#FEE2E2',c:'#991B1B'}, expired:{bg:'#F3F4F6',c:'#6B7280'} };
  const m = M[s] || M.pending;
  return <span style={{background:m.bg,color:m.c,padding:'2px 10px',borderRadius:8,fontSize:12,fontWeight:700,textTransform:'capitalize'}}>{s}</span>;
};

const Card = ({ children, style = {} }) => (
  <div style={{background:'#fff',borderRadius:16,padding:24,boxShadow:'0 2px 12px rgba(0,0,0,.06)',...style}}>{children}</div>
);

const Btn = ({ onClick, children, variant = 'primary', size = 'md', disabled = false, style = {} }) => {
  const V = { primary:{bg:'#1D4ED8',c:'#fff'}, success:{bg:'#10B981',c:'#fff'}, danger:{bg:'#EF4444',c:'#fff'}, secondary:{bg:'#F3F4F6',c:'#374151'}, outline:{bg:'#fff',c:'#1D4ED8',border:'1px solid #1D4ED8'} };
  const S = { sm:{padding:'5px 12px',fontSize:12}, md:{padding:'8px 18px',fontSize:14}, lg:{padding:'12px 28px',fontSize:16} };
  const v = V[variant] || V.primary; const s = S[size];
  return (
    <button onClick={onClick} disabled={disabled} style={{background:v.bg,color:v.c,border:v.border||'none',borderRadius:10,fontWeight:600,cursor:disabled?'not-allowed':'pointer',opacity:disabled?.6:1,...s,...style}}>
      {children}
    </button>
  );
};

const Input = ({ label, ...p }) => (
  <div style={{marginBottom:14}}>
    {label && <label style={{display:'block',fontSize:13,fontWeight:600,color:'#374151',marginBottom:5}}>{label}</label>}
    <input style={{width:'100%',padding:'9px 13px',border:'1.5px solid #E5E7EB',borderRadius:10,fontSize:14,outline:'none'}} {...p} />
  </div>
);

const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:20,padding:28,width:'100%',maxWidth:480,maxHeight:'80vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <h3 style={{fontSize:18,fontWeight:700}}>{title}</h3>
          <button onClick={onClose} style={{fontSize:22,background:'none',border:'none',cursor:'pointer',color:'#6B7280'}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

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
        <Input label="Password" type="password" value={f.p} onChange={e=>setF(p=>({...p,p:e.target.value}))} placeholder="••••••••" />
        <Btn onClick={submit} disabled={loading} size="lg" style={{width:'100%',marginTop:8}}>
          {loading ? 'Signing in...' : 'Sign In'}
        </Btn>
      </Card>
    </div>
  );
}

// ── SIDEBAR ──────────────────────────────────────────────────
const NAV = [
  { path: '/dashboard', icon: '📊', label: 'Dashboard' },
  { path: '/purchases', icon: '📥', label: 'Purchases' },
  { path: '/withdrawals', icon: '📤', label: 'Withdrawals' },
  { path: '/users', icon: '👥', label: 'Users' },
  { path: '/settings', icon: '⚙️', label: 'Settings' },
];

function Sidebar() {
  const loc = useLocation();
  const { logout } = useAdmin();
  return (
    <div style={{width:220,minHeight:'100vh',background:'linear-gradient(180deg,#1E3A8A,#1B3080)',color:'#fff',display:'flex',flexDirection:'column',flexShrink:0}}>
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

// ── DASHBOARD ──────────────────────────────────────────────────
function Dashboard() {
  const [d, setD] = useState(null);
  useEffect(() => { getDash(); }, []);
  const getDash = async () => { try { const r = await API.getDashboard(); setD(r); } catch {} };

  if (!d) return <div style={{padding:32,textAlign:'center'}}>Loading...</div>;
  const { stats, recentOrders, recentWithdrawals } = d;

  const StatCard = ({ icon, label, value, color = '#1D4ED8' }) => (
    <Card>
      <div style={{fontSize:28,marginBottom:8}}>{icon}</div>
      <div style={{fontSize:28,fontWeight:800,color}}>{value}</div>
      <div style={{fontSize:13,color:'#6B7280',marginTop:4}}>{label}</div>
    </Card>
  );

  return (
    <div>
      <h1 style={{fontSize:24,fontWeight:800,marginBottom:24}}>Dashboard</h1>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:16,marginBottom:28}}>
        <StatCard icon="👥" label="Total Users" value={stats.totalUsers} />
        <StatCard icon="📥" label="Pending Purchases" value={stats.pendingPurchases} color="#F59E0B" />
        <StatCard icon="📤" label="Pending Withdrawals" value={stats.pendingWithdrawals} color="#EF4444" />
        <StatCard icon="✅" label="Approved Orders" value={stats.approvedPurchases} color="#10B981" />
        <StatCard icon="💰" label="Total Revenue" value={fmtINR(stats.totalRevenue)} color="#1D4ED8" />
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

// ── PURCHASES ──────────────────────────────────────────────────
function Purchases() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async (s = filter) => { try { const r = await API.getPurchases(1, s); setOrders(r.orders); } catch {} };
  useEffect(() => { load(); }, []);

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
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <h1 style={{fontSize:24,fontWeight:800}}>Purchase Orders</h1>
        <div style={{display:'flex',gap:8}}>
          {FILTERS.map(f => (
            <Btn key={f} variant={filter===f?'primary':'secondary'} size="sm" onClick={() => { setFilter(f); load(f); }}>
              {f || 'All'}
            </Btn>
          ))}
        </div>
      </div>
      <Card>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
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
                  <div style={{fontSize:11,color:'#9CA3AF'}}>{o.users?.email}</div>
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
                    style={{width:'100%',border:'1.5px solid #E5E7EB',borderRadius:10,padding:'10px',fontSize:14,resize:'vertical'}}
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
  const [selected, setSelected] = useState(null);
  const [txHash, setTxHash] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async (s = filter) => { try { const r = await API.getWithdrawals(1, s); setOrders(r.orders); } catch {} };
  useEffect(() => { load(); }, []);

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
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <h1 style={{fontSize:24,fontWeight:800}}>Withdrawal Orders</h1>
        <div style={{display:'flex',gap:8}}>
          {['','pending','approved','rejected'].map(f=>(
            <Btn key={f} variant={filter===f?'primary':'secondary'} size="sm" onClick={()=>{setFilter(f);load(f);}}>
              {f||'All'}
            </Btn>
          ))}
        </div>
      </div>
      <Card>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
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
  const [newPwd, setNewPwd] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async (s = search) => { try { const r = await API.getUsers(1, s); setUsers(r.users); } catch {} };
  useEffect(() => { load(); }, []);

  const viewUser = async (u) => {
    setSelected(u);
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

  const toggleBan = async (u) => {
    try { await API.updateUser(u.id, { isBanned: !u.is_banned }); load(); } catch(e) { alert(e.message); }
  };

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <h1 style={{fontSize:24,fontWeight:800}}>Users</h1>
        <div style={{display:'flex',gap:10}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&load(search)}
            placeholder="Search name, email, phone..." style={{padding:'8px 14px',border:'1.5px solid #E5E7EB',borderRadius:10,fontSize:14,width:280}} />
          <Btn onClick={()=>load(search)}>Search</Btn>
        </div>
      </div>
      <Card>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead>
            <tr style={{borderBottom:'2px solid #F3F4F6'}}>
              {['User','Email','Phone','User ID','Balance','Joined','Status','Action'].map(h=>(
                <th key={h} style={{textAlign:'left',padding:'10px 14px',fontSize:12,fontWeight:700,color:'#6B7280',textTransform:'uppercase'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u=>(
              <tr key={u.id} style={{borderBottom:'1px solid #F9FAFB'}}>
                <td style={{padding:'12px 14px',fontSize:14,fontWeight:600}}>{u.name}</td>
                <td style={{padding:'12px 14px',fontSize:13,color:'#6B7280'}}>{u.email}</td>
                <td style={{padding:'12px 14px',fontSize:13,color:'#6B7280'}}>{u.phone}</td>
                <td style={{padding:'12px 14px',fontSize:13,fontWeight:700,color:'#1D4ED8'}}>{u.user_code}</td>
                <td style={{padding:'12px 14px',fontSize:14,fontWeight:700,color:'#10B981'}}>{fmtUSDT(u.available_balance)}</td>
                <td style={{padding:'12px 14px',fontSize:12,color:'#9CA3AF'}}>{new Date(u.created_at).toLocaleDateString('en-IN')}</td>
                <td style={{padding:'12px 14px'}}>
                  {u.is_banned
                    ? <span style={{background:'#FEE2E2',color:'#991B1B',padding:'2px 10px',borderRadius:8,fontSize:12,fontWeight:700}}>Banned</span>
                    : <span style={{background:'#D1FAE5',color:'#065F46',padding:'2px 10px',borderRadius:8,fontSize:12,fontWeight:700}}>Active</span>
                  }
                </td>
                <td style={{padding:'12px 14px'}}>
                  <div style={{display:'flex',gap:6}}>
                    <Btn size="sm" variant="outline" onClick={()=>viewUser(u)}>Edit</Btn>
                    <Btn size="sm" variant={u.is_banned?'success':'danger'} onClick={()=>toggleBan(u)}>
                      {u.is_banned?'Unban':'Ban'}
                    </Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={!!selected} onClose={()=>{setSelected(null);setDetail(null);}} title={`Edit User: ${selected?.name}`}>
        {selected&&(
          <div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,background:'#F9FAFB',borderRadius:12,padding:14,marginBottom:18}}>
              {[['Name',selected.name],['Email',selected.email],['Phone',selected.phone],['User ID',selected.user_code],['Referral Code',selected.referral_code],['Joined',new Date(selected.created_at).toLocaleString('en-IN')],['Last Login',selected.last_login?new Date(selected.last_login).toLocaleString('en-IN'):'Never'],['Password Hash','••••••• (hashed)']].map(([l,v])=>(
                <div key={l}>
                  <div style={{fontSize:10,color:'#9CA3AF',fontWeight:700,textTransform:'uppercase',marginBottom:2}}>{l}</div>
                  <div style={{fontSize:13,fontWeight:600,wordBreak:'break-all'}}>{v}</div>
                </div>
              ))}
            </div>
            <Input label="Available Balance (USDT $)" type="number" value={editBal} onChange={e=>setEditBal(e.target.value)} />
            <Input label="Set New Password (leave blank to keep)" type="password" value={newPwd} onChange={e=>setNewPwd(e.target.value)} placeholder="New password..." />
            <Btn onClick={saveUser} disabled={loading} size="lg" style={{width:'100%',marginTop:8}}>
              {loading?'Saving...':'💾 Save Changes'}
            </Btn>
            {detail&&(
              <div style={{marginTop:20}}>
                <div style={{fontSize:14,fontWeight:700,marginBottom:10}}>Recent Purchases ({detail.purchases?.length})</div>
                {detail.purchases?.slice(0,5).map(o=>(
                  <div key={o.id} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #F3F4F6',fontSize:13}}>
                    <span style={{color:'#6B7280'}}>{o.order_id}</span>
                    <span style={{fontWeight:700,color:'#10B981'}}>{fmtUSDT(o.amount_usdt)}</span>
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
  const [addMethod, setAddMethod] = useState(false);
  const [newMethod, setNewMethod] = useState({ name:'', type:'upi', upiId:'', bankName:'', accountNumber:'', ifscCode:'', accountHolder:'', qrImageUrl:'' });

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
        support_whatsapp: s.support_whatsapp,
        support_telegram: s.support_telegram,
        is_maintenance: s.is_maintenance,
        maintenance_message: s.maintenance_message
      });
      alert('Settings saved!');
    } catch(e) { alert(e.message); }
    setLoading(false);
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
        style={{width:'100%',padding:'9px 13px',border:'1.5px solid #E5E7EB',borderRadius:10,fontSize:14}} />
    </div>
  );

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
        <h1 style={{fontSize:24,fontWeight:800}}>Settings</h1>
        <Btn onClick={save} disabled={loading} size="lg">{loading?'Saving...':'💾 Save All Settings'}</Btn>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>
        <Card>
          <h3 style={{fontSize:16,fontWeight:700,marginBottom:18}}>💹 USDT Rates</h3>
          <F label="USDT Buy Rate (₹ per USDT)" field="usdt_buy_rate" type="number" />
          <F label="USDT Market Rate (₹ per USDT)" field="usdt_market_rate" type="number" />
          <div style={{background:'#EFF6FF',borderRadius:10,padding:12,fontSize:13,color:'#1E40AF'}}>
            💡 When a user deposits ₹{s.min_buy_inr}, they get {(parseFloat(s.min_buy_inr||0)/parseFloat(s.usdt_buy_rate||1)).toFixed(2)} USDT at current rate.
          </div>
        </Card>
        <Card>
          <h3 style={{fontSize:16,fontWeight:700,marginBottom:18}}>🛒 Purchase Limits</h3>
          <F label="Minimum Purchase (₹ INR)" field="min_buy_inr" type="number" />
          <F label="Maximum Purchase (₹ INR)" field="max_buy_inr" type="number" />
          <F label="Min Withdrawal (USDT)" field="min_withdraw_usdt" type="number" />
          <F label="Max Withdrawal (USDT)" field="max_withdraw_usdt" type="number" />
          <F label="Withdrawal Fee (USDT)" field="withdrawal_fee" type="number" />
          <F label="Free Withdrawals Count" field="free_withdrawals_count" type="number" />
        </Card>
        <Card>
          <h3 style={{fontSize:16,fontWeight:700,marginBottom:18}}>📞 Support Links</h3>
          <F label="WhatsApp Support Number" field="support_whatsapp" />
          <F label="Telegram Username/Link" field="support_telegram" />
        </Card>
        <Card>
          <h3 style={{fontSize:16,fontWeight:700,marginBottom:18}}>🔧 Maintenance</h3>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
            <label style={{fontSize:14,fontWeight:600}}>Maintenance Mode</label>
            <input type="checkbox" checked={s.is_maintenance||false} onChange={e=>setS(p=>({...p,is_maintenance:e.target.checked}))} style={{width:20,height:20,cursor:'pointer'}} />
            <span style={{fontSize:13,color:s.is_maintenance?'#EF4444':'#10B981',fontWeight:600}}>{s.is_maintenance?'ON — App disabled':'OFF — App active'}</span>
          </div>
          <F label="Maintenance Message" field="maintenance_message" />
        </Card>
      </div>

      <Card>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
          <h3 style={{fontSize:16,fontWeight:700}}>💳 Payment Methods</h3>
          <Btn onClick={()=>setAddMethod(true)} size="sm">+ Add Method</Btn>
        </div>
        {methods.length===0 && <p style={{color:'#9CA3AF',textAlign:'center',padding:20}}>No payment methods added yet.</p>}
        {methods.map(m=>(
          <div key={m.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px',border:'1.5px solid #E5E7EB',borderRadius:12,marginBottom:10}}>
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
        <div>
          <div style={{marginBottom:14}}>
            <label style={{display:'block',fontSize:13,fontWeight:600,marginBottom:5}}>Name</label>
            <input value={newMethod.name} onChange={e=>setNewMethod(p=>({...p,name:e.target.value}))} placeholder="e.g. Main UPI" style={{width:'100%',padding:'9px 13px',border:'1.5px solid #E5E7EB',borderRadius:10,fontSize:14}} />
          </div>
          <div style={{marginBottom:14}}>
            <label style={{display:'block',fontSize:13,fontWeight:600,marginBottom:5}}>Type</label>
            <select value={newMethod.type} onChange={e=>setNewMethod(p=>({...p,type:e.target.value}))} style={{width:'100%',padding:'9px 13px',border:'1.5px solid #E5E7EB',borderRadius:10,fontSize:14}}>
              <option value="upi">UPI</option>
              <option value="bank">Bank Account</option>
              <option value="qr">QR Code</option>
            </select>
          </div>
          {newMethod.type==='upi'&&<div style={{marginBottom:14}}><label style={{display:'block',fontSize:13,fontWeight:600,marginBottom:5}}>UPI ID</label><input value={newMethod.upiId} onChange={e=>setNewMethod(p=>({...p,upiId:e.target.value}))} placeholder="yourname@upi" style={{width:'100%',padding:'9px 13px',border:'1.5px solid #E5E7EB',borderRadius:10,fontSize:14}} /></div>}
          {newMethod.type==='bank'&&<>
            <div style={{marginBottom:14}}><label style={{fontSize:13,fontWeight:600}}>Bank Name</label><input value={newMethod.bankName} onChange={e=>setNewMethod(p=>({...p,bankName:e.target.value}))} style={{width:'100%',padding:'9px 13px',border:'1.5px solid #E5E7EB',borderRadius:10,fontSize:14,marginTop:5}} /></div>
            <div style={{marginBottom:14}}><label style={{fontSize:13,fontWeight:600}}>Account Number</label><input value={newMethod.accountNumber} onChange={e=>setNewMethod(p=>({...p,accountNumber:e.target.value}))} style={{width:'100%',padding:'9px 13px',border:'1.5px solid #E5E7EB',borderRadius:10,fontSize:14,marginTop:5}} /></div>
            <div style={{marginBottom:14}}><label style={{fontSize:13,fontWeight:600}}>IFSC Code</label><input value={newMethod.ifscCode} onChange={e=>setNewMethod(p=>({...p,ifscCode:e.target.value}))} style={{width:'100%',padding:'9px 13px',border:'1.5px solid #E5E7EB',borderRadius:10,fontSize:14,marginTop:5}} /></div>
            <div style={{marginBottom:14}}><label style={{fontSize:13,fontWeight:600}}>Account Holder</label><input value={newMethod.accountHolder} onChange={e=>setNewMethod(p=>({...p,accountHolder:e.target.value}))} style={{width:'100%',padding:'9px 13px',border:'1.5px solid #E5E7EB',borderRadius:10,fontSize:14,marginTop:5}} /></div>
          </>}
          {(newMethod.type==='qr'||newMethod.type==='upi')&&<div style={{marginBottom:14}}><label style={{fontSize:13,fontWeight:600}}>QR Image URL (optional)</label><input value={newMethod.qrImageUrl} onChange={e=>setNewMethod(p=>({...p,qrImageUrl:e.target.value}))} placeholder="https://..." style={{width:'100%',padding:'9px 13px',border:'1.5px solid #E5E7EB',borderRadius:10,fontSize:14,marginTop:5}} /></div>}
          <Btn onClick={addPM} size="lg" style={{width:'100%',marginTop:8}}>Add Payment Method</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ── ROOT APP ──────────────────────────────────────────────────
function Layout({ children }) {
  return (
    <div style={{display:'flex',minHeight:'100vh'}}>
      <Sidebar />
      <div style={{flex:1,padding:32,overflowY:'auto'}}>{children}</div>
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
              <Route path="/" element={<Navigate to="/dashboard" />} />
              <Route path="/dashboard" element={<Dashboard />} />
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
