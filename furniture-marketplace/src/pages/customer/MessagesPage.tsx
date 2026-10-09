import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MessageCircle, Send } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import * as api from '../../services/api';

export function MessagesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedConversationId = searchParams.get('conversationId');
  const [conversations, setConversations] = useState<api.ApiConversation[]>([]);
  const [messages, setMessages] = useState<api.ApiMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const loadConversations = useCallback(async () => {
    try {
      const items = await api.listConversations();
      setConversations(items);
      if (!selectedConversationId && items.length > 0) {
        setSearchParams({ conversationId: items[0].id }, { replace: true });
      }
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load conversations.');
    } finally {
      setLoadingConversations(false);
    }
  }, [selectedConversationId, setSearchParams]);

  useEffect(() => {
    if (!user) return;
    void loadConversations();
    const interval = window.setInterval(() => void loadConversations(), 20_000);
    return () => window.clearInterval(interval);
  }, [loadConversations, user]);

  useEffect(() => {
    if (!selectedConversationId || !user) {
      setMessages([]);
      return;
    }
    let active = true;
    setLoadingMessages(true);
    api.listConversationMessages(selectedConversationId)
      .then((items) => {
        if (active) setMessages(items);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'Could not load messages.');
        }
      })
      .finally(() => {
        if (active) setLoadingMessages(false);
      });
    return () => {
      active = false;
    };
  }, [selectedConversationId, user]);

  const submitReply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedConversationId || !draft.trim()) return;
    setSending(true);
    try {
      const sent = await api.sendConversationMessage(
        selectedConversationId,
        draft.trim()
      );
      setMessages((current) => [...current, sent]);
      setDraft('');
      await loadConversations();
    } catch (cause) {
      toast(
        cause instanceof Error ? cause.message : 'Could not send your message.',
        'error'
      );
    } finally {
      setSending(false);
    }
  };

  const currentConversation = conversations.find(
    (conversation) => conversation.id === selectedConversationId
  );
  const seller = user?.role === 'seller';

  const content = !user ? (
    <div className="rounded-xl border border-sand bg-white p-8 text-center shadow-soft">
      <MessageCircle className="mx-auto h-8 w-8 text-brown" />
      <h1 className="mt-3 font-display text-2xl font-semibold text-charcoal">Your messages</h1>
      <p className="mt-2 text-sm text-muted">Sign in to see messages from sellers and customers.</p>
      <Link to="/login" className="mt-5 inline-block">
        <Button>Sign in</Button>
      </Link>
    </div>
  ) : user.role === 'admin' ? (
    <div className="rounded-xl border border-sand bg-white p-8 text-center text-muted">
      Messaging is available to customers and sellers.
    </div>
  ) : (
    <div className="grid min-h-[32rem] overflow-hidden rounded-xl border border-sand bg-white shadow-soft md:grid-cols-[18rem_1fr]">
      <aside className="border-b border-sand md:border-b-0 md:border-r">
        <div className="border-b border-sand px-4 py-4">
          <h1 className="font-display text-xl font-semibold text-charcoal">Messages</h1>
          <p className="mt-1 text-xs text-muted">Talk directly with your marketplace contacts.</p>
        </div>
        <div className="max-h-72 overflow-y-auto md:max-h-[36rem]">
          {loadingConversations && (
            <p className="p-4 text-sm text-muted">Loading conversations…</p>
          )}
          {!loadingConversations && conversations.length === 0 && (
            <p className="p-4 text-sm text-muted">No messages yet.</p>
          )}
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              onClick={() => setSearchParams({ conversationId: conversation.id })}
              className={`block w-full border-b border-sand/70 px-4 py-3 text-left hover:bg-cream/60 ${
                conversation.id === selectedConversationId ? 'bg-cream' : ''
              }`}
            >
              <span className="block truncate text-sm font-semibold text-charcoal">
                {conversation.otherParticipantName}
              </span>
              <span className="block truncate text-xs text-muted">
                {conversation.productName || 'Marketplace conversation'}
              </span>
              <span className="mt-1 block truncate text-xs text-stone">
                {conversation.lastMessage}
              </span>
            </button>
          ))}
        </div>
      </aside>

      <section className="flex min-h-[30rem] flex-col">
        {currentConversation ? (
          <>
            <header className="border-b border-sand px-5 py-4">
              <h2 className="font-semibold text-charcoal">
                {currentConversation.otherParticipantName}
              </h2>
              <p className="mt-0.5 text-xs text-muted">{currentConversation.productName}</p>
            </header>
            {error && <p role="alert" className="px-5 pt-3 text-sm text-error">{error}</p>}
            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {loadingMessages && <p className="text-sm text-muted">Loading messages…</p>}
              {!loadingMessages && messages.map((message) => {
                const ownMessage = message.senderId === user.id;
                return (
                  <div
                    key={message.id}
                    className={`flex ${ownMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      ownMessage ? 'bg-brown text-white' : 'bg-cream text-charcoal'
                    }`}>
                      <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                      <time className={`mt-1 block text-[10px] ${
                        ownMessage ? 'text-white/70' : 'text-muted'
                      }`}>
                        {new Date(message.createdAt).toLocaleString()}
                      </time>
                    </div>
                  </div>
                );
              })}
            </div>
            <form onSubmit={submitReply} className="flex gap-2 border-t border-sand p-4">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={2}
                maxLength={4000}
                required
                aria-label="Write a message"
                placeholder="Write a message…"
                className="min-h-11 flex-1 resize-y rounded-lg border border-sand bg-ivory px-3 py-2 text-sm outline-none focus:border-brown"
              />
              <Button type="submit" aria-label="Send message" disabled={sending || !draft.trim()}>
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">{sending ? 'Sending…' : 'Send'}</span>
              </Button>
            </form>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-muted">
            <MessageCircle className="h-8 w-8 text-sand" />
            <p className="mt-3 text-sm">Choose a conversation to read and reply.</p>
          </div>
        )}
      </section>
    </div>
  );

  if (seller) {
    return <div className="mx-auto max-w-6xl">{content}</div>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{content}</main>
      <Footer />
    </div>
  );
}
