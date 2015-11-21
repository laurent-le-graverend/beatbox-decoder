'use strict';

angular
  .module('hackday')
  .factory('BeatDetector', function() {
    return {
      convertIndexToTime: convertIndexToTime,
      drawBeats: drawBeats,
      getPeaks: getPeaks,
      lowPassFilter: lowPassFilter
    };

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

        for (let i = 0; i < channel.length;) {
          if (channel[i] > threshold) {
            peaks.push(i);
            i += 10000;
          } else {
            i++;
          }
        }

        return peaks;
      }

      function drawBeats(peaks, length) {
        var ctx = document.querySelectorAll('#waveform').item(0).getContext('2d'),
          width = ctx.canvas.width;

        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.strokeStyle = '#5397CC';

        for (let i = 0; i < peaks.length; i++) {
          ctx.beginPath();
          ctx.moveTo(peaks[i] / length * width, 0);
          ctx.lineTo(peaks[i] / length * width, ctx.canvas.height);
          ctx.stroke();
        }
      }

      function convertIndexToTime(peaks, audioBuffer) {
        return peaks.map(function(peak) {
          return peak / audioBuffer.getChannelData(0).length * audioBuffer.duration;
        })
      }
  });
