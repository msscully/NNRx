/*global angular */

/**
 * Services that persists and retrieves REMINDERs from localStorage
 */
app.service('localNotifications', ['$rootScope', '$q', 'CordovaService', '$window', function ($rootScope, $q, CordovaService, $window) {
    'use strict';

    var service = {

        add: function(title, message, json, date, repeat) {
            var deferred = $q.defer();

            CordovaService.ready.then(function() {
                var notificationId = $window.plugin.notification.local.add({
                    title:      title,
                    message:    message,
                    json:       json,
                    date:       date,
                    autoCancel: true,
                    repeat:     repeat,
                });

                deferred.resolve(notificationId);
            });

            return deferred.promise;
        },

        isScheduled: function(notificationId) {
            var deferred = $q.defer();

            CordovaService.ready.then(function() {
                var scheduled = false;
                $window.plugin.notification.local.isScheduled(
                    notificationId,
                    function (isScheduled) {
                        schedule = isScheduled;
                    }
                );

                deferred.resolve(schduled);
            });

            return deferred.promise;
        },

        cancel: function(notificationId) {
            var deferred = $q.defer();

            CordovaService.ready.then(function() {
                $window.plugin.notification.local.cancel(notificationId);

                deferred.resolve();
            });

            return deferred.promise;

        },

    };

    $window.plugin.notification.local.onclick = function(id, state, json) {
        // Need to emit an event so controllers can subscribe
        // Needs to be wrapped in $rootScope.safeApply because it's a callback that
        // gets executed out-of-app
        $rootScope.safeApply($rootScope.$emit("localOnClick", {id: id, state: state, json: json}));
    };
    
    $window.plugin.notification.local.ontrigger = function(id, state, json) {
        // Need to emit an event so controllers can subscribe
        // Needs to be wrapped in $rootScope.safeApply because it's a callback that
        // gets executed out-of-app
        $rootScope.safeApply($rootScope.$emit("localOnTrigger", {id: id, state: state, json: json}));
    };
    return service;

}]);
