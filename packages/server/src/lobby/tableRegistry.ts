import type { Server } from "socket.io";
import { createTable, findTableByCode, listTables } from "../persistence/repositories/tables.js";
import { TableRuntime } from "../realtime/tableRoom.js";

const runtimesById = new Map<string, TableRuntime>();
const runtimesByCode = new Map<string, TableRuntime>();

export function createAndRegisterTable(io: Server, name: string, createdBy: string): TableRuntime {
  const record = createTable(name, createdBy);
  const runtime = new TableRuntime(io, record);
  runtimesById.set(record.id, runtime);
  runtimesByCode.set(record.code, runtime);
  return runtime;
}

export function getTableByCode(io: Server, code: string): TableRuntime | undefined {
  const cached = runtimesByCode.get(code.toUpperCase());
  if (cached) return cached;
  const record = findTableByCode(code);
  if (!record) return undefined;
  const runtime = new TableRuntime(io, record);
  runtimesById.set(record.id, runtime);
  runtimesByCode.set(record.code, runtime);
  return runtime;
}

export function getTableById(id: string): TableRuntime | undefined {
  return runtimesById.get(id);
}

export function listTableSummaries() {
  return listTables().map((t) => {
    const runtime = runtimesById.get(t.id);
    return {
      tableId: t.id,
      code: t.code,
      name: t.name,
      status: runtime?.status ?? t.status,
      seatedCount: runtime?.seatedCount() ?? 0,
    };
  });
}
