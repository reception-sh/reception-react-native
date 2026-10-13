import { requireNativeView } from 'expo';
import type { StyleProp, ViewStyle } from 'react-native';
import { native, warnUnavailable } from './NativeReception';

export interface ReceptionChatViewProps {
  style?: StyleProp<ViewStyle>;
}
const NativeView = native
  ? requireNativeView<ReceptionChatViewProps>('ReceptionReactNative')
  : null;

export function ReceptionChatView(props: ReceptionChatViewProps) {
  if (!NativeView) {
    warnUnavailable();
    return null;
  }
  return <NativeView {...props} />;
}
