var updateChart = function(left,used){

    "use strict";

    var data = {
        series: [{
          value:left,
          name:'Tokens Left'
        },
        {value:used,
        name:'Tokens Bought'
        }]
    };

    var sum = function (a, b) { return a + b };

    new Chartist.Pie('.chart', data, {
        chartPadding: 20,
        labelInterpolationFnc: function (value) {
            return "";
        }
    });

    var progress = Math.floor( (used/sum(left,used))*100 );
    $('#fund-goal-label').text(progress+'%');
    $('#fund-goal').width(progress+'%');
    $('#fund-goal').attr('aria-valuenow',progress);
}
