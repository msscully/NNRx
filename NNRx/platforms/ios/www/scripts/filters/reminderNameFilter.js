app.filter('nameFilter', function() {
    return function(inputName) {
        var outputName = inputName;

        if (inputName.length > 30) {
            outputName = inputName.substring(0, 30);
            outputName += "...";
        }
    
        return outputName;
    };
});
