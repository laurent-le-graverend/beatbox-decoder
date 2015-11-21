navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

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

angular.module('hackday', [])
  .controller('MainCtrl', function($scope) {

    var context = new AudioContext(),
      bufferSize = 2048,
      soundArrayLeft = [],
      record = {},
      audioInput,
      recorder;

    $scope.isRecording = false;

    function storeBuffer(audioEvent) {
      soundArrayLeft.push(new Float32Array(audioEvent.inputBuffer.getChannelData(0)));
    }

    $scope.toggleRecord = function() {
      if (!$scope.isRecording) {
        startRecord();
        $scope.isRecording = true;
      }
      else {
        stopRecord();
        $scope.isRecording = false;
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
      var resultSoundArray,
        resultLength = Math.ceil(soundArrayLeft.length * bufferSize),
        offset = 0,
        i;

      // Disconnect nodes
      audioInput.disconnect();
      recorder.disconnect();
      soundArrayLeft = [];

      // Clean up data
      resultSoundArray = new Float32Array(resultLength);
      for (i = 0; i < soundArrayLeft.length; i++) {
        resultSoundArray.set(soundArrayLeft[i], offset);
        offset += soundArrayLeft[i].length;
      }

      record.audioBuffer = context.createBuffer(2, resultSoundArray.length, context.sampleRate);

      var playSound = context.createBufferSource();

      console.log(record.audioBuffer);
      playSound.buffer = record.audioBuffer;
      playSound.connect(context.destination);
      playSound.start(0);
    }
  });
