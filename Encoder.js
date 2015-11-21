'use strict';

angular
  .module('hackday')
  .factory('Encoder', function($q) {

    return {
      toWav: toWav
    };

    function toWav(buffer) {
      var defer = $q.defer(),
        worker = new Worker('recorderWorker.js');

      // initialize the new worker
      worker.postMessage({
        command: 'init',
        config: {
          numChannels: 1,
          sampleRate: 44100
        }
      });

      // callback for `exportWAV`
      worker.onmessage = function(e) {
        var blob = e.data;

        // our WAV blob
        defer.resolve(blob)
      };

      // send the channel data from our buffer to the worker
      worker.postMessage({
        command: 'record',
        buffer: [
          buffer.getChannelData(0)
        ]
      });

      // ask the worker for a WAV
      worker.postMessage({
        command: 'exportWAV',
        type: 'audio/wav'
      });

      return defer.promise;
    }
  });
