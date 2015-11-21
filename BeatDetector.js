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
      const ctx = new OfflineAudioContext(1, buffer.length, buffer.sampleRate),
        source = ctx.createBufferSource(),
        filter = ctx.createBiquadFilter();

       source.buffer = buffer;
       filter.type = "lowpass";
       source.connect(filter);
       filter.connect(ctx.destination);
       source.start(0);
       return ctx.startRendering();
     }

     function getPeaks(buffer, threshold) {
        const channel = buffer.getChannelData(0),
          peaks = [];


        for (let i = 0; i < channel.length; i++) {
          console.log(channel[i]);
          if (channel[i] > threshold) {
            peaks.push(i);
          }
        }

        return peaks;
       }
  });
