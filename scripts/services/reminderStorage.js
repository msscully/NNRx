/*global angular */

/**
 * Services that persists and retrieves REMINDERs from localStorage
 */
app.factory('reminderStorage', ['CordovaService', function (CordovaService) {
  'use strict';
  var STORAGE_ID = 'reminders-nnrx';
  var NOTIFICATION_STORAGE_ID = 'note2reminder-nnrx';
  var MAXID_ID = 'reminders-nnrx-maxid';
  var maxInt = Math.pow(2,32) - 1;

  var dateTimeRestorer = function(key, value) {
    if (key === 'date') {
      return new Date(value);
    }
    else {
      return value;
    }
  };

  var getAll = function() {
    return JSON.parse(window.localStorage.getItem(STORAGE_ID) || '{}', dateTimeRestorer);
  };

  var putReminders = function(reminders) {
    window.localStorage.setItem(STORAGE_ID, JSON.stringify(reminders));
  };

  var nextId = function() {
    var newId = JSON.parse(window.localStorage.getItem(MAXID_ID) || '0') + 1;
    window.localStorage.setItem(MAXID_ID, JSON.stringify(newId));
    return newId;
  };

  var getNotificationIdToReminderId = function() {
    return JSON.parse(window.localStorage.getItem(NOTIFICATION_STORAGE_ID) || '{}');
  };

  var setNotificationIdToReminderId = function(notificationIdToReminderId) {
    window.localStorage.setItem(NOTIFICATION_STORAGE_ID, JSON.stringify(notificationIdToReminderId));
  };

  return {
    all: getAll,

    put: putReminders,

    nextId: nextId,

    getNotificationIdToReminderId: getNotificationIdToReminderId,

    setNotificationIdToReminderId: setNotificationIdToReminderId,
  };
}]);
