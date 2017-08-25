import SceneNode from './SceneNode';
import {
  audio,
} from './audioEngine';

export default class OscNode extends SceneNode {
  constructor() {
    super({
      name: 'Oscillator',
      inputs: {
        freq: {
          name: 'Freq',
          type: 'float',
          value: 440,
        },
        gain: {
          name: 'Gain',
          type: 'float',
          value: 0.5,
        },
      },
      outputs: {
        output: {
          type: 'sound',
          name: 'Output',
        },
      }
    });

    this.osc = audio.createOscillator();
    this.osc.type = 'triangle';
    this.osc.frequency.value = 110;
    this.audioNode = audio.createGain();
    this.osc.start();
    this.osc.connect(this.audioNode);
  }

  onBeforeConnect(sourceNode, sourcePin, targetNode, targetPin) {
    if (sourceNode === this) {
      this.audioNode.connect(targetNode.audioNode);
    }
  }

  onBeforeDisconnect(sourceNode, sourcePin, targetNode, targetPin) {
    if (sourceNode === this) {
      this.audioNode.disconnect(targetNode.audioNode);
    }
  }

  run(inputs) {
    try {
      this.audioNode.gain.value = inputs.gain;
      this.osc.frequency.linearRampToValueAtTime(inputs.freq, audio.currentTime + 0.01);
    } catch (e) {
      console.error(e);
    }
    return { output: this.audioNode };
  }
}
