var base_dir = 'http://127.0.0.1:5000/';

$('.custom-file-input').on('change',function(){
    //get the file name
    var fileName = $(this).val().split('\\')[2];
    //replace the "Choose a file" label
    $(this).next('.custom-file-label').html(fileName);
})

// read the coverage file list
d3.json(base_dir + 'list_dir_admin/coverage').then(function(data) {

files_list = data['files'];
for (i=0;i< files_list.length; i++){
    $('#dropdownList1').append('<option>'+files_list[i]+'</option>')
}

})

// read the traffic file list
d3.json(base_dir + 'list_dir_admin/traffic').then(function(data) {

files_list = data['files'];
for (i=0;i< files_list.length; i++){
    $('#dropdownList2').append('<option>'+files_list[i]+'</option>')
}

})

// click event for for the button
$('.btn.btn-success').click(function() {
    let filt_list = []
    $('td').each(function() {
        filt_list.push($(this).find('input').val())
    });

    let data = {
            'file_name_coverage':$('#dropdownList1').find(':selected').text(),
            'file_name_traffic':$('#dropdownList2').find(':selected').text(),
            'result_file_name':$('#inputFilename').val(),
            'filt_list':filt_list
        };
    console.log(data)

    $.ajax({
        type: 'POST',
        url: '/generate_site_search_result',
        dataType: 'json',
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: function(response) {
            console.log(response)
        },
        error: function(error) {
            console.log('sending failed!')
        }
    });
})

// click event for creating filter
$('#createFilterButton').click(function() {

    $("table").remove()
    let form = $("#filterForm")
    let filterSize = $("#filterSize").val()
    $("<table class='table table-bordered table-condensed'><tbody></tbody></table>").insertAfter(form)
    for (i=0; i<filterSize; i++) {
        $("table").append("<tr></tr>")
            for (j=0; j<filterSize; j++) {
            $("tr").last().append("<td><input type='number' class='form-control' value='1' /></td>")
            }
    }

})