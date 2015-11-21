'use strict';

angular
  .module('hackday')
  .factory('BeatDetector', function() {
    return {
      getPeaks: getPeaks,
      lowPassFilter: lowPassFilter
    };

    function detectBeats(buffer) {
      return lowPassFilter.then(getPeaks);
    }

    function lowPassFilter(buffer) {
      const ctx = new OfflineContext(1, buffer.length, buffer.sampleRate),
        source = offlineContext.createBufferSource(),
        filter = offlineContext.createBiquadFilter();

       source.buffer = buffer;
       filter.type = "lowpass";
       source.connect(filter);
       filter.connect(offlineContext.destination);
       source.start(0);
       return offlineContext.startRendering();
     }

     function getPeaks(buffer) {
        const channel = buffer.getChannel(0),
          peaks = [];

        for (let c = 0; c < channels; c++) {
          for (let i = 0; i < length; i++) {
            if (channel[i] > THRESHOLD) {
              peaks.push(i);
            }
          }
        }

        return peaks;
       }
  });
