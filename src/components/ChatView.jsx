import { useEffect, useRef, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  doc,
  query,
  where,
  getDocs,
  setDoc,
  addDoc,
  onSnapshot,
  orderBy,
  serverTimestamp,
  deleteDoc
} from "firebase/firestore";
import { MessageCircle, Send, Trash2 } from "lucide-react";

export default function ChatView({ user }) {
  const [friendEmail, setFriendEmail] = useState("");
  const [friendName, setFriendName] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState("");
  const [chatId, setChatId] = useState(null);
  const [chats, setChats] = useState([]); // all chats for this user
  const [chatsLoading, setChatsLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);
  const restoredRef = useRef(false);

  // Persist last opened chat so refresh/close keeps it
  useEffect(() => {
    if (!user) return;
    if (restoredRef.current) return;
    restoredRef.current = true;

    const key = `chat:last:${user.uid}`;
    const raw = localStorage.getItem(key);
    if (!raw) return;

    try {
      const saved = JSON.parse(raw);
      if (typeof saved.friendEmail === "string") setFriendEmail(saved.friendEmail);
      if (typeof saved.friendName === "string") setFriendName(saved.friendName);
      if (typeof saved.chatId === "string") setChatId(saved.chatId);
    } catch {
      // ignore corrupted storage
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const key = `chat:last:${user.uid}`;
    localStorage.setItem(
      key,
      JSON.stringify({
        friendEmail,
        friendName,
        chatId
      })
    );
  }, [user, friendEmail, friendName, chatId]);

  // Subscribe to list of chats this user is in
  useEffect(() => {
    if (!user) return;

    const chatsRef = collection(db, "chats");
    const q = query(chatsRef, where("participants", "array-contains", user.uid));

    setChatsLoading(true);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setChats(data);
        setChatsLoading(false);
      },
      () => {
        setChatsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Subscribe to messages for the active chat
  useEffect(() => {
    if (!user || !chatId) return;

    const msgsRef = collection(db, "chats", chatId, "messages");
    const q = query(msgsRef, orderBy("createdAt", "asc"));

    setMessagesLoading(true);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setMessages(data);
        setMessagesLoading(false);
      },
      () => {
        setMessagesLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, chatId]);

  // Auto-scroll to the latest message (WhatsApp-style)
  useEffect(() => {
    if (!messagesEndRef.current) return;
    messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const handleConnect = async () => {
    if (!friendEmail.trim() || !friendName.trim()) {
      setConnectError("Please enter a Gmail and a name.");
      return;
    }
    if (!user) {
      setConnectError("You must be logged in to chat.");
      return;
    }

    setConnectError("");
    setConnecting(true);
    try {
      const emailLower = friendEmail.trim().toLowerCase();

      // Look up friend by email in Firestore users collection
      const usersQ = query(
        collection(db, "users"),
        where("email", "==", emailLower)
      );
      const snap = await getDocs(usersQ);
      if (snap.empty) {
        setConnectError("No account found with this email. They need to sign up first.");
        setConnecting(false);
        return;
      }

      const friendDoc = snap.docs[0];
      const friendUid = friendDoc.data()?.uid || friendDoc.id;

      if (friendUid === user.uid) {
        setConnectError("You cannot start a chat with yourself.");
        setConnecting(false);
        return;
      }

      // Deterministic chat id for this pair of users
      const pair = [user.uid, friendUid].sort();
      const newChatId = `${pair[0]}_${pair[1]}`;
      const chatRef = doc(db, "chats", newChatId);

      await setDoc(
        chatRef,
        {
          participants: pair,
          participantEmails: {
            [user.uid]: (user.email || "").toLowerCase(),
            [friendUid]: emailLower
          },
          participantNames: {
            [user.uid]: user.email || "Me",
            [friendUid]: friendName.trim()
          },
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      // Do not auto-open; chat will appear in the list on both accounts
      setConnectError("");
    } catch (err) {
      console.error(err);
      setConnectError("Failed to connect. Please try again.");
    }
    setConnecting(false);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !chatId) return;

    try {
      const msgsRef = collection(db, "chats", chatId, "messages");
      await addDoc(msgsRef, {
        fromUid: user.uid,
        text: newMessage.trim(),
        createdAt: serverTimestamp()
      });
      setNewMessage("");
    } catch (err) {
      console.error(err);
      // Keep message in input on failure
    }
  };

  const currentChat = chatId
    ? chats.find((c) => c.id === chatId) || null
    : null;

  const currentMateLabel = (() => {
    if (!currentChat || !user) return null;
    const others = (currentChat.participants || []).filter((uid) => uid !== user.uid);
    const mateUid = others[0];
    if (!mateUid) return null;
    const names = currentChat.participantNames || {};
    const emails = currentChat.participantEmails || {};
    return names[mateUid] || emails[mateUid] || "Conversation";
  })();

  const handleSelectChat = (chat) => {
    if (!user || !chat) return;
    setChatId(chat.id);

    const others = (chat.participants || []).filter((uid) => uid !== user.uid);
    const mateUid = others[0];
    const emails = chat.participantEmails || {};
    const names = chat.participantNames || {};
    setFriendEmail(emails[mateUid] || "");
    setFriendName(names[mateUid] || "");
  };

  const handleDeleteChat = async () => {
    if (!currentChat || !chatId) return;
    const ok = window.confirm("Delete this chat and all its messages for both participants?");
    if (!ok) return;
    try {
      const msgsRef = collection(db, "chats", chatId, "messages");
      const snap = await getDocs(msgsRef);
      const deletions = snap.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(deletions);
      await deleteDoc(doc(db, "chats", chatId));
      setChatId(null);
      setMessages([]);
    } catch (err) {
      console.error(err);
    }
  };

  if (!user) {
    return (
      <div className="p-6 text-center text-gray-500">
        Please log in to use chat.
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6">
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
              Chat with mates
            </h1>
            <p className="text-sm text-gray-500">
              Connect with teammates using their Gmail (Firebase account) and exchange messages in real time.
            </p>
          </div>
        </div>

        {/* Connect form */}
        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            Start or open a chat
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_auto] gap-3 mb-3">
            <input
              type="email"
              value={friendEmail}
              onChange={(e) => setFriendEmail(e.target.value)}
              placeholder="Friend's Gmail"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
            />
            <input
              value={friendName}
              onChange={(e) => setFriendName(e.target.value)}
              placeholder="Friend's name"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
            />
            <button
              type="button"
              onClick={handleConnect}
              disabled={connecting}
              className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-sm"
            >
              {connecting ? "Connecting…" : "Connect"}
            </button>
          </div>
          {connectError && (
            <p className="text-xs text-red-600 mt-1">{connectError}</p>
          )}
          <p className="text-xs text-gray-400 mt-2">
            Note: your friend must already have an account (same Gmail) in this app so we can find them in Firebase.
          </p>
        </div>

        {/* Chat window: left column with chat names, right pane with messages */}
        <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg border border-gray-200 flex h-[420px] md:h-[480px] overflow-hidden">
          {/* Chats list (names only) */}
          <div className="w-40 sm:w-56 md:w-60 border-r border-gray-200 flex flex-col bg-gray-50/70">
            <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-gray-50/90 backdrop-blur z-10">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Chats
              </span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {chatsLoading && (
                <p className="px-3 py-2 text-xs text-gray-400">Loading chats…</p>
              )}
              {!chatsLoading && chats.length === 0 && (
                <p className="px-3 py-3 text-xs text-gray-400">
                  No chats yet. Connect with a mate above.
                </p>
              )}
              {chats.map((chat) => {
                const others = (chat.participants || []).filter((uid) => uid !== user.uid);
                const mateUid = others[0];
                const names = chat.participantNames || {};
                const emails = chat.participantEmails || {};
                const label = names[mateUid] || emails[mateUid] || "Conversation";
                const isActive = chat.id === chatId;
                return (
                  <button
                    key={chat.id}
                    type="button"
                    onClick={() => handleSelectChat(chat)}
                    className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 hover:bg-blue-50/80 ${
                      isActive ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-800"
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-xs font-semibold shadow-sm">
                      {(label || "?")[0].toUpperCase()}
                    </div>
                    <span className="truncate">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Messages for the selected chat; nothing shown until a chat is clicked */}
          <div className="flex-1 flex flex-col bg-white">
            <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-gray-100 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-gray-900 truncate">
                {currentChat ? currentMateLabel || "Conversation" : "No conversation selected"}
              </span>
              {currentChat && (
                <button
                  type="button"
                  onClick={handleDeleteChat}
                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-red-600 hover:bg-red-50"
                  title="Delete chat for both participants"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-2 bg-gradient-to-b from-gray-50 to-white custom-scrollbar">
              {messagesLoading && currentChat && (
                <p className="text-xs text-gray-400">Loading messages…</p>
              )}
              {!messagesLoading && messages.length === 0 && currentChat && (
                <p className="text-xs text-gray-400">
                  No messages yet. Say hi 👋
                </p>
              )}
              {!currentChat && (
                <p className="text-xs text-gray-400">
                  Select a chat on the left to see messages.
                </p>
              )}
              {currentChat &&
                messages.map((m) => {
                  const isMine = m.fromUid === user.uid;
                  return (
                    <div
                      key={m.id}
                      className={`flex ${isMine ? "justify-end" : "justify-start"} mb-1.5 px-1 sm:px-2`}
                    >
                      <div className="max-w-[82%] sm:max-w-[70%] lg:max-w-[60%]">
                        <div
                          className={`inline-flex px-3.5 py-2.5 rounded-3xl text-sm shadow-sm ${
                            isMine
                              ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-2xl ml-auto"
                              : "bg-gray-100 text-gray-900 rounded-bl-2xl"
                          }`}
                        >
                          <p className="break-words leading-snug">{m.text}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              {/* Anchor element to scroll into view for latest message */}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 px-3 py-2.5 flex items-center gap-2 bg-white">
              <input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder={
                  currentChat ? "Type a message…" : "Select a chat to start typing"
                }
                className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 disabled:bg-gray-100"
                disabled={!currentChat}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!currentChat || !newMessage.trim()}
                className="inline-flex items-center justify-center rounded-full w-9 h-9 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-sm"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

