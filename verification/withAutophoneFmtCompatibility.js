const { withPodfile } = require("@expo/config-plugins");

const MARKER = "# AUTOPHONE_FMT_XCODE_26_COMPATIBILITY";
const ANCHOR = "    # This is necessary for Xcode 14";
const PATCH = `    ${MARKER}
    installer.pods_project.targets.each do |target|
      next unless target.name == 'fmt'

      target.build_configurations.each do |config|
        config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
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
