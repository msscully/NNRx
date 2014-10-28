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
  var FINAL_NOTIFICATION_STORAGE_ID = 'final-notification-nnrx';

  var dateTimeRestorer = function(key, value) {
    if (key === 'date') {
      return new Date(value);
    }
    else {
      return value;
    }
  };

  var getKeys = function(obj) {
    var keys = [];
    var key;
    for(key in obj){
      if(obj.hasOwnProperty(key)){
        keys.push(key);
      }
    }
    return keys.sort();
  };

  var getFromLocalStorage = function(storageKey, defaultValue) {
    return JSON.parse(window.localStorage.getItem(storageKey) || defaultValue, dateTimeRestorer);
  };

  var putInLocalStorage = function(storageKey, value) {
    window.localStorage.setItem(storageKey, JSON.stringify(value));
  };

  var getFinalNotification = function() {
    return JSON.parse(window.localStorage.getItem(FINAL_NOTIFICATION_STORAGE_ID) || "{\"empty\":true}", dateTimeRestorer);
  };

  var finalNotification = getFinalNotification();

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

    promiseSequence = promiseSequence.then(function() {
      return clearAndRescheduleFinalNotification();
    });

    return promiseSequence;
  };

  var cancelNotification = function (notificationId, reminderId) {
    return localNotifications.cancel(notificationId).then(function() {
      console.log('canceling ' + notificationId);
      delete noteId2ReminderId[notificationId];
      //var index = indexOf(notificationId, reminderQueues[reminderId], compare('id'));
      //reminderQueues[reminderId].splice(index, 1);
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

  var cancelSnooze = function(notificationId) {
    var reminderId = noteId2ReminderId[notificationId];
    return cancelNotification(notificationId, reminderId).then( function() {
      return rebalanceQueues();
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

    var messageWithScheduledTime = oldReminder.message + '\n\nOriginally Scheduled for ' + lastNotification.date.toLocaleDateString() + ' at ' + displayNiceTime(lastNotification.date);
    var newNotification = {
      id:         nextNotificationId(),
      title:      oldReminder.title,
      message:    messageWithScheduledTime,
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
      // TODO: Update finalNotification
    });
  };

  var addReminder = function(reminder) {
    reminders[reminder.reminderId] = reminder;
    var newQueueLength = getNewQueueLength();
    if (newQueueLength > 1) {
      putInLocalStorage(REMINDERS_STORAGE_ID, reminders);
      // rebalanceQueues will do the right thing for a reminder with nothing in
      // the queue
      return rebalanceQueues();
    } else {
      var deferred = $q.defer();
      delete reminders[reminder.reminderId];
      deferred.reject('Queue too short');
      return deferred.promise;
    }
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
        return clearAndRescheduleFinalNotification();
      });
    });
  };

  var clearAndRescheduleFinalNotification = function() {
    var newDate = dateOfFinalNotification();

    if (getKeys(reminders).length > 0 ) {
      if (finalNotification.hasOwnProperty('empty')) {
        finalNotification = {
          reminderId:   -1,
          id:           nextNotificationId(),
          title:        'WARNING! WARNING! WARNING!',
          message:      'Use app or lose reminders!',
          date:         newDate,
          repeat:       'minutely',
          autoCancel:   false,
          json:         JSON.stringify({ snooze: false}),
        };

        return localNotifications.add(finalNotification).then( function() {
          finalNotification.date = newDate;
          putInLocalStorage(FINAL_NOTIFICATION_STORAGE_ID, finalNotification);
        });
      } else {
        return localNotifications.cancel(finalNotification.id).then( function() {
          finalNotification.id = nextNotificationId();
          finalNotification.date = newDate;
          return localNotifications.add(finalNotification).then( function() {
            finalNotification.date = newDate;
            putInLocalStorage(FINAL_NOTIFICATION_STORAGE_ID, finalNotification);
          });
        });
      }
    } else {
      var defer = $q.defer();
      defer.resolve();
      return defer.promise;
    }
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
        if(getKeys(reminders).length === 0) {
          localNotifications.cancel(finalNotification.id).then( function() {
            finalNotification = {empty: true};
            putInLocalStorage(FINAL_NOTIFICATION_STORAGE_ID, finalNotification);
          });
        }
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

  var indexOf = function (element, array, comparer, start, end) {
    if (array.length === 0)
        return -1;

    start = start || 0;
    end = end || array.length;
    var pivot = (start + end) >> 1;  // should be faster than the above calculation

    var c = comparer(element, array[pivot]);
    if (end - start <= 1) return c == -1 ? pivot - 1 : pivot;

    switch (c) {
        case -1: return indexOf(element, array, comparer, start, pivot);
        case 0: return pivot;
        case 1: return indexOf(element, array, comparer, pivot, end);
    }
  };

  var compare = function(attr) {
    return function(a, b) {
      if (a[attr] < b[attr]) return -1;
      if (a[attr] < b[attr]) return 1;
        return 0;
    };
  };

  var displayNiceTime = function (date){
      // getHours returns the hours in local time zone from 0 to 23
      var hours = date.getHours();
      // getMinutes returns the minutes in local time zone from 0 to 59
      var minutes =  date.getMinutes();
      var meridiem = " AM";

      // convert to 12-hour time format
      if (hours > 12) {
        hours = hours - 12;
        meridiem = ' PM';
      }
      else if (hours === 12) {
        meridiem = 'PM';
      }
      else if (hours === 0){
        hours = 12;
      }

      // minutes should always be two digits long
      if (minutes < 10) {
        minutes = "0" + minutes.toString();
      }
      return hours + ':' + minutes + meridiem;
    };

  var addSnooze = function (origNotificationId) {
    var reminderId = noteId2ReminderId[origNotificationId];
    var now = new Date().getTime();
    var fiveMinInFuture = new Date(now + 300*1000);
    var reminder = reminders[reminderId];
    var index = indexOf({'id': origNotificationId}, reminderQueues[reminderId], compare('id'));
    var snoozedNotification = reminderQueues[reminderId][index];
    var messageWithScheduledTime = reminder.message + '\n\nOriginally Scheduled for ' + snoozedNotification.date.toLocaleDateString() + ' at ' + displayNiceTime(snoozedNotification.date);
    var newNotification = {
      id:         nextNotificationId(),
      title:      snoozedNotification.title,
      message:    messageWithScheduledTime,
      date:       fiveMinInFuture,
      autoCancel: false,
      json:       JSON.stringify({ snooze: true}),
      repeat:     'hourly'
    };

    return cancelNotification(origNotificationId, reminderId).then( function() {
      localNotifications.add(newNotification).then(function () {
        newNotification.freq = snoozedNotification.freq;
        newNotification.time = snoozedNotification.time;
        newNotification.date = fiveMinInFuture;
        newNotification.reminderId = reminderId;
        var newIndex = indexOf(newNotification, reminderQueues[reminderId], compare('date')) + 1;
        reminderQueues[reminderId].splice(newIndex, 0, newNotification);
        noteId2ReminderId[newNotification.id] = reminderId;
        putInLocalStorage(NOTE2REMINDER_STORAGE_ID, noteId2ReminderId);
        putInLocalStorage(QUEUE_STORAGE_ID, reminderQueues);
        return clearAndRescheduleFinalNotification();
      });
    });

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

  var getNotification = function(notificationId) {
    var reminderId = noteId2ReminderId[notificationId];
    var index = indexOf({'id': notificationId}, reminderQueues[reminderId], compare('id'));
    return reminderQueues[reminderId][index];
  };

  var dateOfFinalNotification = function() {
    var now = new Date();
    var finalDate = new Date();
    finalDate.setDate(now.getDate() + 1000);
    angular.forEach(reminderQueues, function(queue, reminderId) {
      if (reminderId != finalNotification.reminderId) {
        var reminder = queue[queue.length-1];
        finalDate = reminder.date < finalDate ? reminder.date : finalDate;
      }
    });

    // Warn people one day before they'll start losing reminders
    return new Date(finalDate - 1);
  };

  clearAndRescheduleFinalNotification();

  var getFinalNotificationId = function() {
    return finalNotification.id;
  };

  return {
    reminders: reminders,

    noteId2ReminderId: noteId2ReminderId,

    getFinalNotificationId: getFinalNotificationId,

    nextId: nextNotificationId,

    addSnooze: addSnooze,

    addReminder: addReminder,

    cancelNotification: cancelNotification,

    cancelAndReschedule: cancelAndReschedule,

    deleteReminder: deleteReminder,

    getTriggeredNotifications: getTriggeredNotifications,

    getNotification: getNotification,

    cancelSnooze: cancelSnooze,

    clearAndRescheduleFinalNotification: clearAndRescheduleFinalNotification,

  };
}]);
