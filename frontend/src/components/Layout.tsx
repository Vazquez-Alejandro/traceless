import { Link } from "react-router-dom";

export default function Layout({ children }: { children: React.ReactNode }) {
  const logout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800/40 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="font-bold text-lg">TraceLess</Link>
            <Link to="/dashboard" className="text-sm text-gray-400 hover:text-white">Dashboard</Link>
            <Link to="/clientes" className="text-sm text-gray-400 hover:text-white">Clientes</Link>
            <Link to="/facturas" className="text-sm text-gray-400 hover:text-white">Facturas</Link>
          </div>
          <button onClick={logout} className="text-sm text-gray-400 hover:text-white">Salir</button>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
