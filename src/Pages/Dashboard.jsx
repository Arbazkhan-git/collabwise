import { useEffect, useState, useRef } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { Clock, Grid, Calendar, BarChart3, LayoutDashboard, History, Menu, X as XIcon, ListTodo, MessageCircle } from "lucide-react";
import BoardsView from "../components/BoardsView";
import SummaryView from "../components/SummaryView";
import TaskManagerView from "../components/TaskManagerView";
import CalendarView from "../components/CalendarView";
import AllTasksView from "../components/AllTasksView";
import ChatView from "../components/ChatView";

const VALID_VIEWS = ["boards", "summary", "calendar", "taskmanager", "alltasks", "chat"];

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openProfile, setOpenProfile] = useState(false);

  // Derive view and board from URL so reload keeps the same place
  const viewFromUrl = searchParams.get("view");
  const boardIdFromUrl = searchParams.get("boardId");
  const currentView = VALID_VIEWS.includes(viewFromUrl) ? viewFromUrl : "boards";
  const selectedBoardId =
    currentView === "taskmanager" && boardIdFromUrl ? boardIdFromUrl : null;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [recentItems, setRecentItems] = useState([]);
  const [historyItems, setHistoryItems] = useState([]);
  const [recentOpen, setRecentOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [allTasks, setAllTasks] = useState([]);
  const [allBoards, setAllBoards] = useState([]);
  const profileRef = useRef(null);
  const navigate = useNavigate();
  const restoredLastPlaceRef = useRef(false);

  // Restore last place even after closing/reopening the page
  useEffect(() => {
    if (restoredLastPlaceRef.current) return;
    restoredLastPlaceRef.current = true;

    const isEmpty = !searchParams || searchParams.toString() === "";
    if (!isEmpty) return;

    const saved = localStorage.getItem("lastDashboardParams");
    if (!saved) return;

    setSearchParams(new URLSearchParams(saved), { replace: true });
  }, [searchParams, setSearchParams]);

  // Load recent and history from localStorage
  useEffect(() => {
    const savedRecent = localStorage.getItem("recentItems");
    const savedHistory = localStorage.getItem("historyItems");
    if (savedRecent) setRecentItems(JSON.parse(savedRecent));
    if (savedHistory) setHistoryItems(JSON.parse(savedHistory));
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setOpenProfile(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
        navigate("/loginuser");
        return;
      }
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  
  useEffect(() => {
    if (!user) return;

    const qBoards = query(collection(db, "boards"), where("userId", "==", user.uid));
    const unsubscribeBoards = onSnapshot(qBoards, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllBoards(data);
    });

    const qTasks = query(collection(db, "tasks"), where("userId", "==", user.uid));
    const unsubscribeTasks = onSnapshot(qTasks, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllTasks(data);
    });

    return () => {
      unsubscribeBoards();
      unsubscribeTasks();
    };
  }, [user]);

  const addToRecent = (item) => {
    const newItem = { ...item, timestamp: Date.now() };
    setRecentItems((prev) => {
      const filtered = prev.filter((i) => i.id !== item.id);
      const updated = [newItem, ...filtered].slice(0, 10); // Keep last 10
      localStorage.setItem("recentItems", JSON.stringify(updated));
      return updated;
    });
  };

  const addToHistory = (item) => {
    const newItem = { ...item, timestamp: Date.now() };
    setHistoryItems((prev) => {
      const filtered = prev.filter((i) => i.id !== item.id || i.type !== item.type);
      const updated = [newItem, ...filtered].slice(0, 20); // Keep last 20
      localStorage.setItem("historyItems", JSON.stringify(updated));
      return updated;
    });
  };

  const updateUrl = (view, boardId = null) => {
    const params = new URLSearchParams();
    if (view && view !== "boards") params.set("view", view);
    if (boardId) params.set("boardId", boardId);
    // Push a new history entry so browser Back goes to the previous in-app view,
    // instead of jumping straight back to the login page.
    setSearchParams(params);
    localStorage.setItem("lastDashboardParams", params.toString());
  };

  const handleViewChange = (view, boardId = null) => {
    updateUrl(view, boardId || undefined);
    setSidebarOpen(false);
    const viewNames = {
      boards: "Boards",
      summary: "Summary",
      calendar: "Calendar",
      taskmanager: "Task Manager",
      alltasks: "All Tasks"
    };
    addToHistory({ id: view, type: "view", name: viewNames[view] || view });
  };

  const handleBoardClick = (boardId, boardName) => {
    updateUrl("taskmanager", boardId);
    if (boardName) {
      addToRecent({ id: boardId, type: "board", name: boardName });
      addToHistory({ id: boardId, type: "board", name: boardName });
    }
    setSidebarOpen(false);
  };

  const handleRecentClick = (item) => {
    if (item.type === "board") {
      handleBoardClick(item.id, item.name);
    } else {
      handleViewChange(item.id);
    }
  };

  const handleHistoryClick = (item) => {
    if (item.type === "board") {
      handleBoardClick(item.id, item.name);
    } else {
      handleViewChange(item.id);
    }
  };

  if (loading) return <p className="text-center mt-10 text-gray-500">Loading...</p>;
  if (!user) return null;

  const renderView = () => {
    switch (currentView) {
      case "boards":
        return <BoardsView onBoardClick={handleBoardClick} user={user} />;
      case "summary":
        return <SummaryView user={user} onBoardClick={handleBoardClick} />;
      case "calendar":
        return <CalendarView user={user} onBoardClick={handleBoardClick} />;
      case "taskmanager":
        return <TaskManagerView boardId={selectedBoardId} user={user} onBack={() => handleViewChange("boards")} />;
      case "alltasks":
        return <AllTasksView user={user} onBoardClick={handleBoardClick} />;
      case "chat":
        return <ChatView user={user} />;
      default:
        return <BoardsView onBoardClick={handleBoardClick} user={user} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile Overlay */}
      {sidebarOpen && (
  <div
    onClick={() => setSidebarOpen(false)}
    className="fixed inset-0 z-40 lg:hidden
               bg-black/30
               backdrop-blur-md
               supports-[backdrop-filter]:bg-black/20"
  />
)}

      
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-white lg:bg-gray-50 border-r border-gray-200 
        flex flex-col overflow-y-auto
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        shadow-lg lg:shadow-none
      `}>
        {/* Logo */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img className="h-8 w-auto" src="/collabwiselogo.png" alt="logo" />
            <h1 className="text-lg font-bold text-gray-800">CollabWise</h1>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <XIcon size={20} />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-2">
          {/* Recent — details only when clicked */}
          <div className="mb-4">
            <button
              onClick={() => setRecentOpen((o) => !o)}
              className="w-full flex items-center gap-2 px-2 py-1 text-xs font-semibold text-gray-500 uppercase hover:bg-gray-100 rounded"
            >
              <Clock className="w-4 h-4" />
              Recent
            </button>
            {recentOpen && (
              <>
                {recentItems.length === 0 ? (
                  <p className="px-2 py-1 text-xs text-gray-400 italic">No recent items</p>
                ) : (
                  <div className="space-y-1 mt-1">
                    {recentItems.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleRecentClick(item)}
                        className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-200 rounded flex items-center gap-2"
                      >
                        <span className="truncate">{item.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* History — details only when clicked */}
          <div className="mb-4">
            <button
              onClick={() => setHistoryOpen((o) => !o)}
              className="w-full flex items-center gap-2 px-2 py-1 text-xs font-semibold text-gray-500 uppercase hover:bg-gray-100 rounded"
            >
              <History className="w-4 h-4" />
              History
            </button>
            {historyOpen && (
              <>
                {historyItems.length === 0 ? (
                  <p className="px-2 py-1 text-xs text-gray-400 italic">No history</p>
                ) : (
                  <div className="space-y-1 mt-1">
                    {historyItems.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleHistoryClick(item)}
                        className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-200 rounded flex items-center gap-2"
                      >
                        <span className="truncate">{item.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Chat with mates */}
          <div className="mb-4">
            <button
              onClick={() => handleViewChange("chat")}
              className={`w-full text-left px-2 py-2 text-sm hover:bg-gray-200 rounded flex items-center gap-2 ${
                currentView === "chat" ? "bg-blue-100 text-blue-700 font-medium" : ""
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              Chat with mates
            </button>
          </div>

          {/* All Tasks Button */}
          <div className="mb-4">
            <button
              onClick={() => handleViewChange("alltasks")}
              className={`w-full text-left px-2 py-2 text-sm hover:bg-gray-200 rounded flex items-center gap-2 ${
                currentView === "alltasks" ? "bg-blue-100 text-blue-700 font-medium" : ""
              }`}
            >
              <ListTodo className="w-4 h-4" />
              All Tasks
              {allTasks.length > 0 && (
                <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-700">
                  {allTasks.length}
                </span>
              )}
            </button>
          </div>

          {/* Main Navigation */}
          <div className="mb-4">
            <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold text-gray-500 uppercase">
              <LayoutDashboard className="w-4 h-4" />
              Navigation
            </div>
            <div className="space-y-1">
              <button
                onClick={() => handleViewChange("boards")}
                className={`w-full text-left px-2 py-2 text-sm hover:bg-gray-200 rounded flex items-center gap-2 ${
                  currentView === "boards" ? "bg-blue-100 text-blue-700 font-medium" : ""
                }`}
              >
                <Grid className="w-4 h-4" />
                Boards
              </button>
              <button
                onClick={() => handleViewChange("summary")}
                className={`w-full text-left px-2 py-2 text-sm hover:bg-gray-200 rounded flex items-center gap-2 ${
                  currentView === "summary" ? "bg-blue-100 text-blue-700 font-medium" : ""
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Summary
              </button>
              <button
                onClick={() => handleViewChange("calendar")}
                className={`w-full text-left px-2 py-2 text-sm hover:bg-gray-200 rounded flex items-center gap-2 ${
                  currentView === "calendar" ? "bg-blue-100 text-blue-700 font-medium" : ""
                }`}
              >
                <Calendar className="w-4 h-4" />
                Calendar
              </button>
            </div>
          </div>
        </div>

        {/* Profile Section */}
        <div ref={profileRef} className="p-2 border-t border-gray-200">
          <button
            onClick={() => setOpenProfile(!openProfile)}
            className="w-full text-left px-2 py-2 text-sm hover:bg-gray-200 rounded flex items-center gap-2"
          >
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs">
              {user.email?.[0]?.toUpperCase() || "U"}
            </div>
            <span className="truncate text-xs">{user.email}</span>
          </button>
          {openProfile && (
            <div className="absolute bottom-16 left-2 w-64 max-h-60 overflow-y-auto border bg-white shadow-lg rounded-lg z-50">
              <div className="p-3 border-b">
                <p className="text-xs text-gray-500">Signed in as</p>
                <p className="text-sm font-medium break-all">{user.email}</p>
              </div>
              <div className="p-3 space-y-2">
                <button className="w-full text-left text-sm hover:bg-gray-100 p-2 rounded">
                  Account settings
                </button>
                <button className="w-full text-left text-sm hover:bg-gray-100 p-2 rounded">
                  My boards
                </button>
                <button
                  onClick={async () => {
                    await auth.signOut();
                    navigate("/loginuser");
                  }}
                  className="w-full text-left text-sm text-red-600 hover:bg-red-50 p-2 rounded"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Top Header */}
        <div className="flex w-full items-center h-16 justify-between gap-2 shadow-sm px-4 lg:px-6 bg-white border-b border-gray-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu size={20} className="text-gray-600" />
            </button>
            <h2 className="text-lg lg:text-xl font-semibold capitalize text-gray-800">
              {currentView === "taskmanager" ? "Task Manager" : currentView === "alltasks" ? "All Tasks" : currentView}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                {user.email?.[0]?.toUpperCase() || "U"}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="w-full max-w-7xl mx-auto">
            {renderView()}
          </div>
        </div>
      </div>
    </div>
  );
}
