// 验证构建的测试状态通道：Autophone 在 App 运行期间把一条命令写进
// `Documents/autophone-ui-eval-command.json`，App 校验后执行并写回执。
// 本文件只做解析与规划，不读写文件、不改 Store，便于 Node 测试覆盖全部拒绝路径。

export const TEST_COMMAND_DOCUMENT = "autophone-ui-eval-command.json";
export const TEST_COMMAND_RESULT_DOCUMENT = "autophone-ui-eval-command-result.json";
export const TEST_COMMAND_SCHEMA = "food-ordering-test-command/v1";
export const TEST_COMMAND_RESULT_SCHEMA = "food-ordering-test-command-result/v1";

// 只开放验收条款用到的操作；新增操作须同时补测试。
const OPERATIONS = new Set(["cart.decrease_line", "navigate"]);
// 导航只允许无界面入口的验收路由，不能借通道跳到任意页面。
const NAVIGABLE_ROUTES = new Set(["/dish-detail"]);
const APP_HOST = "app.invalid";
const COMMAND_ID = /^[a-f0-9]{16,64}$/;
const LINE_STABLE_ID = /^cart\.line\.[A-Za-z0-9._+-]+$/;

/**
 * 解析命令文档。返回 `{ok:true, command}` 或 `{ok:false, commandId, error}`；
 * 命令 ID 无法读出时 commandId 为 null，调用方不执行、不回执，也不删除文件。
 */
export function parseTestCommand(text, { sessionNonce }) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, commandId: null, error: "command_not_json" };
  }
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, commandId: null, error: "command_not_object" };
  }
  const commandId = typeof raw.command_id === "string" && COMMAND_ID.test(raw.command_id)
    ? raw.command_id
    : null;
  const reject = (error) => ({ ok: false, commandId, error });
  if (commandId === null) return reject("command_id_invalid");
  if (raw.schema_version !== TEST_COMMAND_SCHEMA) return reject("schema_version_unsupported");
  if (!sessionNonce) return reject("session_not_ready");
  // 命令绑定本进程读到的选择 nonce：上一次冷启动遗留的命令不得作用于新会话。
  if (raw.nonce !== sessionNonce) return reject("nonce_mismatch");
  if (!OPERATIONS.has(raw.op)) return reject("op_unsupported");
  if (raw.op === "cart.decrease_line") {
    if (typeof raw.line !== "string" || !LINE_STABLE_ID.test(raw.line)) return reject("line_invalid");
    return { ok: true, command: { commandId, op: raw.op, line: raw.line } };
  }
  if (typeof raw.path !== "string") return reject("path_invalid");
  let url;
  try {
    // 非特殊 scheme 的 origin 恒为 "null"，用 http 基址才能识别 `//host/...` 这类越界路径。
    url = new URL(raw.path, `http://${APP_HOST}`);
  } catch {
    return reject("path_invalid");
  }
  if (url.host !== APP_HOST || !raw.path.startsWith("/") || !NAVIGABLE_ROUTES.has(url.pathname)) {
    return reject("path_not_allowed");
  }
  return { ok: true, command: { commandId, op: raw.op, path: raw.path } };
}

/**
 * 按购物车当前行规划减量；lines 为 `[{stableId, id, customizations}]`。
 * 返回要传给 `decreaseQty` 的行，或拒绝原因。
 */
export function planDecreaseLine(command, lines) {
  const matches = lines.filter((line) => line.stableId === command.line);
  if (matches.length !== 1) return { ok: false, error: "line_not_found" };
  return { ok: true, line: matches[0] };
}

export function testCommandResult({ commandId, sessionNonce, ok, error, cartLines, route }) {
  return {
    schema_version: TEST_COMMAND_RESULT_SCHEMA,
    command_id: commandId,
    nonce: sessionNonce ?? null,
    ok,
    ...(error ? { error } : {}),
    cart_lines: cartLines,
    ...(route ? { route } : {}),
  };
}
