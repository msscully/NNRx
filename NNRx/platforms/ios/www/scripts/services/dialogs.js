/*global angular */

/**
 * Services that persists and retrieves REMINDERs from localStorage
 */
app.service('dialogs', ['$q', 'CordovaService', function ($q, CordovaService) {
    'use strict';

    var service = {

        confirm: function(message, title, buttons) {
            var deferred = $q.defer();
            var index;

            var notificationConfirm = function(buttonIndex) {
                index = buttonIndex;
                deferred.resolve(index);
            };

            CordovaService.ready.then(function() {
                navigator.notification.confirm(
                    message,
                    notificationConfirm,
                    title,
                    buttons
                );
            });

            return deferred.promise;
        },

        alert: function(message, title, buttonName) {
            var deferred = $q.defer();

            var notificationAlert = function() {
                deferred.resolve();
            };

            CordovaService.ready.then(function() {
                navigator.notification.alert(
                    message,
                    notificationAlert,
                    title,
                    buttonName
                );
            });

            return deferred.promise;
        },

    };

    return service;
}]);
