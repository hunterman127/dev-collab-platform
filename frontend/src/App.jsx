import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ProjectPage from "./pages/ProjectPage";

function App() {
  const savedToken = localStorage.getItem("token");
  const savedUser = localStorage.getItem("user");

  const [token, setToken] = useState(savedToken || null);
  const [user, setUser] = useState(savedUser ? JSON.parse(savedUser) : null);

  function handleLogin(data) {
    setToken(data.token);
    setUser(data.user);

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
  }

  function handleLogout() {
    setToken(null);
    setUser(null);

    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }

  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={token ? "/dashboard" : "/login"} />}
      />

      <Route
        path="/login"
        element={<Login onLogin={handleLogin} />}
      />

      <Route
        path="/register"
        element={<Register />}
      />

      <Route
        path="/dashboard"
        element={
          token ? (
            <Dashboard token={token} onLogout={handleLogout} />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      <Route
        path="/project/:id"
        element={
          token ? (
            <ProjectPage token={token} user={user} />
          ) : (
            <Navigate to="/login" />
          )
        }
      />
    </Routes>
  );
}

export default App;