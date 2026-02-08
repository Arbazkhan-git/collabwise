import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot
} from "firebase/firestore";

export default function SummaryView({ user, onBoardClick }) {
  const [loading, setLoading] = useState(true);
  const [boards, setBoards] = useState([]);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "boards"), where("userId", "==", user.uid));
    const unsubscribeBoards = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBoards(data);
    });

    return () => unsubscribeBoards();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "tasks"), where("userId", "==", user.uid));
    const unsubscribeTasks = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTasks(data);
      setLoading(false);
    });

    return () => unsubscribeTasks();
  }, [user]);

  if (loading) return <p className="text-center mt-10 text-gray-500">Loading...</p>;

  const todoTasks = tasks.filter(t => t.status === "todo");
  const inProgressTasks = tasks.filter(t => t.status === "progress");
  const doneTasks = tasks.filter(t => t.status === "done");
  const totalTasks = tasks.length;

  // Calculate tasks per board
  const tasksByBoard = boards.map(board => {
    const boardTasks = tasks.filter(t => t.boardId === board.id);
    return {
      ...board,
      totalTasks: boardTasks.length,
      todo: boardTasks.filter(t => t.status === "todo").length,
      inProgress: boardTasks.filter(t => t.status === "progress").length,
      done: boardTasks.filter(t => t.status === "done").length
    };
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Overall Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-5 sm:p-6 shadow-md hover:shadow-lg transition-shadow">
          <h3 className="text-xs sm:text-sm font-semibold text-blue-600 mb-2 uppercase tracking-wide">Total Boards</h3>
          <p className="text-3xl sm:text-4xl font-bold text-blue-700">{boards.length}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-xl p-5 sm:p-6 shadow-md hover:shadow-lg transition-shadow">
          <h3 className="text-xs sm:text-sm font-semibold text-purple-600 mb-2 uppercase tracking-wide">Total Tasks</h3>
          <p className="text-3xl sm:text-4xl font-bold text-purple-700">{totalTasks}</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-200 rounded-xl p-5 sm:p-6 shadow-md hover:shadow-lg transition-shadow">
          <h3 className="text-xs sm:text-sm font-semibold text-yellow-600 mb-2 uppercase tracking-wide">Todo Tasks</h3>
          <p className="text-3xl sm:text-4xl font-bold text-yellow-700">{todoTasks.length}</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-5 sm:p-6 shadow-md hover:shadow-lg transition-shadow">
          <h3 className="text-xs sm:text-sm font-semibold text-green-600 mb-2 uppercase tracking-wide">Completed Tasks</h3>
          <p className="text-3xl sm:text-4xl font-bold text-green-700">{doneTasks.length}</p>
        </div>
      </div>

      {/* Status Overview with Donut Chart */}
      <div className="bg-white border-2 border-gray-200 rounded-xl p-5 sm:p-6 shadow-md mb-6 sm:mb-8">
        <div className="mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">Status overview</h2>
          <p className="text-sm text-gray-600 mb-4">Get a snapshot of the status of your work items.</p>
        </div>
        <DonutChart 
          todo={todoTasks.length}
          inProgress={inProgressTasks.length}
          done={doneTasks.length}
          total={totalTasks}
        />
      </div>

      {/* Task Status Breakdown */}
      <div className="bg-white border-2 border-gray-200 rounded-xl p-5 sm:p-6 shadow-md mb-6 sm:mb-8">
        <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6">Task Status Breakdown</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div className="border-l-4 border-yellow-500 pl-4">
            <p className="text-sm text-gray-600">Todo</p>
            <p className="text-2xl font-bold">{todoTasks.length}</p>
            {totalTasks > 0 && (
              <p className="text-xs text-gray-500">
                {Math.round((todoTasks.length / totalTasks) * 100)}% of total
              </p>
            )}
          </div>
          <div className="border-l-4 border-blue-500 pl-4">
            <p className="text-sm text-gray-600">In Progress</p>
            <p className="text-2xl font-bold">{inProgressTasks.length}</p>
            {totalTasks > 0 && (
              <p className="text-xs text-gray-500">
                {Math.round((inProgressTasks.length / totalTasks) * 100)}% of total
              </p>
            )}
          </div>
          <div className="border-l-4 border-green-500 pl-4">
            <p className="text-sm text-gray-600">Done</p>
            <p className="text-2xl font-bold">{doneTasks.length}</p>
            {totalTasks > 0 && (
              <p className="text-xs text-gray-500">
                {Math.round((doneTasks.length / totalTasks) * 100)}% of total
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Board-wise Breakdown */}
      <div className="bg-white border-2 border-gray-200 rounded-xl p-5 sm:p-6 shadow-md">
        <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6">Tasks by Board</h2>
        {tasksByBoard.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 italic">No boards found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasksByBoard.map((board) => (
              <div
                key={board.id}
                className="border-2 border-gray-200 rounded-xl p-4 sm:p-5 hover:bg-gray-50 hover:border-blue-300 cursor-pointer transition-all shadow-sm hover:shadow-md"
                onClick={() => onBoardClick(board.id, board.name)}
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 gap-2">
                  <h3 className="font-bold text-base sm:text-lg text-gray-800">{board.name}</h3>
                  <span className="text-xs sm:text-sm text-gray-500 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {board.members} members
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-3">
                  <div className="text-center sm:text-left">
                    <p className="text-xs text-gray-600 mb-1">Todo</p>
                    <p className="text-lg sm:text-xl font-bold text-yellow-600">{board.todo}</p>
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-xs text-gray-600 mb-1">In Progress</p>
                    <p className="text-lg sm:text-xl font-bold text-blue-600">{board.inProgress}</p>
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-xs text-gray-600 mb-1">Done</p>
                    <p className="text-lg sm:text-xl font-bold text-green-600">{board.done}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    Total Tasks: <span className="font-bold text-gray-800">{board.totalTasks}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Donut Chart Component
function DonutChart({ todo, inProgress, done, total }) {
  const size = 200;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  if (total === 0) {
    return (
      <div className="relative">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-3xl sm:text-4xl font-bold text-gray-400">0</div>
          <div className="text-xs sm:text-sm text-gray-400 text-center">Total work items</div>
        </div>
      </div>
    );
  }

  const donePercent = done / total;
  const inProgressPercent = inProgress / total;
  const todoPercent = todo / total;

  // Calculate dash array and offset for each segment
  // Each segment starts where the previous one ends
  const doneLength = circumference * donePercent;
  const inProgressLength = circumference * inProgressPercent;
  const todoLength = circumference * todoPercent;

  // Offsets: each segment starts after the previous ones
  const doneOffset = circumference - doneLength;
  const inProgressOffset = circumference - (doneLength + inProgressLength);
  const todoOffset = circumference - (doneLength + inProgressLength + todoLength);

  return (
    <div className="flex flex-col lg:flex-row items-center gap-6">
      <div className="relative flex-shrink-0">
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
          />
          {/* Done segment (green) - starts at top */}
          {done > 0 && (
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="#10b981"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={doneOffset}
              strokeLinecap="round"
            />
          )}
          {/* In Progress segment (blue) */}
          {inProgress > 0 && (
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="#3b82f6"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={inProgressOffset}
              strokeLinecap="round"
            />
          )}
          {/* Todo segment (yellow) */}
          {todo > 0 && (
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="#eab308"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={todoOffset}
              strokeLinecap="round"
            />
          )}
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-3xl sm:text-4xl font-bold text-gray-800">{total}</div>
          <div className="text-xs sm:text-sm text-gray-500 text-center px-2">Total work items</div>
        </div>
      </div>
      {/* Legend */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500"></div>
          <span className="text-sm text-gray-700">Done: {done}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-500"></div>
          <span className="text-sm text-gray-700">In Progress: {inProgress}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-yellow-500"></div>
          <span className="text-sm text-gray-700">To Do: {todo}</span>
        </div>
      </div>
    </div>
  );
}
