import { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  arrayUnion
} from "firebase/firestore";
import { MessageSquare, Send, CheckCircle2, Play } from "lucide-react";

export default function AllTasksView({ user, onBoardClick }) {
  const [tasks, setTasks] = useState([]);
  const [boards, setBoards] = useState([]);
  const [expandedTask, setExpandedTask] = useState(null);
  const [commentTexts, setCommentTexts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const qBoards = query(collection(db, "boards"), where("userId", "==", user.uid));
    const unsubscribeBoards = onSnapshot(qBoards, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBoards(data);
    });

    const qTasks = query(collection(db, "tasks"), where("userId", "==", user.uid));
    const unsubscribeTasks = onSnapshot(qTasks, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTasks(data);
      setLoading(false);
    });

    return () => {
      unsubscribeBoards();
      unsubscribeTasks();
    };
  }, [user]);

  const handleAddComment = async (taskId) => {
    const commentText = commentTexts[taskId];
    if (!commentText?.trim() || !user) return;

    const newComment = {
      text: commentText.trim(),
      userId: user.uid,
      userEmail: user.email,
      createdAt: Date.now()
    };

    try {
      const taskRef = doc(db, "tasks", taskId);
      await updateDoc(taskRef, {
        comments: arrayUnion(newComment)
      });
      setCommentTexts({ ...commentTexts, [taskId]: "" });
    } catch (err) {
      console.error("Error adding comment:", err);
      alert("Failed to add comment");
    }
  };

  const handleUpdateStatus = async (taskId, newStatus) => {
    try {
      const taskRef = doc(db, "tasks", taskId);
      await updateDoc(taskRef, { status: newStatus });
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Failed to update task status");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "todo":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "progress":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "done":
        return "bg-green-100 text-green-700 border-green-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  if (loading) return <p className="text-center mt-10 text-gray-500">Loading...</p>;

  const todoTasks = tasks.filter(t => t.status === "todo");
  const inProgressTasks = tasks.filter(t => t.status === "progress");
  const doneTasks = tasks.filter(t => t.status === "done");

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">All Tasks</h2>
        <p className="text-gray-600">View and manage all your tasks across all boards</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Todo Column */}
        <div className="bg-white border-2 border-yellow-200 rounded-xl shadow-md">
          <div className="bg-yellow-100 p-4 border-b border-yellow-200 rounded-t-xl">
            <h3 className="font-bold text-yellow-800 flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-200 text-yellow-800 font-semibold">
                {todoTasks.length}
              </span>
              To Do
            </h3>
          </div>
          <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
            {todoTasks.length === 0 ? (
              <p className="text-sm text-gray-400 italic text-center py-4">No tasks</p>
            ) : (
              todoTasks.map((task) => {
                const board = boards.find(b => b.id === task.boardId);
                const isExpanded = expandedTask === task.id;
                return (
                  <TaskCard
                    key={task.id}
                    task={task}
                    board={board}
                    isExpanded={isExpanded}
                    onToggleExpand={() => setExpandedTask(isExpanded ? null : task.id)}
                    commentText={commentTexts[task.id] || ""}
                    onCommentChange={(text) => setCommentTexts({ ...commentTexts, [task.id]: text })}
                    onAddComment={() => handleAddComment(task.id)}
                    onUpdateStatus={handleUpdateStatus}
                    onBoardClick={onBoardClick}
                    statusColor={getStatusColor(task.status)}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* In Progress Column */}
        <div className="bg-white border-2 border-blue-200 rounded-xl shadow-md">
          <div className="bg-blue-100 p-4 border-b border-blue-200 rounded-t-xl">
            <h3 className="font-bold text-blue-800 flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-200 text-blue-800 font-semibold">
                {inProgressTasks.length}
              </span>
              In Progress
            </h3>
          </div>
          <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
            {inProgressTasks.length === 0 ? (
              <p className="text-sm text-gray-400 italic text-center py-4">No tasks</p>
            ) : (
              inProgressTasks.map((task) => {
                const board = boards.find(b => b.id === task.boardId);
                const isExpanded = expandedTask === task.id;
                return (
                  <TaskCard
                    key={task.id}
                    task={task}
                    board={board}
                    isExpanded={isExpanded}
                    onToggleExpand={() => setExpandedTask(isExpanded ? null : task.id)}
                    commentText={commentTexts[task.id] || ""}
                    onCommentChange={(text) => setCommentTexts({ ...commentTexts, [task.id]: text })}
                    onAddComment={() => handleAddComment(task.id)}
                    onUpdateStatus={handleUpdateStatus}
                    onBoardClick={onBoardClick}
                    statusColor={getStatusColor(task.status)}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* Done Column */}
        <div className="bg-white border-2 border-green-200 rounded-xl shadow-md">
          <div className="bg-green-100 p-4 border-b border-green-200 rounded-t-xl">
            <h3 className="font-bold text-green-800 flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-200 text-green-800 font-semibold">
                {doneTasks.length}
              </span>
              Done
            </h3>
          </div>
          <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
            {doneTasks.length === 0 ? (
              <p className="text-sm text-gray-400 italic text-center py-4">No tasks</p>
            ) : (
              doneTasks.map((task) => {
                const board = boards.find(b => b.id === task.boardId);
                const isExpanded = expandedTask === task.id;
                return (
                  <TaskCard
                    key={task.id}
                    task={task}
                    board={board}
                    isExpanded={isExpanded}
                    onToggleExpand={() => setExpandedTask(isExpanded ? null : task.id)}
                    commentText={commentTexts[task.id] || ""}
                    onCommentChange={(text) => setCommentTexts({ ...commentTexts, [task.id]: text })}
                    onAddComment={() => handleAddComment(task.id)}
                    onUpdateStatus={handleUpdateStatus}
                    onBoardClick={onBoardClick}
                    statusColor={getStatusColor(task.status)}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskCard({ 
  task, 
  board, 
  isExpanded, 
  onToggleExpand, 
  commentText, 
  onCommentChange, 
  onAddComment, 
  onUpdateStatus,
  onBoardClick,
  statusColor 
}) {
  const comments = task.comments || [];

  return (
    <div className={`border-2 rounded-lg p-3 ${statusColor} transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 break-words mb-1">{task.text}</p>
          {board ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onBoardClick(task.boardId, board.name);
              }}
              className="text-xs text-gray-700 hover:text-blue-600 hover:underline font-medium flex items-center gap-1 transition-colors"
              title={`Go to ${board.name} board`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {board.name}
            </button>
          ) : (
            <span className="text-xs text-gray-500 italic">No board</span>
          )}
        </div>
      </div>

      {/* Action Buttons for Todo tasks */}
      {task.status === "todo" && (
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => onUpdateStatus(task.id, "progress")}
            className="flex-1 flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1.5 rounded transition-colors"
          >
            <Play size={12} />
            Start
          </button>
          <button
            onClick={() => onUpdateStatus(task.id, "done")}
            className="flex-1 flex items-center justify-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1.5 rounded transition-colors"
          >
            <CheckCircle2 size={12} />
            Complete
          </button>
        </div>
      )}

      {/* Comments Section */}
      <div className="mt-2">
        <button
          onClick={onToggleExpand}
          className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800"
        >
          <MessageSquare size={12} />
          <span>{comments.length} {comments.length === 1 ? 'comment' : 'comments'}</span>
        </button>

        {isExpanded && (
          <div className="mt-2 space-y-2 border-t pt-2">
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
                onChange={(e) => onCommentChange(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && onAddComment()}
                placeholder="Add a comment..."
                className="flex-1 text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={onAddComment}
                disabled={!commentText.trim()}
                className="bg-blue-600 text-white px-2 py-1.5 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={12} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
