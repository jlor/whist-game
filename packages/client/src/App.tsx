import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./state/AuthContext.js";
import { GameStateProvider } from "./state/GameStateProvider.js";
import LobbyPage from "./pages/LobbyPage.js";
import TablePage from "./pages/TablePage.js";
import HistoryPage from "./pages/HistoryPage.js";

export default function App() {
  const { user, loading, logout } = useAuth();

  if (loading) return <div className="centered">Loading…</div>;
  if (!user) return <LobbyPage />;

  return (
    <GameStateProvider>
      <header className="app-header">
        <span>Whist — signed in as {user.username}</span>
        <button onClick={() => logout()}>Log out</button>
      </header>
      <Routes>
        <Route path="/" element={<LobbyPage />} />
        <Route path="/table/:code" element={<TablePage />} />
        <Route path="/history/:sessionId" element={<HistoryPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </GameStateProvider>
  );
}
