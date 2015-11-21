=Install=
* Anaconda (https://www.continuum.io/downloads)
** conda update conda
* pip install pybrain cors-python webob paste
* pybrain (http://pybrain.org/) (Anaconda/Scripts/pip install pybrain)
* npm install

=Run=
* Anaconda/python server.py
* npm start
* http://localhost:3000/

Debug
* Access http://localhost:8000/ to debug the sound matcher

To improve the detection, put lots of sample sounds in /autobeatbox/kick /autobeatbox/hh-closed and /autobeatbox/snare

=Test=
* Anaconda/python classify_beat.py
