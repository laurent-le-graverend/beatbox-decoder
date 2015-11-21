import webob
from paste import httpserver
import classify_beat
import json
from cors.cors_application import CorsApplication
from cors.cors_options import CorsOptions
import traceback

classifier = classify_beat.Classifier()

def app(environ, start_response):
    request = webob.Request(environ)
    print request.method
    if request.method == "GET":
        start_response("200 OK", [("Content-Type", "text/html")]) #, ('Access-Control-Allow-Origin', '*')])

        yield """<html><head><title>Test harness</title></head><body><form action="/" method="post" enctype="multipart/form-data">
            <p><input type="file" name="file">
            <p><button type="submit">Submit</button>
        </form></body></html>"""
    elif request.method == "POST":
        print "got here"
        start_response("200 OK", [("Content-Type", "application/json")]) #, ('Access-Control-Allow-Origin', '*')])
        try:
            print request.POST
            if request.POST.items():
                for name,value in request.POST.items():
                    print "name", name
                    print "value", value
                    if name == "file":
                        if not hasattr(value, "file"):
                            raise Exception, "expected a file upload"
                        f = value.file
            else:
                print request.body_file.read(1000)
                f = request.body_file
            yield json.dumps({"drum":classifier.classify(f)})
        except Exception, e:
            print "error"
            print traceback.format_exc(e)
    else:
        start_response("501 Not Implemented", [("Content-Type", "text/plain")]) #, ('Access-Control-Allow-Origin', '*')])


corsapp = CorsApplication(app, CorsOptions())

httpserver.serve(corsapp, host="0.0.0.0", port=8000)
