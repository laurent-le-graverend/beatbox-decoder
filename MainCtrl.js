'use strict';

angular
  .module('hackday')
  .controller('MainCtrl', function(
    $q,
    $http,
    $scope,
    BeatDetector,
    Encoder,
    Sample
  ) {

    var context = new AudioContext(),
      bufferSize = 2048,
      soundArrayLeft = [],
      audioInput,
      recorder,
      getUserMediaOpts,
      record,
      peaks;

    getUserMediaOpts = {
      audio: {
        mandatory: {
          echoCancellation: false,
          googEchoCancellation: false,
          googEchoCancellation2: false,
          googAutoGainControl: false,
          googAutoGainControl2: false,
          googNoiseSuppression: false,
          googNoiseSuppression2: false,
          googHighpassFilter: false,
          googTypingNoiseDetection: false
        },
        optional: []
      },
      video: false
    };

    // Sounds samples
    var sounds = [{
      name: 'kick',
      url: 'https://d11ofhkcovlw0l.cloudfront.net/soundbanks/808-kit/036-Kick_808.ogg'
    }, {
      name: 'hh-closed',
      url: 'https://d11ofhkcovlw0l.cloudfront.net/soundbanks/808-kit/042-HH-Closed_808.ogg'
    }, {
      name: 'snare',
      url: 'https://d11ofhkcovlw0l.cloudfront.net/soundbanks/808-kit/038-Snare_808.ogg'
    }];

    // Some data for test
    var beatsArray = [{
      startTime: 0,
      sound: 'kick'
    }, {
      startTime: 0.25,
      sound: 'hh-closed'
    }, {
      startTime: 0.5,
      sound: 'snare'
    }, {
      startTime: 0.75,
      sound: 'hh-closed'
    }, {
      startTime: 0.875,
      sound: 'kick'
    }, {
      startTime: 1,
      sound: 'snare'
    }, {
      startTime: 1.125,
      sound: 'snare'
    }, {
      startTime: 1.25,
      sound: 'hh-closed'
    }, {
      startTime: 1.375,
      sound: 'kick'
    }, {
      startTime: 1.5,
      sound: 'snare'
    }, {
      startTime: 1.75,
      sound: 'hh-closed'
    }];

    $scope.isRecording = false;

    $scope.playBeats = function() {
      playBeats(beatsArray);
    };

    $scope.toggleRecord = function() {

      if (!$scope.isRecording) {
        startRecord();
        $scope.isRecording = true;
      }
      else {
        record = stopRecord();
        $scope.isRecording = false;

        parse(record);
      }
    };

    function storeBuffer(audioEvent) {
      soundArrayLeft.push(new Float32Array(audioEvent.inputBuffer.getChannelData(0)));
    }

    //var request = new XMLHttpRequest();
    //request.open('GET', 'sample.wav', true);
    //request.responseType = 'arraybuffer';
    //
    //request.onload = function() {
    //  context.decodeAudioData(request.response, function(buffer) {
    //    parse(buffer);
    //  });
    //}
    //request.send();

    function parse(buffer) {
      //BeatDetector.lowPassFilter(buffer)
      //  .then(function(audioBuffer) {
      //    return something(audioBuffer);
      //  });

      return getBeats(buffer);

      function getBeats(audioBuffer) {
        var initialThresold = 0.9,
          thresold = initialThresold,
          minThresold = 0.3,
          minPeaks = 30;

        do {
          peaks = BeatDetector.getPeaks(audioBuffer, thresold);
          thresold -= 0.05;
        } while (peaks.length < minPeaks && thresold >= minThresold);

        BeatDetector.drawBeats(peaks, audioBuffer.getChannelData(0).length);
        beatsArray = _.map(BeatDetector.convertIndexToTime(peaks, buffer), function(time) {
          return {
            sound: 'kick',
            startTime: time
          };
        });
      }
    }

    function startRecord() {
      navigator.getUserMedia(getUserMediaOpts,
        function(stream) {
          audioInput = context.createMediaStreamSource(stream);
          recorder = context.createScriptProcessor(bufferSize, 1, 1);
          recorder.onaudioprocess = storeBuffer;
          audioInput.connect(recorder);
          recorder.connect(context.destination);
        },
        function(err) {
          throw new Error(err);
        });
    }

    function stopRecord() {
      var resultLength = Math.ceil(soundArrayLeft.length * bufferSize),
        resultSoundArray = new Float32Array(resultLength),
        offset = 0,
        audioBuffer,
        i;

      // Disconnect nodes
      audioInput.disconnect();
      recorder.disconnect();

      // Clean up data
      for (i = 0; i < soundArrayLeft.length; i++) {
        resultSoundArray.set(soundArrayLeft[i], offset);
        offset += soundArrayLeft[i].length;
      }
      soundArrayLeft = [];

      audioBuffer = context.createBuffer(2, resultSoundArray.length, context.sampleRate);
      audioBuffer.getChannelData(0).set(resultSoundArray);
      audioBuffer.getChannelData(1).set(resultSoundArray);

      // For debug, play record
      //playSound(audioBuffer);

      return audioBuffer;
    }

    $scope.uploadPeaks = function upload() {
      const peakTimes = BeatDetector.convertIndexToTime(peaks, record);
      const uploadUrl = 'http://localhost:8000/';
      const config = {
            transformRequest: angular.identity,
            headers: {'Content-Type': undefined}
        };

      BeatDetector.exportPeakBuffers(peakTimes, record)
        .then(function(buffers) {
          return $q.all(_.map(buffers, function(buffer) {
            console.log("buffer.peak " + buffer.peak);
            return Encoder.toWav(buffer.buffer).then(function(blob) {
              return {peak: buffer.peak, blob: blob};
            })
          }));
        })
        .then(function(blobs) {
          var promises = _.map(blobs, function(blob) {
            var fd = new FormData();
            fd.append('file', blob.blob);

            return $http.post(uploadUrl, fd, config)
              .then(function(response) {
                console.log("blob.peak " + blob.peak);
                return {peak: blob.peak, sound: response.data.sound};
              });

            console.log(URL.createObjectURL(blob));
          });

          return $q.all(promises);
        })
        .then(function(sounds) {
            beatsArray = _.map(sounds, function(sound) {
              console.log("sound.sound " + sound.sound);
              console.log("sound.peak " + sound.peak);
              console.log("sound " + sound);
              return {
                sound: sound.sound,
                startTime: sound.peak
              };
            })
        })
        .catch(function(err) {
          console.log(err);
        })
    }

    function playSound(audioBuffer, atTime) {
      var playSound = context.createBufferSource();
      playSound.buffer = audioBuffer;
      playSound.connect(context.destination);
      playSound.start(atTime + context.currentTime || 0);
    }

    function playBeats(beatsArray) {

      // Load audio buffers
      var promises = sounds.map(function(sound) {
        return Sample.getBuffer(sound.url)
          .then(Sample.decodeAudioData)
          .then(function(decodedBuffer) {
            sound.buffer = decodedBuffer;
            return decodedBuffer;
          });
      });

      $q.all(promises)
        .then(function() {
          var i = 0;
          beatsArray.forEach(function(beat) {
            playSound(_.find(sounds, { name: beat.sound }).buffer, beat.startTime);
            i++;
          })
        });
    }
  });
