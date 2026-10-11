import { NativeModule, requireNativeModule } from 'expo';
import type { ScreenStateChangeEvent } from './ScreenState.types';

declare class ScreenStateModule extends NativeModule<{
  onScreenState: (event: ScreenStateChangeEvent) => void;
}> {
  isScreenOn(): boolean;
}

export default requireNativeModule<ScreenStateModule>('ScreenState');
