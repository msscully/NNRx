/*global angular */

/**
 * Services that persists and retrieves REMINDERs from localStorage
 */
app.factory('reminderStorage', function ($window) {
    'use strict';

    var STORAGE_ID = 'reminders-nnrx';

    return {
        all: function () {
            return JSON.parse($window.localStorage.getItem(STORAGE_ID) || '{}');
        },

        put: function (reminders) {
            $window.localStorage.setItem(STORAGE_ID, JSON.stringify(reminders));
        },
    };
});
