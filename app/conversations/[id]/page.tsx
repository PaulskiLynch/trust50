"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

type UserSummary = {
  id: string;
  email: string;
  name: string | null;
};

type Message = {
  id: string;
  body: string;
  createdAt: string;
  senderId: string;
  sender?: UserSummary | null;
};

type Conversation = {
  id: string;
  kind: string;
  group?: {
    id: string;
    name: string;
  } | null;
  participantOneId: string;
  participantTwoId: string;
  participantOne?: UserSummary | null;
  participantTwo?: UserSummary | null;
  messages: Message[];
  introduction?: {
    id: string;
    status: string;
    request: {
      id: string;
      content: string;
      group: {
        id: string;
        name: string;
      };
      creator?: UserSummary | null;
    };
    connector?: UserSummary | null;
    targetUser?: UserSummary | null;
  } | null;
};

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function ConversationPage({ params }: PageProps) {
  const { data: session } = useSession();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    void params.then((value) => setConversationId(value.id));
  }, [params]);

  const loadConversation = useCallback(async () => {
    if (!conversationId) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/conversations/${conversationId}`);
      const data = (await response.json()) as Conversation | { error?: string };

      if (!response.ok) {
        throw new Error(("error" in data && data.error) || "Unable to load conversation");
      }

      setConversation(data as Conversation);
      setFlash(null);
    } catch (error) {
      setConversation(null);
      setFlash(error instanceof Error ? error.message : "Unable to load conversation");
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    if (conversationId) {
      void loadConversation();
    }
  }, [conversationId, loadConversation]);

  const currentUserId = session?.user?.id ?? null;

  const otherParticipant = useMemo(() => {
    if (!conversation || !currentUserId) {
      return null;
    }

    if (conversation.participantOneId === currentUserId) {
      return conversation.participantTwo;
    }

    return conversation.participantOne;
  }, [conversation, currentUserId]);

  const conversationGroup = conversation?.group || conversation?.introduction?.request.group || null;
  const conversationKind = conversation?.introduction ? "introduction" : conversation?.kind;

  const handleSend = async () => {
    if (!conversationId || !draft.trim()) {
      return;
    }

    setSending(true);
    setFlash(null);

    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          body: draft,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to send message");
      }

      setDraft("");
      await loadConversation();
    } catch (error) {
      setFlash(error instanceof Error ? error.message : "Unable to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-6 py-16 text-foreground">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <Link
              href={conversationGroup ? `/groups/${conversationGroup.id}` : "/"}
              className="text-sm font-medium text-muted transition hover:text-foreground"
            >
              ← Back
            </Link>
            <h1 className="text-4xl font-semibold tracking-tight">
              {otherParticipant?.name || otherParticipant?.email || "Conversation"}
            </h1>
            <p className="max-w-3xl text-base text-muted">
              {conversationKind === "introduction"
                    ? `Structured conversation from an accepted reply in ${conversationGroup?.name || "Trust50"}.`
                    : `Private conversation between members of ${conversationGroup?.name || "Trust50"}.`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadConversation()}
            className="rounded-full border border-line bg-panel px-4 py-2 text-sm font-medium transition hover:border-foreground"
          >
            Refresh
          </button>
        </div>

        {flash ? (
          <div className="rounded-2xl border border-line bg-panel px-4 py-3 text-sm text-muted">
            {flash}
          </div>
        ) : null}

        {conversation ? (
          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-line bg-panel p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">Conversation</h2>
                  <p className="mt-1 text-sm text-muted">
                    Only the two participants in this conversation can view and send messages here.
                  </p>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
                  {conversationKind === "introduction" ? "structured" : "direct"}
                </span>
              </div>

              <div className="mt-5 min-h-[24rem] space-y-3 rounded-3xl border border-line bg-white p-4">
                {!conversation.messages.length ? (
                  <p className="text-sm text-muted">
                    No messages yet. Send the first one to start the conversation.
                  </p>
                ) : null}

                {conversation.messages.map((message) => {
                  const isMine = message.senderId === currentUserId;

                  return (
                    <div
                      key={message.id}
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                        isMine
                          ? "ml-auto bg-foreground text-white"
                          : "bg-stone-100 text-foreground"
                      }`}
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
                        {message.sender?.name || message.sender?.email || message.senderId}
                      </p>
                      <p className="mt-2">{message.body}</p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
                <input
                  className="rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-foreground"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Write a message"
                />
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={sending || !draft.trim()}
                  className="rounded-full bg-foreground px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sending ? "Sending..." : "Send"}
                </button>
              </div>
            </div>

            <aside className="space-y-6">
              <section className="rounded-3xl border border-line bg-panel p-6 shadow-sm">
                <h2 className="text-xl font-semibold">
                  {conversation.kind === "introduction" ? "Discussion context" : "Shared context"}
                </h2>
                <div className="mt-4 space-y-4 text-sm text-muted">
                  {conversation.introduction ? (
                    <>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em]">Request</p>
                        <p className="mt-1 text-foreground">
                          {conversation.introduction.request.content}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em]">Connector</p>
                        <p className="mt-1 text-foreground">
                          {conversation.introduction.connector?.name ||
                            conversation.introduction.connector?.email ||
                            "Unknown"}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em]">Group</p>
                <p className="mt-1 text-foreground">{conversationGroup?.name || "Trust50"}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em]">Participants</p>
                    <p className="mt-1 text-foreground">
                      {conversation.participantOne?.name ||
                        conversation.participantOne?.email ||
                        conversation.participantOneId}
                      {" and "}
                      {conversation.participantTwo?.name ||
                        conversation.participantTwo?.email ||
                        conversation.participantTwoId}
                    </p>
                  </div>
                </div>
              </section>
            </aside>
          </section>
        ) : loading ? (
          <div className="rounded-3xl border border-line bg-panel p-8 text-sm text-muted">
            Loading conversation...
          </div>
        ) : null}
      </div>
    </main>
  );
}
