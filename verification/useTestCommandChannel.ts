import { useEffect } from "react";
import * as FileSystem from "expo-file-system";
import { router } from "expo-router";

import { isVerificationBuild } from "@/verification/runtime";
import {
  TEST_COMMAND_DOCUMENT,
  TEST_COMMAND_RESULT_DOCUMENT,
  parseTestCommand,
  planDecreaseLine,
  testCommandResult,
} from "@/verification/test-command.mjs";
import { cartLineStableId, useCartStore } from "@/store/cart.store";

const POLL_MS = 250;

// 本进程读到的选择 nonce；由 `useFoodOrderingEvalFixture` 在 Fixture 就绪后设置。
let sessionNonce: string | null = null;

export function setTestCommandSession(nonce: string): void {
  sessionNonce = nonce;
}

function documentUri(name: string): string | null {
  return FileSystem.documentDirectory ? `${FileSystem.documentDirectory}${name}` : null;
}

function cartLines() {
  return useCartStore.getState().items.map((item) => ({
    stable_id: cartLineStableId(item),
    quantity: item.quantity,
  }));
}

async function writeResult(result: object): Promise<void> {
  const path = documentUri(TEST_COMMAND_RESULT_DOCUMENT);
  if (!path) return;
  const temporary = `${path}.tmp`;
  await FileSystem.writeAsStringAsync(temporary, `${JSON.stringify(result, null, 2)}\n`);
  await FileSystem.deleteAsync(path, { idempotent: true });
  await FileSystem.moveAsync({ from: temporary, to: path });
}

async function pollOnce(handled: Set<string>): Promise<void> {
  const path = documentUri(TEST_COMMAND_DOCUMENT);
  if (!path) return;
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) return;
  const text = await FileSystem.readAsStringAsync(path);
  const parsed = parseTestCommand(text, { sessionNonce });
  const commandId = parsed.ok ? parsed.command.commandId : parsed.commandId;
  // 读不出命令 ID 时可能是宿主写到一半：留着文件，下一次轮询或下一条命令覆盖它。
  if (commandId === null) return;
  if (handled.has(commandId)) {
    await FileSystem.deleteAsync(path, { idempotent: true });
    return;
  }
  let ok = false;
  let error: string | undefined = parsed.ok ? undefined : parsed.error;
  let route: string | undefined;
  if (parsed.ok) {
    const { command } = parsed;
    if (command.op === "cart.decrease_line") {
      const items = useCartStore.getState().items;
      const plan = planDecreaseLine(command, items.map((item) => ({
        stableId: cartLineStableId(item), id: item.id, customizations: item.customizations ?? [],
      })));
      if (plan.ok) {
        useCartStore.getState().decreaseQty(plan.line.id, plan.line.customizations);
        ok = true;
      } else {
        error = plan.error;
      }
    } else {
      router.push(command.path as never);
      route = command.path;
      ok = true;
    }
  }
  handled.add(commandId);
  // 先写回执再删命令：宿主看到回执时命令已执行完毕。
  await writeResult(testCommandResult({
    commandId, sessionNonce, ok, error, cartLines: cartLines(), route,
  }));
  await FileSystem.deleteAsync(path, { idempotent: true });
}

/** 仅验证构建启用；生产构建不读取命令文件。 */
export function useTestCommandChannel(): void {
  useEffect(() => {
    if (!isVerificationBuild) return;
    const handled = new Set<string>();
    let busy = false;
    const timer = setInterval(() => {
      if (busy) return;
      busy = true;
      pollOnce(handled)
        .catch(() => undefined)
        .finally(() => {
          busy = false;
        });
    }, POLL_MS);
    return () => clearInterval(timer);
  }, []);
}
