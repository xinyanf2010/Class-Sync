import { registerWebModule, NativeModule } from 'expo';

// Web stub: browsers have no screen lock signal, so assume on.
class ScreenStateModule extends NativeModule {
  isScreenOn(): boolean {
    return true;
  }
}

export default registerWebModule(ScreenStateModule, 'ScreenState');
