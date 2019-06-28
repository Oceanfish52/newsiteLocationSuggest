// init ggmap
var map;
var pred_result_list;
var pred_result_dict = {};
var id_array = [];
var traff_array = [];
var infoWindow;
var infoWindow2;
var pa_center_dict = {};
var windowInfo_data;
var windowInfo_data2;
var files_list;
var marker_list = [];
var marker_list2 = [];
var base_dir = 'http://127.0.0.1:5000/';

function initMap() {

  map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: 13.7570319, lng: 100.5023148},
    zoom: 9.5
  });

  // read the file list from csv file
  d3.json(base_dir + 'list_dir/coord').then(function(data) {
    files_list = data['files'];
    for (i=0;i< files_list.length; i++){
        $('#exampleFormControlSelect1').append('<option>'+files_list[i]+'</option>')
    }

    // read prediction result from csv file
    loadPredCoord(base_dir + 'src/coord/'+files_list[0])
    $('#download_link').attr("href",base_dir + "src/coord/" + files_list[0])

    });

    loadCondo();
}

function loadPredCoord(fp){

  d3.csv(fp).then(function(data){
      data.forEach(function(d) {
        d.lat = +d.lat;
        d.lon = +d.lon;
        d.coverage_traffic_gain = +d.coverage_traffic_gain;
      });

      windowInfo_data = data;
      clearMapOverlay();
      $('#ranking_table_body').empty();
      for (i=0; i<data.length; i++){
        $('#ranking_table_body').append('<tr><th>'+ String(i+1) + '</th><td>' + data[i]["lat"] + '</td><td>' + data[i]["lon"] +
        '</td><td>' + String(parseInt(data[i]["coverage_traffic_gain"])).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + '</td></tr>');

        var icon = {
            url: base_dir + "src/pic/station.png", // url
            scaledSize: new google.maps.Size(30,100), // scaled size
            origin: new google.maps.Point(0,0), // origin
            anchor: new google.maps.Point(15, 100) // anchor
            };

        var thisMarker = new google.maps.Marker({
            position:{lat:data[i]['lat'],lng:data[i]['lon']},
            map: map,
            icon: icon,
            zIndex: i
        });

        marker_list.push(thisMarker);
        marker_list[i].addListener('click',showPredInfo)

        infoWindow = new google.maps.InfoWindow;
      }

      // add event listen to get pa id from clicked row
      var table_rows = $('.table').find('tr')
      table_rows.click( function(){
        console.log('You clicked row '+ ($(this).index()+1));
        console.log('pd_id: ' + table_rows[$(this).index()+1].children[1].textContent);
        // next -> get the pa center
            // current pa center is stored as list (index based) not key based
        lat = parseFloat(table_rows[$(this).index()+1].children[1].textContent);
        lon = parseFloat(table_rows[$(this).index()+1].children[2].textContent);
        console.log('center coordinate of the selected PA is: ' + String(lat) + ',' + String(lon));
        // zoom in
        map.setCenter({lat:lat,lng:lon});
        map.setZoom(15);
      });
  });
}

function clearMapOverlay(){
    if (marker_list.length != 0) {
        console.log('removing markers...')
        for (i=0; i< marker_list.length; i++) {
            marker_list[i].setMap(null);
        }
    }
}

function showPredInfo(event){

    // Since this polygon has only one path, we can call getPath() to return the

    var contentString = "<b>Estimated traffic gain (MB):</b>" + String(parseInt(windowInfo_data[this.zIndex]["coverage_traffic_gain"])).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    // Replace the info window's content and position.
    infoWindow.setContent(contentString);
    infoWindow.setPosition(event.latLng);

    infoWindow.open(map);
}

function loadCondo(){

  d3.csv(base_dir + 'src/buildings/condo_sample.csv').then(function(data){
      data.forEach(function(d) {
        d.name = d.names;
        d.lat = +d.lats;
        d.lon = +d.lons;
        d.cap = +d.caps;
        d.price = +d.prices;
        d.floor = +d.floors;
        d.exp = d.exp;
      });

      windowInfo_data2 = data;
//      clearMapOverlay();

      for (i=0; i<data.length; i++){

        var icon = {
            url: base_dir + "src/pic/condo.png", // url
            scaledSize: new google.maps.Size(20,20), // scaled size
            origin: new google.maps.Point(0,0), // origin
            anchor: new google.maps.Point(15, 100) // anchor
            };

        var thisMarker = new google.maps.Marker({
            position:{lat:data[i]['lat'],lng:data[i]['lon']},
            map: map,
            icon: icon,
            zIndex: i
        });

        marker_list2.push(thisMarker);
        marker_list2[i].addListener('click',showCondoInfo)

        infoWindow2 = new google.maps.InfoWindow;
      }
  });

}

function showCondoInfo(event){

    // Since this polygon has only one path, we can call getPath() to return the

    var contentString = ("<b>Project:</b>" + String(parseInt(windowInfo_data2[this.zIndex]["name"])) +
                        "<br><b>Total Unit:</b>" + String(parseInt(windowInfo_data2[this.zIndex]["cap"])) +
                        "<br><b>Price:</b>" + String(parseInt(windowInfo_data2[this.zIndex]["price"])) +
                        "<br><b>Floor:</b>" + String(parseInt(windowInfo_data2[this.zIndex]["floor"])) +
                        "<br><b>Expected to finish:</b>" + String(parseInt(windowInfo_data2[this.zIndex]["exp"]))).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    // Replace the info window's content and position.
    infoWindow2.setContent(contentString);
    infoWindow2.setPosition(event.latLng);

    infoWindow2.open(map);

}
// add select event listener to input option
$('#exampleFormControlSelect1').on('change', function (e) {
    var optionSelected = $("option:selected", this);
    var valueSelected = this.value;
    console.log(valueSelected + ' selected!');
    loadPredCoord(base_dir + "src/coord/" + valueSelected);
    $('#download_link').attr("href",base_dir + "src/coord/" + valueSelected)
});