import os
import os.path
from pybrain.datasets            import ClassificationDataSet
from pybrain.utilities           import percentError
from pybrain.tools.shortcuts     import buildNetwork
from pybrain.supervised.trainers import BackpropTrainer
from pybrain.structure.modules   import SoftmaxLayer
from pylab import ion, ioff, figure, draw, contourf, clf, show, hold, plot, xlabel, ylabel, fft, ceil, log10, mean, var, sqrt, average
from scipy import diag, arange, meshgrid, where
from numpy.random import multivariate_normal
import scipy.io.wavfile
import glob
import numpy

"""
Features of each sample

The average and variance in frequency and rms and variance of squares at each slice of the sample.  There are WINDOW_RESOLUTION slices
"""

WINDOW_RESOLUTION = 13
WINDOW_SIZE = 4500 # samples
FEATURES_PER_WINDOW = 4
FEATURES = 4
DRUMS = ["kick", "snare", "hh-closed"]
DRUM_INDICES = dict((d, i) for (i, d) in enumerate(DRUMS))
EPOCHS = 50

class Classifier():
    def __init__(self, testing = False):
        self.training_set, self.test_set = split_samples(0.5 if testing else 1.0)
        self.net = buildNetwork( self.training_set.indim, self.training_set.outdim, outclass=SoftmaxLayer )
        self.trainer = BackpropTrainer( self.net, dataset=self.training_set, momentum=0.1, verbose=True, weightdecay=0.01)
        self.train()

    def train(self):
        self.trainer.trainEpochs( EPOCHS )
        trnresult = percentError( self.trainer.testOnClassData(),
                                  self.training_set['class'] )
        print "  train error: %5.2f%%" % trnresult

    def classify(self, file):
        strengths = self.net.activate(process_sample(*load_sample(file)))
        print strengths
        best_match = None
        strength = 0.0
        for i,s in enumerate(strengths):
            if s > strength:
                best_match = i
                strength = s
        return DRUMS[best_match]

    def test(self):
        tstresult = percentError( self.trainer.testOnClassData(
               dataset=self.test_set ), self.test_set['class'] )

        print "  test error: %5.2f%%" % tstresult

def main ():
    # return visualize()
    c = Classifier(True)
    cl = c.classify(open(".\\kick\\008.WAV","rb"))
    print cl
    c.test()
    # print test_set

def visualize ():
    sample_rate, snd = load_sample(".\\hh-closed\\dh9.WAV")
    print snd.dtype
    data = normalize(snd)
    print data.shape
    n = data.shape[0]
    length = float(n)
    print length / sample_rate, "s"
    timeArray = arange(0, length, 1)
    timeArray = timeArray / sample_rate
    timeArray = timeArray * 1000  #scale to milliseconds
    ion()
    if False:
        plot(timeArray, data, color='k')
        ylabel('Amplitude')
        xlabel('Time (ms)')
        raw_input("press enter")
        exit()
    p = fft(data) # take the fourier transform
    nUniquePts = ceil((n+1)/2.0)
    print nUniquePts
    p = p[0:nUniquePts]
    p = abs(p)
    p = p / float(n) # scale by the number of points so that
                 # the magnitude does not depend on the length
                 # of the signal or on its sampling frequency
    p = p**2  # square it to get the power

    # multiply by two (see technical document for details)
    # odd nfft excludes Nyquist point
    if n % 2 > 0: # we've got odd number of points fft
        p[1:len(p)] = p[1:len(p)] * 2
    else:
        p[1:len(p) -1] = p[1:len(p) - 1] * 2 # we've got even number of points fft

    print p
    freqArray = arange(0, nUniquePts, 1.0) * (sample_rate / n);
    plot(freqArray/1000, 10*log10(p), color='k')
    xlabel('Frequency (kHz)')
    ylabel('Power (dB)')
    raw_input("press enter")

    m = average(freqArray, weights = p)
    v = average((freqArray - m)**2, weights= p)
    r = sqrt(mean(data**2))
    s = var(data**2)
    print "mean freq", m #TODO: IMPORTANT: this is currently the mean *power*, not the mean freq.  What we want is mean freq weighted by power
    print "var freq", v
    print "rms", r
    print "squared variance", s



def split_samples(ratio):
    samples = {}
    for drum in DRUMS:
        samples[drum] = glob.glob(os.path.join('.', drum, '*'))
        print len(samples[drum]), " x ", drum

    ds = ClassificationDataSet(FEATURES, 1, nb_classes=3) #TODO: what's the 2nd parameter?
    for drum in samples:
        for f in samples[drum]:
            # if f.lower() != ".\\kick\\XR10bd01.WAV".lower():
            #    continue
            print f
            features = process_sample(*load_sample(f))
            ds.addSample(features, [DRUM_INDICES[drum]]) #why put this in an array?
    training_set, test_set = ds.splitWithProportion( ratio )
    training_set._convertToOneOfMany( )
    test_set._convertToOneOfMany( )
    return training_set, test_set



load_sample = scipy.io.wavfile.read

def normalize(data):

    if type(data[0]) == numpy.int16: #mono
        mono = data
    else:
        mono = data.sum(axis=1)

    mono = mono / (2.**15)

    return mono / sqrt(mean(mono**2))

def process_sample(sample_rate, data):
    mono = normalize(data)

    while len(mono) > 1000:
        try:
            peak = 0.0
            features = []
            # window_size = len(mono) / WINDOW_RESOLUTION
            window_size = min([WINDOW_SIZE, len(mono)])
            window_resolution = len(mono) / window_size
            #for i in xrange(WINDOW_RESOLUTION):
            for i in xrange(window_resolution):
                fs = (m, v, r, s) = process_window(sample_rate, mono[i * window_size:(i+1)*window_size])
                if r > peak:
                    features = fs
                    peak = r
            if len(features) != FEATURES:
                raise Exception, len(features)
            print features
            return features
        except Silence:
            print "silence encountered, halving length"
            mono = mono[:len(mono) / 2]
    else:
        raise TooShort


class Silence(Exception):
    pass

class TooShort(Exception):
    pass

def process_window(sample_rate, data):
    # print "processing window"
    # print data.dtype
    # print data.shape
    n = data.shape[0]
    length = float(n)
    # print length / sample_rate, "s"
    p = fft(data) # take the fourier transform
    nUniquePts = ceil((n+1)/2.0)
    p = p[0:nUniquePts]
    p = abs(p)
    p = p / float(n) # scale by the number of points so that
                 # the magnitude does not depend on the length
                 # of the signal or on its sampling frequency
    p = p**2  # square it to get the power

    # multiply by two (see technical document for details)
    # odd nfft excludes Nyquist point
    if n % 2 > 0: # we've got odd number of points fft
        p[1:len(p)] = p[1:len(p)] * 2
    else:
        p[1:len(p) -1] = p[1:len(p) - 1] * 2 # we've got even number of points fft
    freqArray = arange(0, nUniquePts, 1.0) * (sample_rate / n);

    if sum(p) == 0:
        raise Silence
    m = average(freqArray, weights = p)
    v = sqrt(average((freqArray - m)**2, weights= p))
    r = sqrt(mean(data**2))
    s = var(data**2)
    print "mean freq", m #TODO: IMPORTANT: this is currently the mean *power*, not the mean freq.  What we want is mean freq weighted by power
    # print freqArray
    # print (freqArray - m)
    # print p
    print "var freq", v
    print "rms", r
    print "squared variance", s
    return [m, v, r, s]

if __name__ == "__main__":
    main()
