/*global angular */

/**
 * Services that manages the internal notification queue
 *
 * The queue is really an associative array of reminderId: [notificationIds].
 * Each reminder has its own queue, in firing date order, of length:
 * floor(64/(numEveryOtherDay + 2*numDaily)
 * If a new reminder is created all queues are resized to create the queue for
 * the new reminder. When a reminder is canceled a new one is added for the
 * next appropriate date to the end of its queue.
 *
 * There's always a notification scheduled to warn the user that they need to
 * interact with the app or stop getting notifications. That notification is
 * rescheduled everytime a reminder is created or canceled, and it's set to go
 * off between the last scheduled reminder and when the next would be
 * scheduled.
 *
 * reminders is the dictionary of {reminderId: {reminder} for display in the
 * views. It needs to be persisted to localStorage. Reminder 0 should always
 * be the reminder to interact with the app again, but it shouldn't be shown
 * in the reminders list, shouldn't be editable or deletable, just available
 * for the dialog.
 *
 * reminderQueues is the dictionary of {reminderId: [notification]} that
 * contains the per reminder queues. It also needs to be persisted to
 * localStorage.
 */
app.factory('notificationQueue', ['CordovaService', 'reminderStorage', 'localNotifications', function (CordovaService, reminderStorage, localNotifications) {
  'use strict';
  var REMINDERS_STORAGE_ID = 'reminders-nnrx';
  var NOTE2REMINDER_STORAGE_ID = 'note2reminder-nnrx';
  var QUEUE_STORAGE_ID = 'notification-queue-nnrx';
  var OLDEST_DATE_STORAGE_ID = 'oldest-date-nnrx';
  var LAST_NOTIFICATION_STORAGE_ID = 'last-notification-nnrx';
  var lastNotification = getLastNotification();
  /* Queues look like:
   * {reminderId: [{
   *                id: notificationId,
   *                title: notification.title,
   *                message: notification.message,
   *                date: notification.date,
   *                autoCancel: false,
   *                json: JSON.stringify({ snooze: false}),
   *                repeat: repeatInterval,
   *              }],
   * }
   */
  var reminderQueues = getFromLocalStorage(QUEUE_STORAGE_ID, '{}');

  /* An individual reminder looks like:
   * reminder = {name: '', date: '', time: '', freq: 'daily', id: '', message: '', tomorrow: 'false'};
   */
  var reminders = getFromLocalStorage(REMINDERS_STORAGE_ID, '{}');

  var noteId2ReminderId = getFromLocalStorage(NOTE2REMINDER_STORAGE_ID, '{}');

  var dateTimeRestorer = function(key, value) {
    if (key === 'date') {
      return new Date(value);
    }
    else {
      return value;
    }
  };

  var getFromLocalStorage = function(storageKey, defaultValue) {
    return JSON.parse(window.localStorage.getItem(storageKey) || defaultValue, dateTimeRestorer);
  };

  var putInLocalStorage = function(storageKey, value) {
    window.localStorage.setItem(storageKey, JSON.stringify(value));
  };

  var getLastNotification = function() {
    return JSON.parse(window.localStorage.getItem(LAST_NOTIFICATION_STORAGE_ID) || '{}', dateTimeRestorer);
  };

  var rebalanceQueues = function() {
    // TODO: Make snooze safe
    var deferred = $q.defer();
    var promises = [];
    var newQueueLength = this.getNewQueueLength();

    var allDone = function() {
      deferred.resolve();
    };

    for (var reminderId in reminders) {
      if (reminders.hasOwnProperty( reminderId )) {
        var singleQueue = reminderQueues[reminderId] || [];
        if (singleQueue.length !== newQueueLength) {
          var diff = Math.abs(newQueueLength - singleQueue.length);
          if (singleQueue.length > newQueueLength) {
            // Too big
            // cancel oldest until correct size
            for (var j = 0; j !== diff; ++j) {
              promises.push(cancelNotification(singleQueue[newQueueLength + j].id, reminderId, newQueueLength + j));
            }
          } else {
            // Too small
            // Schedule more until correct size
            for (var k = 0; k !== diff; ++k) {
              promises.push(scheduleNext(reminderId));
            }
          }
        }
      }
    }

    $q.all(promises).then(allDone);
    return deferred.promise;
  };

  var cancelNotification = function (notificationId, reminderId, queueIndex) {
    return localNotifications.cancel(notificationId).then(function() {
      delete noteId2ReminderId[notificationId];
      delete reminderQueues[reminderId][queueIndex];
      putInLocalStorage(QUEUE_STORAGE_ID, reminderQueues);
      putInLocalStorage(NOTE2REMINDER_STORAGE_ID, noteId2ReminderId);
    });
  };

  var scheduleNext = function(reminderId) {
    // TODO: handleSnooze?
    // TODO: Update to handle the fact that notification and reminder objects aren't the same
    var oldReminder = reminders[reminderId];
    var lastNotification;
    if (reminderId in reminderQueues && reminderQueues[reminderId].length > 0) {
      var reminderQueue = reminderQueues[reminderId];
      lastNotification = reminderQueue[reminderQueue.length - 1];
    } else {
      reminderQueues[reminderId] = [];
      lastNotification = reminders[reminderId];
    }

    var newDate = lastNotification.date;
    if (lastNotification.freq === 'daily') {
      newDate.setDate = lastNotificationDate.getDate() + 1;
    } else {
      newDate.setDate = lastNotificationDate.getDate() + 2;
    }

    var newNotification = {
      id:         this.nextNotificationId(),
      title:      oldReminder.name,
      message:    oldReminder.message,
      date:       newDate,
      autoCancel: false,
      json:       JSON.stringify({ snooze: false}),
      repeat:     'hourly',
    };
    // TODO: Call an internal add function here that updates the last
    // notification if needed.
    // This returns a promise
    return localNotifications.add(newNotification).then( function() {
      reminderQueues[reminderId].push(newNotification);
      noteId2ReminderId[newNotification.Id()] = reminderId;
      putInLocalStorage(NOTE2REMINDER_STORAGE_ID, noteId2ReminderId);
      putInLocalStorage(QUEUE_STORAGE_ID, reminderQueues);
    });
  };

  var addNotification = function(newNotification) {
    localNotifications.add(newNotification).then( function() {
      // TODO: Update lastNotification
    });
  };

  var addReminder = function(reminder) {
    reminders[reminder.id] = reminder;
    // rebalanceQueues will do the right thing for a reminder with nothing in
    // the queue
    return rebalanceQueues().then(function() {
      putInLocalStorage(REMINDERS_STORAGE_ID, reminders);
      putInLocalStorage(QUEUE_STORAGE_ID, reminderQueues);
    });
  };

  var cancelAndReschedule = function(notificationId) {
    // TODO: If we schedule before canceling we may go over 64 limit. If we
    // cancel before scheduling we may lose the only notification in the queue
    // and have to use the date from the original reminder, which will now be
    // wrong. For now we reserve one of the 64 notifications for this purpose.
    var reminderId = noteId2ReminderId[notificationId];
    scheduleNext(reminderId).then( function () {
      localNotifications.cancelNotification(notificationId).then( function () {
        delete noteId2ReminderId[notificationId];
        var singleQueue = reminderQueues[reminderId];
        var index = singleQueue.indexOf(notificationId);
        if (~index){
          delete reminderQueues[reminderId][index];
        }
        putInLocalStorage(QUEUE_STORAGE_ID, reminderQueues);
        putInLocalStorage(NOTE2REMINDER_STORAGE_ID, noteId2ReminderId);
      });
    });
  };

  var deleteReminder = function(reminderId) {
    // Cancel all notifications in its queue then delete its queue and delete
    // it from reminders then persist to localStorage
    var deferred = $q.defer();
    var notificationsToCancel = reminderQueues[reminderId].length;

    var decCount = function(notificationId) {
      delete noteId2ReminderId[notificationId];

      notificationsToCancel -= 1;

      if(notificationsToCancel <= 0){
        delete reminderQueues[reminderId];
        delete reminders[reminderId];
        putInLocalStorage(REMINDERS_STORAGE_ID, reminders);
        putInLocalStorage(QUEUE_STORAGE_ID, reminderQueues);
        putInLocalStorage(NOTE2REMINDER_STORAGE_ID, noteId2ReminderId);
        rebalanceQueues();
        deferred.resolve();
      }
    };

    var singleQueue = reminderQueues[reminderId];
    for (var i = 0, len = singleQueue.length; i !== len; ++i) {
      console.log('canceling ' + singleQueue[i]);
      localNotifications.cancelNotification(singleQueue[i].id).then( decCount(singleQueue[i].id));
    }

    return deferred.promise;
  };


  var getTriggeredNotifications = function() {
    var triggeredNotificationIds = [];
    var now = new Date();
    for (var reminderId in reminders) {
      if (reminders.hasOwnProperty( reminderId )) {
        var singleQueue = reminderQueues[reminderId];
        for (var j = 0, len = singleQueue.length; j !== len; ++j) {
          var reminder = singleQueue[j];
          if (reminder.date <= now) {
            triggeredNotificationIds.push(reminder.id);
          }
        }
      }
    }
  };

  var getNewQueueLength = function() {
    var queueLength = 0;
    var reminders = reminderStorage.all();
    var reminderCount = 0;
    for (var reminderId in reminders) {
      if (reminders.hasOwnProperty( reminderId )) {
        ++reminderCount;
        if (reminers[reminderId].repeat === 'daily') {
          ++reminderCount;
        }
      }
    }
    // iOS limits localNotifications to 64 per app. We need one for the
    // notification telling users to use the app, and one for a buffer when
    // cancelling and rescheduling. It may be possible to refactor to get
    // around needing the buffer.
    queueLength = Math.floor(62/reminderCount);

    return queueLength;
  };

  var addSnooze = function (reminderId) {
  };

  var nextNotificationId = function() {
    var MAXID_ID = 'reminders-nnrx-maxid';
    var newId = JSON.parse(window.localStorage.getItem(MAXID_ID) || '0') + 1;
    window.localStorage.setItem(MAXID_ID, JSON.stringify(newId));
    return newId;
  };

  return {
    reminders: reminders,

    addSnooze: addSnooze,

    addReminder: addReminder,

    cancelAndReschedule: cancelAndReschedule,

    deleteReminder: deleteReminder,

    getTriggeredNotifications: getTriggeredNotifications,

  };
}]);
