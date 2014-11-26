/*global angular */

/**
 * Services that persists and retrieves REMINDERs from localStorage
 */
app.factory('reminderStorage', ['CordovaService', function (CordovaService) {
    'use strict';
    var STORAGE_ID = 'reminders-nnrx';
    var MAXID_ID = 'reminders-nnrx-maxid';
    var maxInt = Math.pow(2,32) - 1;

    var getAll = function() {
        return JSON.parse(window.localStorage.getItem(STORAGE_ID) || '{}');
    };

    var putReminders = function(reminders) {
        window.localStorage.setItem(STORAGE_ID, JSON.stringify(reminders));
    };

    var nextId = function() {
      var newId = JSON.parse(window.localStorage.getItem(MAXID_ID) || '0') + 1;
      window.localStorage.setItem(MAXID_ID, JSON.stringify(newId));
      return newId;
    };

    return {
        all: getAll,

        put: putReminders,

        nextId: nextId,
    };
}]);
