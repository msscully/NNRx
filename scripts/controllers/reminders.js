app.controller('ReminderCtrl', function ($scope, $rootScope, $location, $routeParams, reminderStorage, uuid4, $window) {
    'use strict';
    var reminders = $scope.reminders = reminderStorage.all();

    if ($routeParams.reminderId) {
        $scope.reminder = angular.copy(reminders[$routeParams.reminderId]);
        $scope.editing = true;
    } else {
        $scope.reminder = {name: '', time: '', freq: '', id: '', message: '', notificationId: ''};
        $scope.editing = false;
    }

    $scope.submitForm = function() {
        if ($scope.reminder.notificationId) {
            $scope.cancelReminder($scope.reminder.notificationId);
            $scope.reminder.notificationId = $scope.addLocalNotification($scope.reminder);
            reminders[$scope.reminder.id] = $scope.reminder;
        } else {
            $scope.reminder.id = uuid4.generate();
            $scope.reminder.notificationId = $scope.addLocalNotification($scope.reminder);
            reminders[$scope.reminder.id] = $scope.reminder;
        }
    };

    $scope.addLocalNotification = function(reminder) {
        var reminderDate = new Date();
        var reminderTimeSplit = reminder.time.split(':');
        reminderDate.setHours(reminderTimeSplit[0]);
        reminderDate.setMinutes(reminderTimeSplit[1]);

        return $window.plugin.notification.local.add({
            title:      reminder.name,
            message:    reminder.message,
            json:       JSON.stringify({ id: reminder.id }),
            date:       reminderDate,
            autoCancel: true
            //repeat:     'weekly',
        });
    };

    $scope.$watch('reminders', function (newValue, oldValue) {
        if (newValue !== oldValue) { // This prevents unneeded calls to the local storage
            reminderStorage.put(reminders);
        }
    }, true);

    $scope.checkDelete = function() {
        var confirmTitle = "Delete " + "\"" + $scope.reminder.name + "\"?";
        navigator.notification.confirm(
            "Are you sure? This will delete all future reminders for this event and can't be undone.",
            $scope.deleteReminder,
            confirmTitle,
            ['Delete', 'Cancel']
        );
    };

    $scope.deleteReminder = function(buttonIndex) {
        if (buttonIndex === 1) {
            $scope.cancelReminder($scope.reminder.notificationId);

            delete reminders[$scope.reminder.id];
            reminderStorage.put(reminders);
            $location.path('/').replace();
            $rootScope.safeApply();
        }
    };

    $scope.cancelReminder = function(notificationId) {
        $scope.idIsScheduled = false;
        $window.plugin.notification.local.isScheduled(
            notificationId,
            function (isScheduled) {
                $scope.idIsScheduled = isScheduled;
            });

            if ($scope.idIsScheduled) {
                $window.plugin.notification.local.cancel(notificationId);
            }
    };

    $scope.clearReminder = function(id) {
        //TODO: implement when v0.8.x of notifications plugin is released.
        $window.plugin.notification.local.clear(id);
    };

    $scope.handleNotification = function(id, state, json) {
        var reminderId = JSON.parse(json).id;
        var reminder = $scope.reminder = reminders[reminderId];
        if (!reminder.message) {
            reminder.message = "This message intentionally left blank.";
        }
        navigator.notification.confirm(
            reminder.message,  // message
            function(buttonIndex) {
                $rootScope.safeApply($scope.alertDismissed(buttonIndex));
            },         // callback
            reminder.name,            // title
            ["Took Meds", "Didn't Take Meds", "Snooze"] // buttonNames
        );
    };

    $scope.alertDismissed = function(buttonIndex) {
        if (buttonIndex === 3) {
            // Snooze pressed, add one-time notification for 5min from now.
            var reminder = angular.copy($scope.reminder);
            var now = new Date().getTime();
            var fiveMinInFuture = new Date(now + 300*1000);

            console.log(JSON.stringify(reminder));
            console.log("previous time: " + reminder.time);
            reminder.time = fiveMinInFuture.getHours() + ":" + fiveMinInFuture.getMinutes();
            reminder.repeat = null;
            console.log("in future: " + reminder.time);
            $scope.addLocalNotification(reminder);
        }
        $location.path('/').replace();
        $rootScope.safeApply();
    };

    $scope.handleTriggeredNotification = function(notificationId, state, json) {
        if (state !== "background") {
            $scope.clearReminder(notificationId);
            $scope.handleNotification(notificationId, state, json);
        }
    };


    $window.plugin.notification.local.onclick = function(id, state, json) {
        $rootScope.safeApply($scope.handleNotification(id, state, json));
    };

    $window.plugin.notification.local.ontrigger = function(id, state, json) {
        $rootScope.safeApply($scope.handleTriggeredNotification(id, state, json));
    };

});
