export declare const BUSINESS_EVENT_DOCUMENT: string;
export declare const BUSINESS_EVENT_SCHEMA: string;
export declare const BUSINESS_EVENTS: ReadonlySet<string>;

export declare function startLine(nonce: string, at: string): string;

export declare function appendLine(
  existing: string,
  event: { nonce: string; event: string; at: string; data?: Record<string, unknown> },
): string;
