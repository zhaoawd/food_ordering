import * as FileSystem from "expo-file-system";
import {
  Children,
  isValidElement,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  LayoutChangeEvent,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  TextProps,
  TextStyle,
  View,
  ViewProps,
  ViewStyle,
} from "react-native";

import { isVerificationBuild } from "@/verification/runtime";

const OBSERVATION_FILE = "autophone-ui-observation.json";
const STATE_REVISION = 1;
const SELECTION_RECEIPT_FILE = "autophone-ui-eval-selection-receipt.json";
let mutationEpoch = 0;
const WRITE_DELAY_MS = 150;
// layout 之后的补测时点（毫秒）：覆盖 safe-area inset 生效等晚到的窗口位置变化。
const SETTLE_RESAMPLE_MS = [120, 400, 900];

type Primitive = string | number | boolean | null;
type SourceRef = { file: string; symbol?: string | null; line?: number | null };
type Frame = { x: number; y: number; width: number; height: number };
type ObservedElement = {
  stable_id: string;
  role?: string;
  visible: boolean;
  text?: string | null;
  resolved_style?: Record<string, Primitive>;
  frame: Frame;
  source_ref?: SourceRef;
};

const elements = new Map<string, ObservedElement>();
let layoutEpoch = 0;
let writeTimer: ReturnType<typeof setTimeout> | null = null;
let publishNotBeforeMs = 0;

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function fnv1a32(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

/**
 * 从实际渲染的 children 取文案，而不是读一个为观测另写的 observationText prop。
 *
 * 换掉 prop 有两个理由。其一，prop 是**同源回读**：改渲染与改观测输入是两处可以各自
 * 改动的写法。其二更硬——变异实验会改渲染出来的文案，而 overlay 里写死的 prop
 * 不会跟着变，两路一比对就判不一致而 fail-closed，整个变异组一个数都拿不到。
 *
 * 边界：这仍取自 React 元素树而非渲染输出，消除的是同源「重复」，
 * 不等于把 text 提升为 render_independent。text 的独立证据来自第二路 AX 通道。
 */
function renderedText(children: ReactNode): string | null {
  const parts: string[] = [];
  // 同一元素内的字符串直接相连，跨元素边界补一个分隔符 —— 与 iOS 对 accessible
  // 容器拼接子节点标签的行为一致，两路文案才能直接比对。
  const walk = (node: ReactNode, own: string[]): void => {
    if (node === null || node === undefined || typeof node === "boolean") return;
    if (typeof node === "string" || typeof node === "number") {
      own.push(String(node));
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((item) => walk(item, own));
      return;
    }
    if (isValidElement(node)) {
      const nested: string[] = [];
      walk((node.props as { children?: ReactNode }).children, nested);
      const text = nested.join("").trim();
      if (text.length > 0) parts.push(text);
    }
  };
  const direct: string[] = [];
  walk(children, direct);
  const own = direct.join("").trim();
  if (own.length > 0) parts.unshift(own);
  return parts.length > 0 ? parts.join(" ") : null;
}

function renderedInlineText(children: ReactNode): string | null {
  const walk = (node: ReactNode): string => {
    if (node === null || node === undefined || typeof node === "boolean") return "";
    if (typeof node === "string" || typeof node === "number") return String(node);
    if (Array.isArray(node)) return node.map(walk).join("");
    if (isValidElement(node)) {
      return walk((node.props as { children?: ReactNode }).children);
    }
    return "";
  };
  const text = walk(children).trim();
  return text.length > 0 ? text : null;
}

function primitiveStyle(style: unknown): Record<string, Primitive> {
  const flattened = StyleSheet.flatten(style as StyleProp<ViewStyle | TextStyle>) || {};
  return Object.fromEntries(
    Object.entries(flattened).filter(([, value]) =>
      value === null || ["string", "number", "boolean"].includes(typeof value),
    ),
  ) as Record<string, Primitive>;
}

// 仅合并唯一直接 Text 子节点的颜色；不把文本布局当作按钮布局。
// 多个文本子节点或 render-prop 无法确定唯一颜色时保留缺失值。
export function pressableObservationStyle(
  style: StyleProp<ViewStyle>,
  children: ReactNode | PressableProps["children"],
): StyleProp<ViewStyle | TextStyle> {
  if (typeof children === "function") return style;
  const labels = Children.toArray(children).filter(
    (child) => isValidElement<TextProps>(child) && child.type === Text,
  );
  if (labels.length !== 1 || !isValidElement<TextProps>(labels[0])) return style;
  const labelStyle = StyleSheet.flatten(labels[0].props.style);
  return labelStyle?.color == null ? style : [style, { color: labelStyle.color }];
}

function observationPath(): string | null {
  return FileSystem.documentDirectory
    ? `${FileSystem.documentDirectory}${OBSERVATION_FILE}`
    : null;
}

async function publishObservation(): Promise<void> {
  if (!isVerificationBuild) return;
  const path = observationPath();
  if (!path) return;
  const sortedElements = [...elements.values()]
    .sort((left, right) => left.stable_id.localeCompare(right.stable_id));
  const payload = {
    schema_version: "ui-actual-observation/v1",
    stability: {
      state_revision: STATE_REVISION,
      mutation_epoch: mutationEpoch,
      layout_epoch: layoutEpoch,
      snapshot_hash: fnv1a32(canonical(sortedElements)),
    },
    elements: sortedElements,
  };
  const temporaryPath = `${path}.tmp`;
  await FileSystem.writeAsStringAsync(temporaryPath, `${JSON.stringify(payload, null, 2)}\n`);
  await FileSystem.deleteAsync(path, { idempotent: true });
  await FileSystem.moveAsync({ from: temporaryPath, to: path });
}

function schedulePublish(): void {
  if (!isVerificationBuild) return;
  if (writeTimer) clearTimeout(writeTimer);
  const delayMs = Math.max(
    WRITE_DELAY_MS,
    publishNotBeforeMs - Date.now() + WRITE_DELAY_MS,
  );
  writeTimer = setTimeout(() => {
    writeTimer = null;
    void publishObservation();
  }, delayMs);
}

function upsertElement(element: ObservedElement): void {
  const previous = elements.get(element.stable_id);
  if (previous && canonical(previous) === canonical(element)) return;
  elements.set(element.stable_id, element);
  layoutEpoch += 1;
  schedulePublish();
}

type BeginEvalObservationSession = Readonly<{
  mutationId: string;
  mutationEpoch: number;
  selectionNonce: string;
  registrySha256: string;
}>;

function selectionReceiptPath(): string | null {
  return FileSystem.documentDirectory
    ? `${FileSystem.documentDirectory}${SELECTION_RECEIPT_FILE}`
    : null;
}

export async function beginEvalObservationSession({
  mutationId,
  mutationEpoch: nextMutationEpoch,
  selectionNonce,
  registrySha256,
}: BeginEvalObservationSession): Promise<void> {
  if (!Number.isInteger(nextMutationEpoch) || nextMutationEpoch < 0) {
    throw new Error("mutation epoch must be a non-negative integer");
  }
  if (selectionNonce.length === 0 || !/^[0-9a-f]{64}$/.test(registrySha256)) {
    throw new Error("selection receipt inputs are invalid");
  }
  await resetObservationExport();
  mutationEpoch = nextMutationEpoch;
  const path = selectionReceiptPath();
  if (!path) throw new Error("Documents directory is unavailable");
  const receipt = {
    schema_version: "ui-eval-selection-receipt/v1",
    mutation_id: mutationId,
    mutation_epoch: mutationEpoch,
    nonce: selectionNonce,
    registry_sha256: registrySha256,
  };
  const temporaryPath = `${path}.tmp`;
  await FileSystem.writeAsStringAsync(
    temporaryPath,
    `${JSON.stringify(receipt, null, 2)}\n`,
  );
  await FileSystem.deleteAsync(path, { idempotent: true });
  await FileSystem.moveAsync({ from: temporaryPath, to: path });
}

export async function resetObservationExport(): Promise<void> {
  if (!isVerificationBuild) return;
  elements.clear();
  layoutEpoch = 0;
  mutationEpoch = 0;
  publishNotBeforeMs = 0;
  if (writeTimer) {
    clearTimeout(writeTimer);
    writeTimer = null;
  }
  for (const path of [observationPath(), selectionReceiptPath()]) {
    if (path) await FileSystem.deleteAsync(path, { idempotent: true });
  }
}

type ObservationProps = {
  stableId?: string;
  observationRole: string;
  sourceRef?: SourceRef;
};

function useObservation(
  props: ObservationProps,
  style: StyleProp<ViewStyle | TextStyle>,
  text: string | null,
) {
  const ref = useRef<any>(null);
  const resolvedStyle = useMemo(() => primitiveStyle(style), [style]);
  const styleSignature = canonical(resolvedStyle);
  const measure = useCallback(() => {
    if (!isVerificationBuild || !props.stableId) return;
    // 只在 onLayout 测一次不够：safe-area inset 在 layout 之后才作用到窗口位置，
    // 此后没有事件触发重测，而 upsertElement 只在值变化时发布 —— 提前测到的坐标会
    // 「稳定地」停在错值上，就绪闸反而把它当成合格观测。重测幂等：值没变直接返回。
    publishNotBeforeMs = Math.max(
      publishNotBeforeMs,
      Date.now() + SETTLE_RESAMPLE_MS[SETTLE_RESAMPLE_MS.length - 1],
    );
    if (writeTimer) schedulePublish();
    const sample = () => {
      ref.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
        upsertElement({
          stable_id: props.stableId as string,
          role: props.observationRole,
          visible: width > 0 && height > 0,
          text,
          resolved_style: resolvedStyle,
          frame: { x, y, width, height },
          source_ref: props.sourceRef,
        });
      });
    };
    requestAnimationFrame(() => {
      sample();
      requestAnimationFrame(sample);
    });
    for (const delayMs of SETTLE_RESAMPLE_MS) {
      setTimeout(sample, delayMs);
    }
  }, [props.stableId, props.observationRole, props.sourceRef, styleSignature, text]);
  // 只挂 onLayout 不够：文案或样式变了而盒子没变时，RN 不发 layout 事件，
  // 观测里的 text 会**永久**停在旧值上，且因为不再变化而通过稳定性判据——
  // 2026-08-17 实测：偏好摘要连续两次交互后 AX 走到「重辣 · 2 项忌口」，观测仍是
  // 「中辣 · 无忌口」。此处按观测值本身的变化重测，与 onLayout 互补；
  // upsertElement 值未变即返回，所以重复调用不会多发布。
  useEffect(() => {
    measure();
  }, [measure]);
  useEffect(() => () => {
    if (!isVerificationBuild || !props.stableId) return;
    if (!elements.delete(props.stableId)) return;
    layoutEpoch += 1;
    schedulePublish();
  }, [props.stableId]);
  return { ref, measure };
}

