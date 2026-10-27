const { withAppDelegate, withInfoPlist } = require("@expo/config-plugins");

// Apps linked against the iOS 27 SDK must adopt the scene lifecycle: UIKit traps at launch
// (_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption) when Info.plist has no
// UIApplicationSceneManifest. React Native starts from a SceneDelegate instead of the AppDelegate.

const MARKER = "// AUTOPHONE_SCENE_LIFECYCLE";
const WINDOW_START = `#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif
`;
const WINDOW_VAR = "  var window: UIWindow?\n";
const SCENE_DELEGATE = `
${MARKER}
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }
    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window
    appDelegate.reactNativeFactory?.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: appDelegate.launchOptions)
  }
}
`;

function withSceneManifest(config) {
  return withInfoPlist(config, (plistConfig) => {
    plistConfig.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: "Default Configuration",
            UISceneDelegateClassName: "$(PRODUCT_MODULE_NAME).SceneDelegate",
          },
        ],
      },
    };
    return plistConfig;
  });
}

function withSceneDelegate(config) {
  return withAppDelegate(config, (delegateConfig) => {
    const { language, contents } = delegateConfig.modResults;
    if (language !== "swift") {
      throw new Error("Scene lifecycle plugin expects a Swift AppDelegate");
    }
    if (contents.includes(MARKER)) return delegateConfig;
    if (!contents.includes(WINDOW_START) || !contents.includes(WINDOW_VAR)) {
      throw new Error("Scene lifecycle anchors are missing from AppDelegate.swift");
    }
    delegateConfig.modResults.contents =
      contents
        .replace(WINDOW_VAR, `${WINDOW_VAR}  var launchOptions: [UIApplication.LaunchOptionsKey: Any]?\n`)
        .replace(WINDOW_START, "    self.launchOptions = launchOptions\n") + SCENE_DELEGATE;
    return delegateConfig;
  });
}

module.exports = function withSceneLifecycle(config) {
  return withSceneDelegate(withSceneManifest(config));
};
