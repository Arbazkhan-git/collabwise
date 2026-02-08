import { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
  updateDoc,
  arrayUnion,
  arrayRemove
} from "firebase/firestore";
import { ArrowLeft, Plus, GripVertical, X, CheckCircle2, Circle, Clock, MessageSquare, Send } from "lucide-react";

export default function TaskManagerView({ boardId, user, onBack }) {
  const [loading, setLoading] = useState(true);
  const [boards, setBoards] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [taskText, setTaskText] = useState("");
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [expandedTask, setExpandedTask] = useState(null);

  // Load user boards
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "boards"), where("userId", "==", user.uid));
    const unsubscribeBoards = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setBoards(data);
    });

    return () => unsubscribeBoards();
  }, [user]);

  // Load tasks for current board
  useEffect(() => {
    if (!user || !boardId) return;

    const q = query(
      collection(db, "tasks"),
      where("userId", "==", user.uid),
      where("boardId", "==", boardId)
    );

    const unsubscribeTasks = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setTasks(data);
      setLoading(false);
    });

    return () => unsubscribeTasks();
  }, [user, boardId]);

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
      <div className="flex flex-col sm:flex-row w-full items-start sm:items-center justify-between shadow-md mb-4 sm:mb-6 px-4 sm:px-6 py-3 sm:py-4 bg-white rounded-xl border border-gray-200 gap-3">
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
        <div className="text-xs sm:text-sm text-gray-500 flex-shrink-0">
          {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
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
