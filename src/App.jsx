import React, { useState, useEffect, useRef } from 'react';
import { Copy, ChevronDown, ChevronUp, Trash2, Plus, X, Home, Users, CalendarDays, Settings } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://sbznyuwjyaklielcznlv.supabase.co',
  'sb_publishable_-wrAqCXtcQttCd6cM9diKQ_Sb1_pNz_'
);

// Compute balance from ledger
const computeBalance = (ledger = []) =>
  ledger.reduce((sum, e) => sum + e.amount, 0);

// Has this player ever had a debt written off?
const hasWriteOffHistory = (ledger = []) =>
  ledger.some(e => e.type === 'writeoff');

const BankBalanceEditor = ({ bankBalance, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saved, setSaved] = useState(false);
  const save = () => {
    const val = parseFloat(draft);
    if (!isNaN(val)) {
      onSave(val);
      setSaved(true);
      setTimeout(() => { setSaved(false); setEditing(false); }, 1000);
    }
  };
  if (!editing) return (
    <div className="bg-white p-4 rounded-lg shadow-sm flex items-center justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Bank Balance</p>
        <p className="text-2xl font-bold text-gray-900">£{bankBalance}</p>
      </div>
      <button onClick={() => { setDraft(bankBalance.toString()); setEditing(true); }}
        className="text-sm text-green-600 font-medium hover:text-green-700">Edit</button>
    </div>
  );
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Bank Balance</p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
          <input autoFocus type="number" step="1" value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && save()}
            className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded text-gray-900 text-lg font-medium" />
        </div>
        <button onClick={save} className="bg-green-600 text-white px-4 py-2 rounded font-semibold hover:bg-green-700">
          {saved ? 'Saved!' : 'Save'}
        </button>
        <button onClick={() => setEditing(false)} className="bg-gray-200 text-gray-600 px-3 py-2 rounded font-semibold">Cancel</button>
      </div>
    </div>
  );
};

const EditName = ({ player, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(player.name);
  const save = () => { if (draft.trim()) { onSave(draft.trim()); setEditing(false); } };
  if (!editing) return (
    <button onClick={() => { setDraft(player.name); setEditing(true); }} className="text-sm text-green-600 font-medium">Edit name</button>
  );
  return (
    <div className="flex gap-2">
      <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && save()}
        className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm" />
      <button onClick={save} className="bg-green-600 text-white px-3 py-1 rounded text-sm font-semibold">Save</button>
      <button onClick={() => setEditing(false)} className="bg-gray-200 text-gray-600 px-3 py-1 rounded text-sm">Cancel</button>
    </div>
  );
};

