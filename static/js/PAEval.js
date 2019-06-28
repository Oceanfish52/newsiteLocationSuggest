// init ggmap
var map;
var shp;
var dbf;
var pred_result_list;
var pred_result_dict = {};
var id_array = [];
var traff_array = [];
var infoWindow;
var pa_center_dict = {};
var files_list;
var selected_csv;
var pa_overlay = [];
var id2index = {};
var base_dir = 'http://127.0.0.1:5000/';

function initMap() {

  map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: 13.7570319, lng: 100.5023148},
    zoom: 9.5
  });
  SHPParser.load(base_dir + 'src/shape/RNC_PA_region.shp', shpLoad, shpLoadError);
  DBFParser.load(base_dir + 'src/shape/RNC_PA_region.dbf', dbfLoad, dbfLoadError);

}

// Handles the callback from loading SHPParser by assigning the shp to a global.
function shpLoad(sh) {
  shp = sh;
  console.log('shp loaded...');

  for (i=0;i<shp.records.length;i++){
    pa_center_dict[i] = {lng:(shp.records[i].shape.content.maxX+shp.records[i].shape.content.minX)/2,
    lat:(shp.records[i].shape.content.maxY+shp.records[i].shape.content.minY)/2}
  }

  // read the file list
  d3.json(base_dir + 'list_dir/pa').then(function(data) {

    files_list = data['files'];

    for (i=0;i< files_list.length; i++){
        $('#exampleFormControlSelect1').append('<option>'+files_list[i]+'</option>')
    }

    // read the prediction result from csv file
    loadPredPa(base_dir + "src/pa/" + files_list[0]);
    $('#download_link').attr("href",base_dir + "src/pa/" + files_list[0])

  })
}

function loadPredPa(fp) {

    // read the prediction result from csv file
    d3.csv(fp).then(function(data) {
      id_array = [];
      traff_array = [];
      data.forEach(function(d) {
        d.pa_id = +d.pa_id;
        d.traffic_gain = +d.traffic_gain;
        id_array.push(d.pa_id);
        traff_array.push(d.traffic_gain);
      });

      // find the max traffic gain
      var max_traff = d3.max(traff_array);

      // store the data to the object
      pred_result_list = data;
      top20_pa = pred_result_list.sort(function(x,y){
        return d3.descending(x.traffic_gain,y.traffic_gain);
        }).slice(0,20)

      $('#ranking_table_body').empty()
      for (i=0; i<20; i++){
        $('#ranking_table_body').append('<tr><th>'+ String(i+1) + '</th><td>' + dbf.records[top20_pa[i]["pa_id"]]["RNCNAME"] + '</td><td>' + String(parseInt(top20_pa[i]["traffic_gain"])).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + '</td></tr>')
      }

      // add event listen to get pa id from clicked row
      var table_rows = $('.table').find('tr')
      table_rows.click( function(){
        console.log('You clicked row '+ ($(this).index()+1));
        console.log('pd_id: ' + table_rows[$(this).index()+1].children[1].textContent);
        // next -> get the pa center
            // current pa center is stored as list (index based) not key based
        selected_coord = pa_center_dict[id2index[table_rows[$(this).index()+1].children[1].textContent]];
        console.log('center coordinate of the selected PA is: ' + String(selected_coord['lat']) + ',' + String(selected_coord['lng']));
        // zoom in
        map.setCenter(selected_coord);
        map.setZoom(13);
      });

      pred_result_dict = {};
      // convert the data in the list form to dictionary form
      for (i=0; i<pred_result_list.length; i++){
        pred_result_dict[pred_result_list[i]['pa_id']] = {};
        pred_result_dict[pred_result_list[i]['pa_id']]['traffic_gain'] =  pred_result_list[i]['traffic_gain'];
        pred_result_dict[pred_result_list[i]['pa_id']]['opacity'] =  pred_result_list[i]['traffic_gain']/max_traff;

      }

      // create opacity from pred traffic
      readAndDraw();

      });

}

// error handler for shploader.
function shpLoadError() {
  window.console.log('shp file failed to load');
}

// Handles the callback from loading DBFParser by assigning the dbf to a global.
function dbfLoad(db) {

  dbf = db;
  console.log('dbf loaded...');

  for (i=0; i< dbf.records.length; i++){
      id2index[dbf.records[i]['RNCNAME']] = i
  }

}

// error handler for dbfloader.
function dbfLoadError() {
  console.log('dbf file failed to load');
}

function readAndDraw() {

    // init polygon obj
    clearMapOverlay();
    var paPoly = [];
    pa_overlay = [];
    for (i=0; i<shp.records.length; i++){
        paPoly[i] = []
        for (j=0; j<shp.records[i].shape.content.points.length/2; j++){
            paPoly[i].push({lat:shp.records[i].shape.content.points[2*j+1], lng:shp.records[i].shape.content.points[2*j]})
        }
        var thisPoly = new google.maps.Polygon({
          paths: paPoly[i],
          strokeColor: '#32CD32',
          strokeOpacity: 0.8,
          strokeWeight: 1,
          fillColor: '#32CD32',
          fillOpacity: getOpacity(i),
          zIndex: i
        });
        pa_overlay.push(thisPoly);
        pa_overlay[i].setMap(map);

        // add a listener for the click event
         pa_overlay[i].addListener('click', showArrays);

        infoWindow = new google.maps.InfoWindow;
    }

}

function clearMapOverlay(){
    if (pa_overlay.length != 0) {
        for (i=0; i< pa_overlay.length; i++) {
            pa_overlay[i].setMap(null)
        }
    }
}

function getOpacity(ix){
    if ($.inArray(ix,id_array) != -1){
        return pred_result_dict[ix]['opacity']
    }else {
        return 0
    }
}

function showArrays(event){

    // Since this polygon has only one path, we can call getPath() to return the

    var contentString = '<b>PA polygon</b><br>'+'<b>id:</b>'+dbf.records[this.zIndex]["RNCNAME"]+'<br>'+'<b>Estimated traffic gain:</b>'+String(parseInt(pred_result_dict[this.zIndex]['traffic_gain'])).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    // Replace the info window's content and position.
    infoWindow.setContent(contentString);
    infoWindow.setPosition(event.latLng);

    infoWindow.open(map);
}

// add select event listener to input option
$('#exampleFormControlSelect1').on('change', function (e) {
    var optionSelected = $("option:selected", this);
    var valueSelected = this.value;
    console.log(valueSelected + ' selected!');
    loadPredPa(base_dir + "src/pa/" + valueSelected);
    $('#download_link').attr("href",base_dir + "src/pa/" + valueSelected)
});