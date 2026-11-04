// The example resolves sh.reception:reception from ~/.m2 until the Android SDK is on Maven Central.
// Publish it first: ./gradlew :reception:publishToMavenLocal in a copy of reception-android.
const { withProjectBuildGradle } = require('expo/config-plugins');

module.exports = function withMavenLocal(config) {
  return withProjectBuildGradle(config, (config) => {
    const marker = 'allprojects {\n  repositories {\n';
    if (!config.modResults.contents.includes('mavenLocal()')) {
      config.modResults.contents = config.modResults.contents.replace(
        marker,
        `${marker}    mavenLocal()\n`,
      );
    }
    return config;
  });
};
