app.controller('ReminderCtrl', ['$scope', '$rootScope', '$q', '$location', '$routeParams', 'reminderStorage', '$window', 'CordovaService', 'localNotifications', 'dialogs', function ($scope, $rootScope, $q, $location, $routeParams, reminderStorage, $window, CordovaService, localNotifications, dialogs) {
  CordovaService.ready.then(function() {
    'use strict';

    $scope.reminders = reminderStorage.reminders;
    $scope.submitted = false;

    if ($routeParams.reminderId) {
      $scope.reminder = angular.copy(reminderStorage.reminders[$routeParams.reminderId]);
      $scope.editing = true;
    } else {
      $scope.reminder = {title: '', time: '', freq: 'daily', reminderId: '', message: '', tomorrow: 'false'};
      $scope.editing = false;
    }

    $scope.submitForm = function() {
      if (!$scope.addReminderForm.$valid) {
        $scope.submitted = true;
        dialogs.alert(
          "Form is invalid. Please fix.",
          "Errors Detected",
          "OK"
        );
      } else {
        $scope.processForm();
      }
    };

    $scope.processForm = function() {
      $scope.submitted = false;
      var reminderDate = new Date();
      var now = new Date();
      // if every-other-day are we supposed to start tomorrow?
      if ($scope.reminder.freq === 'daily') {
        $scope.reminder.tomorrow = 'false';
      }

      if ($scope.reminder.tomorrow === 'true') {
        reminderDate.setDate(now.getDate() + 1);
      }

      var reminderTimeSplit = $scope.reminder.time.split(':');
      reminderDate.setHours(reminderTimeSplit[0]);
      reminderDate.setMinutes(reminderTimeSplit[1]);

      var tempDate = new Date(reminderDate);
      if (reminderDate < now) {
        if ($scope.reminder.freq === 'daily') {
          tempDate.setDate(reminderDate.getDate() + 1);
        } else {
          tempDate.setDate(reminderDate.getDate() + 2);
        }
      }
      reminderDate = tempDate;
      $scope.reminder.date = reminderDate;

      if (reminderStorage.reminders.hasOwnProperty($scope.reminder.reminderId)) {
        reminderStorage.deleteReminder($scope.reminder.reminderId, false);
        reminderStorage.addReminder($scope.reminder);
      } else {
        $scope.reminder.reminderId = reminderStorage.nextId();
        reminderStorage.addReminder($scope.reminder);
      }
      $scope.back();
    };

    $scope.checkDelete = function() {
      var confirmTitle = "Delete " + "\"" + $scope.reminder.title + "\"?";
      dialogs.confirm(
        "Are you sure? This will delete all future reminders for this event and can't be undone.",
        confirmTitle,
        ['Delete', 'Cancel']
      ).then($scope.deleteReminder);
    };

    $scope.deleteReminder = function(buttonIndex) {
      if (buttonIndex === 1) {
        reminderStorage.deleteReminder($scope.reminder.reminderId)
        .then( function () {
          $scope.back();
          $rootScope.safeApply();
        });
      }
    };

    $scope.clearNotification = function(notificationId, json) {
      //TODO: use localNotifications plugin clear function when v0.8.x
      // of notifications plugin is released.
      // $window.plugin.notification.local.clear(id);
      // For now, cancel then re-add with date as tomorrow
      var reminderId = reminderStorage.noteId2ReminderId[notificationId];
      var reminder = reminderStorage.reminders[reminderId];
      if (! JSON.parse(json).snooze) {
        return reminderStorage.cancelAndReschedule(notificationId);
      } else {
        // We don't need to schedule a replacement for the
        // canceled notification
        return reminderStorage.cancelNotification(notificationId, reminderId);
      }
    };

    $scope.displayNiceTime = function (date){
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

    $scope.handleNotification = function(notificationId, state, json) {
      CordovaService.ready.then( function() {
        var reminderId = reminderStorage.noteId2ReminderId[notificationId];
        var reminder = $scope.reminder = reminderStorage.reminders[reminderId];
        if (!reminder.message) {
          reminder.message = "This message intentionally left blank.";
        }
        var now = new Date();
        var nameWithTime = reminder.title + ' at ' + $scope.displayNiceTime(now);
        var messageWithScheduledTime = reminder.message + '\n\nOriginally Scheduled for ' + reminder.date.toLocaleDateString() + ' at ' + $scope.displayNiceTime(reminder.date);
        dialogs.confirm(
          messageWithScheduledTime,  // message
          nameWithTime,            // title
          ["Took Meds", "Didn't Take Meds", "Snooze"] // buttonNames
        ).then( function(buttonIndex) { $scope.alertDismissed(buttonIndex, notificationId, json); });
      });
    };

    $scope.alertDismissed = function(buttonIndex, notificationId, json) {
      // Notifications are rescheduled the first time the alert is
      // dismissed, even if they choose snooze. All snooze does is add a
      // one time alert for 5 min from now. Snooze alerts are not
      // re-added.
      if (buttonIndex === 3) {
        // Snooze pressed, add one-time notification for 5min from now.
        // TODO: Update to work with new reminderStorage
        var now = new Date().getTime();
        var fiveMinInFuture = new Date(now + 300*1000);
        var reminderId = reminderStorage.noteId2ReminderId[notificationId];
        var reminder = reminderStorage.reminders[reminderId];

        console.log(JSON.stringify(reminder));
        console.log("previous time: " + reminder.date);
        console.log("in future: " + fiveMinInFuture.toUTCString());
        var snoozeNotification = {
          id:         reminderStorage.nextId(),
          title:      reminder.title,
          message:    reminder.message,
          date:       fiveMinInFuture,
          autoCancel: false,
          json:       JSON.stringify({ snooze: true}),
          repeat:     'hourly'
        };

        localNotifications.add(snoozeNotification).then(function(newNotificationId) {
          // Snooze is a one-time thing, so we don't need to track
          // this
          reminderStorage.noteId2ReminderId[newNotificationId] = reminderId;
          $location.path('/').replace();
          $rootScope.safeApply();
        });
      }
      // Technically we don't have to clear notifications that were
      // clicked on from outside the app, but it doesn't hurt anything.
      $scope.clearNotification(notificationId, json).then( function() {
        $location.path('/').replace();
        $rootScope.safeApply();
      });
    };

    $scope.handleTriggeredNotification = function(notificationId, state, json) {
      if (state !== "background") {
        $scope.handleNotification(notificationId, state, json);
      }
    };

    $scope.$on("localOnClick", function(event, data) {
      // Triggered when a local notification is clicked on
      $rootScope.safeApply($scope.handleNotification(data.id, data.state, data.json));
    });

    $scope.$on("localOnTrigger", function(event, data) {
      // Triggered when a local notification is triggered. Used to detect if
      // a notifcation occurs while the app is running, since iOS normally
      // supresses them.
      $rootScope.safeApply($scope.handleTriggeredNotification(data.id, data.state, data.json));
    });

  });
}]);
