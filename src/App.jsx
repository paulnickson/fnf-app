import React, { useState, useEffect } from 'react';
import { Copy, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

const FNFApp = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sessions, setSessions] = useState([]);
  const [players, setPlayers] = useState([]);
  const [bankBalance, setBankBalance] = useState(0);
  const [showNewPlayer, setShowNewPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [expandedSession, setExpandedSession] = useState(null);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [playerFilter, setPlayerFilter] = useState('all');
  const [settings, setSettings] = useState({ playerFee: 8, pitchCost: 104 });
  const [settingsDraft, setSettingsDraft] = useState({ playerFee: 8, pitchCost: 104 });
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Load data from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('fnfData');
    if (saved) {
      const data = JSON.parse(saved);
      setPlayers(data.players || []);
      setSessions(data.sessions || []);
      setBankBalance(data.bankBalance || 0);
      if (data.settings) {
        setSettings(data.settings);
        setSettingsDraft(data.settings);
      }
    } else {
      initializeDemo();
    }
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem('fnfData', JSON.stringify({
      players,
      sessions,
      bankBalance,
      settings,
    }));
  }, [players, sessions, bankBalance, settings]);

  const initializeDemo = () => {
    const demoPlayers = [
      { id: '1', name: 'Luke', balance: -8 },
      { id: '2', name: 'Ash', balance: -8 },
      { id: '3', name: 'Saxon', balance: -8 },
      { id: '4', name: 'Abdul', balance: 0 },
      { id: '5', name: 'Adil', balance: 0 },
      { id: '6', name: 'Adriano', balance: 0 },
    ];

    const nextFriday = new Date();
    nextFriday.setDate(nextFriday.getDate() + ((5 - nextFriday.getDay() + 7) % 7 || 7));

    const demoSessions = [
      {
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
      },
    ];

    setPlayers(demoPlayers);
    setSessions(demoSessions);
    setBankBalance(622);
  };

  const addPlayer = () => {
    if (newPlayerName.trim()) {
      setPlayers([
        ...players,
        { id: Date.now().toString(), name: newPlayerName, balance: 0 },
      ]);
      setNewPlayerName('');
      setShowNewPlayer(false);
    }
  };

  const createNewSession = () => {
    const nextFriday = new Date();
    nextFriday.setDate(nextFriday.getDate() + ((5 - nextFriday.getDay() + 7) % 7 || 7));

    const attendance = {};
    players.forEach(p => {
      attendance[p.id] = { attended: false, paid: false };
    });

    const newSession = {
      id: Date.now().toString(),
      date: nextFriday.toISOString().split('T')[0],
      status: 'open',
      playerAttendance: attendance,
    };

    setSessions([newSession, ...sessions]);
  };

  const updateAttendance = (sessionId, playerId, field, value) => {
    setSessions(
      sessions.map(s =>
        s.id === sessionId
          ? {
              ...s,
              playerAttendance: {
                ...s.playerAttendance,
                [playerId]: { ...s.playerAttendance[playerId], [field]: value },
              },
            }
          : s
      )
    );
  };

  const closeSession = (sessionId) => {
    const session = sessions.find(s => s.id === sessionId);
    const attendeeCount = Object.values(session.playerAttendance).filter(a => a.attended).length;
    const collected = attendeeCount * settings.playerFee;
    const net = collected - settings.pitchCost;

    setSessions(
      sessions.map(s =>
        s.id === sessionId
          ? {
              ...s,
              status: 'closed',
              collected,
              pitchCost: settings.pitchCost,
              netAmount: net,
              attendeeCount,
            }
          : s
      )
    );

    setBankBalance(prev => prev + net);

    setPlayers(
      players.map(p => {
        const attendance = session.playerAttendance[p.id];
        if (attendance && attendance.attended && !attendance.paid) {
          return { ...p, balance: p.balance - settings.playerFee };
        }
        return p;
      })
    );
  };

  const cancelSession = (sessionId) => {
    setSessions(
      sessions.map(s =>
        s.id === sessionId ? { ...s, status: 'cancelled' } : s
      )
    );
  };

  const saveSettings = () => {
    const updated = {
      playerFee: parseFloat(settingsDraft.playerFee) || 8,
      pitchCost: parseFloat(settingsDraft.pitchCost) || 104,
    };
    setSettings(updated);
    setSettingsDraft(updated);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  };

  const generateWhatsAppMessage = () => {
    const overdue = players.filter(p => p.balance < 0);
    if (overdue.length === 0) return 'All payments up to date!';

    const lines = ['Friday Night Football - outstanding balances', ''];
    overdue.forEach(p => {
      lines.push(`${p.name} - £${Math.abs(p.balance)}`);
    });
    lines.push('');
    lines.push(`Total outstanding: £${overdue.reduce((sum, p) => sum + Math.abs(p.balance), 0)}`);
    return lines.join('\n');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateWhatsAppMessage());
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  const totalOwed = Math.abs(players.reduce((sum, p) => sum + Math.min(p.balance, 0), 0));
  const currentSession = sessions.find(s => s.status === 'open');
  const pastSessions = sessions.filter(s => s.status !== 'open');

  return (
    <div className="bg-gray-50 min-h-screen">
      <style>{`
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        * { box-sizing: border-box; }
      `}</style>

      {/* Header */}
      <div className="bg-green-600 text-white sticky top-0 z-50 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">FNF</h1>
          <p className="text-green-100 text-sm">Friday Night Football</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-4 pb-32">

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-600">
                <p className="text-gray-600 text-xs font-semibold uppercase tracking-wide">Bank Balance</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">£{bankBalance}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-orange-500">
                <p className="text-gray-600 text-xs font-semibold uppercase tracking-wide">Amount Owed</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">£{totalOwed}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-900">WhatsApp Message</h2>
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-2 text-green-600 hover:text-green-700 text-sm font-medium"
                >
                  <Copy size={16} />
                  {copiedMessage ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <pre className="bg-gray-50 p-3 rounded text-xs text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
                {generateWhatsAppMessage()}
              </pre>
            </div>

            {currentSession && (
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <h2 className="font-semibold text-gray-900 mb-3">
                  {new Date(currentSession.date + 'T00:00').toLocaleDateString('en-GB', {
                    weekday: 'long', month: 'short', day: 'numeric',
                  })}
                </h2>

                <div className="space-y-2 mb-4">
                  {players.map(player => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200"
                    >
                      <span className="font-medium text-gray-900">{player.name}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            updateAttendance(currentSession.id, player.id, 'attended',
                              !currentSession.playerAttendance[player.id]?.attended)
                          }
                          className={`px-3 py-1 rounded text-sm font-medium transition ${
                            currentSession.playerAttendance[player.id]?.attended
                              ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-700'
                          }`}
                        >
                          In
                        </button>
                        <button
                          onClick={() =>
                            updateAttendance(currentSession.id, player.id, 'paid',
                              !currentSession.playerAttendance[player.id]?.paid)
                          }
                          className={`px-3 py-1 rounded text-sm font-medium transition ${
                            currentSession.playerAttendance[player.id]?.paid
                              ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-700'
                          }`}
                        >
                          Paid
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Session preview */}
                <div className="bg-gray-50 rounded p-3 mb-3 text-sm text-gray-600">
                  {(() => {
                    const attending = Object.values(currentSession.playerAttendance).filter(a => a.attended).length;
                    const collected = attending * settings.playerFee;
                    const net = collected - settings.pitchCost;
                    return (
                      <div className="flex justify-between">
                        <span>{attending} players × £{settings.playerFee} = £{collected}</span>
                        <span className={net >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                          Net: {net >= 0 ? '+' : ''}£{net}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => closeSession(currentSession.id)}
                    className="flex-1 bg-green-600 text-white py-2 rounded font-semibold hover:bg-green-700 transition"
                  >
                    Close Week
                  </button>
                  <button
                    onClick={() => cancelSession(currentSession.id)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 rounded font-semibold hover:bg-gray-400 transition"
                  >
                    Cancel
                  </button>
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
                <button
                  onClick={() => setShowNewPlayer(true)}
                  className="w-full bg-green-600 text-white py-2 rounded font-semibold hover:bg-green-700 transition"
                >
                  Add Player
                </button>
              ) : (
                <div className="flex gap-2 w-full">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Player name"
                    value={newPlayerName}
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
                { id: 'owes', label: `Owes (${players.filter(p => p.balance < 0).length})` },
                { id: 'credit', label: `Credit (${players.filter(p => p.balance > 0).length})` },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setPlayerFilter(f.id)}
                  className={`flex-1 py-2 text-sm font-medium transition ${
                    playerFilter === f.id
                      ? 'bg-green-600 text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Player list — alphabetical, filtered */}
            {[...players]
              .filter(p => {
                if (playerFilter === 'owes') return p.balance < 0;
                if (playerFilter === 'credit') return p.balance > 0;
                return true;
              })
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(player => (
                <div key={player.id} className="bg-white p-4 rounded-lg shadow-sm flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{player.name}</p>
                    <p className={`text-sm ${player.balance < 0 ? 'text-orange-600 font-medium' : player.balance > 0 ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                      {player.balance < 0 ? `Owes £${Math.abs(player.balance)}` : player.balance === 0 ? 'Up to date' : `Credit £${player.balance}`}
                    </p>
                  </div>
                  <button
                    onClick={() => setPlayers(players.filter(p => p.id !== player.id))}
                    className="text-gray-400 hover:text-red-600 transition"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            }

            {players.filter(p => {
              if (playerFilter === 'owes') return p.balance < 0;
              if (playerFilter === 'credit') return p.balance > 0;
              return false;
            }).length === 0 && playerFilter !== 'all' && (
              <p className="text-center text-gray-400 py-6 text-sm">No players in this category</p>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            <button
              onClick={createNewSession}
              className="w-full bg-green-600 text-white py-2 rounded font-semibold hover:bg-green-700 transition"
            >
              Create New Week
            </button>

            {pastSessions.map(session => (
              <div key={session.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <button
                  onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-3">
                    {expandedSession === session.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">
                        {new Date(session.date + 'T00:00').toLocaleDateString('en-GB', {
                          weekday: 'short', month: 'short', day: 'numeric',
                        })}
                      </p>
                      <p className="text-sm text-gray-600 capitalize">{session.status}</p>
                    </div>
                  </div>
                  {session.status === 'closed' && (
                    <div className="text-right">
                      <p className={`font-semibold ${session.netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {session.netAmount >= 0 ? '+' : ''}£{session.netAmount}
                      </p>
                      <p className="text-xs text-gray-400">{session.attendeeCount} players</p>
                    </div>
                  )}
                </button>

                {expandedSession === session.id && (
                  <div className="bg-gray-50 p-4 border-t border-gray-200">
                    {session.status === 'cancelled' ? (
                      <p className="text-sm text-gray-600">This session was cancelled</p>
                    ) : (
                      <div className="space-y-3">
                        {/* Financial breakdown */}
                        {session.collected !== undefined && (
                          <div className="text-sm bg-white rounded p-3 border border-gray-200 space-y-1">
                            <div className="flex justify-between text-gray-700">
                              <span>Collected ({session.attendeeCount} × £{session.collected / session.attendeeCount})</span>
                              <span>£{session.collected}</span>
                            </div>
                            <div className="flex justify-between text-gray-700">
                              <span>Pitch cost</span>
                              <span>−£{session.pitchCost}</span>
                            </div>
                            <div className={`flex justify-between font-semibold border-t border-gray-200 pt-1 ${session.netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              <span>Net</span>
                              <span>{session.netAmount >= 0 ? '+' : ''}£{session.netAmount}</span>
                            </div>
                          </div>
                        )}
                        {/* Player list */}
                        <div className="space-y-2 text-sm">
                          {players.map(p => {
                            const att = session.playerAttendance[p.id];
                            if (!att) return null;
                            return (
                              <div key={p.id} className="flex justify-between items-center">
                                <span className="text-gray-900">{p.name}</span>
                                <div className="flex gap-2">
                                  {att.attended && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Played</span>}
                                  {att.attended && att.paid && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Paid</span>}
                                </div>
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
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-4">Pricing</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Player fee (£ per session)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                    <input
                      type="number"
                      min="0"
                      step="0.50"
                      value={settingsDraft.playerFee}
                      onChange={(e) => setSettingsDraft({ ...settingsDraft, playerFee: e.target.value })}
                      className="w-full pl-7 pr-4 py-2 border border-gray-300 rounded text-gray-900 text-lg font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pitch cost (£ per session)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                    <input
                      type="number"
                      min="0"
                      step="0.50"
                      value={settingsDraft.pitchCost}
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

                <button
                  onClick={saveSettings}
                  className="w-full bg-green-600 text-white py-2 rounded font-semibold hover:bg-green-700 transition"
                >
                  {settingsSaved ? 'Saved!' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-2xl mx-auto flex justify-around">
          {[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'players', label: 'Players' },
            { id: 'history', label: 'History' },
            { id: 'settings', label: 'Settings' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-sm font-medium transition border-t-2 ${
                activeTab === tab.id
                  ? 'text-green-600 border-green-600'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FNFApp;