type ObservedViewProps = ObservationProps & ViewProps & {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function ObservedView({
  stableId,
  observationRole,
  sourceRef,
  onLayout,
  style,
  children,
  ...props
}: ObservedViewProps) {
  const text = useMemo(() => renderedText(children), [children]);
  const observation = useObservation({ stableId, observationRole, sourceRef }, style, text);
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    onLayout?.(event);
    observation.measure();
  }, [onLayout, observation.measure]);
  return (
    <View
      {...props}
      collapsable={false}
      onLayout={handleLayout}
      ref={observation.ref}
      style={style}
      testID={stableId}
    >
      {children}
    </View>
  );
}

type ObservedTextProps = ObservationProps & TextProps & {
  children?: ReactNode;
  className?: string;
  observationStyle?: StyleProp<ViewStyle>;
};

export function ObservedText({
  stableId,
  observationRole,
  sourceRef,
  accessibilityRole,
  onLayout,
  observationStyle,
  style,
  children,
  ...props
}: ObservedTextProps) {
  const text = useMemo(() => renderedInlineText(children), [children]);
  const observation = useObservation({ stableId, observationRole, sourceRef }, style, text);
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    onLayout?.(event);
    observation.measure();
  }, [onLayout, observation.measure]);
  // 必须用 accessible 的 View 包住 Text，不能只给 Text 加 accessible：
  // RN 在 iOS 上把 <Text> 渲染成文本容器，其 AX 元素是合成的虚拟元素，既不继承
  // testID → accessibilityIdentifier，也不带自身 frame（报全屏）。只有 accessible 的
  // View 才在 AX 树里成为可按 identifier 寻址、且 frame 正确的节点。
  // observationStyle 只在调用方需要冻结观测 Frame 时作用于包装 View；
  // className 与 style 仍作用在 Text 上。
  return (
    <View
      accessible
      accessibilityRole={accessibilityRole}
      collapsable={false}
      onLayout={handleLayout}
      ref={observation.ref}
      style={observationStyle}
      testID={stableId}
    >
      <Text {...props} style={style}>
        {children}
      </Text>
    </View>
  );
}

