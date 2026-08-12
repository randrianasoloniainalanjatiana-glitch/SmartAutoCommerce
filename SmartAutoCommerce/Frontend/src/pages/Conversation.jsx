import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { DJANGO_API } from "../config/apiConfig";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";
import { Send, Users } from "lucide-react";

const WEBHOOK_URL = "https://n8n.projets-omega.net/webhook/envoie_message_manuel";

function formatTime(isoString) {
  try {
    return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function truncate(text, maxLen) {
  const s = typeof text === "string" ? text : "";
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen)}...`;
}

export default function Conversation() {
  const { user } = useAuth();
  const { parametres, loading: settingsLoading } = useSettings();

  const [conversations, setConversations] = useState([]);
  const [people, setPeople] = useState([]);
  const [selectedPersonId, setSelectedPersonId] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const [reponseAuto, setReponseAuto] = useState(null);
  const [reponseAutoLoading, setReponseAutoLoading] = useState(false);

  const messagesScrollRef = useRef(null);
  const refreshInFlightRef = useRef(false);
  const stickToBottomRef = useRef(true);
  const prevSelectedPersonRef = useRef("");
  const prevMessageCountRef = useRef(0);

  const messengerId = parametres?.messenger_id || "";

  const loadConversations = async ({ silent = false } = {}) => {
    if (!user?.id) return;
    if (!silent) {
      setLoading(true);
      setError("");
    }
    try {
      const res = await axios.get(`${DJANGO_API}/conversations/${user.id}/`);
      const list = res.data || [];
      setConversations((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(list)) return prev;
        return list;
      });
    } catch (e) {
      console.error("Erreur chargement conversations:", e);
      if (!silent) setError("Impossible de charger les conversations.");
      setConversations([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    if (settingsLoading) return;
    if (!messengerId) {
      setPeople([]);
      setSelectedPersonId("");
      return;
    }
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, settingsLoading, messengerId]);

  // Polling léger pour simuler du "temp réel"
  useEffect(() => {
    if (!user?.id) return;
    if (settingsLoading) return;
    if (!messengerId) return;

    const intervalMs = 4000;
    const timer = setInterval(async () => {
      if (refreshInFlightRef.current) return;
      refreshInFlightRef.current = true;
      try {
        await loadConversations({ silent: true });
      } finally {
        refreshInFlightRef.current = false;
      }
    }, intervalMs);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, settingsLoading, messengerId]);

  const computedPeople = useMemo(() => {
    if (!messengerId) return [];
    const lastByPerson = new Map(); // personId -> last conversation row

    const hasReceiver = conversations?.some((c) => c && c.id_receiver !== undefined);

    for (const c of conversations || []) {
      if (!c) continue;

      const sender = c?.id_sender;
      const pageId = c?.page_id ?? messengerId;

      let personId = null;
      if (hasReceiver) {
        const receiver = c?.id_receiver;
        if (!sender || !receiver) continue;
        personId =
          String(sender) === String(pageId) ? String(receiver) : // bot -> client
            String(receiver) === String(pageId) ? String(sender) : // client -> bot
              null;
      } else {
        // fallback si id_receiver n'est pas présent
        if (!sender) continue;
        if (String(sender) === String(pageId)) continue; // bot envoie
        personId = String(sender);
      }

      if (!personId) continue;

      const prev = lastByPerson.get(personId);
      if (!prev) {
        lastByPerson.set(personId, c);
        continue;
      }

      const prevT = new Date(prev.created_at).getTime();
      const curT = new Date(c.created_at).getTime();
      if (curT > prevT) lastByPerson.set(personId, c);
    }

    const arr = Array.from(lastByPerson.entries()).map(([id, last]) => ({
      id,
      lastMessage: last?.message || "",
      lastCreatedAt: last?.created_at || "",
    }));

    arr.sort((a, b) => new Date(b.lastCreatedAt).getTime() - new Date(a.lastCreatedAt).getTime());
    return arr;
  }, [conversations, messengerId]);

  useEffect(() => {
    setPeople(computedPeople);
  }, [computedPeople]);

  useEffect(() => {
    if (!selectedPersonId && people.length > 0) {
      setSelectedPersonId(people[0].id);
    }
    // Si la personne n'existe plus (ex: conversations nettoyées), choisir la première.
    if (selectedPersonId && !people.some((p) => p.id === selectedPersonId)) {
      setSelectedPersonId(people[0]?.id || "");
    }
  }, [people, selectedPersonId]);

  const selectedMessages = useMemo(() => {
    if (!messengerId || !selectedPersonId) return [];

    // Filtrage strict via (id_sender, id_receiver) pour éviter de mélanger plusieurs clients.
    const pageId = String(messengerId);
    const personId = String(selectedPersonId);

    const hasReceiver = conversations?.some((c) => c && c.id_receiver !== undefined);
    if (!hasReceiver) {
      // fallback si jamais id_receiver n'est pas présent
      return (conversations || [])
        .filter(
          (c) => String(c?.id_sender) === personId || String(c?.id_sender) === String(c?.page_id)
        )
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }

    return (conversations || [])
      .filter((c) => {
        const sender = String(c?.id_sender);
        const receiver = String(c?.id_receiver);
        return (
          (sender === personId && receiver === pageId) || // client -> bot
          (sender === pageId && receiver === personId) // bot -> client
        );
      })
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [conversations, messengerId, selectedPersonId]);

  const isNearBottom = (el, threshold = 96) => (
    el.scrollHeight - el.scrollTop - el.clientHeight < threshold
  );

  const handleMessagesScroll = () => {
    const el = messagesScrollRef.current;
    if (!el) return;
    stickToBottomRef.current = isNearBottom(el);
  };

  useEffect(() => {
    const el = messagesScrollRef.current;
    if (!el) return;

    const personChanged = prevSelectedPersonRef.current !== selectedPersonId;
    prevSelectedPersonRef.current = selectedPersonId;

    const messageCount = selectedMessages.length;
    const hasNewMessages = messageCount > prevMessageCountRef.current;
    prevMessageCountRef.current = messageCount;

    if (personChanged) {
      stickToBottomRef.current = true;
    }

    if (personChanged || stickToBottomRef.current || (hasNewMessages && !sending)) {
      requestAnimationFrame(() => {
        if (messagesScrollRef.current) {
          messagesScrollRef.current.scrollTop = messagesScrollRef.current.scrollHeight;
        }
      });
    }
  }, [selectedMessages, selectedPersonId, sending]);

  const fetchReponseAuto = async (idContact) => {
    if (!user?.id || !idContact) return;
    setReponseAutoLoading(true);
    try {
      const res = await axios.get(
        `${DJANGO_API}/contacts/reponse-auto/${user.id}/${encodeURIComponent(idContact)}/`
      );
      setReponseAuto(typeof res.data?.reponse_auto === "boolean" ? res.data.reponse_auto : true);
    } catch (e) {
      console.error("Erreur fetch reponse_auto:", e);
      setReponseAuto(true);
    } finally {
      setReponseAutoLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedPersonId) {
      setReponseAuto(null);
      return;
    }
    fetchReponseAuto(selectedPersonId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPersonId]);

  const updateReponseAuto = async (value) => {
    if (!user?.id || !selectedPersonId) return;
    setReponseAutoLoading(true);
    try {
      const res = await axios.put(
        `${DJANGO_API}/contacts/reponse-auto/${user.id}/${encodeURIComponent(selectedPersonId)}/`,
        { reponse_auto: value }
      );
      const next = typeof res.data?.reponse_auto === "boolean" ? res.data.reponse_auto : value;
      setReponseAuto(next);
    } catch (e) {
      console.error("Erreur update reponse_auto:", e);
      // on garde l'ancienne valeur
    } finally {
      setReponseAutoLoading(false);
    }
  };

  const safeUuid = () => {
    try {
      if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    } catch {
      // ignore
    }
    return `manual_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  };

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    if (!selectedPersonId) {
      setError("Sélectionnez d'abord une personne dans la liste à gauche.");
      return;
    }
    if (!messengerId) {
      setError("Votre Messenger ID n'est pas configuré dans les paramètres.");
      return;
    }

    setSending(true);
    setError("");

    const payload = {
      // Référence comme dans la table `conversations`
      Message_id: safeUuid(),
      platform: "messenger",
      message: trimmed,
      id_sender: messengerId, // pour un message envoyé par le bot / page
      page_id: messengerId, // doit matcher `conversations.page_id`

      // Infos utiles pour la webhook (pour envoyer vers la bonne personne)
      id_receiver: selectedPersonId,

      // Paramètres boutique (n8n peut en avoir besoin pour appeler l'API Messenger)
      id_utilisateur: user?.id,
      messenger_id: messengerId,
      page_id_facebook: parametres?.page_id,
      page_access_token: parametres?.page_access_token,
    };

    try {
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status}`);
      }

      setMessage("");
      stickToBottomRef.current = true;
      await loadConversations();
    } catch (e) {
      console.error("Erreur webhook n8n:", e);
      setError("Erreur lors de l'envoi du message.");
    } finally {
      setSending(false);
    }
  };

  const handleInputKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-3 flex-1 min-h-0 h-full overflow-hidden">
      {/* Colonne gauche: liste des personnes */}
        <aside
          className={`w-full md:w-80 h-full min-h-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden flex flex-col md:flex-shrink-0 ${
            selectedPersonId ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-cyan-500" />
              <h2 className="text-sm font-bold text-gray-800 dark:text-white">Personnes</h2>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {loading && (
              <div className="p-4 text-sm text-gray-500 dark:text-gray-400">Chargement...</div>
            )}

            {!loading && people.length === 0 && (
              <div className="p-4 text-sm text-gray-500 dark:text-gray-400">
                Aucune conversation pour cette boutique.
              </div>
            )}

            {!loading &&
              people.map((p) => {
                const isSelected = p.id === selectedPersonId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPersonId(p.id)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-50 dark:border-gray-700 transition-colors ${
                      isSelected
                        ? "bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800"
                        : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                          {p.id}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {truncate(p.lastMessage, 40)}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                        {formatTime(p.lastCreatedAt)}
                      </div>
                    </div>
                  </button>
                );
              })}
          </div>
        </aside>

      {/* Colonne centrale: conversation */}
      <section className="flex-1 min-h-0 h-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden flex flex-col">
        <div className="shrink-0 p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3">
          {selectedPersonId && (
            <button
              type="button"
              onClick={() => setSelectedPersonId("")}
              className="md:hidden inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm font-semibold"
            >
              ← Retour
            </button>
          )}
          <div className="min-w-0">
            <div className="text-sm font-bold text-gray-800 dark:text-white truncate">
              {selectedPersonId ? `Conversation: ${selectedPersonId}` : "Sélectionnez une personne"}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {messengerId ? "Messages bot vs client (id_sender)" : ""}
            </div>
          </div>
        </div>

        {error && (
          <div className="shrink-0 px-4 pt-3">
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-3">
              {error}
            </div>
          </div>
        )}

        <div
          ref={messagesScrollRef}
          onScroll={handleMessagesScroll}
          className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3"
        >
          {(!selectedPersonId || selectedMessages.length === 0) && (
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-6">
              {selectedPersonId ? "Aucun message pour cette personne." : "Choisissez une personne à gauche pour démarrer la conversation."}
            </div>
          )}

          {selectedMessages.map((c) => {
            const fromBot = String(c?.id_sender) === String(c?.page_id);
            const bubbleClass = fromBot
              ? "bg-cyan-500 text-white rounded-2xl rounded-tr-sm"
              : "bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-2xl rounded-tl-sm";
            const containerClass = fromBot ? "flex justify-end" : "flex justify-start";
            return (
              <div key={c.id || c.Message_id || `${c.created_at}_${c.message}`} className={containerClass}>
                <div className={`${bubbleClass} px-4 py-2.5 max-w-[80%] whitespace-pre-wrap break-words`}>
                  <div className="text-sm font-medium">{c.message}</div>
                  <div className={`text-[10px] mt-1 ${fromBot ? "text-white/80" : "text-gray-500 dark:text-gray-400"}`}>
                    {formatTime(c.created_at)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Champ d'envoi — toujours visible en bas */}
        <div className="shrink-0 p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
          <div className="flex items-end gap-2">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleInputKeyDown}
              rows={1}
              placeholder="Écrire un message..."
              className="flex-1 resize-none w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl outline-none bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-cyan-400"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={sending}
              className="px-4 py-2.5 bg-cyan-500 text-white rounded-xl hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold flex items-center gap-2"
            >
              <Send size={16} />
              {sending ? "Envoi..." : "Envoyer"}
            </button>
          </div>
          <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">
            Raccourci: `Entrée` pour envoyer.
          </div>
        </div>
      </section>

      {/* Colonne droite: paramètres */}
      <aside className="hidden md:flex md:flex-col w-80 h-full min-h-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="text-sm font-bold text-gray-800 dark:text-white">Parametres</div>
        </div>
        <div className="p-4 space-y-5">
          <div>
            <div className="text-sm font-semibold text-gray-800 dark:text-white mb-3">
              Réponse auto
            </div>

            {!selectedPersonId ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Sélectionnez une personne dans la liste pour régler la réponse auto.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-700 dark:text-gray-200">
                    {reponseAuto ? 'Activée' : 'Désactivée'}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={reponseAuto === true}
                    aria-label="Activer ou désactiver la réponse auto"
                    disabled={reponseAutoLoading || reponseAuto === null}
                    onClick={() => updateReponseAuto(!reponseAuto)}
                    className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                      reponseAuto ? 'bg-cyan-500' : 'bg-gray-300 dark:bg-gray-600'
                    } ${reponseAutoLoading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                        reponseAuto ? 'translate-x-8' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {reponseAutoLoading && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Mise à jour...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

