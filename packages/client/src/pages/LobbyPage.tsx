import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext.js";
import { useGame } from "../state/GameStateProvider.js";
import { getSocket } from "../api/socket.js";

export default function LobbyPage() {
  const { user } = useAuth();
  return user ? <TableBrowser /> : <AuthForms />;
}

function AuthForms() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (mode === "login") await login(username, password);
      else await register(username, password, displayName || undefined);
    } catch (err: any) {
      setError(err.message ?? "something went wrong");
    }
  }

  return (
    <div className="centered">
      <form className="card" onSubmit={submit}>
        <h1>Whist</h1>
        <div className="tabs">
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
            Log in
          </button>
          <button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>
            Register
          </button>
        </div>
        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3} />
        </label>
        {mode === "register" && (
          <label>
            Display name
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </label>
        )}
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit">{mode === "login" ? "Log in" : "Register"}</button>
      </form>
    </div>
  );
}

function TableBrowser() {
  const { actions } = useGame();
  const navigate = useNavigate();
  const [tables, setTables] = useState<
    { tableId: string; code: string; name: string; status: string; seatedCount: number }[]
  >([]);
  const [newTableName, setNewTableName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSocket().emit("lobby:list", {}, (list: any) => setTables(list));
  }, []);

  async function createTable(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const { code } = await actions.createTable(newTableName || "Table");
      navigate(`/table/${code}`);
    } catch (err: any) {
      setError(err.message ?? "could not create table");
    }
  }

  async function joinTable(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const result = await actions.joinTable(joinCode.trim());
      if (!result || (result as any).error) throw new Error("table not found");
      navigate(`/table/${result.code}`);
    } catch (err: any) {
      setError(err.message ?? "could not join table");
    }
  }

  return (
    <div className="page">
      <h1>Lobby</h1>
      {error && <p className="error">{error}</p>}

      <section className="card">
        <h2>Create a table</h2>
        <form onSubmit={createTable}>
          <input placeholder="Table name" value={newTableName} onChange={(e) => setNewTableName(e.target.value)} />
          <button type="submit">Create</button>
        </form>
      </section>

      <section className="card">
        <h2>Join by code</h2>
        <form onSubmit={joinTable}>
          <input placeholder="ABCDE" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} />
          <button type="submit">Join</button>
        </form>
      </section>

      <section className="card">
        <h2>Open tables</h2>
        <ul>
          {tables.map((t) => (
            <li key={t.tableId}>
              <button onClick={() => navigate(`/table/${t.code}`)}>
                {t.name} — {t.code} ({t.seatedCount}/4, {t.status})
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
