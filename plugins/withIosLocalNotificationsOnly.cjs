const { withEntitlementsPlist } = require('expo/config-plugins');

// Reminders are local-only. expo-notifications always adds the push entitlement,
// which free Apple personal teams cannot sign. Remove this plugin if remote push is added.
module.exports = function withIosLocalNotificationsOnly(config) {
  return withEntitlementsPlist(config, config => {
    delete config.modResults['aps-environment'];
    return config;
  });
};
