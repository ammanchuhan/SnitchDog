// iOS 27 won't launch an app that still uses the old app-delegate-only life cycle. Expo ships a
// scene delegate for this (ExpoAppSceneDelegate) but the SDK 57 template doesn't use it yet, so
// this plugin wires it in whenever the ios/ folder is generated.
//
// Two changes:
// - Info.plist declares a single window scene handled by ExpoAppSceneDelegate.
// - AppDelegate stops creating its own window. The scene delegate creates the window and starts
//   React Native in it, using the factory the app delegate still creates at launch.
const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

function withSceneManifest(config) {
  return withInfoPlist(config, (config) => {
    config.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: 'EXExpoAppSceneDelegate',
          },
        ],
      },
    };
    return config;
  });
}

function withSceneAppDelegate(config) {
  return withAppDelegate(config, (config) => {
    if (config.modResults.language !== 'swift') {
      throw new Error('withSceneLifecycle expects a Swift AppDelegate');
    }
    let src = config.modResults.contents;

    src = src.replace(
      'class AppDelegate: ExpoAppDelegate {',
      'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {',
    );

    const startBlock =
      /#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\([\s\S]*?\)\n#endif\n/;
    if (startBlock.test(src)) {
      src = src.replace(
        startBlock,
        '    // The window and React Native are started by the scene delegate (see Info.plist).\n',
      );
    } else if (!src.includes('ExpoReactNativeFactoryProvider')) {
      throw new Error('withSceneLifecycle: AppDelegate template changed, update the plugin');
    }

    config.modResults.contents = src;
    return config;
  });
}

module.exports = function withSceneLifecycle(config) {
  return withSceneAppDelegate(withSceneManifest(config));
};
