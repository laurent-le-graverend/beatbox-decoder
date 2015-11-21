'use strict';

angular
  .module('hackday')
  .factory('BeatDetector', function($q) {
    return {
      convertIndexToTime: convertIndexToTime,
      drawBeats: drawBeats,
      exportPeakBuffers: exportPeakBuffers,
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
        const ctx = document.querySelectorAll('#waveform').item(0).getContext('2d'),
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

      function exportPeakBuffers(peaks, buffer) {
        const timestamp = convertIndexToTime(peaks, buffer);
        return $q.all(_.map(peaks, function(peak) {
          return exportPeakBuffer(peak, buffer);
        }));
      }


      function exportPeakBuffer(peak, buffer) {
        const ctx = new OfflineAudioContext(1, 1 * buffer.sampleRate, buffer.sampleRate),
          source = ctx.createBufferSource();

        source.buffer = buffer,
        source.start(0, Math.max(peak - 0.3, 0), 1);
        source.connect(ctx.destination);

        return ctx.startRendering().then(function(buffer){
          return {peak: peak, buffer: buffer};
        });
      }
  });
