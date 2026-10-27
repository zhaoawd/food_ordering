export declare const TEST_COMMAND_DOCUMENT: string;
export declare const TEST_COMMAND_RESULT_DOCUMENT: string;
export declare const TEST_COMMAND_SCHEMA: string;
export declare const TEST_COMMAND_RESULT_SCHEMA: string;

export type TestCommand =
  | { commandId: string; op: "cart.decrease_line"; line: string }
  | { commandId: string; op: "navigate"; path: string };

export type ParsedTestCommand =
  | { ok: true; command: TestCommand }
  | { ok: false; commandId: string | null; error: string };

export declare function parseTestCommand(
  text: string,
  options: { sessionNonce: string | null },
): ParsedTestCommand;

export declare function planDecreaseLine<Line extends { stableId: string }>(
  command: { line: string },
  lines: Line[],
): { ok: true; line: Line } | { ok: false; error: string };

export declare function testCommandResult(options: {
  commandId: string;
  sessionNonce: string | null;
  ok: boolean;
  error?: string;
  cartLines: { stable_id: string; quantity: number }[];
  route?: string;
}): Record<string, unknown>;