type ObservedPressableProps = ObservationProps &
  Omit<PressableProps, "style"> & {
    children?: ReactNode | PressableProps["children"];
    className?: string;
    style?: StyleProp<ViewStyle>;
  };

export function ObservedPressable({
  stableId,
  observationRole,
  sourceRef,
  onLayout,
  style,
  children,
  ...props
}: ObservedPressableProps) {
  const text = useMemo(
    () => typeof children === "function" ? null : renderedText(children),
    [children],
  );
  const observedStyle = useMemo(() => pressableObservationStyle(style, children), [style, children]);
  const observation = useObservation({ stableId, observationRole, sourceRef }, observedStyle, text);
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    onLayout?.(event);
    observation.measure();
  }, [onLayout, observation.measure]);
  // accessible + collapsable={false}：与 ObservedText 同理，让这个节点在 AX 树里
  // 可按 identifier 寻址且带自身 frame。普通 children 直接派生文案；render-prop
  // children 需要 Pressable 提供 pressed 状态后才有结果，观测层不执行它并返回 null。
  return (
    <Pressable
      {...props}
      accessible
      collapsable={false}
      onLayout={handleLayout}
      ref={observation.ref}
      style={style}
      testID={stableId}
    >
      {children as PressableProps["children"]}
    </Pressable>
  );
}
