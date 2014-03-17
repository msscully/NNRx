/*global angular */

/**
 * Services that persists and retrieves REMINDERs from localStorage
 */
app.factory('reminderStorage', function () {
    'use strict';

    var STORAGE_ID = 'reminders-nnrx';

    return {
        get: function () {
            return JSON.parse(localStorage.getItem(STORAGE_ID) || '[]');
        },

        put: function (reminders) {
            localStorage.setItem(STORAGE_ID, JSON.stringify(reminders));
        }
    };
});
