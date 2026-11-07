// commerce-v1 业务事件日志（验证构建）：App 把业务事实逐行写进
// `Documents/autophone-commerce-business-events.jsonl`，autophone 经 vphoned 拉回核对。
// 本文件只负责事件格式与追加规划，不读写文件，便于 Node 测试覆盖。
//
// 第一行固定为 session_started，携带本次选择文档的 nonce：读回方据此确认日志属于
// 这一次准备，而不是上一次运行留下的文件。之后每行 seq 递增 1。

export const BUSINESS_EVENT_DOCUMENT = "autophone-commerce-business-events.jsonl";
export const BUSINESS_EVENT_SCHEMA = "commerce-business-event/v1";

// 只登记验收用例用到的事件名；新增须同时补测试与读回方的白名单。
export const BUSINESS_EVENTS = new Set([
  "session_started",
  "fixture_applied",
  "tab_navigated",
  "account_created",
]);

const NONCE = /^[A-Za-z0-9._-]{1,128}$/;

export function startLine(nonce, at) {
  if (!NONCE.test(String(nonce))) throw new Error("business event nonce is invalid");
  return eventLine({ nonce, seq: 0, event: "session_started", at, data: {} });
}

/** 在已有日志末尾追加一行；返回完整新内容。日志不属于当前 nonce 时拒绝追加。 */
export function appendLine(existing, { nonce, event, at, data = {} }) {
  if (!BUSINESS_EVENTS.has(event) || event === "session_started") {
    throw new Error(`business event is not registered: ${event}`);
  }
  const lines = String(existing || "").split("\n").filter(line => line.length > 0);
  if (lines.length === 0) throw new Error("business event log has not started");
  const last = JSON.parse(lines[lines.length - 1]);
  const first = JSON.parse(lines[0]);
  if (first.event !== "session_started" || first.nonce !== nonce || last.nonce !== nonce) {
    throw new Error("business event log belongs to another session");
  }
  return `${lines.join("\n")}\n${eventLine({ nonce, seq: last.seq + 1, event, at, data })}\n`;
}

function eventLine({ nonce, seq, event, at, data }) {
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("business event data must be an object");
  }
  return JSON.stringify({ schema_version: BUSINESS_EVENT_SCHEMA, nonce, seq, event, at, data });
}
