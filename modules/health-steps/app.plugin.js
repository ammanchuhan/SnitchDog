// Adds the HealthKit entitlement and the reason shown on Apple's Health sheet.
const { withEntitlementsPlist, withInfoPlist } = require('expo/config-plugins');

module.exports = function withHealthSteps(config, { usage } = {}) {
  config = withEntitlementsPlist(config, (config) => {
    config.modResults['com.apple.developer.healthkit'] = true;
    config.modResults['com.apple.developer.healthkit.access'] = [];
    return config;
  });
  return withInfoPlist(config, (config) => {
    config.modResults.NSHealthShareUsageDescription =
      usage ?? 'SnitchDog reads your daily step count to track your step goal.';
    return config;
  });
};
