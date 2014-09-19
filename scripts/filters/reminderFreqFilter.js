app.filter('freqFilter', function() {
  return function(inputFreq) {
    var outputFreq = inputFreq;

    if (inputFreq === 'daily') {
      outputFreq = 'Daily';
    } else if (inputFreq === 'semiDaily') {
      outputFreq = 'Every-Other-Day';
    } else if (inputFreq === 'twiceDaily') {
      outputFreq = 'Twice Daily';
    }

    return outputFreq;
  };
});
