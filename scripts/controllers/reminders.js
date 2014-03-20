app.controller('ReminderCtrl', function ($scope, $rootScope, $location, $routeParams, reminderStorage) {
    'use strict';
    var reminders = $scope.reminders = reminderStorage.all();

    if ($routeParams.reminderId) {
        $scope.reminder = reminders[$routeParams.reminderId];
    } else {
        $scope.reminder = {name: '', time: '', freq: '', id: '', message: '', notificationId: ''};
    }

    $scope.submitForm = function() {
        if ($scope.reminder.id) {
            reminders[$scope.reminder.id] = $scope.reminder;
        } else {
            $scope.reminder.id = $scope.nextId();
            $scope.reminder.notificationId = $scope.addLocalNotification($scope.reminder);
            reminders[$scope.reminder.id] = $scope.reminder;
        }
    };

    $scope.addLocalNotification = function(reminder) {
        return window.plugin.notification.local.add({
            title:      reminder.name,
            message:    reminder.message,
            json:       JSON.stringify({ id: reminder.id }),
            date:       new Date(new Date().getTime() + 5*1000),
            autoCancel: true
            //repeat:     'weekly',
        });
    };

    $scope.$watch('reminders', function (newValue, oldValue) {
        if (newValue !== oldValue) { // This prevents unneeded calls to the local storage
            reminderStorage.put(reminders);
        }
    }, true);

    $scope.nextId = function () {
        var nextId = 0;
        var remindersKeys = Object.keys(reminders);
        if (remindersKeys.length > 0) {
            nextId = parseInt(remindersKeys[remindersKeys.length-1]) + 1;
        }
        return nextId;
    };

    $scope.checkDelete = function() {
        var confirmTitle = "Delete " + "\"" + $scope.reminder.name + "\"?";
        navigator.notification.confirm(
            "Are you sure? This can't be undone.",
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
            $rootScope.$apply();
        }
    };

    $scope.cancelReminder = function(notificationId) {
        $scope.idIsScheduled = false;
        window.plugin.notification.local.isScheduled(
            notificationId,
            function (isScheduled) {
                $scope.idIsScheduled = isScheduled;
            });

            if ($scope.idIsScheduled) {
                window.plugin.notification.local.cancel(notificationId);
            }
    };

    $scope.clearReminder = function(id) {
        //TODO: implement when v0.8.x of notifications plugin is released.
        window.plugin.notification.local.clear(id);
    };

    $rootScope.handleNotification = function(id, state, json) {
        var reminderId = JSON.parse(json).id;
        var reminder = reminders[reminderId];
        if (!reminder.message) {
            reminder.message = "This message intentionally left blank.";
        }
        navigator.notification.alert(
            reminder.message,  // message
            $rootScope.alertDismissed,         // callback
            reminder.name,            // title
            'Dismiss'                  // buttonName
        );
    };

    $rootScope.alertDismissed = function() {
        $location.path('/').replace();
        $rootScope.$apply();
    };

    $rootScope.handleTriggeredNotification = function(notificationId, state, json) {
        if (state !== "background") {
            $scope.clearReminder(notificationId);
            $rootScope.handleNotification(notificationId, state, json);
        }
    };


    window.plugin.notification.local.onclick = $rootScope.handleNotification;

    window.plugin.notification.local.ontrigger = $rootScope.handleTriggeredNotification;

});
