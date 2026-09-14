import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { MessageSquare, Send, Mic, Volume2, Megaphone, Plus, ArrowLeft, ChevronRight } from 'lucide-react';
import type { Tenant, Message, Announcement, Property } from '@/types';
import { VoiceInput } from '@/components/ui/VoiceInput';
import { SpeakButton } from '@/components/ui/SpeakButton';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { timeAgo } from '@/lib/utils';
import { speak } from '@/lib/voice';

export function Messages() {
  const { profile } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annPropId, setAnnPropId] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const lang = profile?.preferred_language || 'en';

  useEffect(() => {
    const fetchData = async () => {
      const { data: tens } = await supabase.from('tenants').select('*').order('full_name');
      const { data: props } = await supabase.from('properties').select('*');
      const { data: anns } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      setTenants((tens || []) as Tenant[]);
      setProperties((props || []) as Property[]);
      setAnnouncements((anns || []) as Announcement[]);
      setLoading(false);
    };
    fetchData();
  }, []);

  const fetchMessages = async (tenantId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true });
    setMessages((data || []) as Message[]);
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSelectTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    fetchMessages(tenant.id);
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedTenant) return;
    await supabase.from('messages').insert({
      tenant_id: selectedTenant.id,
      sender: 'landlord',
      body: messageText,
      original_language: lang,
      translated_body: '',
    });
    setMessageText('');
    fetchMessages(selectedTenant.id);
  };

  const sendAnnouncement = async () => {
    if (!annBody.trim()) return;
    await supabase.from('announcements').insert({
      property_id: annPropId || null,
      title: annTitle,
      body: annBody,
    });
    setAnnTitle('');
    setAnnBody('');
    setAnnPropId('');
    setShowAnnouncementModal(false);
    const { data: anns } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    setAnnouncements((anns || []) as Announcement[]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-stone-400">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-stone-800">Messages</h2>
          <p className="text-stone-500 text-sm mt-1">Chat with tenants and send announcements</p>
        </div>
        <button
          onClick={() => setShowAnnouncementModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors"
        >
          <Megaphone size={20} />
          <span className="hidden sm:inline">Announcement</span>
        </button>
      </div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <div className="bg-white rounded-2.5xl shadow-card border border-stone-100/80 p-4">
          <h3 className="font-semibold text-stone-800 mb-3 flex items-center gap-2 text-sm">
            <Megaphone size={16} className="text-teal-600" /> Recent Announcements
          </h3>
          <div className="space-y-2">
            {announcements.slice(0, 3).map((ann) => (
              <div key={ann.id} className="flex items-start justify-between p-3 rounded-xl bg-stone-50">
                <div className="flex-1">
                  {ann.title && <p className="font-medium text-stone-700 text-sm">{ann.title}</p>}
                  <p className="text-sm text-stone-500">{ann.body}</p>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <SpeakButton text={`${ann.title}. ${ann.body}`} language={lang} label="" />
                  <span className="text-xs text-stone-400">{timeAgo(ann.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tenant list (shown when no tenant selected) */}
      {!selectedTenant && (
        <div className="space-y-2">
          {tenants.length === 0 ? (
            <EmptyState
              icon={<MessageSquare size={36} />}
              title="No tenants yet"
              description="Add tenants first to start messaging."
            />
          ) : (
            tenants.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelectTenant(t)}
                className="w-full flex items-center gap-3 p-3 bg-white rounded-2xl border border-stone-100 hover:border-teal-200 transition-colors"
              >
                <div className="w-11 h-11 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 text-base font-medium">
                  {t.full_name.charAt(0)}
                </div>
                <div className="text-left">
                  <p className="font-medium text-stone-800">{t.full_name}</p>
                  <p className="text-xs text-stone-400">{t.phone || 'No phone'}</p>
                </div>
                <ChevronRight size={18} className="text-stone-300 ml-auto" />
              </button>
            ))
          )}
        </div>
      )}

      {/* Chat area (shown when a tenant is selected) */}
      {selectedTenant && (
        <div className="bg-white rounded-2.5xl shadow-card border border-stone-100/80 flex flex-col overflow-hidden h-[calc(100vh-220px)]">
          <div className="px-4 py-3 border-b border-stone-100 flex items-center gap-3">
            <button
              onClick={() => setSelectedTenant(null)}
              className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 font-medium">
              {selectedTenant.full_name.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-stone-800">{selectedTenant.full_name}</p>
              <p className="text-xs text-stone-400">
                {selectedTenant.preferred_language} • {selectedTenant.phone || 'No phone'}
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-stone-400">No messages yet. Start the conversation.</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'landlord' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                      msg.sender === 'landlord'
                        ? 'bg-teal-600 text-white'
                        : 'bg-stone-100 text-stone-800'
                    }`}
                  >
                    <p className="text-sm">{msg.body}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs ${msg.sender === 'landlord' ? 'text-teal-100' : 'text-stone-400'}`}>
                        {timeAgo(msg.created_at)}
                      </span>
                      <SpeakButton
                        text={msg.body}
                        language={lang}
                        label=""
                        className={msg.sender === 'landlord' ? 'bg-white/15 text-white' : ''}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-stone-100">
            <VoiceInput
              value={messageText}
              onChange={setMessageText}
              language={lang}
              placeholder="Type or speak your message..."
            />
            <button
              onClick={sendMessage}
              disabled={!messageText.trim()}
              className="mt-2 w-full py-2.5 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <Send size={18} /> Send
            </button>
          </div>
        </div>
      )}

      {/* Announcement Modal */}
      <Modal
        open={showAnnouncementModal}
        onClose={() => setShowAnnouncementModal(false)}
        title="Create Announcement"
        size="lg"
      >
        <div className="p-4 space-y-4">
          <div className="bg-teal-50 rounded-xl p-3 flex items-start gap-2">
            <Mic size={18} className="text-teal-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-teal-700">
              Broadcast a notice to all tenants. They will receive it as both text and audio in their preferred language.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1.5">Property (optional)</label>
            <select
              value={annPropId}
              onChange={(e) => setAnnPropId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">All properties</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1.5">Title (optional)</label>
            <VoiceInput
              value={annTitle}
              onChange={setAnnTitle}
              language={lang}
              placeholder="e.g. Water maintenance notice"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1.5">Message (speak or type)</label>
            <VoiceInput
              value={annBody}
              onChange={setAnnBody}
              language={lang}
              placeholder="Your announcement..."
              multiline
            />
          </div>
          {annBody && (
            <div className="flex items-center gap-2">
              <SpeakButton text={annBody} language={lang} label="Preview audio" />
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowAnnouncementModal(false)}
              className="px-5 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-medium hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={sendAnnouncement}
              disabled={!annBody.trim()}
              className="flex-1 py-2.5 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <Megaphone size={18} /> Send Announcement
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
