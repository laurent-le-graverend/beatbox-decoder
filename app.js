navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

angular.module('hackday', [])
  .controller('MainCtrl', function($scope) {

    var context = new AudioContext(),
      isRecording = false,
      bufferSize = 2048,
      soundArrayLeft = [],
      record = {},
      audioInput,
      recorder;

    function storeBuffer(audioProcessingEvent) {
      var soundData = audioProcessingEvent.inputBuffer.getChannelData(0);

      soundArrayLeft.push(new Float32Array(soundData));

      console.log(soundArrayLeft);
    }

    $scope.toggleRecord = function() {
      if (!isRecording) {
        startRecord();
        isRecording = true;
      }
      else {
        stopRecord();
        isRecording = false;
      }
    };

    function startRecord() {
      navigator.getUserMedia({
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
      }, function(stream) {
        audioInput = context.createMediaStreamSource(stream);
        recorder = context.createScriptProcessor(bufferSize, 1, 1);
        recorder.onaudioprocess = storeBuffer;
        audioInput.connect(recorder);
        recorder.connect(context.destination);

      }, function(e) {

      });
    }

    function stopRecord() {
      var resultSoundArray,
        resultLength = Math.ceil(soundArrayLeft.length * bufferSize),
        offset = 0,
        i;

      audioInput.disconnect();
      recorder.disconnect();

      // Clean up data
      resultSoundArray = new Float32Array(resultLength);
      for (i = 0; i < soundArrayLeft.length; i++) {
        resultSoundArray.set(soundArrayLeft[i], offset);
        offset += soundArrayLeft[i].length;
      }

      record.audioBuffer = context.createBuffer(2, resultSoundArray.length, context.sampleRate);

      var playSound = context.createBufferSource();

      playSound.buffer = record.audioBuffer;
      playSound.connect(context.destination);
      playSound.start(0);

    }
  });
