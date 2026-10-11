import ExpoModulesCore
import UIKit

/**
 * Reports screen lock/unlock via the protected-data notifications.
 *
 * `protectedDataWillBecomeUnavailable` fires at the moment the device locks
 * — while this app is still running — so the JS side can send its SCREEN_OFF
 * telemetry before iOS suspends it. Caveat: protected-data notifications
 * require a device passcode; without one the events never fire and the app
 * falls back to heartbeat-only presence (the pre-module behavior).
 */
public class ScreenStateModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ScreenState")

    Events("onScreenState")

    Function("isScreenOn") { () -> Bool in
      UIApplication.shared.isProtectedDataAvailable
    }

    OnStartObserving {
      NotificationCenter.default.addObserver(
        self,
        selector: #selector(self.screenLocked),
        name: UIApplication.protectedDataWillBecomeUnavailableNotification,
        object: nil
      )
      NotificationCenter.default.addObserver(
        self,
        selector: #selector(self.screenUnlocked),
        name: UIApplication.protectedDataDidBecomeAvailableNotification,
        object: nil
      )
    }

    OnStopObserving {
      NotificationCenter.default.removeObserver(self)
    }
  }

  @objc private func screenLocked() {
    sendEvent("onScreenState", ["state": "off"])
  }

  @objc private func screenUnlocked() {
    sendEvent("onScreenState", ["state": "on"])
  }
}
