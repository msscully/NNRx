/*global angular */

/**
 * Services that persists and retrieves REMINDERs from localStorage
 */
app.service('localNotifications', ['$rootScope', '$q', 'CordovaService', '$window', function ($rootScope, $q, CordovaService, $window) {
    'use strict';

    var service = {

        add: function(notificationSettings) {
            var deferred = $q.defer();

            CordovaService.ready.then(function() {
                var notificationId = $window.plugin.notification.local.add(notificationSettings);

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
                        scheduled = isScheduled;
                    }
                );

                deferred.resolve(scheduled);
            });

            return deferred.promise;
        },

        cancel: function(notificationId) {
            var deferred = $q.defer();

            CordovaService.ready.then(function() {

                var scheduled;
                $window.plugin.notification.local.isScheduled(
                    notificationId,
                    function (isScheduled) {
                        scheduled = isScheduled;
                    }
                );


                var cancelFinished = function () {
                    deferred.resolve();
                };

                if(scheduled) {
                    $window.plugin.notification.local.cancel(notificationId, cancelFinished);
                }

            });

            return deferred.promise;

        },

    };

    CordovaService.ready.then(function() {
        $window.plugin.notification.local.onclick = function(id, state, json) {
            // Need to emit an event so controllers can subscribe
            // Needs to be wrapped in $rootScope.safeApply because it's a callback that
            // gets executed out-of-app
            CordovaService.ready.then(function() {
                $rootScope.safeApply(
                    $rootScope.$broadcast("localOnClick", {id: id, state: state, json: json})
                );
            });
        };

        $window.plugin.notification.local.ontrigger = function(id, state, json) {
            // Need to emit an event so controllers can subscribe
            // Needs to be wrapped in $rootScope.safeApply because it's a callback that
            // gets executed out-of-app
            CordovaService.ready.then(function() {
                $rootScope.safeApply($rootScope.$broadcast("localOnTrigger", {id: id, state: state, json: json}));
            });
        };
    });

    return service;
}]);
