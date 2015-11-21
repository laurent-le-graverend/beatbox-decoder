'use strict';

angular
  .module('hackday')
  .factory('Sample', function($q, $http) {

    var audioContext = new AudioContext();

    return {
      decodeAudioData: decodeAudioData,
      getBuffer: getBuffer
    };

    function getBuffer(url) {
      return $http.get(url, { responseType: 'arraybuffer' }).then(function(response) {
        return response.data;
      });
    }

    function decodeAudioData(buffer, file) {
      var deferred = $q.defer();

      audioContext.decodeAudioData(buffer, function(audioBuffer) {
        // send left channel to calculate peak volume level of sample
        // make pseudo stereo sound if original audio is mono
        // is stereo - return original buffer with both channels
        if (audioBuffer.numberOfChannels === 1) {
          var stereoAudioBuffer = audioContext.createBuffer(2, audioBuffer.length, audioContext.sampleRate);
          stereoAudioBuffer.getChannelData(0).set(audioBuffer.getChannelData(0));
          stereoAudioBuffer.getChannelData(1).set(audioBuffer.getChannelData(0));
          audioBuffer = stereoAudioBuffer;
        }

        // calculate metric of sample volume level
        if (file && !file.volumeMetric) {
          audioBuffer.volumeMetric = getRestrictedVolumeMetric(audioBuffer.getChannelData(0));
        }
        deferred.resolve(audioBuffer);
      }, function(e) {
        // TODO: Update every decodeAudioData and pass the file since `file` is new parameter
        deferred.reject(e || new Error('Unable to process audio of ' + (file && file.name || 'file')));
      });

      return deferred.promise;
    }
  });
