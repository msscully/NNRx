app.filter('timeFilter', function() {
    return function(inputTime) {
        var twelveHourTime = "";
        var timeArgs = inputTime.split(':');
        var inputHours = parseInt(timeArgs[0]);
        var inputMinutes = timeArgs[1];
        var timeSuffix = 'AM';

        if ( inputHours > 11 ){
            twelveHourTime = inputHours - 12;
            timeSuffix = 'PM';
        }

        if ( inputHours === 0) {
            inputHours = 12;
        }

        twelveHourTime = inputHours + ":" + inputMinutes + " " + timeSuffix;

        return twelveHourTime;
    };
});
