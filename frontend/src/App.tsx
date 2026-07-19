import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "./api/client";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import ClienteHistorial from "./pages/ClienteHistorial";
import Facturas from "./pages/Facturas";
import Terminos from "./pages/Terminos";
import Privacidad from "./pages/Privacidad";
import Perfil from "./pages/Perfil";
import Layout from "./components/Layout";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return setOk(false);
    api.auth.me().then(() => setOk(true)).catch(() => setOk(false));
  }, []);

  if (ok === null) return <div className="flex items-center justify-center min-h-screen text-gray-400">Cargando...</div>;
  if (!ok) return <Navigate to="/login" />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
      <Route path="/clientes/:id" element={<ProtectedRoute><ClienteHistorial /></ProtectedRoute>} />
      <Route path="/facturas" element={<ProtectedRoute><Facturas /></ProtectedRoute>} />
      <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
      <Route path="/terminos" element={<Terminos />} />
      <Route path="/privacidad" element={<Privacidad />} />
    </Routes>
  );
}
