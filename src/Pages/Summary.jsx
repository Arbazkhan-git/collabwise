import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  onSnapshot
} from "firebase/firestore";
import { ArrowLeft } from "lucide-react";

export default function Summary() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [boards, setBoards] = useState([]);
  const [tasks, setTasks] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setBoards([]);
        setTasks([]);
        setLoading(false);
        navigate("/loginuser");
        return;
      }
    });

    return () => unsubscribeAuth();
  }, [navigate]);

   
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
  if (!user) return null;

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
    <div>
      <div className="flex w-full items-center h-20 justify-between gap-2 shadow-md mb-5 px-5">
        <div className="flex items-center gap-3">
          <p
            onClick={() => navigate("/home")}
            className="font-medium text-gray-400 flex items-center gap-1 hover:text-gray-600 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Home
          </p>
          <b className="text-gray-300">|</b>
          <h1 className="text-lg md:text-lg lg:text-3xl font-bold">Summary</h1>
        </div>
      </div>

      <div className="px-5">
        {/* Overall Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-sm font-medium text-blue-600 mb-2">Total Boards</h3>
            <p className="text-3xl font-bold text-blue-700">{boards.length}</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-sm font-medium text-purple-600 mb-2">Total Tasks</h3>
            <p className="text-3xl font-bold text-purple-700">{totalTasks}</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-sm font-medium text-yellow-600 mb-2">Todo Tasks</h3>
            <p className="text-3xl font-bold text-yellow-700">{todoTasks.length}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-sm font-medium text-green-600 mb-2">Completed Tasks</h3>
            <p className="text-3xl font-bold text-green-700">{doneTasks.length}</p>
          </div>
        </div>

        {/* Task Status Breakdown */}
        <div className="bg-white border rounded-lg p-6 shadow-sm mb-8">
          <h2 className="text-xl font-semibold mb-4">Task Status Breakdown</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Tasks by Board</h2>
          {tasksByBoard.length === 0 ? (
            <p className="text-gray-400 italic">No boards found</p>
          ) : (
            <div className="space-y-4">
              {tasksByBoard.map((board) => (
                <div
                  key={board.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/taskmanager/${board.id}`)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg">{board.name}</h3>
                    <span className="text-sm text-gray-500">{board.members} members</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-3">
                    <div>
                      <p className="text-xs text-gray-600">Todo</p>
                      <p className="text-lg font-bold text-yellow-600">{board.todo}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">In Progress</p>
                      <p className="text-lg font-bold text-blue-600">{board.inProgress}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Done</p>
                      <p className="text-lg font-bold text-green-600">{board.done}</p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-sm text-gray-600">
                      Total Tasks: <span className="font-semibold">{board.totalTasks}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
