import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../firebase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login");  
  const [loading, setLoading] = useState(false);

const navigate=useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      alert("Please fill all fields");
      return;
    }

    try {
      setLoading(true);

      if (mode === "login") {
        await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password.trim()
        );
        
      } else {
        await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password.trim()
        );
        alert("Account created");
      }
      navigate("/home")
    } catch (err) {
      alert(err.code);
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
       
      <div className="flex items-center justify-center mt-24 gap-3">
        <img
          className="w-35 h-24.75"
          src="/collabwiselogo.png"
          alt="CollabWise logo"
        />
        <h1 className="text-4xl font-bold">CollabWise</h1>
      </div>

      <div className="flex items-center justify-center text-2xl mb-20">
        <h1>Work Together, Clearly</h1>
      </div>

       
      <form
        onSubmit={handleSubmit}
        className="flex flex-col items-center"
      >
        <input
    className="border shadow-lg rounded-2xl pl-3 h-10 m-3 w-70 md:w-1/2"

          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
className="border shadow-lg rounded-2xl pl-3 h-10 m-3 w-70 md:w-1/2"

          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
 
        <button
          type="submit"
          disabled={loading}
          className={`w-1/2 rounded-lg mt-2 py-2 text-white ${
            loading
              ? "bg-blue-400 cursor-not-allowed"
              : "bg-blue-600"
          }`}
        >
          {loading
            ? "Please wait..."
            : mode === "login"
            ? "Login"
            : "Sign Up"}
        </button>

        
        <div className="flex items-center w-1/2 gap-3 my-4">
          <div className="flex-1 h-px bg-gray-300"></div>
          <span className="text-gray-500">or</span>
          <div className="flex-1 h-px bg-gray-300"></div>
        </div>
 
        <button
          type="button"
          onClick={() =>
            setMode(mode === "login" ? "signup" : "login")
          }
          className="bg-white border shadow-xl w-1/2 rounded-lg py-2"
        >
          {mode === "login"
            ? "  Sign Up ?"
            : " Login ?"}
        </button>
      </form>
    </>
  );
}
