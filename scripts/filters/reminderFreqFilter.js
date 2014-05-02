app.filter('freqFilter', function() {
    return function(inputFreq) {
        var outputFreq = inputFreq;

        if (inputFreq === 'daily') {
            outputFreq = 'Daily';
        } else if (inputFreq === 'semiDaily') {
            outputFreq = 'Every-other-day';
        } else if (inputFreq === 'twiceDaily') {
            outputFreq = 'Twice Daily';
        }
    
        return outputFreq;
    };
});
