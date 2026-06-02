'use strict';

import React, { useState, useEffect } from 'react';
import { Mail, Clock, RefreshCw, Trash2, Eye, Calendar, Sparkles, Send } from 'lucide-react';
import { Memory } from '@/lib/db';
import { EmailLog } from '@/lib/email';

interface EmailSandboxProps {
  refreshTrigger: number;
}

export default function EmailSandbox({ refreshTrigger }: EmailSandboxProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [activeTab, setActiveTab] = useState<'memories' | 'inbox'>('memories');
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [cronStatus, setCronStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [memRes, emailRes] = await Promise.all([
        fetch('/api/memories'),
        fetch('/api/emails/sandbox'),
      ]);
      if (memRes.ok && emailRes.ok) {
        const memData = await memRes.json();
        const emailData = await emailRes.json();
        setMemories(memData);
        setEmails(emailData);
      }
    } catch (err) {
      console.error('Failed to load sandbox data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerCron = async () => {
    setCronStatus('Processing due capsules...');
    try {
      const res = await fetch('/api/cron/send-scheduled-emails', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setCronStatus(`Processed successfully! ${data.processed_count} memories checked.`);
        fetchData();
      } else {
        setCronStatus('Failed to run scheduler check.');
      }
    } catch (err) {
      setCronStatus('Scheduler communication failure.');
    }
    setTimeout(() => setCronStatus(null), 5000);
  };

  const clearInbox = async () => {
    if (!confirm('Clear all simulated emails from sandbox?')) return;
    try {
      const res = await fetch('/api/emails/sandbox', { method: 'DELETE' });
      if (res.ok) {
        setEmails([]);
        setSelectedEmail(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteEmail = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/emails/sandbox?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setEmails((prev) => prev.filter((item) => item.id !== id));
        if (selectedEmail?.id === id) {
          setSelectedEmail(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteMemory = async (id: string) => {
    if (!confirm('Delete this scheduled memory capsule?')) return;
    try {
      const res = await fetch(`/api/memories?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMemories((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="w-full cutting-mat-grid rounded-3xl p-6 relative text-emerald-100">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-emerald-800/30 pb-5 mb-5">
        <div>
          <h3 className="text-lg font-bold text-emerald-50 tracking-tight flex items-center gap-2 font-mono">
            <Mail className="h-5 w-5 text-emerald-400 animate-pulse-slow" />
            Sandbox Developer Console
          </h3>
          <p className="text-xs text-emerald-300/80 font-mono mt-0.5">
            Offline environment for database status checking and email inbox reviews.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={triggerCron}
            className="flex-1 sm:flex-none px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-mono text-xs font-black uppercase tracking-wider rounded-md brutalist-btn cursor-pointer shadow-black flex items-center justify-center gap-1.5"
            title="Check delivery times and deliver capsules due"
          >
            <Send className="h-3.5 w-3.5" /> Force Cron Tick
          </button>
          <button
            onClick={fetchData}
            className="p-2 bg-white hover:bg-slate-50 text-black rounded-md brutalist-btn cursor-pointer shadow-black flex items-center justify-center"
            title="Reload sandbox tables"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {cronStatus && (
        <div className="mb-4 bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 px-3.5 py-2.5 rounded-xl text-xs font-mono flex items-center gap-2 animate-pulse">
          <Sparkles className="h-4 w-4 shrink-0" />
          <span>{cronStatus}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-black mb-5 gap-2">
        <button
          onClick={() => setActiveTab('memories')}
          className={`px-4 py-2 font-mono text-[10px] sm:text-xs font-black uppercase tracking-wider border-2 border-black rounded-t-md transition-all cursor-pointer ${
            activeTab === 'memories'
              ? 'bg-yellow-400 text-black shadow-none translate-y-[1px]'
              : 'bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900 shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-y-[1px]'
          }`}
        >
          Scheduled DB ({memories.length})
        </button>
        <button
          onClick={() => setActiveTab('inbox')}
          className={`px-4 py-2 font-mono text-[10px] sm:text-xs font-black uppercase tracking-wider border-2 border-black rounded-t-md transition-all cursor-pointer ${
            activeTab === 'inbox'
              ? 'bg-yellow-400 text-black shadow-none translate-y-[1px]'
              : 'bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900 shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-y-[1px]'
          }`}
        >
          Mock Email Inbox ({emails.length})
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'memories' && (
        <div className="overflow-x-auto">
          {memories.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-emerald-800/40 rounded-2xl">
              <Clock className="h-8 w-8 text-emerald-700/80 mx-auto mb-2" />
              <p className="text-xs text-emerald-450 font-mono">No memory capsules in database</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-emerald-800/30 text-emerald-450/70 text-[10px] uppercase tracking-wider">
                  <th className="py-2.5">Recipient</th>
                  <th className="py-2.5">Delivery date</th>
                  <th className="py-2.5">Type</th>
                  <th className="py-2.5">Status</th>
                  <th className="py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-800/20 text-emerald-250">
                {memories.map((mem) => {
                  const isPast = new Date(mem.delivery_date) <= new Date();
                  return (
                    <tr key={mem.id} className="hover:bg-emerald-800/10 transition-colors">
                      <td className="py-3 font-semibold text-emerald-100">{mem.recipient_email}</td>
                      <td className="py-3">
                        <div className="flex flex-col">
                          <span>{new Date(mem.delivery_date).toLocaleString()}</span>
                          {mem.status === 'pending' && isPast && (
                            <span className="text-[9px] text-pink-400 font-bold uppercase tracking-tight">
                              Due for delivery!
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 uppercase text-[10px]">{mem.schedule_type}</td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            mem.status === 'sent'
                              ? 'bg-emerald-950/50 border border-emerald-500/20 text-emerald-400'
                              : 'bg-amber-950/50 border border-amber-500/20 text-amber-400'
                          }`}
                        >
                          {mem.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => deleteMemory(mem.id)}
                          className="p-1.5 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                          title="Delete memory"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'inbox' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[250px]">
          {/* Inbox List */}
          <div className={`${selectedEmail ? 'lg:col-span-4' : 'lg:col-span-12'} overflow-y-auto max-h-[400px] flex flex-col gap-2 border-r border-emerald-800/15 pr-2`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-emerald-500 uppercase tracking-wider font-mono">
                MOCK RECEIVED LOGS
              </span>
              {emails.length > 0 && (
                <button
                  onClick={clearInbox}
                  className="text-[10px] text-red-400 hover:text-red-300 underline font-mono active:scale-95 cursor-pointer animate-pulse"
                >
                  Clear Inbox
                </button>
              )}
            </div>

            {emails.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-emerald-800/40 rounded-2xl flex-1 flex flex-col items-center justify-center">
                <Mail className="h-8 w-8 text-emerald-700/80 mb-2" />
                <p className="text-xs text-emerald-450 font-mono">Inbox is empty</p>
              </div>
            ) : (
              emails.map((email) => (
                <div
                  key={email.id}
                  onClick={() => setSelectedEmail(email)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all text-left flex flex-col gap-1.5 ${
                    selectedEmail?.id === email.id
                      ? 'bg-emerald-900/30 border-emerald-500/50 shadow-inner'
                      : 'bg-emerald-950/40 border-emerald-900/45 hover:bg-emerald-900/10 hover:border-emerald-850/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-emerald-400 truncate max-w-[150px]">
                      {email.to}
                    </span>
                    <span className="text-[9px] text-emerald-500/60 font-mono shrink-0">
                      {new Date(email.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h5 className="font-medium text-xs text-emerald-100 line-clamp-1">
                    {email.subject}
                  </h5>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[9px] text-emerald-500/60 font-mono">
                      {new Date(email.created_at).toLocaleDateString()}
                    </span>
                    <button
                      onClick={(e) => deleteEmail(email.id, e)}
                      className="p-1 text-emerald-400/80 hover:text-red-400 rounded-md transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Email Preview Frame */}
          {selectedEmail && (
            <div className="lg:col-span-8 border border-emerald-800/30 rounded-2xl overflow-hidden bg-emerald-950/45 flex flex-col h-[400px]">
              <div className="bg-emerald-900/45 border-b border-emerald-900/40 p-3.5 flex items-center justify-between text-left">
                <div>
                  <h4 className="font-semibold text-xs text-emerald-100">{selectedEmail.subject}</h4>
                  <p className="text-[10px] text-emerald-400 font-mono mt-0.5">To: {selectedEmail.to}</p>
                </div>
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="px-2.5 py-1.5 bg-red-400 hover:bg-red-500 text-black border-2 border-black rounded-md text-[10px] font-mono font-black uppercase tracking-wider brutalist-btn cursor-pointer shadow-black"
                >
                  Close Preview
                </button>
              </div>
              <div className="flex-1 p-4 overflow-y-auto bg-emerald-950/30 text-emerald-100 shadow-inner">
                {/* Visual rendering of raw HTML mock email */}
                <div
                  className="rounded-xl overflow-hidden max-w-full text-zinc-200"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.html }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