const FNFApp = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sessions, setSessions] = useState([]);
  const [players, setPlayers] = useState([]);
  const [bankBalance, setBankBalance] = useState(0);
  const [showNewPlayer, setShowNewPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [expandedSession, setExpandedSession] = useState(null);
  const [expandedMonth, setExpandedMonth] = useState(null);
  const [expandedPlayer, setExpandedPlayer] = useState(null);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [playerFilter, setPlayerFilter] = useState('all');
  const [sessionFilter, setSessionFilter] = useState('all');
  const [settings, setSettings] = useState({ playerFee: 8, pitchCost: 104 });
  const [settingsDraft, setSettingsDraft] = useState({ playerFee: 8, pitchCost: 104 });
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [closeModal, setCloseModal] = useState(null);
  const [invoiceCopied, setInvoiceCopied] = useState(null);
  const [invoiceMonth, setInvoiceMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [invoicePayments, setInvoicePayments] = useState([]);
  const [confirmingPayment, setConfirmingPayment] = useState(null);
  const [cancelModal, setCancelModal] = useState(null); // { sessionId }
  const [editingSessionDate, setEditingSessionDate] = useState(false);
  const [newSessionDate, setNewSessionDate] = useState('');
  // Manual entry form state
  const [entryForm, setEntryForm] = useState(null); // { playerId }
  const [entryDraft, setEntryDraft] = useState({ date: '', amount: '', label: '', type: 'debt' });

  const today = new Date().toISOString().split('T')[0];
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  // Migrate old player format (balance only → ledger)
  const migratePlayer = (p) => {
    if (p.ledger) return p;
    const ledger = p.balance !== 0
      ? [{ id: 'init', date: today, amount: p.balance, label: 'Opening balance' }]
      : [];
    return { ...p, ledger };
  };

  // Load from Supabase on mount, fall back to localStorage
  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('app_data')
          .select('value')
          .eq('key', 'state')
          .single();

        if (data?.value) {
          const d = data.value;
          const migrated = (d.players || []).map(migratePlayer);
          setPlayers(migrated);
          setSessions(d.sessions || []);
          setBankBalance(d.bankBalance || 0);
          if (d.settings) { setSettings(d.settings); setSettingsDraft(d.settings); }
          if (d.invoicePayments) setInvoicePayments(d.invoicePayments);
        } else {
          // Fall back to localStorage
          const saved = localStorage.getItem('fnfData');
          if (saved) {
            const d = JSON.parse(saved);
            const migrated = (d.players || []).map(migratePlayer);
            setPlayers(migrated);
            setSessions(d.sessions || []);
            setBankBalance(d.bankBalance || 0);
            if (d.settings) { setSettings(d.settings); setSettingsDraft(d.settings); }
            if (d.invoicePayments) setInvoicePayments(d.invoicePayments);
          } else {
            initializeDemo();
          }
        }
      } catch (err) {
        // Offline — fall back to localStorage
        const saved = localStorage.getItem('fnfData');
        if (saved) {
          const d = JSON.parse(saved);
          const migrated = (d.players || []).map(migratePlayer);
          setPlayers(migrated);
          setSessions(d.sessions || []);
          setBankBalance(d.bankBalance || 0);
          if (d.settings) { setSettings(d.settings); setSettingsDraft(d.settings); }
          if (d.invoicePayments) setInvoicePayments(d.invoicePayments);
        } else {
          initializeDemo();
        }
      } finally {
        initialized.current = true;
        setLoading(false);
      }
    };
    load();
  }, []);

  // Save to Supabase + localStorage whenever state changes
  useEffect(() => {
    if (!initialized.current) return;
    const state = { players, sessions, bankBalance, settings, invoicePayments };
    localStorage.setItem('fnfData', JSON.stringify(state));
    supabase.from('app_data').upsert({ key: 'state', value: state, updated_at: new Date().toISOString() }).then(({ error }) => {
      if (error) console.error('Supabase save error:', error);
    });
  }, [players, sessions, bankBalance, settings, invoicePayments]);

  const initializeDemo = () => {
    const lastFriday = new Date();
    lastFriday.setDate(lastFriday.getDate() - ((lastFriday.getDay() + 2) % 7));
    const lastFridayStr = lastFriday.toISOString().split('T')[0];

    const nextFriday = new Date();
    nextFriday.setDate(nextFriday.getDate() + ((5 - nextFriday.getDay() + 7) % 7 || 7));

    const demoPlayers = [
      { id: '1', name: 'Luke', ledger: [{ id: 'l1', date: lastFridayStr, amount: -8, label: 'Fri session - unpaid' }] },
      { id: '2', name: 'Ash', ledger: [{ id: 'l2', date: lastFridayStr, amount: -8, label: 'Fri session - unpaid' }] },
      { id: '3', name: 'Saxon', ledger: [{ id: 'l3', date: lastFridayStr, amount: -8, label: 'Fri session - unpaid' }] },
      { id: '4', name: 'Abdul', ledger: [] },
      { id: '5', name: 'Adil', ledger: [] },
      { id: '6', name: 'Adriano', ledger: [] },
    ];

    const demoSessions = [{
      id: '1',
      date: nextFriday.toISOString().split('T')[0],
      status: 'open',
      playerAttendance: {
        '1': { attended: true, paid: false },
        '2': { attended: true, paid: false },
        '3': { attended: true, paid: false },
        '4': { attended: true, paid: true },
        '5': { attended: true, paid: true },
        '6': { attended: false, paid: false },
      },
    }];

    setPlayers(demoPlayers);
    setSessions(demoSessions);
    setBankBalance(622);
  };

  const addPlayer = () => {
    if (newPlayerName.trim()) {
      setPlayers([...players, { id: Date.now().toString(), name: newPlayerName, ledger: [] }]);
      setNewPlayerName('');
      setShowNewPlayer(false);
    }
  };

  const nextFridayDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7 || 7));
    return d.toISOString().split('T')[0];
  };

  const createNewSession = (date) => {
    const attendance = {};
    players.forEach(p => { attendance[p.id] = { attended: false, paid: false }; });
    setSessions([{ id: Date.now().toString(), date: date || nextFridayDate(), status: 'open', playerAttendance: attendance }, ...sessions]);
  };

  const updateSessionDate = (sessionId, date) => {
    setSessions(sessions.map(s => s.id === sessionId ? { ...s, date } : s));
    setEditingSessionDate(false);
  };

  const updateAttendance = (sessionId, playerId, field, value) => {
    setSessions(sessions.map(s =>
      s.id === sessionId
        ? { ...s, playerAttendance: { ...s.playerAttendance, [playerId]: { ...s.playerAttendance[playerId], [field]: value } } }
        : s
    ));
  };

  const closeSession = (sessionId) => {
    const session = sessions.find(s => s.id === sessionId);
    const attendanceVals = Object.values(session.playerAttendance);
    const attendeeCount = attendanceVals.filter(a => a.attended).length;
    const unpaidCount = attendanceVals.filter(a => a.attended && !a.paid).length;
    const collected = attendeeCount * settings.playerFee;

    setSessions(sessions.map(s =>
      s.id === sessionId
        ? { ...s, status: 'closed', collected, attendeeCount }
        : s
    ));

    setBankBalance(prev => {
      const newBalance = prev + collected;
      setCloseModal({ collected, newBalance, attendeeCount, unpaidCount, playerFee: settings.playerFee });
      return newBalance;
    });

    // Add ledger entries for unpaid attendees
    const sessionLabel = `${new Date(session.date + 'T00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} - unpaid`;
    setPlayers(players.map(p => {
      const attendance = session.playerAttendance[p.id];
      if (attendance && attendance.attended && !attendance.paid) {
        const entry = { id: `${sessionId}-${p.id}`, date: session.date, amount: -settings.playerFee, label: sessionLabel };
        return { ...p, ledger: [...(p.ledger || []), entry] };
      }
      return p;
    }));
  };

  const cancelSession = (sessionId, reason) => {
    setSessions(sessions.map(s => s.id === sessionId ? { ...s, status: 'cancelled', cancelReason: reason } : s));
    setCancelModal(null);
  };

  const reopenSession = (sessionId) => {
    setSessions(sessions.map(s => s.id === sessionId ? { ...s, status: 'open', cancelReason: null } : s));
  };

  // Add a manual ledger entry to a player
  const addManualEntry = () => {
    const amount = entryDraft.type === 'debt'
      ? -Math.abs(parseFloat(entryDraft.amount))
      : Math.abs(parseFloat(entryDraft.amount));
    if (!entryDraft.date || isNaN(amount) || !entryDraft.label.trim()) return;

    const entry = {
      id: Date.now().toString(),
      date: entryDraft.date,
      amount,
      label: entryDraft.label.trim(),
      ...(entryDraft.type === 'writeoff' ? { type: 'writeoff' } : {}),
    };
    setPlayers(players.map(p =>
      p.id === entryForm.playerId
        ? { ...p, ledger: [...(p.ledger || []), entry].sort((a, b) => a.date.localeCompare(b.date)) }
        : p
    ));
    setEntryForm(null);
    setEntryDraft({ date: '', amount: '', label: '', type: 'debt' });
  };

  const deleteEntry = (playerId, entryId) => {
    setPlayers(players.map(p =>
      p.id === playerId ? { ...p, ledger: p.ledger.filter(e => e.id !== entryId) } : p
    ));
  };

  const saveSettings = () => {
    const updated = { playerFee: parseFloat(settingsDraft.playerFee) || 8, pitchCost: parseFloat(settingsDraft.pitchCost) || 104 };
    setSettings(updated);
    setSettingsDraft(updated);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  };

  const generateWhatsAppMessage = () => {
    const overdue = players.filter(p => computeBalance(p.ledger) < 0)
      .sort((a, b) => {
        // Sort by oldest debt date first, then alphabetically
        const oldestA = (a.ledger || []).filter(e => e.amount < 0).map(e => e.date).sort()[0] || '';
        const oldestB = (b.ledger || []).filter(e => e.amount < 0).map(e => e.date).sort()[0] || '';
        if (oldestA !== oldestB) return oldestA.localeCompare(oldestB);
        return a.name.localeCompare(b.name);
      });
    if (overdue.length === 0) return 'All payments up to date!';
    const lines = ['Friday Night Football - outstanding balances', ''];
    overdue.forEach(p => {
      const debts = (p.ledger || []).filter(e => e.amount < 0);
      const total = Math.abs(computeBalance(p.ledger));
      const dates = debts
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(e => new Date(e.date + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }))
        .join(', ');
      lines.push(`${p.name} - £${total}${dates ? ` (${dates})` : ''}`);
    });
    lines.push('');
    lines.push(`Total outstanding: £${overdue.reduce((sum, p) => sum + Math.abs(computeBalance(p.ledger)), 0)}`);
    return lines.join('\n');
  };

  const recordInvoicePayment = (month, amount) => {
    setInvoicePayments(prev => [...prev, { id: Date.now().toString(), month, amount, paidOn: today }]);
    setBankBalance(prev => prev - amount);
    setConfirmingPayment(null);
  };

  const getFridaysInMonth = (year, month) => {
    const fridays = [];
    const d = new Date(year, month, 1);
    while (d.getMonth() === month) {
      if (d.getDay() === 5) fridays.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return fridays;
  };

  const getInvoiceData = () => {
    const [year, month] = invoiceMonth.split('-').map(Number);
    const invoiceDate = new Date(year, month - 1, 1);

    // Previous month
    const prevDate = new Date(year, month - 2, 1);
    const prevYear = prevDate.getFullYear();
    const prevMonth = prevDate.getMonth(); // 0-indexed

    // Cancelled sessions in previous month
    const cancelled = sessions.filter(s => {
      if (s.status !== 'cancelled') return false;
      const d = new Date(s.date + 'T00:00');
      return d.getFullYear() === prevYear && d.getMonth() === prevMonth;
    });

    // Fridays in invoice month
    const fridays = getFridaysInMonth(year, month - 1);
    const fullCost = fridays.length * settings.pitchCost;
    const discount = cancelled.length * settings.pitchCost;
    const revisedCost = fullCost - discount;

    const prevMonthName = prevDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    const invoiceMonthName = invoiceDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

    const cancelledDates = cancelled
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(s => new Date(s.date + 'T00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }))
      .join(', ');

    const message = cancelled.length === 0
      ? null
      : `Hi, we had ${cancelled.length} cancelled session${cancelled.length > 1 ? 's' : ''} in ${prevMonthName} (${cancelledDates}). Please reduce our ${invoiceMonthName} invoice by £${discount} — charge for ${fridays.length - cancelled.length} week${fridays.length - cancelled.length !== 1 ? 's' : ''} (£${revisedCost}) instead of ${fridays.length} (£${fullCost}).`;

    return { cancelled, fridays, fullCost, discount, revisedCost, prevMonthName, invoiceMonthName, message };
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateWhatsAppMessage());
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  const totalOwed = players.reduce((sum, p) => {
    const bal = computeBalance(p.ledger);
    return sum + (bal < 0 ? Math.abs(bal) : 0);
  }, 0);

  const currentSession = sessions.find(s => s.status === 'open');
  const pastSessions = sessions.filter(s => s.status !== 'open');

  const formatDate = (dateStr) =>
    new Date(dateStr + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  if (loading) return (
    <div className="bg-gray-50 min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-3xl mb-3">⚽</div>
        <p className="text-gray-500 text-sm">Loading FNF...</p>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-50 min-h-screen">
      <style>{`
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        * { box-sizing: border-box; }
      `}</style>

      {/* Header */}
      <div className="bg-green-600 text-white sticky top-0 z-50 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-2 flex items-center gap-3">
          <img src="/apple-touch-icon.png" alt="FNF" className="w-9 h-9 rounded-lg" />
          <div>
            <h1 className="text-base font-bold leading-tight">FNF</h1>
            <p className="text-green-100 text-xs leading-tight">Friday Night Football</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 pb-32">

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            {/* Top summary cards */}
            {(() => {
              const inCount = currentSession ? players.filter(p => currentSession.playerAttendance[p.id]?.attended).length : null;
              const paidCount = currentSession ? players.filter(p => currentSession.playerAttendance[p.id]?.paid).length : null;
              return (
                <div className={`grid gap-3 ${currentSession ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  <div className="bg-white p-3 rounded-lg shadow-sm border-l-4 border-green-600">
                    <p className="text-gray-600 text-xs font-semibold uppercase tracking-wide">Bank</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">£{bankBalance}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm border-l-4 border-orange-500">
                    <p className="text-gray-600 text-xs font-semibold uppercase tracking-wide">Owed</p>
                    <p className="text-2xl font-bold text-orange-600 mt-1">£{totalOwed}</p>
                  </div>
                  {currentSession && (
                    <div className="bg-white p-3 rounded-lg shadow-sm border-l-4 border-blue-500">
                      <p className="text-gray-600 text-xs font-semibold uppercase tracking-wide">This Week</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{inCount} <span className="text-sm font-medium text-gray-500">in</span></p>
                      <p className="text-xs text-gray-500 mt-0.5">{paidCount} paid</p>
                    </div>
                  )}
                </div>
              );
            })()}

            {currentSession && (
              <div className="bg-white p-4 rounded-lg shadow-sm">
                {/* Editable session date */}
                <div className="flex items-center justify-between mb-3">
                  {editingSessionDate ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="date"
                        defaultValue={currentSession.date}
                        onChange={(e) => setNewSessionDate(e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 text-sm flex-1"
                      />
                      <button
                        onClick={() => updateSessionDate(currentSession.id, newSessionDate || currentSession.date)}
                        className="text-green-600 text-sm font-semibold"
                      >Done</button>
                      <button onClick={() => setEditingSessionDate(false)} className="text-gray-400 text-sm">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditingSessionDate(true); setNewSessionDate(currentSession.date); }} className="text-left">
                      <h2 className="font-semibold text-gray-900">
                        {new Date(currentSession.date + 'T00:00').toLocaleDateString('en-GB', { weekday: 'long', month: 'short', day: 'numeric' })}
                      </h2>
                      <p className="text-xs text-green-600">Tap to change date</p>
                    </button>
                  )}
                </div>

                {/* Player filter */}
                {(() => {
                  const inCount = players.filter(p => currentSession.playerAttendance[p.id]?.attended).length;
                  const unpaidCount = players.filter(p => currentSession.playerAttendance[p.id]?.attended && !currentSession.playerAttendance[p.id]?.paid).length;
                  return (
                    <div className="flex rounded-lg overflow-hidden border border-gray-200 mb-3">
                      {[
                        { id: 'all', label: `All (${players.length})` },
                        { id: 'playing', label: `Playing (${inCount})` },
                        { id: 'unpaid', label: `Unpaid (${unpaidCount})` },
                      ].map(f => (
                        <button key={f.id} onClick={() => setSessionFilter(f.id)}
                          className={`flex-1 py-1.5 text-xs font-medium transition ${sessionFilter === f.id ? 'bg-green-600 text-white' : 'text-gray-600 bg-white hover:bg-gray-50'}`}>
                          {f.label}
                        </button>
                      ))}
                    </div>
                  );
                })()}

                <div className="space-y-2 mb-4">
                  {players
                    .filter(player => {
                      const att = currentSession.playerAttendance[player.id];
                      if (sessionFilter === 'playing') return att?.attended;
                      if (sessionFilter === 'unpaid') return att?.attended && !att?.paid;
                      return true;
                    })
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(player => (
                    <div key={player.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                      <span className="font-medium text-gray-900">{player.name}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateAttendance(currentSession.id, player.id, 'attended', !currentSession.playerAttendance[player.id]?.attended)}
                          className={`px-3 py-1 rounded text-sm font-medium transition ${currentSession.playerAttendance[player.id]?.attended ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-700'}`}
                        >In</button>
                        <button
                          onClick={() => updateAttendance(currentSession.id, player.id, 'paid', !currentSession.playerAttendance[player.id]?.paid)}
                          className={`px-3 py-1 rounded text-sm font-medium transition ${currentSession.playerAttendance[player.id]?.paid ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-700'}`}
                        >Paid</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-gray-50 rounded p-3 mb-3 text-sm text-gray-600">
                  {(() => {
                    const attending = Object.values(currentSession.playerAttendance).filter(a => a.attended).length;
                    const collected = attending * settings.playerFee;
                    const net = collected - settings.pitchCost;
                    return (
                      <div className="flex justify-between">
                        <span>{attending} players × £{settings.playerFee} = £{collected}</span>
                        <span className={net >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>Net: {net >= 0 ? '+' : ''}£{net}</span>
                      </div>
                    );
                  })()}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => closeSession(currentSession.id)} className="flex-1 bg-green-600 text-white py-2 rounded font-semibold hover:bg-green-700 transition">Close Week</button>
                  <button onClick={() => setCancelModal({ sessionId: currentSession.id })} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded font-semibold hover:bg-gray-400 transition">Cancel Week</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Players Tab */}
        {activeTab === 'players' && (
          <div className="space-y-3">
            {/* Add player */}
            <div className="flex gap-2">
              {!showNewPlayer ? (
                <button onClick={() => setShowNewPlayer(true)} className="w-full bg-green-600 text-white py-2 rounded font-semibold hover:bg-green-700 transition">Add Player</button>
              ) : (
                <div className="flex gap-2 w-full">
                  <input
                    autoFocus type="text" placeholder="Player name" value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addPlayer()}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded"
                  />
                  <button onClick={addPlayer} className="bg-green-600 text-white px-4 py-2 rounded font-semibold hover:bg-green-700">Add</button>
                  <button onClick={() => { setShowNewPlayer(false); setNewPlayerName(''); }} className="bg-gray-300 text-gray-700 px-4 py-2 rounded font-semibold hover:bg-gray-400">Cancel</button>
                </div>
              )}
            </div>

            {/* Filter buttons */}
            <div className="flex rounded-lg overflow-hidden border border-gray-200 bg-white shadow-sm">
              {[
                { id: 'all', label: `All (${players.length})` },
                { id: 'owes', label: `Owes (${players.filter(p => computeBalance(p.ledger) < 0).length})` },
                { id: 'credit', label: `Credit (${players.filter(p => computeBalance(p.ledger) > 0).length})` },
              ].map(f => (
                <button key={f.id} onClick={() => setPlayerFilter(f.id)}
                  className={`flex-1 py-2 text-sm font-medium transition ${playerFilter === f.id ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                  {f.label}
                </button>
              ))}
            </div>

            {/* Player list */}
            {[...players]
              .filter(p => {
                const bal = computeBalance(p.ledger);
                if (playerFilter === 'owes') return bal < 0;
                if (playerFilter === 'credit') return bal > 0;
                return true;
              })
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(player => {
                const balance = computeBalance(player.ledger);
                const isExpanded = expandedPlayer === player.id;
                const writtenOff = hasWriteOffHistory(player.ledger);
                return (
                  <div key={player.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                    {/* Player row */}
                    <div className="flex items-center p-4">
                      <button className="flex-1 flex items-center justify-between text-left" onClick={() => setExpandedPlayer(isExpanded ? null : player.id)}>
                        <div>
                          <p className="font-semibold text-gray-900 flex items-center gap-1.5 flex-wrap">
                            {player.name}
                            {writtenOff && (
                              <span className="text-[10px] leading-none bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium whitespace-nowrap">
                                ⚠ write-off history
                              </span>
                            )}
                          </p>
                          {balance < 0 ? (() => {
                            const debtDates = (player.ledger || [])
                              .filter(e => e.amount < 0)
                              .sort((a, b) => a.date.localeCompare(b.date))
                              .map(e => new Date(e.date + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }))
                              .join(', ');
                            return (
                              <div>
                                <p className="text-sm text-orange-600 font-medium">Owes £{Math.abs(balance)}</p>
                                {debtDates && <p className="text-xs text-orange-400">{debtDates}</p>}
                              </div>
                            );
                          })() : (
                            <p className={`text-sm ${balance > 0 ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                              {balance === 0 ? 'Up to date' : `Credit £${balance}`}
                            </p>
                          )}
                        </div>
                        {isExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                      </button>
                      <button onClick={() => setPlayers(players.filter(p => p.id !== player.id))} className="ml-3 text-gray-300 hover:text-red-500 transition">
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Expanded: edit name + ledger + add entry */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
                        {/* Edit name */}
                        <EditName player={player} onSave={(name) => setPlayers(players.map(p => p.id === player.id ? { ...p, name } : p))} />
                        {/* Quick action buttons: paid me back / write off */}
                        {balance < 0 && entryForm?.playerId !== player.id && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEntryForm({ playerId: player.id });
                                setEntryDraft({ date: today, amount: Math.abs(balance).toString(), label: 'Paid me back', type: 'credit' });
                              }}
                              className="flex-1 bg-blue-600 text-white py-2 rounded font-semibold text-sm hover:bg-blue-700 transition"
                            >
                              Paid me back — £{Math.abs(balance)}
                            </button>
                            <button
                              onClick={() => {
                                setEntryForm({ playerId: player.id });
                                setEntryDraft({ date: today, amount: Math.abs(balance).toString(), label: 'Debt written off', type: 'writeoff' });
                              }}
                              className="flex-1 bg-amber-500 text-white py-2 rounded font-semibold text-sm hover:bg-amber-600 transition"
                            >
                              Write off — £{Math.abs(balance)}
                            </button>
                          </div>
                        )}
                        {/* Ledger entries */}
                        {(player.ledger || []).length === 0 ? (
                          <p className="text-sm text-gray-400">No entries yet</p>
                        ) : (
                          <div className="space-y-2">
                            {[...player.ledger]
                              .sort((a, b) => a.date.localeCompare(b.date))
                              .map(entry => (
                                <div key={entry.id} className={`flex items-center justify-between rounded p-2 border ${entry.type === 'writeoff' ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}>
                                  <div>
                                    <p className="text-sm font-medium text-gray-800">{entry.label}</p>
                                    <p className="text-xs text-gray-400">{formatDate(entry.date)}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {entry.type === 'writeoff' ? (
                                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium whitespace-nowrap">
                                        Written off · £{Math.abs(entry.amount)}
                                      </span>
                                    ) : (
                                      <span className={`text-sm font-semibold ${entry.amount < 0 ? 'text-orange-600' : 'text-blue-600'}`}>
                                        {entry.amount < 0 ? '−' : '+'}£{Math.abs(entry.amount)}
                                      </span>
                                    )}
                                    <button onClick={() => deleteEntry(player.id, entry.id)} className="text-gray-300 hover:text-red-500 transition">
                                      <X size={14} />
                                    </button>
                                  </div>
                                </div>
                              ))
                            }
                          </div>
                        )}

                        {/* Add entry form */}
                        {entryForm?.playerId === player.id ? (
                          <div className="bg-white rounded p-3 border border-gray-200 space-y-2">
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEntryDraft({ ...entryDraft, type: 'debt' })}
                                className={`flex-1 py-1 rounded text-sm font-medium ${entryDraft.type === 'debt' ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-600'}`}
                              >Debt (owes)</button>
                              <button
                                onClick={() => setEntryDraft({ ...entryDraft, type: 'credit' })}
                                className={`flex-1 py-1 rounded text-sm font-medium ${entryDraft.type === 'credit' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}`}
                              >Credit (paid)</button>
                              <button
                                onClick={() => setEntryDraft({ ...entryDraft, type: 'writeoff' })}
                                className={`flex-1 py-1 rounded text-sm font-medium ${entryDraft.type === 'writeoff' ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-600'}`}
                              >Write off</button>
                            </div>
                            <input
                              type="date" value={entryDraft.date}
                              onChange={(e) => setEntryDraft({ ...entryDraft, date: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                            />
                            <input
                              type="number" placeholder="Amount (£)" value={entryDraft.amount} min="0" step="0.50"
                              onChange={(e) => setEntryDraft({ ...entryDraft, amount: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                            />
                            <input
                              type="text" placeholder="Label (e.g. Fri 18 Jul - unpaid)" value={entryDraft.label}
                              onChange={(e) => setEntryDraft({ ...entryDraft, label: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                            />
                            <div className="flex gap-2">
                              <button onClick={addManualEntry} className="flex-1 bg-green-600 text-white py-2 rounded text-sm font-semibold hover:bg-green-700">Save</button>
                              <button onClick={() => { setEntryForm(null); setEntryDraft({ date: '', amount: '', label: '', type: 'debt' }); }}
                                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded text-sm font-semibold hover:bg-gray-300">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEntryForm({ playerId: player.id }); setEntryDraft({ date: today, amount: settings.playerFee.toString(), label: '', type: 'debt' }); }}
                            className="flex items-center gap-2 text-green-600 text-sm font-medium hover:text-green-700"
                          >
                            <Plus size={16} /> Add entry
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            }

            {players.filter(p => {
              const bal = computeBalance(p.ledger);
              if (playerFilter === 'owes') return bal < 0;
              if (playerFilter === 'credit') return bal > 0;
              return false;
            }).length === 0 && playerFilter !== 'all' && (
              <p className="text-center text-gray-400 py-6 text-sm">No players in this category</p>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            {/* Create Week */}
            <div className="bg-white p-3 rounded-lg shadow-sm flex items-center gap-2">
              <input type="date" defaultValue={nextFridayDate()} onChange={(e) => setNewSessionDate(e.target.value)}
                className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm" />
              <button onClick={() => createNewSession(newSessionDate || nextFridayDate())}
                className="bg-green-600 text-white px-4 py-2 rounded font-semibold hover:bg-green-700 transition text-sm whitespace-nowrap">Create Week</button>
            </div>

            {/* Month cards */}
            {(() => {
              // Collect all months from past sessions + invoice payments
              const monthSet = new Set();
              pastSessions.forEach(s => monthSet.add(s.date.slice(0, 7)));
              invoicePayments.forEach(p => monthSet.add(p.month));
              const months = [...monthSet].sort((a, b) => b.localeCompare(a)); // newest first

              if (months.length === 0) return <p className="text-center text-gray-400 py-8 text-sm">No history yet</p>;

              return months.map(monthKey => {
                const [yr, mo] = monthKey.split('-').map(Number);
                const monthDate = new Date(yr, mo - 1, 1);
                const monthName = monthDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
                const fridays = getFridaysInMonth(yr, mo - 1);

                // Previous month cancellations affecting this invoice
                const prevDate = new Date(yr, mo - 2, 1);
                const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
                const prevMonthName = prevDate.toLocaleDateString('en-GB', { month: 'long' });
                const prevCancelled = sessions.filter(s => s.status === 'cancelled' && s.date.startsWith(prevMonthKey));
                const discount = prevCancelled.length * settings.pitchCost;
                const fullCost = fridays.length * settings.pitchCost;
                const invoiceAmount = fullCost - discount;

                const invoicePayment = invoicePayments.find(p => p.month === monthKey);
                const monthSessions = pastSessions.filter(s => s.date.startsWith(monthKey))
                  .sort((a, b) => a.date.localeCompare(b.date));
                const isExpanded = expandedMonth === monthKey;

                // Dispute message
                const disputeMsg = prevCancelled.length > 0
                  ? `Hi, we had ${prevCancelled.length} cancelled session${prevCancelled.length > 1 ? 's' : ''} in ${prevMonthName} (${prevCancelled.sort((a,b) => a.date.localeCompare(b.date)).map(s => new Date(s.date + 'T00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })).join(', ')}). Please reduce our ${monthDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} invoice by £${discount} — charge for ${fridays.length - prevCancelled.length} week${fridays.length - prevCancelled.length !== 1 ? 's' : ''} (£${invoiceAmount}) instead of ${fridays.length} (£${fullCost}).`
                  : null;

                return (
                  <div key={monthKey} className="bg-white rounded-lg shadow-sm overflow-hidden">
                    {/* Month header */}
                    <button onClick={() => setExpandedMonth(isExpanded ? null : monthKey)}
                      className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition">
                      <div className="flex items-center gap-3">
                        {isExpanded ? <ChevronUp size={20} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={20} className="text-gray-400 flex-shrink-0" />}
                        <div className="text-left">
                          <p className="font-semibold text-gray-900">{monthName}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {monthSessions.filter(s => s.status === 'closed').length} played
                            {monthSessions.filter(s => s.status === 'cancelled').length > 0 && ` · ${monthSessions.filter(s => s.status === 'cancelled').length} cancelled`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {invoicePayment
                          ? <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-medium">Invoice paid £{invoicePayment.amount}</span>
                          : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">Invoice unpaid</span>
                        }
                      </div>
                    </button>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="border-t border-gray-100">
                        {/* Invoice section */}
                        <div className="p-4 bg-gray-50 space-y-2 border-b border-gray-100">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Invoice</p>
                          <div className="text-sm space-y-1">
                            <div className="flex justify-between text-gray-700">
                              <span>{fridays.length} Fridays × £{settings.pitchCost}</span>
                              <span>£{fullCost}</span>
                            </div>
                            {prevCancelled.length > 0 && (
                              <div className="flex justify-between text-orange-600">
                                <span>{prevCancelled.length} cancellation{prevCancelled.length > 1 ? 's' : ''} from {prevMonthName}</span>
                                <span>−£{discount}</span>
                              </div>
                            )}
                            <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-200 pt-1">
                              <span>Total due</span>
                              <span>£{invoiceAmount}</span>
                            </div>
                          </div>

                          {invoicePayment ? (
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-sm text-green-700 font-medium">✓ Paid £{invoicePayment.amount} on {formatDate(invoicePayment.paidOn)}</span>
                              <button onClick={() => { setInvoicePayments(prev => prev.filter(p => p.id !== invoicePayment.id)); setBankBalance(prev => prev + invoicePayment.amount); }}
                                className="text-xs text-gray-400 hover:text-red-500">Undo</button>
                            </div>
                          ) : confirmingPayment?.month === monthKey ? (
                            <div className="space-y-2 pt-1">
                              <p className="text-sm text-gray-700">Record payment of <strong>£{confirmingPayment.amount}</strong>?</p>
                              <div className="flex gap-2">
                                <button onClick={() => recordInvoicePayment(monthKey, confirmingPayment.amount)}
                                  className="flex-1 bg-green-600 text-white py-1.5 rounded text-sm font-semibold">Confirm</button>
                                <button onClick={() => setConfirmingPayment(null)}
                                  className="flex-1 bg-gray-200 text-gray-600 py-1.5 rounded text-sm font-semibold">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2 pt-1">
                              {disputeMsg && (
                                <button onClick={() => { navigator.clipboard.writeText(disputeMsg); setInvoiceCopied(monthKey); setTimeout(() => setInvoiceCopied(null), 2000); }}
                                  className="flex-1 flex items-center justify-center gap-1 py-1.5 text-sm font-medium text-green-600 bg-white border border-green-200 rounded hover:bg-green-50">
                                  <Copy size={13} />{invoiceCopied === monthKey ? 'Copied!' : 'Copy dispute'}
                                </button>
                              )}
                              <button onClick={() => setConfirmingPayment({ month: monthKey, amount: invoiceAmount })}
                                className="flex-1 py-1.5 text-sm font-medium text-blue-600 bg-white border border-blue-200 rounded hover:bg-blue-50">
                                Record payment
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Sessions in this month */}
                        <div className="divide-y divide-gray-100">
                          {monthSessions.map(session => (
                            <div key={session.id}>
                              <button onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
                                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition">
                                <div className="flex items-center gap-2">
                                  {expandedSession === session.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                                  <div className="text-left">
                                    <p className="text-sm font-medium text-gray-900">
                                      {new Date(session.date + 'T00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                                    </p>
                                    <p className="text-xs text-gray-500 capitalize">{session.status}{session.cancelReason ? ` — ${session.cancelReason}` : ''}</p>
                                  </div>
                                </div>
                                {session.status === 'closed' && (
                                  <span className="text-sm font-semibold text-green-600">£{session.collected} <span className="text-xs font-normal text-gray-400">({session.attendeeCount}p)</span></span>
                                )}
                              </button>
                              {expandedSession === session.id && (
                                <div className="px-4 pb-3 bg-gray-50">
                                  {session.status === 'cancelled' ? (
                                    <button onClick={() => reopenSession(session.id)} className="text-sm text-green-600 font-medium">Reopen session</button>
                                  ) : (
                                    <div className="space-y-2">
                                      {session.collected !== undefined && (
                                        <p className="text-sm font-medium text-green-700">Transferred to bank: £{session.collected} ({session.attendeeCount} × £{Math.round(session.collected / session.attendeeCount)})</p>
                                      )}
                                      <div className="space-y-1">
                                        {players.filter(p => session.playerAttendance[p.id]?.attended)
                                          .sort((a, b) => a.name.localeCompare(b.name))
                                          .map(p => {
                                            const att = session.playerAttendance[p.id];
                                            return (
                                              <div key={p.id} className="flex justify-between items-center text-sm">
                                                <span className="text-gray-800">{p.name}</span>
                                                <span className={`text-xs px-2 py-0.5 rounded ${att.paid ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                                                  {att.paid ? 'Paid' : 'Unpaid'}
                                                </span>
                                              </div>
                                            );
                                          })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            {/* Bank balance override */}
            <BankBalanceEditor bankBalance={bankBalance} onSave={setBankBalance} />

            {/* WhatsApp message */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-900">WhatsApp Message</h2>
                <button onClick={copyToClipboard} className="flex items-center gap-2 text-green-600 hover:text-green-700 text-sm font-medium">
                  <Copy size={16} />
                  {copiedMessage ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <pre className="bg-gray-50 p-3 rounded text-xs text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
                {generateWhatsAppMessage()}
              </pre>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-4">Pricing</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Player fee (£ per session)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                    <input type="number" min="0" step="0.50" value={settingsDraft.playerFee}
                      onChange={(e) => setSettingsDraft({ ...settingsDraft, playerFee: e.target.value })}
                      className="w-full pl-7 pr-4 py-2 border border-gray-300 rounded text-gray-900 text-lg font-medium"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pitch cost (£ per session)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                    <input type="number" min="0" step="0.50" value={settingsDraft.pitchCost}
                      onChange={(e) => setSettingsDraft({ ...settingsDraft, pitchCost: e.target.value })}
                      className="w-full pl-7 pr-4 py-2 border border-gray-300 rounded text-gray-900 text-lg font-medium"
                    />
                  </div>
                </div>
                <div className="bg-gray-50 rounded p-3 text-sm text-gray-600">
                  <p className="font-medium text-gray-700 mb-1">Break-even</p>
                  <p>Need <span className="font-semibold text-gray-900">{Math.ceil(settingsDraft.pitchCost / settingsDraft.playerFee)} players</span> to cover the pitch</p>
                  <p className="text-xs text-gray-500 mt-1">({settingsDraft.pitchCost} ÷ {settingsDraft.playerFee} = {(settingsDraft.pitchCost / settingsDraft.playerFee).toFixed(1)})</p>
                </div>
                <button onClick={saveSettings} className="w-full bg-green-600 text-white py-2 rounded font-semibold hover:bg-green-700 transition">
                  {settingsSaved ? 'Saved!' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cancel Week Modal */}
      {cancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Cancel this week?</h2>
            <p className="text-sm text-gray-500 mb-5">Who cancelled?</p>
            <div className="space-y-3 mb-4">
              <button
                onClick={() => cancelSession(cancelModal.sessionId, 'Cancelled by leisure centre')}
                className="w-full bg-orange-50 border border-orange-200 text-orange-800 py-3 rounded-lg font-medium text-left px-4 hover:bg-orange-100 transition"
              >
                Leisure centre
                <p className="text-xs font-normal text-orange-600 mt-0.5">Pitch unavailable — can dispute invoice</p>
              </button>
              <button
                onClick={() => cancelSession(cancelModal.sessionId, 'Cancelled by us')}
                className="w-full bg-gray-50 border border-gray-200 text-gray-800 py-3 rounded-lg font-medium text-left px-4 hover:bg-gray-100 transition"
              >
                Us
                <p className="text-xs font-normal text-gray-500 mt-0.5">Not enough players or other reason</p>
              </button>
            </div>
            <button onClick={() => setCancelModal(null)} className="w-full text-sm text-gray-400 py-2 hover:text-gray-600">Go back</button>
          </div>
        </div>
      )}

      {/* Close Week Modal */}
      {closeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Week Closed</h2>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 text-center">
              <p className="text-sm text-green-700 mb-1">{closeModal.attendeeCount} players × £{closeModal.playerFee}</p>
              <p className="text-4xl font-bold text-green-700">£{closeModal.collected}</p>
              <p className="text-sm font-semibold text-green-800 mt-1">Transfer to FNF bank</p>
            </div>

            <div className="flex justify-between text-sm text-gray-600 mb-4 bg-gray-50 rounded-lg p-3">
              <span>New bank balance</span>
              <span className="font-semibold text-gray-900">£{closeModal.newBalance}</span>
            </div>

            {closeModal.unpaidCount > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-orange-800">{closeModal.unpaidCount} player{closeModal.unpaidCount > 1 ? 's' : ''} marked as owing — their balance has been updated.</p>
              </div>
            )}

            <button
              onClick={() => setCloseModal(null)}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
            >Got it</button>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-2xl mx-auto flex justify-around">
          {[
            { id: 'dashboard', label: 'Home', icon: Home },
            { id: 'players', label: 'Players', icon: Users },
            { id: 'history', label: 'History', icon: CalendarDays },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map(tab => {
            const active = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-2 transition ${active ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                <Icon size={22} className={active ? 'text-green-600' : 'text-gray-400'} />
                <span className={`text-xs font-medium ${active ? 'text-green-600' : 'text-gray-400'}`}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FNFApp;
