import SceneNode from '../SceneNode';
import { gl, ScreenNode } from '../ScreenNode';

const uniformTypeMapping = {
  float: 'uniform1f',
  int: 'uniform1i',
  vec2: 'uniform2fv',
  vec3: 'uniform3fv',
  sampler2D: 'uniform1i',
};

const textureBuffer = gl.createBuffer();
const textureData = new Float32Array([
  1, 1,
  0, 1,
  1, 0,
  0, 0,
]);
gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
gl.bufferData(gl.ARRAY_BUFFER, textureData.buffer, gl.STATIC_DRAW);

const vertexBuffer = gl.createBuffer();
const vertexData = new Float32Array([
  1.0, 1.0, 0.0,
  -1.0, 1.0, 0.0,
  1.0, -1.0, 0.0,
  -1.0, -1.0, 0.0,
]);
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertexData.buffer, gl.STATIC_DRAW);

const builtIns = [
  'uResolution',
];

export default class ShaderNode extends SceneNode {
  static nodeName = 'Shader';

  constructor() {
    super({
      name: ShaderNode.nodeName,
      inputs: [],
      outputs: {
        result: { type: 'sampler2D', name: 'Result' },
      },
    });

    this.program = null;

    this.rendererSize = ScreenNode.getRendererSize();
    this.initFramebuffer(this.rendererSize.width, this.rendererSize.height);
  }

  compile(shader) {
    const inputs = shader
      .match(/uniform\s+\w+\s+\w+(?=;)/g)
      .reduce((inputs, uniformDef) => {
        const [_, type, name] = uniformDef.split(' ');
        if (builtIns.indexOf(name) === -1) {
          inputs[name] = {
            name: name,
            type: type,
          };
        }
        return inputs;
      }, {});

    this.updateSchema({
      inputs: inputs,
    });

    this.code = shader;
    this.program = ScreenNode.createProgram(shader);

    this.aPosition = gl.getAttribLocation(this.program, 'aPosition');
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.vertexAttribPointer(this.aPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.aPosition);

    this.aTexCoord = gl.getAttribLocation(this.program, 'aTexCoord');
    gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
    gl.vertexAttribPointer(this.aTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.aTexCoord);

    this.uResolution = gl.getUniformLocation(this.program, 'uResolution');

    this.invalidate();
  }

  initFramebuffer(width, height) {
    if (this.framebuffer) gl.deleteFramebuffer(this.framebuffer);
    if (this.result) gl.deleteTexture(this.result);

    this.result = ScreenNode.createTexture();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    this.framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.result, 0);
  }

  toJSON() {
    const result = super.toJSON();
    result.code = this.code;
    return result;
  }

  async fromJSON(json) {
    await super.fromJSON(json);
    this.compile(json.code);
  }

  update(inputs) {
    if (!this.program) return;

    const currentSize = ScreenNode.getRendererSize();

    if (currentSize !== this.rendererSize) {
      this.initFramebuffer(currentSize.width, currentSize.height);
      this.rendererSize = currentSize;
    }

    gl.useProgram(this.program);
    gl.enableVertexAttribArray(this.aPosition);
    gl.enableVertexAttribArray(this.aTexCoord);
    gl.uniform2fv(this.uResolution, [currentSize.width, currentSize.height]);

    let activeTexture = 0;
    for (let inputId in this.inputs) {
      const location = gl.getUniformLocation(this.program, inputId);
      const input = this.inputs[inputId];
      let value = inputs[inputId] || input.default;

      if (input.type === 'sampler2D') {
        gl.activeTexture(gl.TEXTURE0 + activeTexture);
        gl.bindTexture(gl.TEXTURE_2D, value);
        value = activeTexture;
        activeTexture += 1;
      }

      gl[uniformTypeMapping[input.type]](location, value);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    this.set('result', this.result);
  }
}
