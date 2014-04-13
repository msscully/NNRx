/*global angular */

/**
 * Services that persists and retrieves REMINDERs from localStorage
 */
app.factory('reminderStorage', ['CordovaService', function (CordovaService) {
    'use strict';
    var STORAGE_ID = 'reminders-nnrx';

    var getAll = function() {
        return JSON.parse(window.localStorage.getItem(STORAGE_ID) || '{}');
    };

    var putReminders = function(reminders) {
        window.localStorage.setItem(STORAGE_ID, JSON.stringify(reminders));
    };

    return {
        all: getAll,

        put: putReminders,
    };
}]);
