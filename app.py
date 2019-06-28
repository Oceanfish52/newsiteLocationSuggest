from flask import Flask, render_template, send_from_directory, request, redirect, flash, jsonify
from werkzeug.utils import secure_filename
import json
import os
# from threading import Thread
from SiteSearch import suggest_site_location
from rq import Queue
from rq.job import Job
from worker import redis_con

UPLOAD_FOLDER = 'raw/'
ALLOWED_EXTENSIONS = set(['csv'])

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# set up a Redis connection and initialized a queue
q = Queue(connection=redis_con)

@app.route('/')
def main():
    return render_template('PAEval.html')

@app.route('/site_search')
def render_site_search():
    return render_template('EstByCoord.html')

@app.route('/admin')
def admin():
    raw_files_cov = {'files': os.listdir('raw/coverage/')}
    raw_files_traff = {'files': os.listdir('raw/traffic/')}
    result_files = {'files':os.listdir('src/coord/')}
    return render_template('admin.html', raw_files_cov=raw_files_cov, raw_files_traff=raw_files_traff, result_files=result_files)

@app.route('/src/<path:path>')
def serve_file(path):
    return send_from_directory('src', path)

@app.route('/list_dir/<path:path>')
def list_dir(path):
    files_dict = {'files': os.listdir('src/' + path)}
    return json.dumps(files_dict)

@app.route('/list_dir_admin/<path:path>')
def list_dir_admin(path):
    files_dict = {'files': os.listdir('raw/' + path)}
    return json.dumps(files_dict)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/uploads_cov', methods=['POST'])
def upload_file_cov():
    if request.method == 'POST':
        # check if the post request has the file part
        if 'file' not in request.files:
            flash('No file part')
            return redirect(request.url)
        file = request.files['file']
        # if user does not select file, browser also
        # submit an empty part without filename
        if file.filename == '':
            flash('No selected file')
            return redirect(request.url)
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], 'coverage/' + filename))
            raw_files_cov = {'files': os.listdir('raw/coverage/')}
            raw_files_traff = {'files': os.listdir('raw/traffic/')}
            result_files = {'files': os.listdir('src/coord/')}
            return render_template('admin.html', raw_files_cov=raw_files_cov, raw_files_traff=raw_files_traff,
                                   result_files=result_files)
    return '''
    <!doctype html>
    <title>Upload new File</title>
    <h1>Upload new File</h1>
    <form method=post enctype=multipart/form-data>
      <input type=file name=file>
      <input type=submit value=Upload>
    </form>
    '''

@app.route('/uploads_traff', methods=['POST'])
def upload_file_traff():
    if request.method == 'POST':
        # check if the post request has the file part
        if 'file' not in request.files:
            flash('No file part')
            return redirect(request.url)
        file = request.files['file']
        # if user does not select file, browser also
        # submit an empty part without filename
        if file.filename == '':
            flash('No selected file')
            return redirect(request.url)
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], 'traffic/'+filename))
            raw_files_cov = {'files': os.listdir('raw/coverage/')}
            raw_files_traff = {'files': os.listdir('raw/traffic/')}
            result_files = {'files': os.listdir('src/coord/')}
            return render_template('admin.html', raw_files_cov=raw_files_cov, raw_files_traff=raw_files_traff,
                                   result_files=result_files)
    return '''
    <!doctype html>
    <title>Upload new File</title>
    <h1>Upload new File</h1>
    <form method=post enctype=multipart/form-data>
      <input type=file name=file>
      <input type=submit value=Upload>
    </form>
    '''

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'],
                               filename)

@app.route('/generate_site_search_result', methods=['POST'])
def generate_site_search_result():
    file_name_cov = request.get_json()['file_name_coverage']
    file_name_traff = request.get_json()['file_name_traffic']
    result_file_name = request.get_json()['result_file_name']
    filter = request.get_json()['filt_list']

    job  = q.enqueue(suggest_site_location, file_name_cov, file_name_traff, result_file_name, filter, job_timeout='1h')
    job_id = job.get_id()

    return json.dumps({'job_id':job_id})

@app.route('/test', methods=['POST'])
def test_receive():
    file_name_cov = request.get_json()['file_name_coverage']
    file_name_traff = request.get_json()['file_name_traffic']
    result_file_name = request.get_json()['result_file_name']
    filter = request.get_json()['filt_list']

    print(filter)
    return json.dumps({'result':'successful!'})

@app.route("/results/<job_key>", methods=['GET'])
def get_results(job_key):
    job = Job.fetch(job_key, connection=redis_con)
    return json.dumps({'status':job.get_status(),'meta':job.meta}), 200

@app.route('/status/<job_id>', methods=['GET'])
def job_status(job_id):
    job = q.fetch_job(job_id)
    if job is None:
        response = {'status': 'unknown'}
    else:
        response = {
            'id': job.get_id(),
            'status': job.get_status()
        }
        if job.is_failed:
            response['message'] = job.exc_info.strip().split('\n')[-1]
    return jsonify(response)

if __name__ == '__main__':
    app.run()