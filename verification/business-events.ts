import * as FileSystem from "expo-file-system";

import { appendLine, BUSINESS_EVENT_DOCUMENT, startLine } from "./business-events.mjs";
import { isVerificationBuild } from "./runtime";

/**
 * 业务事件日志的文件读写。只在验证构建中写；Release 生产构建为空操作。
 * 写入串行执行：每次读出整份日志、追加一行、经临时文件原子替换。
 */
let sessionNonce: string | null = null;
let queue: Promise<void> = Promise.resolve();

function logPath(): string | null {
  return FileSystem.documentDirectory ? `${FileSystem.documentDirectory}${BUSINESS_EVENT_DOCUMENT}` : null;
}

async function replace(path: string, content: string): Promise<void> {
  const temporary = `${path}.tmp`;
  await FileSystem.writeAsStringAsync(temporary, content);
  await FileSystem.deleteAsync(path, { idempotent: true });
  await FileSystem.moveAsync({ from: temporary, to: path });
}

function enqueue(task: () => Promise<void>): Promise<void> {
  queue = queue.then(task, task);
  return queue;
}

/** 选择文档生效时开新日志：覆盖旧文件，第一行带本次 nonce。 */
export function beginBusinessEventLog(nonce: string): Promise<void> {
  if (!isVerificationBuild) return Promise.resolve();
  return enqueue(async () => {
    const path = logPath();
    if (!path) throw new Error("Documents directory is unavailable");
    await replace(path, `${startLine(nonce, new Date().toISOString())}\n`);
    sessionNonce = nonce;
  });
}

/** 记录一条业务事件；日志尚未开始（非验证运行）时不写。 */
export function recordBusinessEvent(event: string, data: Record<string, unknown> = {}): Promise<void> {
  if (!isVerificationBuild) return Promise.resolve();
  return enqueue(async () => {
    const path = logPath();
    const nonce = sessionNonce;
    if (!path || nonce === null) return;
    const existing = await FileSystem.readAsStringAsync(path);
    await replace(path, appendLine(existing, { nonce, event, at: new Date().toISOString(), data }));
  });
}
