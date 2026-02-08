import { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  query,
  where,
  onSnapshot,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDocs
} from "firebase/firestore";
import { ArrowLeft, Plus, GripVertical, X, CheckCircle2, Circle, Clock, MessageSquare, Send, UserPlus, Users } from "lucide-react";

export default function TaskManagerView({ boardId, user, onBack }) {
  const [loading, setLoading] = useState(true);
  const [boards, setBoards] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [taskText, setTaskText] = useState("");
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [expandedTask, setExpandedTask] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [teammates, setTeammates] = useState([]); // { uid, email }[]
  const [teamListOpen, setTeamListOpen] = useState(false);

  // Load boards where user is a member
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "boards"),
      where("members", "array-contains", user.uid)
    );
    const unsubscribeBoards = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setBoards(data);
    });
    return () => unsubscribeBoards();
  }, [user]);

  // Resolve member UIDs to emails for current board
  useEffect(() => {
    if (!boardId || !boards.length) {
      setTeammates([]);
      return;
    }
    const board = boards.find((b) => b.id === boardId);
    const memberUids = board?.members || [];
    if (memberUids.length === 0) {
      setTeammates([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const list = [];
      for (const uid of memberUids) {
        try {
          const snap = await getDoc(doc(db, "users", uid));
          const data = snap.data();
          const email = data?.email || "(unknown)";
          list.push({ uid, email });
        } catch {
          list.push({ uid, email: "(unknown)" });
        }
      }
      if (!cancelled) setTeammates(list);
    };
    load();
    return () => { cancelled = true; };
  }, [boardId, boards]);

  // Load tasks for current board
  useEffect(() => {
    if (!user || !boardId) return;

    const q = query(
      collection(db, "tasks"),
      where("boardId", "==", boardId)
    );

    const unsubscribeTasks = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setTasks(data);
      setLoading(false);
    });


    return () => unsubscribeTasks();
  }, [user, boardId]);

  // Only the board creator (owner) can remove members
  const currentBoard = boards.find((b) => b.id === boardId);
  const isBoardOwner = currentBoard && (currentBoard.ownerId === user?.uid || currentBoard.userId === user?.uid);

  const removeMember = async (memberUid) => {
    if (!isBoardOwner || memberUid === user?.uid) return; // can't remove yourself
    try {
      await updateDoc(doc(db, "boards", boardId), {
        members: arrayRemove(memberUid)
      });
    } catch (err) {
      console.error(err);
      alert("Failed to remove member");
    }
  };

  const inviteMember = async () => {
    const emailLower = inviteEmail.trim().toLowerCase();
    if (!emailLower) return;

    setInviting(true);
    try {
      const q = query(
        collection(db, "users"),
        where("email", "==", emailLower)
      );
  
      const snap = await getDocs(q);
  
      if (snap.empty) {
        alert("User not found");
        setInviting(false);
        return;
      }
  
      const invitedUser = snap.docs[0];
  
      const invitedUid = invitedUser.data()?.uid || invitedUser.id;
      await updateDoc(doc(db, "boards", boardId), {
        members: arrayUnion(invitedUid)
      });
  
      setInviteEmail("");
      alert("Teammate added 🎉");
    } catch (err) {
      console.error(err);
      alert("Invite failed");
    }
  
    setInviting(false);
  };
  const addTask = async () => {
    if (!taskText.trim()) return;

    await addDoc(collection(db, "tasks"), {
      text: taskText,
      status: "todo",
      userId: user.uid,
      boardId: boardId,
      createdAt: Date.now(),
    });

    setTaskText("");
  };

  const updateStatus = async (taskId, newStatus) => {
    const taskRef = doc(db, "tasks", taskId);
    await updateDoc(taskRef, { status: newStatus });
  };

  const removeTask = async (taskId) => {
    await deleteDoc(doc(db, "tasks", taskId));
  };

  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", task.id);
    e.currentTarget.style.opacity = "0.5";
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = "1";
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e, status) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    if (draggedTask && draggedTask.status !== newStatus) {
      await updateStatus(draggedTask.id, newStatus);
    }
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  if (loading) return <p className="text-center mt-10 text-gray-500">Loading...</p>;

  const todoTasks = tasks.filter(t => t.status === "todo");
  const inProgressTasks = tasks.filter(t => t.status === "progress");
  const doneTasks = tasks.filter(t => t.status === "done");

  const boardName = boards.find(b => b.id === boardId)?.name;

  return (
    <div className="p-4 sm:p-5 lg:p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="shadow-md mb-4 sm:mb-6 bg-white rounded-xl border border-gray-200 overflow-visible">
        {/* Top bar: back, board name, task count */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <button
              onClick={onBack}
              className="font-medium text-gray-500 flex items-center gap-2 hover:text-gray-700 cursor-pointer transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Boards</span>
            </button>
            <b className="text-gray-300 hidden sm:inline">|</b>
            <span className="font-semibold text-base sm:text-lg text-gray-800 truncate">{boardName}</span>
          </div>
          <span className="text-xs sm:text-sm text-gray-500 flex-shrink-0">
            {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
          </span>
        </div>

        {/* Team + single invite row */}
        <div className="px-4 sm:px-6 py-4 bg-gray-50/80 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <Users className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-700">Team</span>
            </div>
            {teammates.length > 0 && (
              <>
                {teammates.length <= 2 ? (
                  <div className="flex flex-wrap gap-2">
                    {teammates.map((t) => (
                      <div
                        key={t.uid}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-gray-200 shadow-sm text-sm text-gray-700 group"
                      >
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-semibold text-xs">
                          {(t.email || "?")[0].toUpperCase()}
                        </span>
                        <span className="truncate max-w-[180px] sm:max-w-[220px]" title={t.email}>
                          {t.email}
                        </span>
                        {isBoardOwner && t.uid !== user?.uid && (
                          <button
                            type="button"
                            onClick={() => removeMember(t.uid)}
                            className="ml-0.5 p-0.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Remove from board"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="relative inline-block overflow-visible">
                  <button
                    type="button"
                    onClick={() => setTeamListOpen((o) => !o)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-1"
                  >
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white text-xs font-bold">
                      {teammates.length}
                    </span>
                
                    <span>Teammates</span>
                
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${
                        teamListOpen ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                
                  {teamListOpen && (
                    <>
                      {/* Click-outside backdrop */}
                      <div
                        className="fixed inset-0 z-[9998]"
                        onClick={() => setTeamListOpen(false)}
                        aria-hidden
                      />
                
                      {/* Dropdown */}
                      <div className="absolute left-0 top-full mt-2 z-[9999] w-72 rounded-xl bg-white border border-gray-200 shadow-xl">
                        <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Team members
                          </p>
                          <p className="text-sm text-gray-700 mt-0.5">
                            {teammates.length} members
                          </p>
                        </div>
                
                        <div className="max-h-64 overflow-y-auto py-2">
                          {teammates.map((t) => (
                            <div
                              key={t.uid}
                              className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                            >
                              <span className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 text-blue-700 font-semibold text-sm flex-shrink-0">
                                {(t.email || "?")[0].toUpperCase()}
                              </span>
                
                              <span
                                className="flex-1 min-w-0 truncate text-sm text-gray-800"
                                title={t.email}
                              >
                                {t.email}
                              </span>
                
                              {isBoardOwner && t.uid !== user?.uid && (
                                <button
                                  type="button"
                                  onClick={() => removeMember(t.uid)}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                                  title="Remove from board"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                
                )}
              </>
            )}
            <div className="flex items-center gap-2 sm:ml-auto flex-shrink-0">
              <UserPlus className="w-4 h-4 text-gray-500 hidden sm:block" />
              <input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Add by email"
                className="border border-gray-300 px-3 py-2 rounded-lg text-sm w-44 sm:w-52 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                onKeyDown={(e) => e.key === "Enter" && inviteMember()}
              />
              <button
                onClick={inviteMember}
                disabled={inviting}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {inviting ? "Adding…" : "Add"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 sm:gap-5">
      <TaskColumn
  title="Todo"
  status="todo"
  tasks={todoTasks}
  taskText={taskText}
  setTaskText={setTaskText}
  onAdd={addTask}
  onDragStart={handleDragStart}
  onDragEnd={handleDragEnd}
  onDragOver={handleDragOver}
  onDragLeave={handleDragLeave}
  onDrop={handleDrop}
  dragOverColumn={dragOverColumn}
  icon={<Circle className="w-4 h-4" />}
  color="yellow"
  user={user}
  boardId={boardId}
  expandedTask={expandedTask}
  setExpandedTask={setExpandedTask}
/>


        <TaskColumn
          title="In Progress"
          status="progress"
          tasks={inProgressTasks}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          dragOverColumn={dragOverColumn}
          icon={<Clock className="w-4 h-4" />}
          color="blue"
          user={user}
          boardId={boardId}
          expandedTask={expandedTask}
          setExpandedTask={setExpandedTask}
        />

        <TaskColumn
          title="Done"
          status="done"
          tasks={doneTasks}
          onRemove={removeTask}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          dragOverColumn={dragOverColumn}
          icon={<CheckCircle2 className="w-4 h-4" />}
          color="green"
          user={user}
          boardId={boardId}
          expandedTask={expandedTask}
          setExpandedTask={setExpandedTask}
        />
      </div>
    </div>
  );
}

function TaskColumn({ 
  title, 
  status,
  tasks, 
  taskText, 
  setTaskText, 
  onAdd, 
  onRemove,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  dragOverColumn,
  icon,
  color,
  user,
  boardId,
  expandedTask,
  setExpandedTask
}) {
  const colorClasses = {
    yellow: {
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      header: "bg-yellow-100",
      text: "text-yellow-800",
      accent: "text-yellow-600"
    },
    blue: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      header: "bg-blue-100",
      text: "text-blue-800",
      accent: "text-blue-600"
    },
    green: {
      bg: "bg-green-50",
      border: "border-green-200",
      header: "bg-green-100",
      text: "text-green-800",
      accent: "text-green-600"
    }
  };

  const colors = colorClasses[color] || colorClasses.yellow;
  const isDragOver = dragOverColumn === status;




  
  return (
    <div 
      className={`w-full lg:flex-1 border-2 rounded-xl shadow-lg bg-white flex flex-col transition-all duration-200 min-h-[300px] ${
        isDragOver 
          ? `${colors.border} ${colors.bg} scale-[1.02] sm:scale-105 shadow-2xl` 
          : "border-gray-200"
      }`}
      onDragOver={(e) => onDragOver(e, status)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, status)}
    >
      {/* Header */}
      <div className={`p-4 border-b ${colors.header} rounded-t-xl`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={colors.accent}>{icon}</span>
            <h2 className={`font-bold ${colors.text}`}>{title}</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} font-semibold`}>
              {tasks.length}
            </span>
          </div>
        </div>
      </div>

      {/* Add Task Input (Only for Todo) */}
      {onAdd && status === "todo" && (
        <div className="p-4 border-b bg-gray-50">
          <div className="flex gap-2">
            <input
              value={taskText}
              onChange={(e) => setTaskText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && onAdd()}
              placeholder="Add a new task..."
              className="flex-1 border-2 border-gray-300 px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            />
            <button
              onClick={onAdd}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg transition-colors shadow-md hover:shadow-lg flex items-center gap-1"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Add</span>
            </button>
          </div>
        </div>
      )}

      {/* Tasks List */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-3 min-h-[200px] max-h-[600px]">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <div className="text-4xl mb-2">📋</div>
            <p className="text-sm italic">No tasks yet</p>
            {status === "todo" && (
              <p className="text-xs mt-1">Add one above to get started!</p>
            )}
          </div>
        ) : (
          tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onRemove={onRemove}
              status={status}
              color={color}
              user={user}
              boardId={boardId}
              isExpanded={expandedTask === task.id}
              onToggleExpand={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function TaskCard({ task, onDragStart, onDragEnd, onRemove, status, color, user, boardId, isExpanded, onToggleExpand }) {
  const [isHovered, setIsHovered] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState(task.comments || []);

  const colorClasses = {
    yellow: "border-yellow-300 bg-yellow-50 hover:bg-yellow-100",
    blue: "border-blue-300 bg-blue-50 hover:bg-blue-100",
    green: "border-green-300 bg-green-50 hover:bg-green-100"
  };

  const colors = colorClasses[color] || colorClasses.yellow;

  const handleAddComment = async () => {
    if (!commentText.trim() || !user) return;

    const newComment = {
      text: commentText.trim(),
      userId: user.uid,
      userEmail: user.email,
      createdAt: Date.now()
    };

    try {
      const taskRef = doc(db, "tasks", task.id);
      await updateDoc(taskRef, {
        comments: arrayUnion(newComment)
      });
      setComments([...comments, newComment]);
      setCommentText("");
    } catch (err) {
      console.error("Error adding comment:", err);
      alert("Failed to add comment");
    }
  };

  // Load comments from task
  useEffect(() => {
    if (task.comments) {
      setComments(task.comments);
    }
  }, [task.comments]);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group border-2 rounded-lg p-3 cursor-move transition-all duration-200 shadow-sm hover:shadow-md ${colors} ${
        isHovered ? "scale-[1.02]" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        <div className="mt-0.5 text-gray-400 group-hover:text-gray-600 transition-colors">
          <GripVertical size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 break-words">{task.text}</p>
          {task.createdAt && (
            <p className="text-xs text-gray-500 mt-1">
              {new Date(task.createdAt).toLocaleDateString()}
            </p>
          )}
          
          {/* Comments section */}
          <div className="mt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800"
            >
              <MessageSquare size={12} />
              <span>{comments.length} {comments.length === 1 ? 'comment' : 'comments'}</span>
            </button>

            {isExpanded && (
              <div className="mt-2 space-y-2 border-t pt-2" onClick={(e) => e.stopPropagation()}>
                {/* Existing comments */}
                {comments.length > 0 && (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {comments.map((comment, idx) => (
                      <div key={idx} className="bg-white rounded p-2 text-xs">
                        <p className="font-medium text-gray-700">{comment.text}</p>
                        <p className="text-gray-500 mt-1">
                          {comment.userEmail?.split('@')[0]} • {new Date(comment.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Add comment input */}
                <div className="flex gap-1">
                  <input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                    placeholder="Add a comment..."
                    className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={!commentText.trim()}
                    className="bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    <Send size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(task.id);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 p-1"
            title="Delete task"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
