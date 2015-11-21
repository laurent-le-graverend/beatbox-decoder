'use strict';

angular
  .module('hackday')
  .controller('MainCtrl', function(
    $scope,
    BeatDetector
  ) {

    var context = new AudioContext(),
      bufferSize = 2048,
      soundArrayLeft = [],
      audioInput,
      recorder,
      getUserMediaOpts;

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

    $scope.isRecording = false;

    function storeBuffer(audioEvent) {
      soundArrayLeft.push(new Float32Array(audioEvent.inputBuffer.getChannelData(0)));
    }

    $scope.toggleRecord = function() {
      var record;

      if (!$scope.isRecording) {
        startRecord();
        $scope.isRecording = true;
      }
      else {
        var record = stopRecord();
        $scope.isRecording = false;
        BeatDetector.lowPassFilter(record)
          .then(function(audioBuffer) {
            var playSound = context.createBufferSource();
            playSound.buffer = audioBuffer;
            playSound.connect(context.destination);
            playSound.start(0);
            return BeatDetector.getPeaks(audioBuffer, 1);
          })
          .then(function(peaks) {
            console.log(peaks)
          });
      }
    };

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
      //var playSound = context.createBufferSource();
      //playSound.buffer = audioBuffer;
      //playSound.connect(context.destination);
      //playSound.start(0);

      return audioBuffer;
    }
  });
