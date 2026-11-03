const { withAppDelegate, withInfoPlist } = require('@expo/config-plugins');

const bootstrap = `#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif`;
const sceneMethods = `
  var sceneLaunchOptions: [UIApplication.LaunchOptionsKey: Any]?

  public func application(_ application: UIApplication,
                          configurationForConnecting session: UISceneSession,
                          options: UIScene.ConnectionOptions) -> UISceneConfiguration {
    let configuration = UISceneConfiguration(name: "Autophone", sessionRole: session.role)
    configuration.sceneClass = UIWindowScene.self
    configuration.delegateClass = AutophoneSceneDelegate.self
    return configuration
  }

  func connectScene(_ sceneWindow: UIWindow, options: UIScene.ConnectionOptions) {
    guard let factory = reactNativeFactory else {
      preconditionFailure("React Native factory was not initialized")
    }
    var launchOptions = sceneLaunchOptions ?? [:]
    if let context = options.urlContexts.first {
      launchOptions[.url] = context.url
      launchOptions[.sourceApplication] = context.options.sourceApplication
    }
    if let activity = options.userActivities.first(where: { $0.activityType == NSUserActivityTypeBrowsingWeb }) {
      let key = UIApplication.LaunchOptionsKey(rawValue: "UIApplicationLaunchOptionsUserActivityDictionaryKey")
      launchOptions[key] = [
        "UIApplicationLaunchOptionsUserActivityTypeKey": activity.activityType,
        "UIApplicationLaunchOptionsUserActivityKey": activity
      ]
    }
    window = sceneWindow
    factory.startReactNative(withModuleName: "main", in: sceneWindow, launchOptions: launchOptions)
    sceneWindow.makeKeyAndVisible()
  }
`;
const sceneDelegate = `

@objc(AutophoneSceneDelegate)
class AutophoneSceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(_ scene: UIScene, willConnectTo session: UISceneSession,
             options connectionOptions: UIScene.ConnectionOptions) {
    guard let windowScene = scene as? UIWindowScene,
          let app = UIApplication.shared.delegate as? AppDelegate else { return }
    let sceneWindow = UIWindow(windowScene: windowScene)
    sceneWindow.frame = windowScene.coordinateSpace.bounds
    self.window = sceneWindow
    app.connectScene(sceneWindow, options: connectionOptions)
    self.scene(scene, openURLContexts: connectionOptions.urlContexts)
    for activity in connectionOptions.userActivities {
      _ = app.application(UIApplication.shared, continue: activity, restorationHandler: { _ in })
    }
  }

  func sceneDidDisconnect(_ scene: UIScene) {
    if let app = UIApplication.shared.delegate as? AppDelegate, app.window === window {
      app.window = nil
    }
    window = nil
  }

  func sceneDidBecomeActive(_ scene: UIScene) {
    (UIApplication.shared.delegate as? AppDelegate)?.applicationDidBecomeActive(UIApplication.shared)
  }

  func sceneWillResignActive(_ scene: UIScene) {
    (UIApplication.shared.delegate as? AppDelegate)?.applicationWillResignActive(UIApplication.shared)
  }

  func sceneWillEnterForeground(_ scene: UIScene) {
    (UIApplication.shared.delegate as? AppDelegate)?.applicationWillEnterForeground(UIApplication.shared)
  }

  func sceneDidEnterBackground(_ scene: UIScene) {
    (UIApplication.shared.delegate as? AppDelegate)?.applicationDidEnterBackground(UIApplication.shared)
  }

  func scene(_ scene: UIScene, openURLContexts contexts: Set<UIOpenURLContext>) {
    guard let app = UIApplication.shared.delegate as? AppDelegate else { return }
    for context in contexts {
      var options: [UIApplication.OpenURLOptionsKey: Any] = [.openInPlace: context.options.openInPlace]
      if let source = context.options.sourceApplication { options[.sourceApplication] = source }
      if let annotation = context.options.annotation { options[.annotation] = annotation }
      _ = app.application(UIApplication.shared, open: context.url, options: options)
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    guard let app = UIApplication.shared.delegate as? AppDelegate else { return }
    _ = app.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
  }
}
`;
function migrateAppDelegate(contents, language) {
  if (language !== 'swift') throw new Error('Scene lifecycle requires the frozen Expo 53 Swift template');
  if (contents.includes('@objc(AutophoneSceneDelegate)')) {
    if (contents.includes(bootstrap) || !contents.includes('sceneLaunchOptions = launchOptions')) {
      throw new Error('Scene lifecycle template is partially applied');
    }
    return contents;
  }
  if (contents.split(bootstrap).length !== 2 ||
      contents.split('  // Linking API').length !== 2) {
    throw new Error('Expo 53 AppDelegate bootstrap differs; refuse incomplete scene migration');
  }
  return contents.replace(bootstrap, '    sceneLaunchOptions = launchOptions')
    .replace('  // Linking API', sceneMethods + '\n  // Linking API') + sceneDelegate;
}
module.exports = function withAutophoneSceneLifecycle(config) {
  config = withAppDelegate(config, config => {
    config.modResults.contents = migrateAppDelegate(config.modResults.contents, config.modResults.language);
    return config;
  });
  return withInfoPlist(config, config => {
    const existing = config.modResults.UIApplicationSceneManifest;
    const manifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [{
          UISceneConfigurationName: 'Autophone',
          UISceneClassName: 'UIWindowScene',
          UISceneDelegateClassName: 'AutophoneSceneDelegate'
        }]
      }
    };
    if (existing && JSON.stringify(existing) !== JSON.stringify(manifest)) {
      throw new Error('An existing scene manifest must be migrated explicitly');
    }
    config.modResults.UIApplicationSceneManifest = manifest;
    return config;
  });
};
module.exports.migrateAppDelegate = migrateAppDelegate;
