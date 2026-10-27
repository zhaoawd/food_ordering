const { withPodfile } = require("@expo/config-plugins");

const MARKER = "# AUTOPHONE_XCODE_27_DEPLOYMENT_TARGET";
const ANCHOR = "    # This is necessary for Xcode 14";
const PATCH = `    ${MARKER}
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        current_target = config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if current_target.nil? || Gem::Version.new(current_target) < Gem::Version.new('15.1')
          config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
        end
        if target.name == 'fmt'
          config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
        end
      end
    end

`;

module.exports = function withAutophoneFmtCompatibility(config) {
  return withPodfile(config, (podfileConfig) => {
    const contents = podfileConfig.modResults.contents;
    if (contents.includes(MARKER)) return podfileConfig;
    if (!contents.includes(ANCHOR)) {
      throw new Error("Autophone fmt compatibility anchor is missing from ios/Podfile");
    }
    podfileConfig.modResults.contents = contents.replace(ANCHOR, `${PATCH}${ANCHOR}`);
    return podfileConfig;
  });
};
