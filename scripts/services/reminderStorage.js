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
app.factory('reminderStorage', ['CordovaService', 'localNotifications', '$q', function (CordovaService, localNotifications, $q) {
  'use strict';
  var REMINDERS_STORAGE_ID = 'reminders-nnrx';
  var NOTE2REMINDER_STORAGE_ID = 'note2reminder-nnrx';
  var QUEUE_STORAGE_ID = 'notification-queue-nnrx';
  var OLDEST_DATE_STORAGE_ID = 'oldest-date-nnrx';
  var LAST_NOTIFICATION_STORAGE_ID = 'last-notification-nnrx';

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

  var getNewQueueLength = function() {
    var queueLength = 0;
    var reminderCount = 0;
    for (var reminderId in reminders) {
      if (reminders.hasOwnProperty( reminderId )) {
        ++reminderCount;
        if (reminders[reminderId].freq === 'daily') {
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

  var rebalanceQueues = function() {
    // TODO: Make snooze safe
    var deferred = $q.defer();
    var promises = [];
    var newQueueLength = getNewQueueLength();
    console.log(newQueueLength);

    var promiseSequence = deferred.promise;
    deferred.resolve();

    var cancelNoteWithPromise = function(promise, noteId, reminderId) {
      return promise.then( function() {
        return cancelNotification(noteId, reminderId);
      });
    };

    // Cancel reminders first
    angular.forEach(reminders, function(value, reminderId) {
      console.log('Start loop reminderId: ' + reminderId);
      if (reminders.hasOwnProperty( reminderId )) {
        promiseSequence = promiseSequence.then( function() {
          console.log('In promise reminderId: ' + reminderId);
          var indvDefered = $q.defer();
          indvDefered.resolve();
          var indvPromiseSeq = indvDefered.promise;
          var singleQueue = reminderQueues[reminderId] || [];
          var desiredQueueLength = newQueueLength;
          if(reminders[reminderId].freq === 'daily') {
            desiredQueueLength = newQueueLength * 2;
          }
          if (singleQueue.length !== desiredQueueLength) {
            var diff = Math.abs(desiredQueueLength - singleQueue.length);
            console.log(desiredQueueLength + ' - ' + singleQueue.length);
            if (singleQueue.length > desiredQueueLength) {
              console.log('Queue too long!');
              // Too big
              // cancel oldest until correct size
              var initQueueLength = singleQueue.length;
              for (var j = initQueueLength-1; j >= desiredQueueLength; --j) {
                indvPromiseSeq = cancelNoteWithPromise(indvPromiseSeq,
                                                       singleQueue[j].id,
                                                       reminderId);
                //indvPromiseSeq = indvPromiseSeq.then( function() {
                //  return cancelNotification(singleQueue[desiredQueueLength + j].id, reminderId);
                //});
              }
            } else {
              // Do nothing here, we'll catch it on the next pass
            }
          }
        return indvPromiseSeq;
        });
      }
    });

    angular.forEach(reminders, function(value, reminderId) {
      if (reminders.hasOwnProperty( reminderId )) {
        promiseSequence = promiseSequence.then( function() {
          var indvDefered = $q.defer();
          indvDefered.resolve();
          var indvPromiseSeq = indvDefered.promise;
          var singleQueue = reminderQueues[reminderId] || [];
          var desiredQueueLength = newQueueLength;
          if(reminders[reminderId].freq === 'daily') {
            desiredQueueLength = newQueueLength * 2;
          }
          if (singleQueue.length !== desiredQueueLength) {
            var diff = Math.abs(desiredQueueLength - singleQueue.length);
            if (singleQueue.length < desiredQueueLength) {
              // Too small
              // Schedule more until correct size
              for (var k = 0; k !== diff; ++k) {
                indvPromiseSeq = indvPromiseSeq.then( function() {
                  return scheduleNext(reminderId);
                });
              }
            } else {
              // TODO: throw an error?
              // This shouldn't happen
            }
          }
        return indvPromiseSeq;
        });
      }
    });
    return promiseSequence;
  };

  var cancelNotification = function (notificationId, reminderId) {
    return localNotifications.cancel(notificationId).then(function() {
      console.log('canceling ' + notificationId);
      delete noteId2ReminderId[notificationId];
      for (var i=0, len=reminderQueues[reminderId].length; i !== len; ++i) {
        if (reminderQueues[reminderId].length > 0 && reminderQueues[reminderId][i].id === notificationId) {
          reminderQueues[reminderId].splice(i, 1);
          break;
        }
      }

      putInLocalStorage(QUEUE_STORAGE_ID, reminderQueues);
      putInLocalStorage(NOTE2REMINDER_STORAGE_ID, noteId2ReminderId);
    });
  };

  var scheduleNext = function(reminderId) {
    // TODO: handleSnooze?
    var oldReminder = reminders[reminderId];
    var lastNotification;
    var newDate;
    if (reminderId in reminderQueues && reminderQueues[reminderId].length > 0) {
      var reminderQueue = reminderQueues[reminderId];
      lastNotification = reminderQueue[reminderQueue.length - 1];

      newDate = new Date(lastNotification.date);
      if (lastNotification.freq === 'daily') {
        newDate.setDate(lastNotification.date.getDate() + 1);
      } else {
        newDate.setDate(lastNotification.date.getDate() + 2);
      }
    } else {
      reminderQueues[reminderId] = [];
      lastNotification = reminders[reminderId];

      newDate = new Date(lastNotification.date);
    }

    var newNotification = {
      id:         nextNotificationId(),
      title:      oldReminder.title,
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
      console.log('scheduling ' + newNotification.id);
      newNotification.freq = lastNotification.freq;
      newNotification.time = lastNotification.time;
      newNotification.date = newDate;
      newNotification.reminderId = lastNotification.reminderId;
      reminderQueues[reminderId].push(newNotification);
      noteId2ReminderId[newNotification.id] = reminderId;
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
    reminders[reminder.reminderId] = reminder;
    putInLocalStorage(REMINDERS_STORAGE_ID, reminders);
    // rebalanceQueues will do the right thing for a reminder with nothing in
    // the queue
    return rebalanceQueues();
  };

  var cancelAndReschedule = function(notificationId) {
    // TODO: If we schedule before canceling we may go over 64 limit. If we
    // cancel before scheduling we may lose the only notification in the queue
    // and have to use the date from the original reminder, which will now be
    // wrong. For now we reserve one of the 64 notifications for this purpose.
    var reminderId = noteId2ReminderId[notificationId];
    return scheduleNext(reminderId).then( function () {
      localNotifications.cancel(notificationId).then( function () {
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

  var deleteReminder = function(reminderId, rebalance) {
    // Cancel all notifications in its queue then delete its queue and delete
    // it from reminders then persist to localStorage
    rebalance = typeof rebalance !== 'undefined' ? rebalance : true;
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
        if (rebalance) {
          rebalanceQueues().then(deferred.resolve);
        } else {
          deferred.resolve();
        }
      }
    };

    var singleQueue = reminderQueues[reminderId];
    for (var i = 0, len = singleQueue.length; i !== len; ++i) {
      console.log('canceling ' + singleQueue[i].id);
      localNotifications.cancel(singleQueue[i].id).then( decCount(singleQueue[i].id));
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
          var notification = singleQueue[j];
          if (notification.date <= now) {
            triggeredNotificationIds.push(notification.id);
          }
        }
      }
    }
  };

  var addSnooze = function (reminderId) {
  };

  var nextNotificationId = function() {
    var MAXID_ID = 'reminders-nnrx-maxid';
    var newId = JSON.parse(window.localStorage.getItem(MAXID_ID) || '0') + 1;
    window.localStorage.setItem(MAXID_ID, JSON.stringify(newId));
    return newId;
  };

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
   * reminder = {title: '', date: '', time: '', freq: 'daily', reminderId: '', message: '', tomorrow: 'false'};
   */
  var reminders = getFromLocalStorage(REMINDERS_STORAGE_ID, '{}');

  var noteId2ReminderId = getFromLocalStorage(NOTE2REMINDER_STORAGE_ID, '{}');


  var lastNotification = getLastNotification();

  return {
    reminders: reminders,

    noteId2ReminderId: noteId2ReminderId,

    nextId: nextNotificationId,

    addSnooze: addSnooze,

    addReminder: addReminder,

    cancelNotification: cancelNotification,

    cancelAndReschedule: cancelAndReschedule,

    deleteReminder: deleteReminder,

    getTriggeredNotifications: getTriggeredNotifications,

  };
}]);
