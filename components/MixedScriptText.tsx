import { Platform, Text } from 'react-native';

const HAN = /([\p{Script=Han}\u3000-\u303f\uff00-\uffef]+)/u;
const IS_HAN = /[\p{Script=Han}\u3000-\u303f\uff00-\uffef]/u;
// Web 按基线对齐不同字体的行内片段，PingFang 与系统字体混排时行盒比 lineHeight 高 1pt；
// iOS 由段落样式固定行高，不需要也不受影响。
const webSpanAlign = Platform.OS === 'web' ? ({ verticalAlign: 'top' } as const) : null;

/** 中文用 PingFang SC、其余用系统字体，与设计参考图的字体选择一致。 */
export function mixedText(text: string) {
  return text.split(HAN).filter(Boolean).map((part, index) => (
    <Text key={index} style={[{ fontFamily: IS_HAN.test(part) ? 'PingFang SC' : 'System' }, webSpanAlign]}>{part}</Text>
  ));
}
