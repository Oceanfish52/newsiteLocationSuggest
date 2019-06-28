<b>To run web application</b>

1) open terminal and run "redis-server" (make sure you install redis server first!)<br>
ref: https://realpython.com/flask-by-example-implementing-a-redis-task-queue/?fbclid=IwAR3kjiUWMnC_rsMNB5JKSY8QF93E2Y0ridP4ISGulL080BieM84oLkSQ9Fo
2) run worker using worker.py => "python worker.py"
3) run web application using app.py => "python app.py"

![alt-text](https://github.com/witchapong/newsiteLocationSuggest/blob/master/127.0.0.1_5000-Trafficestimationbycoordinates.jpeg)

<b>To use admin page</b>

1) upload coverage file
2) upload traffic file
3) select files for estimating traffic gain
4) specify filter size and coefficient
5) ***name output file name with ".csv" at the end***
6) generate output file using "generate result" button (click only 1 time!!!)

![alt-text](https://github.com/witchapong/newsiteLocationSuggest/blob/master/127.0.0.1_5000-Admin.jpeg)
