require=(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({"@jscad/viewer":[function(require,module,exports){
'use strict';

var LightGLEngine = require('./jscad-viewer-lightgl');

var _require = require('./jscad-viewer-helpers'),
    colorRGBA = _require.colorRGBA,
    parseColor = _require.parseColor;

/**
 * A viewer is a WebGL canvas that lets the user view a mesh.
 * The user can tumble it around by dragging the mouse.
 * @param {DOMElement} containerelement container element
 * @param {object}     options          options for renderer
 */


function Viewer(containerelement, options) {
  // see the defaults method on how to change these
  this.options = Viewer.defaults();
  // apply all options found
  if ('camera' in options) {
    this.setCameraOptions(options['camera']);
  }
  if ('plate' in options) {
    this.setPlateOptions(options['plate']);
  }
  if ('axis' in options) {
    this.setAxisOptions(options['axis']);
  }
  if ('solid' in options) {
    this.setSolidOptions(options['solid']);
  }
  if ('glOptions' in options) {
    this.options.glOptions = options.glOptions;
  }

  var engine;

  // select drawing engine from options
  if (this.options.engine && Viewer[this.options.engine]) {
    engine = Viewer[this.options.engine];
  }

  // instantiate the rendering engine
  if (!engine) {
    engine = LightGLEngine; // || Viewer.ThreeEngine
  }

  if (!engine) {
    throw new Error('Cannot find drawing engine, please define one via "engine" option');
  }

  // mixin methods
  for (var method in Viewer.prototype) {
    if (!(method in engine.prototype)) {
      engine.prototype[method] = Viewer.prototype[method];
    }
  }

  var e = new engine(containerelement, this.options);
  e.init();
  return e;
};

/**
 * return defaults which can be customized later
 * @returns {object} [[Description]]
 */
Viewer.defaults = function () {
  return {
    camera: {
      fov: 45, // field of view
      angle: { x: -60, y: 0, z: -45 }, // view angle about XYZ axis
      position: { x: 0, y: 0, z: 100 }, // initial position at XYZ
      clip: { min: 0.5, max: 1000 // rendering outside this range is clipped
      } },
    plate: {
      draw: true, // draw or not
      size: 200, // plate size (X and Y)
      // minor grid settings
      m: {
        i: 1, // number of units between minor grid lines
        color: { r: 0.8, g: 0.8, b: 0.8, a: 0.5 // color
        } },
      // major grid settings
      M: {
        i: 10, // number of units between major grid lines
        color: { r: 0.5, g: 0.5, b: 0.5, a: 0.5 // color
        } }
    },
    axis: {
      draw: false, // draw or not
      x: {
        neg: { r: 1.0, g: 0.5, b: 0.5, a: 0.5 }, // color in negative direction
        pos: { r: 1.0, g: 0, b: 0, a: 0.8 // color in positive direction
        } },
      y: {
        neg: { r: 0.5, g: 1.0, b: 0.5, a: 0.5 }, // color in negative direction
        pos: { r: 0, g: 1.0, b: 0, a: 0.8 // color in positive direction
        } },
      z: {
        neg: { r: 0.5, g: 0.5, b: 1.0, a: 0.5 }, // color in negative direction
        pos: { r: 0, g: 0, b: 1.0, a: 0.8 // color in positive direction
        } }
    },
    solid: {
      draw: true, // draw or not
      lines: false, // draw outlines or not
      faces: true,
      overlay: false, // use overlay when drawing lines or not
      smooth: false, // use smoothing or not
      faceColor: { r: 1.0, g: 0.4, b: 1.0, a: 1.0 }, // default face color
      outlineColor: { r: 0.0, g: 0.0, b: 0.0, a: 0.1 // default outline color
      } },
    background: {
      color: { r: 0.93, g: 0.93, b: 0.93, a: 1.0 }
    }
  };
};

Viewer.prototype = {
  parseSizeParams: function parseSizeParams() {
    // essentially, allow all relative + px. Not cm and such.
    var winResizeUnits = ['%', 'vh', 'vw', 'vmax', 'vmin'];
    var width, height;
    var containerStyle = this.containerEl.style;
    var wUnit = containerStyle.width.match(/^(\d+(?:\.\d+)?)(.*)$/)[2];
    var hUnit = typeof containerStyle.height === 'string' ? containerStyle.height.match(/^(\d+(?:\.\d+)?)(.*)$/)[2] : '';
    // whether unit scales on win resize
    var isDynUnit = containerStyle.width.match(/^calc\(/) || containerStyle.height.match(/^calc\(/) || winResizeUnits.indexOf(wUnit) != -1 || winResizeUnits.indexOf(hUnit) != -1;
    // e.g if units are %, need to keep resizing canvas with dom
    if (isDynUnit) {
      window.addEventListener('resize', this.handleResize.bind(this));
    }
  },
  resizeCanvas: function resizeCanvas() {
    var canvas = this.canvas;

    var devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = this.containerEl.clientWidth * devicePixelRatio;
    canvas.height = this.containerEl.clientHeight * devicePixelRatio;
  },
  setCsg: function setCsg(csg) {
    if (0 && csg.length) {
      // preparing multiple CSG's (not union-ed), not yet working
      for (var i = 0; i < csg.length; i++) {
        this.meshes.concat(this.csgToMeshes(csg[i]));
      }
    } else {
      this.meshes = this.csgToMeshes(csg);
    }
    this.state = 2; // showing, object
    this.onDraw();
  },

  clear: function clear() {
    // empty mesh list:
    this.meshes = [];
    this.state = 1; // cleared, no object
    this.onDraw();
  },

  resetCamera: function resetCamera() {
    // reset perpective (camera) to initial settings
    this.angleX = this.options.camera.angle.x;
    this.angleY = this.options.camera.angle.y;
    this.angleZ = this.options.camera.angle.z;
    this.viewpointX = this.options.camera.position.x;
    this.viewpointY = this.options.camera.position.y;
    this.viewpointZ = this.options.camera.position.z;
    this.onDraw();
  },

  supported: function supported() {
    return !!this.gl;
  },

  setCameraOptions: function setCameraOptions(options) {
    options = options || {};
    // apply all options found
    for (var x in this.options.camera) {
      if (x in options) {
        this.options.camera[x] = options[x];
      }
    }
  },

  setPlateOptions: function setPlateOptions(options) {
    options = options || {};
    // apply all options found
    for (var x in this.options.plate) {
      if (x in options) {
        this.options.plate[x] = options[x];
      }
    }
  },

  setAxisOptions: function setAxisOptions(options) {
    options = options || {};
    // apply all options found
    for (var x in this.options.axis) {
      if (x in options) this.options.axis[x] = options[x];
    }
  },

  setSolidOptions: function setSolidOptions(options) {
    options = options || {};
    // apply all options found
    for (var x in this.options.solid) {
      if (x in options) this.options.solid[x] = options[x];
    }
  }
};

module.exports = Viewer;

},{"./jscad-viewer-helpers":1,"./jscad-viewer-lightgl":2}],1:[function(require,module,exports){
'use strict';

/**
 * convert color from rgba object to the array of bytes
 * @param   {object} color `{r: r, g: g, b: b, a: a}`
 * @returns {Array}  `[r, g, b, a]`
 */
function colorBytes(colorRGBA) {
  var result = [colorRGBA.r, colorRGBA.g, colorRGBA.b];
  if (colorRGBA.a !== undefined) result.push(colorRGBA.a);
  return result;
}

function colorRGBA(colorBytes) {
  var result = { r: colorBytes[0], g: colorBytes[1], b: colorBytes[2] };
  if (colorBytes[3] !== undefined) result.a = colorBytes[3];
  return result;
}

function cssFnSingleColor(str) {
  if (str[str.length - 1] === '%') {
    return parseInt(str, 10) / 100;
  } else {
    return parseInt(str, 10) / 255;
  }
}

function parseColor(color) {
  // hsl, hsv, rgba, and #xxyyzz is supported
  var rx = {
    'html3': /^#([a-f0-9]{3})$/i,
    'html6': /^#([a-f0-9]{6})$/i,
    'fn': /^(rgb|hsl|hsv)a?\s*\(([^\)]+)\)$/i
  };
  var rgba;
  var match;
  if (match = color.match(rx.html6)) {
    rgba = [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16), 1];
  } else if (match = color.match(rx.html3)) {
    rgba = [parseInt(match[1] + match[1], 16), parseInt(match[2] + match[2], 16), parseInt(match[3] + match[3], 16), 1];
  } else if (match = color.match(rx.fn)) {
    if (match[1] === 'rgb' || match[1] === 'rgba') {
      // 0-255 or percentage allowed
      var digits = match[2].split(/\s*,\s*/);
      rgba = [cssFnSingleColor(digits[0]), cssFnSingleColor(digits[1]), cssFnSingleColor(digits[2]), parseFloat(digits[3])];
    }
    // rgba = [match[1], match[2], match[3], match[4]]
    // console.log (rgba)
  }
  return rgba;
}

module.exports = {
  colorBytes: colorBytes,
  colorRGBA: colorRGBA,
  cssFnSingleColor: cssFnSingleColor,
  parseColor: parseColor
};

},{}],2:[function(require,module,exports){
'use strict';

var _require = require('most-gestures'),
    baseInteractionsFromEvents = _require.baseInteractionsFromEvents,
    pointerGestures = _require.pointerGestures;

var GL = require('./lightgl');

var _require2 = require('./jscad-viewer-helpers'),
    colorBytes = _require2.colorBytes;

/**
 * lightgl.js renderer for jscad viewer
 * @param {DOMElement} containerelement container element
 * @param {object}     options    options for renderer
 */


function LightGLEngine(containerelement, options) {
  this.options = options;

  this.containerEl = containerelement;

  this.createRenderer();

  // only window resize is available, so add an event callback for the canvas
  window.addEventListener('resize', this.handleResize.bind(this));
};

LightGLEngine.prototype = {
  init: function init() {
    // set initial canvas size
    this.gl.canvas.width = this.containerEl.width;
    this.gl.canvas.height = this.containerEl.height;

    this.handleResize();
  },
  handleResize: function handleResize() {
    // Set up the viewport

    var canvas = this.canvas;

    this.resizeCanvas();

    this.gl.viewport(0, 0, canvas.width, canvas.height); // pixels
    this.gl.matrixMode(this.gl.PROJECTION);
    this.gl.loadIdentity();
    this.gl.perspective(this.options.camera.fov, canvas.width / canvas.height, this.options.camera.clip.min, this.options.camera.clip.max);
    this.gl.matrixMode(this.gl.MODELVIEW);

    this.onDraw();
  },
  createRenderer: function createRenderer() {
    // Set up WebGL state
    var gl = GL.create(this.options.glOptions);
    this.gl = gl;
    this.gl.lineWidth(1); // don't let the library choose

    this.canvas = this.gl.canvas;
    this.meshes = [];
    this.containerEl.appendChild(this.gl.canvas);

    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    this.gl.clearColor.apply(this.gl, colorBytes(this.options.background.color));
    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.enable(this.gl.CULL_FACE);

    var outlineColor = this.options.solid.outlineColor;

    // Black shader for wireframe
    this.blackShader = new GL.Shader('\
      void main() {\
        gl_Position = gl_ModelViewProjectionMatrix * gl_Vertex;\
      }', '\
      void main() {\
        gl_FragColor = vec4(' + colorBytes(outlineColor).join(', ') + ');\
      }');

    // Shader with diffuse and specular lighting
    this.lightingShader = new GL.Shader('\
      varying vec3 color;\
      varying float alpha;\
      varying vec3 normal;\
      varying vec3 light;\
      void main() {\
        const vec3 lightDir = vec3(1.0, 2.0, 3.0) / 3.741657386773941;\
        light = lightDir;\
        color = gl_Color.rgb;\
        alpha = gl_Color.a;\
        normal = gl_NormalMatrix * gl_Normal;\
        gl_Position = gl_ModelViewProjectionMatrix * gl_Vertex;\
      }', '\
      varying vec3 color;\
      varying float alpha;\
      varying vec3 normal;\
      varying vec3 light;\
      void main() {\
        vec3 n = normalize(normal);\
        float diffuse = max(0.0, dot(light, n));\
        float specular = pow(max(0.0, -reflect(light, n).z), 10.0) * sqrt(diffuse);\
        gl_FragColor = vec4(mix(color * (0.3 + 0.7 * diffuse), vec3(1.0), specular), alpha);\
      }');

    var _this = this;

    this.createControls();
    this.resetCamera();

    this.gl.ondraw = function () {
      _this.onDraw();
    };

    // state variables, i.e. used for storing values, etc

    // state of viewer
    // 0 - initialized, no object
    // 1 - cleared, no object
    // 2 - showing, object
    this.state = 0;
    this.meshes = [];
    this.clear(); // and draw the inital viewer
  },
  createControls: function createControls() {
    var _this = this;

    var shiftControl = document.createElement('div');
    shiftControl.className = 'shift-scene';

    var leftArrow = document.createElement('div');
    leftArrow.classList.add('arrow');
    leftArrow.classList.add('arrow-left');

    var rightArrow = document.createElement('div');
    rightArrow.classList.add('arrow');
    rightArrow.classList.add('arrow-right');

    var topArrow = document.createElement('div');
    topArrow.classList.add('arrow');
    topArrow.classList.add('arrow-top');

    var bottomArrow = document.createElement('div');
    topArrow.classList.add('arrow');
    topArrow.classList.add('arrow-bottom');

    shiftControl.appendChild(leftArrow);
    shiftControl.appendChild(rightArrow);
    shiftControl.appendChild(topArrow);
    shiftControl.appendChild(bottomArrow);
    this.containerEl.appendChild(shiftControl);

    // we need mobile detection to change the target element of controls:
    // otherwise we have to disable the build in html zoom on mobile , which is not always ideal
    var isMobile = typeof window.orientation !== 'undefined';
    var element = this.containerEl; // for now only use the canvas isMobile ? this.containerEl : document
    var baseInteractions = baseInteractionsFromEvents(element);
    var gestures = pointerGestures(baseInteractions);

    var rotateFactor = 0.4;
    var panFactor = 0.005;
    var zoomFactor = 1.085;

    gestures.drags.throttle(20).forEach(function (data) {
      var delta = data.delta,
          originalEvents = data.originalEvents;
      var _originalEvents$ = originalEvents[0],
          altKey = _originalEvents$.altKey,
          shiftKey = _originalEvents$.shiftKey,
          ctrlKey = _originalEvents$.ctrlKey,
          metaKey = _originalEvents$.metaKey;

      var button = originalEvents[0].which;

      if (altKey || button === 3) // ROTATE X,Y (ALT or right mouse button)
        {
          _this.angleY += delta.x * rotateFactor;
          _this.angleX += delta.y * rotateFactor;
        } else if (shiftKey || button === 2) {
        // PAN  (SHIFT or middle mouse button)
        _this.viewpointX -= panFactor * delta.x * _this.viewpointZ;
        _this.viewpointY -= panFactor * delta.y * _this.viewpointZ;
      } else if (ctrlKey || metaKey) {
        // ZOOM IN/OUT
        var zoom = (-delta.x + delta.y) * 10 * zoomFactor; // arbitrary
        var coeff = (_this.viewpointZ - _this.options.camera.clip.min) / (_this.options.camera.clip.max - _this.options.camera.clip.min);
        zoom *= coeff;
        _this.viewpointZ += zoom;
        _this.viewpointZ = Math.min(Math.max(_this.viewpointZ, _this.options.camera.clip.min), _this.options.camera.clip.max);
      } else {
        _this.angleZ -= delta.x * rotateFactor;
        _this.angleX += delta.y * rotateFactor;
      }

      _this.onDraw();
    });

    gestures.zooms.throttle(20).forEach(function (zoom) {
      var coeff = (_this.viewpointZ - _this.options.camera.clip.min) / (_this.options.camera.clip.max - _this.options.camera.clip.min);
      zoom *= zoomFactor * coeff;
      _this.viewpointZ -= zoom; //* (this.options.camera.clip.max - this.options.camera.clip.min)
      _this.viewpointZ = Math.min(Math.max(_this.viewpointZ, _this.options.camera.clip.min), _this.options.camera.clip.max);
      _this.onDraw();
    });

    /*this.touch = {
      angleX: 0,
      angleY: 0,
      angleZ: 0,
      lastX: 0,
      lastY: 0,
      scale: 0,
      ctrl: 0,
      shiftTimer: null,
      shiftControl: shiftControl,
      cur: null // current state
      }*/

    /*
    hammerElt.on('press', function (e) {
      console.log('press', e.pointers, e.pointerType)
      if (e.pointers.length === 1) {
        var point = e.center
        shiftControl.classList.add('active')
        shiftControl.style.left = point.pageX + 'px'
        shiftControl.style.top = point.pageY + 'px'
        _this.touch.cur = 'shifting'
      } else {
        _this.clearShift()
      }
    })
      hammerElt.on('pressup', function (e) {
      console.log('pressup')
      _this.clearShift()
      if (_this.touch.cur) {
        shiftControl.classList.remove('active')
        shiftControl.classList.remove('shift-horizontal')
        shiftControl.classList.remove('shift-vertical')
      }
    })
      */

    this.gl.ondraw = function () {
      _this.onDraw();
    };
  },
  clearShift: function clearShift() {
    if (this.touch.shiftTimer) {
      clearTimeout(this.touch.shiftTimer);
      this.touch.shiftTimer = null;
    }
    return this;
  },

  // pan & tilt with one finger
  onPanTilt: function onPanTilt(e) {
    // console.log('onPanTilt')
    this.touch.cur = 'dragging';
    var deltaX = 0;
    var deltaY = 0;
    var factor = 0.3;
    if (this.touch.lastY !== undefined) {
      // tilt
      deltaX = e.deltaY - this.touch.lastY;
      this.angleX += deltaX * factor;
      this.touch.lastY = e.deltaY;
    }
    if (this.touch.lastX !== undefined) {
      // pan
      deltaY = e.deltaX - this.touch.lastX;
      this.angleZ += deltaY * factor;
      this.touch.lastX = e.deltaX;
    }
    // console.log(delta)
    if (deltaX || deltaY) {
      this.onDraw();
    }
  },

  // shift after 0.5s touch&hold
  onShift: function onShift(e) {
    console.log('onShift');
    this.touch.cur = 'shifting';
    var factor = 5e-3;
    var delta = 0;

    if (this.touch.lastY && (e.direction == 'up' || e.direction == 'down')) {
      this.touch.shiftControl.removeClass('shift-horizontal').addClass('shift-vertical').css('top', e.center.pageY + 'px');
      delta = e.deltaY - this.touch.lastY;
      this.viewpointY -= factor * delta * this.viewpointZ;
      this.angleX += delta;
    }
    if (this.touch.lastX && (e.direction == 'left' || e.direction == 'right')) {
      this.touch.shiftControl.removeClass('shift-vertical').addClass('shift-horizontal').css('left', e.center.pageX + 'px');
      delta = e.deltaX - this.touch.lastX;
      this.viewpointX += factor * delta * this.viewpointZ;
      this.angleZ += delta;
    }
    if (delta) {
      this.onDraw();
    }
    this.touch.lastX = e.deltaX;
    this.touch.lastY = e.deltaY;
  },

  onDraw: function onDraw(e) {
    var gl = this.gl;
    gl.makeCurrent();

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.loadIdentity();
    // set the perspective based on the camera postion
    gl.translate(this.viewpointX, this.viewpointY, -this.viewpointZ);
    gl.rotate(this.angleX, 1, 0, 0);
    gl.rotate(this.angleY, 0, 1, 0);
    gl.rotate(this.angleZ, 0, 0, 1);
    // draw the solid (meshes)
    if (this.options.solid.draw) {
      gl.enable(gl.BLEND);
      if (!this.options.solid.overlay) gl.enable(gl.POLYGON_OFFSET_FILL);
      for (var i = 0; i < this.meshes.length; i++) {
        var mesh = this.meshes[i];
        this.lightingShader.draw(mesh, gl.TRIANGLES);
      }
      if (!this.options.solid.overlay) gl.disable(gl.POLYGON_OFFSET_FILL);
      gl.disable(gl.BLEND);

      if (this.options.solid.lines) {
        if (this.options.solid.overlay) gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        for (var i = 0; i < this.meshes.length; i++) {
          var mesh = this.meshes[i];
          this.blackShader.draw(mesh, gl.LINES);
        }
        gl.disable(gl.BLEND);
        if (this.options.solid.overlay) gl.enable(gl.DEPTH_TEST);
      }
    }
    // draw the plate and the axis
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.begin(gl.LINES);

    if (this.options.plate.draw) {
      var m = this.options.plate.m; // short cut
      var M = this.options.plate.M; // short cut
      var size = this.options.plate.size / 2;
      // -- minor grid
      gl.color.apply(gl, colorBytes(m.color));
      var mg = m.i;
      var MG = M.i;
      for (var x = -size; x <= size; x += mg) {
        if (x % MG) {
          // draw only minor grid line
          gl.vertex(-size, x, 0);
          gl.vertex(size, x, 0);
          gl.vertex(x, -size, 0);
          gl.vertex(x, size, 0);
        }
      }
      // -- major grid
      gl.color.apply(gl, colorBytes(M.color));
      for (var x = -size; x <= size; x += MG) {
        gl.vertex(-size, x, 0);
        gl.vertex(size, x, 0);
        gl.vertex(x, -size, 0);
        gl.vertex(x, size, 0);
      }
    }
    if (this.options.axis.draw) {
      var size = this.options.plate.size / 2;
      // X axis
      var c = this.options.axis.x.neg;
      gl.color(c.r, c.g, c.b, c.a); // negative direction is lighter
      gl.vertex(-size, 0, 0);
      gl.vertex(0, 0, 0);
      c = this.options.axis.x.pos;
      gl.color(c.r, c.g, c.b, c.a); // positive direction is lighter
      gl.vertex(0, 0, 0);
      gl.vertex(size, 0, 0);
      // Y axis
      c = this.options.axis.y.neg;
      gl.color(c.r, c.g, c.b, c.a); // negative direction is lighter
      gl.vertex(0, -size, 0);
      gl.vertex(0, 0, 0);
      c = this.options.axis.y.pos;
      gl.color(c.r, c.g, c.b, c.a); // positive direction is lighter
      gl.vertex(0, 0, 0);
      gl.vertex(0, size, 0);
      // Z axis
      c = this.options.axis.z.neg;
      gl.color(c.r, c.g, c.b, c.a); // negative direction is lighter
      gl.vertex(0, 0, -size);
      gl.vertex(0, 0, 0);
      c = this.options.axis.z.pos;
      gl.color(c.r, c.g, c.b, c.a); // positive direction is lighter
      gl.vertex(0, 0, 0);
      gl.vertex(0, 0, size);
    }
    gl.end();
    gl.disable(gl.BLEND);
  },

  // Convert from CSG solid to an array of GL.Mesh objects
  // limiting the number of vertices per mesh to less than 2^16
  csgToMeshes: function csgToMeshes(initial_csg) {
    var csg = initial_csg.canonicalized();
    var mesh = new GL.Mesh({ normals: true, colors: true });
    var meshes = [mesh];
    var vertexTag2Index = {};
    var vertices = [];
    var colors = [];
    var triangles = [];
    // set to true if we want to use interpolated vertex normals
    // this creates nice round spheres but does not represent the shape of
    // the actual model
    var smoothlighting = this.options.solid.smooth;
    var polygons = csg.toPolygons();
    var numpolygons = polygons.length;
    for (var j = 0; j < numpolygons; j++) {
      var polygon = polygons[j];
      var color = colorBytes(this.options.solid.faceColor); // default color

      if (polygon.shared && polygon.shared.color) {
        color = polygon.shared.color;
      } else if (polygon.color) {
        color = polygon.color;
      }

      if (color.length < 4) {
        color.push(1.0);
      } // opaque

      var indices = polygon.vertices.map(function (vertex) {
        var vertextag = vertex.getTag();
        var vertexindex = vertexTag2Index[vertextag];
        var prevcolor = colors[vertexindex];
        if (smoothlighting && vertextag in vertexTag2Index && prevcolor[0] === color[0] && prevcolor[1] === color[1] && prevcolor[2] === color[2]) {
          vertexindex = vertexTag2Index[vertextag];
        } else {
          vertexindex = vertices.length;
          vertexTag2Index[vertextag] = vertexindex;
          vertices.push([vertex.pos.x, vertex.pos.y, vertex.pos.z]);
          colors.push(color);
        }
        return vertexindex;
      });
      for (var i = 2; i < indices.length; i++) {
        triangles.push([indices[0], indices[i - 1], indices[i]]);
      }
      // if too many vertices, start a new mesh;
      if (vertices.length > 65000) {
        // finalize the old mesh
        mesh.triangles = triangles;
        mesh.vertices = vertices;
        mesh.colors = colors;
        mesh.computeWireframe();
        mesh.computeNormals();

        if (mesh.vertices.length) {
          meshes.push(mesh);
        }

        // start a new mesh
        mesh = new GL.Mesh({ normals: true, colors: true });
        triangles = [];
        colors = [];
        vertices = [];
      }
    }
    // finalize last mesh
    mesh.triangles = triangles;
    mesh.vertices = vertices;
    mesh.colors = colors;
    mesh.computeWireframe();
    mesh.computeNormals();

    if (mesh.vertices.length) {
      meshes.push(mesh);
    }

    return meshes;
  }
};

module.exports = LightGLEngine;

},{"./jscad-viewer-helpers":1,"./lightgl":3,"most-gestures":7}],3:[function(require,module,exports){
'use strict';

/*
 * lightgl.js
 * http://github.com/evanw/lightgl.js/
 *
 * Copyright 2011 Evan Wallace
 * Released under the MIT license
 */
var GL = function () {

	// src/texture.js
	// Provides a simple wrapper around WebGL textures that supports render-to-texture.
	// ### new GL.Texture(width, height[, options])
	//
	// The arguments `width` and `height` give the size of the texture in texels.
	// WebGL texture dimensions must be powers of two unless `filter` is set to
	// either `gl.NEAREST` or `gl.LINEAR` and `wrap` is set to `gl.CLAMP_TO_EDGE`
	// (which they are by default).
	//
	// Texture parameters can be passed in via the `options` argument.
	// Example usage:
	//
	//     var t = new GL.Texture(256, 256, {
	//       // Defaults to gl.LINEAR, set both at once with "filter"
	//       magFilter: gl.NEAREST,
	//       minFilter: gl.LINEAR,
	//
	//       // Defaults to gl.CLAMP_TO_EDGE, set both at once with "wrap"
	//       wrapS: gl.REPEAT,
	//       wrapT: gl.REPEAT,
	//
	//       format: gl.RGB, // Defaults to gl.RGBA
	//       type: gl.FLOAT // Defaults to gl.UNSIGNED_BYTE
	//     });


	function Texture(width, height, options) {
		options = options || {};
		this.id = gl.createTexture();
		this.width = width;
		this.height = height;
		this.format = options.format || gl.RGBA;
		this.type = options.type || gl.UNSIGNED_BYTE;
		gl.bindTexture(gl.TEXTURE_2D, this.id);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, options.filter || options.magFilter || gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, options.filter || options.minFilter || gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, options.wrap || options.wrapS || gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, options.wrap || options.wrapT || gl.CLAMP_TO_EDGE);
		gl.texImage2D(gl.TEXTURE_2D, 0, this.format, width, height, 0, this.format, this.type, null);
	}

	var framebuffer;
	var renderbuffer;
	var checkerboardCanvas;

	Texture.prototype = {
		// ### .bind([unit])
		//
		// Bind this texture to the given texture unit (0-7, defaults to 0).
		bind: function bind(unit) {
			gl.activeTexture(gl.TEXTURE0 + (unit || 0));
			gl.bindTexture(gl.TEXTURE_2D, this.id);
		},

		// ### .unbind([unit])
		//
		// Clear the given texture unit (0-7, defaults to 0).
		unbind: function unbind(unit) {
			gl.activeTexture(gl.TEXTURE0 + (unit || 0));
			gl.bindTexture(gl.TEXTURE_2D, null);
		},

		// ### .drawTo(callback[, options])
		//
		// Render all draw calls in `callback` to this texture. This method
		// sets up a framebuffer with this texture as the color attachment
		// and a renderbuffer as the depth attachment.  The viewport is
		// temporarily changed to the size of the texture.
		//
		// The depth buffer can be omitted via `options` as shown in the
		// example below:
		//
		//     texture.drawTo(function() {
		//       gl.clearColor(1, 0, 0, 1);
		//       gl.clear(gl.COLOR_BUFFER_BIT);
		//     }, { depth: false });
		drawTo: function drawTo(callback, options) {

			options = options || {};
			var v = gl.getParameter(gl.VIEWPORT);
			gl.viewport(0, 0, this.width, this.height);

			framebuffer = framebuffer || gl.createFramebuffer();
			gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.id, 0);

			if (options.depth !== false) {
				renderbuffer = renderbuffer || gl.createRenderbuffer();
				gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
				if (this.width != renderbuffer.width || this.height != renderbuffer.height) {
					renderbuffer.width = this.width;
					renderbuffer.height = this.height;
					gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.width, this.height);
				}
				gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);
			}

			callback();

			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			gl.bindRenderbuffer(gl.RENDERBUFFER, null);
			gl.viewport(v[0], v[1], v[2], v[3]);
		},

		// ### .swapWith(other)
		//
		// Switch this texture with `other`, useful for the ping-pong rendering
		// technique used in multi-stage rendering.
		swapWith: function swapWith(other) {
			var temp;
			temp = other.id;
			other.id = this.id;
			this.id = temp;
			temp = other.width;
			other.width = this.width;
			this.width = temp;
			temp = other.height;
			other.height = this.height;
			this.height = temp;
		}
	};

	// ### GL.Texture.fromImage(image[, options])
	//
	// Return a new image created from `image`, an `<img>` tag.
	Texture.fromImage = function (image, options) {
		options = options || {};
		var texture = new Texture(image.width, image.height, options);
		try {
			gl.texImage2D(gl.TEXTURE_2D, 0, texture.format, texture.format, texture.type, image);
		} catch (e) {
			if (window.location.protocol == 'file:') {
				throw 'image not loaded for security reasons (serve this page over "http://" instead)';
			} else {
				throw 'image not loaded for security reasons (image must originate from the same ' + 'domain as this page or use Cross-Origin Resource Sharing)';
			}
		}
		if (options.minFilter && options.minFilter != gl.NEAREST && options.minFilter != gl.LINEAR) {
			gl.generateMipmap(gl.TEXTURE_2D);
		}
		return texture;
	};

	// ### GL.Texture.fromURL(url[, options])
	//
	// Returns a checkerboard texture that will switch to the correct texture when
	// it loads.
	Texture.fromURL = function (url, options) {
		checkerboardCanvas = checkerboardCanvas || function () {
			var c = document.createElement('canvas').getContext('2d');
			c.canvas.width = c.canvas.height = 128;
			for (var y = 0; y < c.canvas.height; y += 16) {
				for (var x = 0; x < c.canvas.width; x += 16) {
					c.fillStyle = (x ^ y) & 16 ? '#FFF' : '#DDD';
					c.fillRect(x, y, 16, 16);
				}
			}
			return c.canvas;
		}();
		var texture = Texture.fromImage(checkerboardCanvas, options);
		var image = new Image();
		var context = gl;
		image.onload = function () {
			context.makeCurrent();
			Texture.fromImage(image, options).swapWith(texture);
		};
		image.src = url;
		return texture;
	};

	// src/mesh.js
	// Represents indexed triangle geometry with arbitrary additional attributes.
	// You need a shader to draw a mesh; meshes can't draw themselves.
	//
	// A mesh is a collection of `GL.Buffer` objects which are either vertex buffers
	// (holding per-vertex attributes) or index buffers (holding the order in which
	// vertices are rendered). By default, a mesh has a position vertex buffer called
	// `vertices` and a triangle index buffer called `triangles`. New buffers can be
	// added using `addVertexBuffer()` and `addIndexBuffer()`. Two strings are
	// required when adding a new vertex buffer, the name of the data array on the
	// mesh instance and the name of the GLSL attribute in the vertex shader.
	//
	// Example usage:
	//
	//     var mesh = new GL.Mesh({ coords: true, lines: true });
	//
	//     // Default attribute "vertices", available as "gl_Vertex" in
	//     // the vertex shader
	//     mesh.vertices = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0]];
	//
	//     // Optional attribute "coords" enabled in constructor,
	//     // available as "gl_TexCoord" in the vertex shader
	//     mesh.coords = [[0, 0], [1, 0], [0, 1], [1, 1]];
	//
	//     // Custom attribute "weights", available as "weight" in the
	//     // vertex shader
	//     mesh.addVertexBuffer('weights', 'weight');
	//     mesh.weights = [1, 0, 0, 1];
	//
	//     // Default index buffer "triangles"
	//     mesh.triangles = [[0, 1, 2], [2, 1, 3]];
	//
	//     // Optional index buffer "lines" enabled in constructor
	//     mesh.lines = [[0, 1], [0, 2], [1, 3], [2, 3]];
	//
	//     // Upload provided data to GPU memory
	//     mesh.compile();
	// ### new GL.Indexer()
	//
	// Generates indices into a list of unique objects from a stream of objects
	// that may contain duplicates. This is useful for generating compact indexed
	// meshes from unindexed data.


	function Indexer() {
		this.unique = [];
		this.indices = [];
		this.map = {};
	}

	Indexer.prototype = {
		// ### .add(v)
		//
		// Adds the object `obj` to `unique` if it hasn't already been added. Returns
		// the index of `obj` in `unique`.
		add: function add(obj) {
			var key = JSON.stringify(obj);
			if (!(key in this.map)) {
				this.map[key] = this.unique.length;
				this.unique.push(obj);
			}
			return this.map[key];
		}
	};

	// ### new GL.Buffer(target, type)
	//
	// Provides a simple method of uploading data to a GPU buffer. Example usage:
	//
	//     var vertices = new GL.Buffer(gl.ARRAY_BUFFER, Float32Array);
	//     var indices = new GL.Buffer(gl.ELEMENT_ARRAY_BUFFER, Uint16Array);
	//     vertices.data = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0]];
	//     indices.data = [[0, 1, 2], [2, 1, 3]];
	//     vertices.compile();
	//     indices.compile();
	//


	function Buffer(target, type) {
		this.buffer = null;
		this.target = target;
		this.type = type;
		this.data = [];
	}

	Buffer.prototype = {
		// ### .compile(type)
		//
		// Upload the contents of `data` to the GPU in preparation for rendering. The
		// data must be a list of lists where each inner list has the same length. For
		// example, each element of data for vertex normals would be a list of length three.
		// This will remember the data length and element length for later use by shaders.
		// The type can be either `gl.STATIC_DRAW` or `gl.DYNAMIC_DRAW`, and defaults to
		// `gl.STATIC_DRAW`.
		//
		// This could have used `[].concat.apply([], this.data)` to flatten
		// the array but Google Chrome has a maximum number of arguments so the
		// concatenations are chunked to avoid that limit.
		compile: function compile(type) {
			var data = [];
			for (var i = 0, chunk = 10000; i < this.data.length; i += chunk) {
				data = Array.prototype.concat.apply(data, this.data.slice(i, i + chunk));
			}
			var spacing = this.data.length ? data.length / this.data.length : 0;
			if (spacing != Math.round(spacing)) throw 'buffer elements not of consistent size, average size is ' + spacing;
			this.buffer = this.buffer || gl.createBuffer();
			this.buffer.length = data.length;
			this.buffer.spacing = spacing;
			gl.bindBuffer(this.target, this.buffer);
			gl.bufferData(this.target, new this.type(data), type || gl.STATIC_DRAW);
		}
	};

	// ### new GL.Mesh([options])
	//
	// Represents a collection of vertex buffers and index buffers. Each vertex
	// buffer maps to one attribute in GLSL and has a corresponding property set
	// on the Mesh instance. There is one vertex buffer by default: `vertices`,
	// which maps to `gl_Vertex`. The `coords`, `normals`, and `colors` vertex
	// buffers map to `gl_TexCoord`, `gl_Normal`, and `gl_Color` respectively,
	// and can be enabled by setting the corresponding options to true. There are
	// two index buffers, `triangles` and `lines`, which are used for rendering
	// `gl.TRIANGLES` and `gl.LINES`, respectively. Only `triangles` is enabled by
	// default, although `computeWireframe()` will add a normal buffer if it wasn't
	// initially enabled.


	function Mesh(options) {
		options = options || {};
		this.vertexBuffers = {};
		this.indexBuffers = {};
		this.addVertexBuffer('vertices', 'gl_Vertex');
		if (options.coords) this.addVertexBuffer('coords', 'gl_TexCoord');
		if (options.normals) this.addVertexBuffer('normals', 'gl_Normal');
		if (options.colors) this.addVertexBuffer('colors', 'gl_Color');
		if (!('triangles' in options) || options.triangles) this.addIndexBuffer('triangles');
		if (options.lines) this.addIndexBuffer('lines');
	}

	Mesh.prototype = {
		// ### .addVertexBuffer(name, attribute)
		//
		// Add a new vertex buffer with a list as a property called `name` on this object
		// and map it to the attribute called `attribute` in all shaders that draw this mesh.
		addVertexBuffer: function addVertexBuffer(name, attribute) {
			var buffer = this.vertexBuffers[attribute] = new Buffer(gl.ARRAY_BUFFER, Float32Array);
			buffer.name = name;
			this[name] = [];
		},

		// ### .addIndexBuffer(name)
		//
		// Add a new index buffer with a list as a property called `name` on this object.
		addIndexBuffer: function addIndexBuffer(name) {
			this.indexBuffers[name] = new Buffer(gl.ELEMENT_ARRAY_BUFFER, Uint16Array);
			this[name] = [];
		},

		// ### .compile()
		//
		// Upload all attached buffers to the GPU in preparation for rendering. This
		// doesn't need to be called every frame, only needs to be done when the data
		// changes.
		compile: function compile() {
			for (var attribute in this.vertexBuffers) {
				var buffer = this.vertexBuffers[attribute];
				buffer.data = this[buffer.name];
				buffer.compile();
			}

			for (var name in this.indexBuffers) {
				var buffer = this.indexBuffers[name];
				buffer.data = this[name];
				buffer.compile();
			}
		},

		// ### .transform(matrix)
		//
		// Transform all vertices by `matrix` and all normals by the inverse transpose
		// of `matrix`.
		transform: function transform(matrix) {
			this.vertices = this.vertices.map(function (v) {
				return matrix.transformPoint(Vector.fromArray(v)).toArray();
			});
			if (this.normals) {
				var invTrans = matrix.inverse().transpose();
				this.normals = this.normals.map(function (n) {
					return invTrans.transformVector(Vector.fromArray(n)).unit().toArray();
				});
			}
			this.compile();
			return this;
		},

		// ### .computeNormals()
		//
		// Computes a new normal for each vertex from the average normal of the
		// neighboring triangles. This means adjacent triangles must share vertices
		// for the resulting normals to be smooth.
		computeNormals: function computeNormals() {
			if (!this.normals) this.addVertexBuffer('normals', 'gl_Normal');
			for (var i = 0; i < this.vertices.length; i++) {
				this.normals[i] = new Vector();
			}
			for (var i = 0; i < this.triangles.length; i++) {
				var t = this.triangles[i];
				var a = Vector.fromArray(this.vertices[t[0]]);
				var b = Vector.fromArray(this.vertices[t[1]]);
				var c = Vector.fromArray(this.vertices[t[2]]);
				var normal = b.subtract(a).cross(c.subtract(a)).unit();
				this.normals[t[0]] = this.normals[t[0]].add(normal);
				this.normals[t[1]] = this.normals[t[1]].add(normal);
				this.normals[t[2]] = this.normals[t[2]].add(normal);
			}
			for (var i = 0; i < this.vertices.length; i++) {
				this.normals[i] = this.normals[i].unit().toArray();
			}
			this.compile();
			return this;
		},

		// ### .computeWireframe()
		//
		// Populate the `lines` index buffer from the `triangles` index buffer.
		computeWireframe: function computeWireframe() {
			var indexer = new Indexer();
			for (var i = 0; i < this.triangles.length; i++) {
				var t = this.triangles[i];
				for (var j = 0; j < t.length; j++) {
					var a = t[j],
					    b = t[(j + 1) % t.length];
					indexer.add([Math.min(a, b), Math.max(a, b)]);
				}
			}
			if (!this.lines) this.addIndexBuffer('lines');
			this.lines = indexer.unique;
			this.compile();
			return this;
		},

		// ### .getAABB()
		//
		// Computes the axis-aligned bounding box, which is an object whose `min` and
		// `max` properties contain the minimum and maximum coordinates of all vertices.
		getAABB: function getAABB() {
			var aabb = {
				min: new Vector(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE)
			};
			aabb.max = aabb.min.negative();
			for (var i = 0; i < this.vertices.length; i++) {
				var v = Vector.fromArray(this.vertices[i]);
				aabb.min = Vector.min(aabb.min, v);
				aabb.max = Vector.max(aabb.max, v);
			}
			return aabb;
		},

		// ### .getBoundingSphere()
		//
		// Computes a sphere that contains all vertices (not necessarily the smallest
		// sphere). The returned object has two properties, `center` and `radius`.
		getBoundingSphere: function getBoundingSphere() {
			var aabb = this.getAABB();
			var sphere = {
				center: aabb.min.add(aabb.max).divide(2),
				radius: 0
			};
			for (var i = 0; i < this.vertices.length; i++) {
				sphere.radius = Math.max(sphere.radius, Vector.fromArray(this.vertices[i]).subtract(sphere.center).length());
			}
			return sphere;
		}
	};

	// ### GL.Mesh.plane([options])
	//
	// Generates a square 2x2 mesh the xy plane centered at the origin. The
	// `options` argument specifies options to pass to the mesh constructor.
	// Additional options include `detailX` and `detailY`, which set the tesselation
	// in x and y, and `detail`, which sets both `detailX` and `detailY` at once.
	// Two triangles are generated by default.
	// Example usage:
	//
	//     var mesh1 = GL.Mesh.plane();
	//     var mesh2 = GL.Mesh.plane({ detail: 5 });
	//     var mesh3 = GL.Mesh.plane({ detailX: 20, detailY: 40 });
	//
	Mesh.plane = function (options) {
		options = options || {};
		var mesh = new Mesh(options),
		    detailX = options.detailX || options.detail || 1,
		    detailY = options.detailY || options.detail || 1;

		for (var y = 0; y <= detailY; y++) {
			var t = y / detailY;
			for (var x = 0; x <= detailX; x++) {
				var s = x / detailX;
				mesh.vertices.push([2 * s - 1, 2 * t - 1, 0]);
				if (mesh.coords) mesh.coords.push([s, t]);
				if (mesh.normals) mesh.normals.push([0, 0, 1]);
				if (x < detailX && y < detailY) {
					var i = x + y * (detailX + 1);
					mesh.triangles.push([i, i + 1, i + detailX + 1]);
					mesh.triangles.push([i + detailX + 1, i + 1, i + detailX + 2]);
				}
			}
		}

		mesh.compile();
		return mesh;
	};

	var cubeData = [[0, 4, 2, 6, -1, 0, 0], // -x
	[1, 3, 5, 7, +1, 0, 0], // +x
	[0, 1, 4, 5, 0, -1, 0], // -y
	[2, 6, 3, 7, 0, +1, 0], // +y
	[0, 2, 1, 3, 0, 0, -1], // -z
	[4, 5, 6, 7, 0, 0, +1] // +z
	];

	function pickOctant(i) {
		return new Vector((i & 1) * 2 - 1, (i & 2) - 1, (i & 4) / 2 - 1);
	}

	// ### GL.Mesh.cube([options])
	//
	// Generates a 2x2x2 box centered at the origin. The `options` argument
	// specifies options to pass to the mesh constructor.
	Mesh.cube = function (options) {
		var mesh = new Mesh(options);

		for (var i = 0; i < cubeData.length; i++) {
			var data = cubeData[i],
			    v = i * 4;
			for (var j = 0; j < 4; j++) {
				var d = data[j];
				mesh.vertices.push(pickOctant(d).toArray());
				if (mesh.coords) mesh.coords.push([j & 1, (j & 2) / 2]);
				if (mesh.normals) mesh.normals.push(data.slice(4, 7));
			}
			mesh.triangles.push([v, v + 1, v + 2]);
			mesh.triangles.push([v + 2, v + 1, v + 3]);
		}

		mesh.compile();
		return mesh;
	};

	// ### GL.Mesh.sphere([options])
	//
	// Generates a geodesic sphere of radius 1. The `options` argument specifies
	// options to pass to the mesh constructor in addition to the `detail` option,
	// which controls the tesselation level. The detail is `6` by default.
	// Example usage:
	//
	//     var mesh1 = GL.Mesh.sphere();
	//     var mesh2 = GL.Mesh.sphere({ detail: 2 });
	//
	Mesh.sphere = function (options) {
		function tri(a, b, c) {
			return flip ? [a, c, b] : [a, b, c];
		}

		function fix(x) {
			return x + (x - x * x) / 2;
		}
		options = options || {};
		var mesh = new Mesh(options);
		var indexer = new Indexer(),
		    detail = options.detail || 6;

		for (var octant = 0; octant < 8; octant++) {
			var scale = pickOctant(octant);
			var flip = scale.x * scale.y * scale.z > 0;
			var data = [];
			for (var i = 0; i <= detail; i++) {
				// Generate a row of vertices on the surface of the sphere
				// using barycentric coordinates.
				for (var j = 0; i + j <= detail; j++) {
					var a = i / detail;
					var b = j / detail;
					var c = (detail - i - j) / detail;
					var vertex = {
						vertex: new Vector(fix(a), fix(b), fix(c)).unit().multiply(scale).toArray()
					};
					if (mesh.coords) vertex.coord = scale.y > 0 ? [1 - a, c] : [c, 1 - a];
					data.push(indexer.add(vertex));
				}

				// Generate triangles from this row and the previous row.
				if (i > 0) {
					for (var j = 0; i + j <= detail; j++) {
						var a = (i - 1) * (detail + 1) + (i - 1 - (i - 1) * (i - 1)) / 2 + j;
						var b = i * (detail + 1) + (i - i * i) / 2 + j;
						mesh.triangles.push(tri(data[a], data[a + 1], data[b]));
						if (i + j < detail) {
							mesh.triangles.push(tri(data[b], data[a + 1], data[b + 1]));
						}
					}
				}
			}
		}

		// Reconstruct the geometry from the indexer.
		mesh.vertices = indexer.unique.map(function (v) {
			return v.vertex;
		});
		if (mesh.coords) mesh.coords = indexer.unique.map(function (v) {
			return v.coord;
		});
		if (mesh.normals) mesh.normals = mesh.vertices;
		mesh.compile();
		return mesh;
	};

	// ### GL.Mesh.load(json[, options])
	//
	// Creates a mesh from the JSON generated by the `convert/convert.py` script.
	// Example usage:
	//
	//     var data = {
	//       vertices: [[0, 0, 0], [1, 0, 0], [0, 1, 0]],
	//       triangles: [[0, 1, 2]]
	//     };
	//     var mesh = GL.Mesh.load(data);
	//
	Mesh.load = function (json, options) {
		options = options || {};
		if (!('coords' in options)) options.coords = !!json.coords;
		if (!('normals' in options)) options.normals = !!json.normals;
		if (!('colors' in options)) options.colors = !!json.colors;
		if (!('triangles' in options)) options.triangles = !!json.triangles;
		if (!('lines' in options)) options.lines = !!json.lines;
		var mesh = new Mesh(options);
		mesh.vertices = json.vertices;
		if (mesh.coords) mesh.coords = json.coords;
		if (mesh.normals) mesh.normals = json.normals;
		if (mesh.colors) mesh.colors = json.colors;
		if (mesh.triangles) mesh.triangles = json.triangles;
		if (mesh.lines) mesh.lines = json.lines;
		mesh.compile();
		return mesh;
	};

	// src/vector.js
	// Provides a simple 3D vector class. Vector operations can be done using member
	// functions, which return new vectors, or static functions, which reuse
	// existing vectors to avoid generating garbage.


	function Vector(x, y, z) {
		this.x = x || 0;
		this.y = y || 0;
		this.z = z || 0;
	}

	// ### Instance Methods
	// The methods `add()`, `subtract()`, `multiply()`, and `divide()` can all
	// take either a vector or a number as an argument.
	Vector.prototype = {
		negative: function negative() {
			return new Vector(-this.x, -this.y, -this.z);
		},
		add: function add(v) {
			if (v instanceof Vector) return new Vector(this.x + v.x, this.y + v.y, this.z + v.z);else return new Vector(this.x + v, this.y + v, this.z + v);
		},
		subtract: function subtract(v) {
			if (v instanceof Vector) return new Vector(this.x - v.x, this.y - v.y, this.z - v.z);else return new Vector(this.x - v, this.y - v, this.z - v);
		},
		multiply: function multiply(v) {
			if (v instanceof Vector) return new Vector(this.x * v.x, this.y * v.y, this.z * v.z);else return new Vector(this.x * v, this.y * v, this.z * v);
		},
		divide: function divide(v) {
			if (v instanceof Vector) return new Vector(this.x / v.x, this.y / v.y, this.z / v.z);else return new Vector(this.x / v, this.y / v, this.z / v);
		},
		equals: function equals(v) {
			return this.x == v.x && this.y == v.y && this.z == v.z;
		},
		dot: function dot(v) {
			return this.x * v.x + this.y * v.y + this.z * v.z;
		},
		cross: function cross(v) {
			return new Vector(this.y * v.z - this.z * v.y, this.z * v.x - this.x * v.z, this.x * v.y - this.y * v.x);
		},
		length: function length() {
			return Math.sqrt(this.dot(this));
		},
		unit: function unit() {
			return this.divide(this.length());
		},
		min: function min() {
			return Math.min(Math.min(this.x, this.y), this.z);
		},
		max: function max() {
			return Math.max(Math.max(this.x, this.y), this.z);
		},
		toAngles: function toAngles() {
			return {
				theta: Math.atan2(this.z, this.x),
				phi: Math.asin(this.y / this.length())
			};
		},
		toArray: function toArray(n) {
			return [this.x, this.y, this.z].slice(0, n || 3);
		},
		clone: function clone() {
			return new Vector(this.x, this.y, this.z);
		},
		init: function init(x, y, z) {
			this.x = x;
			this.y = y;
			this.z = z;
			return this;
		}
	};

	// ### Static Methods
	// `Vector.randomDirection()` returns a vector with a length of 1 and a
	// statistically uniform direction. `Vector.lerp()` performs linear
	// interpolation between two vectors.
	Vector.negative = function (a, b) {
		b.x = -a.x;
		b.y = -a.y;
		b.z = -a.z;
		return b;
	};
	Vector.add = function (a, b, c) {
		if (b instanceof Vector) {
			c.x = a.x + b.x;
			c.y = a.y + b.y;
			c.z = a.z + b.z;
		} else {
			c.x = a.x + b;
			c.y = a.y + b;
			c.z = a.z + b;
		}
		return c;
	};
	Vector.subtract = function (a, b, c) {
		if (b instanceof Vector) {
			c.x = a.x - b.x;
			c.y = a.y - b.y;
			c.z = a.z - b.z;
		} else {
			c.x = a.x - b;
			c.y = a.y - b;
			c.z = a.z - b;
		}
		return c;
	};
	Vector.multiply = function (a, b, c) {
		if (b instanceof Vector) {
			c.x = a.x * b.x;
			c.y = a.y * b.y;
			c.z = a.z * b.z;
		} else {
			c.x = a.x * b;
			c.y = a.y * b;
			c.z = a.z * b;
		}
		return c;
	};
	Vector.divide = function (a, b, c) {
		if (b instanceof Vector) {
			c.x = a.x / b.x;
			c.y = a.y / b.y;
			c.z = a.z / b.z;
		} else {
			c.x = a.x / b;
			c.y = a.y / b;
			c.z = a.z / b;
		}
		return c;
	};
	Vector.cross = function (a, b, c) {
		c.x = a.y * b.z - a.z * b.y;
		c.y = a.z * b.x - a.x * b.z;
		c.z = a.x * b.y - a.y * b.x;
		return c;
	};
	Vector.unit = function (a, b) {
		var length = a.length();
		b.x = a.x / length;
		b.y = a.y / length;
		b.z = a.z / length;
		return b;
	};
	Vector.fromAngles = function (theta, phi) {
		return new Vector(Math.cos(theta) * Math.cos(phi), Math.sin(phi), Math.sin(theta) * Math.cos(phi));
	};
	Vector.randomDirection = function () {
		return Vector.fromAngles(Math.random() * Math.PI * 2, Math.asin(Math.random() * 2 - 1));
	};
	Vector.min = function (a, b) {
		return new Vector(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.min(a.z, b.z));
	};
	Vector.max = function (a, b) {
		return new Vector(Math.max(a.x, b.x), Math.max(a.y, b.y), Math.max(a.z, b.z));
	};
	Vector.lerp = function (a, b, fraction) {
		return b.subtract(a).multiply(fraction).add(a);
	};
	Vector.fromArray = function (a) {
		return new Vector(a[0], a[1], a[2]);
	};

	// src/shader.js
	// Provides a convenient wrapper for WebGL shaders. A few uniforms and attributes,
	// prefixed with `gl_`, are automatically added to all shader sources to make
	// simple shaders easier to write.
	//
	// Example usage:
	//
	//     var shader = new GL.Shader('\
	//       void main() {\
	//         gl_Position = gl_ModelViewProjectionMatrix * gl_Vertex;\
	//       }\
	//     ', '\
	//       uniform vec4 color;\
	//       void main() {\
	//         gl_FragColor = color;\
	//       }\
	//     ');
	//
	//     shader.uniforms({
	//       color: [1, 0, 0, 1]
	//     }).draw(mesh);

	function regexMap(regex, text, callback) {
		var result;
		while ((result = regex.exec(text)) !== null) {
			callback(result);
		}
	}

	// Non-standard names beginning with `gl_` must be mangled because they will
	// otherwise cause a compiler error.
	var LIGHTGL_PREFIX = 'LIGHTGL';

	// ### new GL.Shader(vertexSource, fragmentSource)
	//
	// Compiles a shader program using the provided vertex and fragment shaders.


	function Shader(vertexSource, fragmentSource) {
		// Allow passing in the id of an HTML script tag with the source


		function followScriptTagById(id) {
			var element = document.getElementById(id);
			return element ? element.text : id;
		}
		vertexSource = followScriptTagById(vertexSource);
		fragmentSource = followScriptTagById(fragmentSource);

		// Headers are prepended to the sources to provide some automatic functionality.
		var header = '\
    uniform mat3 gl_NormalMatrix;\
    uniform mat4 gl_ModelViewMatrix;\
    uniform mat4 gl_ProjectionMatrix;\
    uniform mat4 gl_ModelViewProjectionMatrix;\
    uniform mat4 gl_ModelViewMatrixInverse;\
    uniform mat4 gl_ProjectionMatrixInverse;\
    uniform mat4 gl_ModelViewProjectionMatrixInverse;\
  ';
		var vertexHeader = header + '\
    attribute vec4 gl_Vertex;\
    attribute vec4 gl_TexCoord;\
    attribute vec3 gl_Normal;\
    attribute vec4 gl_Color;\
    vec4 ftransform() {\
      return gl_ModelViewProjectionMatrix * gl_Vertex;\
    }\
  ';
		var fragmentHeader = '\
    precision highp float;\
  ' + header;

		// Check for the use of built-in matrices that require expensive matrix
		// multiplications to compute, and record these in `usedMatrices`.
		var source = vertexSource + fragmentSource;
		var usedMatrices = {};
		regexMap(/\b(gl_[^;]*)\b;/g, header, function (groups) {
			var name = groups[1];
			if (source.indexOf(name) != -1) {
				var capitalLetters = name.replace(/[a-z_]/g, '');
				usedMatrices[capitalLetters] = LIGHTGL_PREFIX + name;
			}
		});
		if (source.indexOf('ftransform') != -1) usedMatrices.MVPM = LIGHTGL_PREFIX + 'gl_ModelViewProjectionMatrix';
		this.usedMatrices = usedMatrices;

		// The `gl_` prefix must be substituted for something else to avoid compile
		// errors, since it's a reserved prefix. This prefixes all reserved names with
		// `_`. The header is inserted after any extensions, since those must come
		// first.


		function fix(header, source) {
			var replaced = {};
			var match = /^((\s*\/\/.*\n|\s*#extension.*\n)+)\^*$/.exec(source);
			source = match ? match[1] + header + source.substr(match[1].length) : header + source;
			regexMap(/\bgl_\w+\b/g, header, function (result) {
				if (!(result in replaced)) {
					source = source.replace(new RegExp('\\b' + result + '\\b', 'g'), LIGHTGL_PREFIX + result);
					replaced[result] = true;
				}
			});
			return source;
		}
		vertexSource = fix(vertexHeader, vertexSource);
		fragmentSource = fix(fragmentHeader, fragmentSource);

		// Compile and link errors are thrown as strings.


		function compileSource(type, source) {
			var shader = gl.createShader(type);
			gl.shaderSource(shader, source);
			gl.compileShader(shader);
			if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
				throw 'compile error: ' + gl.getShaderInfoLog(shader);
			}
			return shader;
		}
		this.program = gl.createProgram();
		gl.attachShader(this.program, compileSource(gl.VERTEX_SHADER, vertexSource));
		gl.attachShader(this.program, compileSource(gl.FRAGMENT_SHADER, fragmentSource));
		gl.linkProgram(this.program);
		if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
			throw 'link error: ' + gl.getProgramInfoLog(this.program);
		}
		this.attributes = {};
		this.uniformLocations = {};

		// Sampler uniforms need to be uploaded using `gl.uniform1i()` instead of `gl.uniform1f()`.
		// To do this automatically, we detect and remember all uniform samplers in the source code.
		var isSampler = {};
		regexMap(/uniform\s+sampler(1D|2D|3D|Cube)\s+(\w+)\s*;/g, vertexSource + fragmentSource, function (groups) {
			isSampler[groups[2]] = 1;
		});
		this.isSampler = isSampler;
	}

	function isArray(obj) {
		var str = Object.prototype.toString.call(obj);
		return str == '[object Array]' || str == '[object Float32Array]';
	}

	function isNumber(obj) {
		var str = Object.prototype.toString.call(obj);
		return str == '[object Number]' || str == '[object Boolean]';
	}

	Shader.prototype = {
		// ### .uniforms(uniforms)
		//
		// Set a uniform for each property of `uniforms`. The correct `gl.uniform*()` method is
		// inferred from the value types and from the stored uniform sampler flags.
		uniforms: function uniforms(_uniforms) {
			gl.useProgram(this.program);

			for (var name in _uniforms) {
				var location = this.uniformLocations[name] || gl.getUniformLocation(this.program, name);
				if (!location) continue;
				this.uniformLocations[name] = location;
				var value = _uniforms[name];
				if (value instanceof Vector) {
					value = [value.x, value.y, value.z];
				} else if (value instanceof Matrix) {
					value = value.m;
				}
				if (isArray(value)) {
					switch (value.length) {
						case 1:
							gl.uniform1fv(location, new Float32Array(value));
							break;
						case 2:
							gl.uniform2fv(location, new Float32Array(value));
							break;
						case 3:
							gl.uniform3fv(location, new Float32Array(value));
							break;
						case 4:
							gl.uniform4fv(location, new Float32Array(value));
							break;
						// Matrices are automatically transposed, since WebGL uses column-major
						// indices instead of row-major indices.
						case 9:
							gl.uniformMatrix3fv(location, false, new Float32Array([value[0], value[3], value[6], value[1], value[4], value[7], value[2], value[5], value[8]]));
							break;
						case 16:
							gl.uniformMatrix4fv(location, false, new Float32Array([value[0], value[4], value[8], value[12], value[1], value[5], value[9], value[13], value[2], value[6], value[10], value[14], value[3], value[7], value[11], value[15]]));
							break;
						default:
							throw 'don\'t know how to load uniform "' + name + '" of length ' + value.length;
					}
				} else if (isNumber(value)) {
					(this.isSampler[name] ? gl.uniform1i : gl.uniform1f).call(gl, location, value);
				} else {
					throw 'attempted to set uniform "' + name + '" to invalid value ' + value;
				}
			}

			return this;
		},

		// ### .draw(mesh[, mode])
		//
		// Sets all uniform matrix attributes, binds all relevant buffers, and draws the
		// mesh geometry as indexed triangles or indexed lines. Set `mode` to `gl.LINES`
		// (and either add indices to `lines` or call `computeWireframe()`) to draw the
		// mesh in wireframe.
		draw: function draw(mesh, mode) {
			this.drawBuffers(mesh.vertexBuffers, mesh.indexBuffers[mode == gl.LINES ? 'lines' : 'triangles'], arguments.length < 2 ? gl.TRIANGLES : mode);
		},

		// ### .drawBuffers(vertexBuffers, indexBuffer, mode)
		//
		// Sets all uniform matrix attributes, binds all relevant buffers, and draws the
		// indexed mesh geometry. The `vertexBuffers` argument is a map from attribute
		// names to `Buffer` objects of type `gl.ARRAY_BUFFER`, `indexBuffer` is a `Buffer`
		// object of type `gl.ELEMENT_ARRAY_BUFFER`, and `mode` is a WebGL primitive mode
		// like `gl.TRIANGLES` or `gl.LINES`. This method automatically creates and caches
		// vertex attribute pointers for attributes as needed.
		drawBuffers: function drawBuffers(vertexBuffers, indexBuffer, mode) {
			// Only construct up the built-in matrices we need for this shader.
			var used = this.usedMatrices;
			var MVM = gl.modelviewMatrix;
			var PM = gl.projectionMatrix;
			var MVMI = used.MVMI || used.NM ? MVM.inverse() : null;
			var PMI = used.PMI ? PM.inverse() : null;
			var MVPM = used.MVPM || used.MVPMI ? PM.multiply(MVM) : null;
			var matrices = {};
			if (used.MVM) matrices[used.MVM] = MVM;
			if (used.MVMI) matrices[used.MVMI] = MVMI;
			if (used.PM) matrices[used.PM] = PM;
			if (used.PMI) matrices[used.PMI] = PMI;
			if (used.MVPM) matrices[used.MVPM] = MVPM;
			if (used.MVPMI) matrices[used.MVPMI] = MVPM.inverse();
			if (used.NM) {
				var m = MVMI.m;
				matrices[used.NM] = [m[0], m[4], m[8], m[1], m[5], m[9], m[2], m[6], m[10]];
			}
			this.uniforms(matrices);

			// Create and enable attribute pointers as necessary.
			var length = 0;
			for (var attribute in vertexBuffers) {
				var buffer = vertexBuffers[attribute];
				var location = this.attributes[attribute] || gl.getAttribLocation(this.program, attribute.replace(/^(gl_.*)$/, LIGHTGL_PREFIX + '$1'));
				if (location == -1 || !buffer.buffer) continue;
				this.attributes[attribute] = location;
				gl.bindBuffer(gl.ARRAY_BUFFER, buffer.buffer);
				gl.enableVertexAttribArray(location);
				gl.vertexAttribPointer(location, buffer.buffer.spacing, gl.FLOAT, false, 0, 0);
				length = buffer.buffer.length / buffer.buffer.spacing;
			}

			// Disable unused attribute pointers.
			for (var attribute in this.attributes) {
				if (!(attribute in vertexBuffers)) {
					gl.disableVertexAttribArray(this.attributes[attribute]);
				}
			}

			// Draw the geometry.
			if (length && (!indexBuffer || indexBuffer.buffer)) {
				if (indexBuffer) {
					gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer.buffer);
					gl.drawElements(mode, indexBuffer.buffer.length, gl.UNSIGNED_SHORT, 0);
				} else {
					gl.drawArrays(mode, 0, length);
				}
			}

			return this;
		}
	};

	// ### GL.Shader.fromURL(vsURL, fsURL)
	//
	// Compiles a shader program using the provided vertex and fragment
	// shaders. The shaders are loaded synchronously from the given URLs.
	//
	Shader.fromURL = function (vsURL, fsURL) {

		var XMLHttpRequestGet = function XMLHttpRequestGet(uri) {
			var mHttpReq = new XMLHttpRequest();
			mHttpReq.open("GET", uri, false);
			mHttpReq.send(null);
			if (mHttpReq.status !== 200) {
				throw 'could not load ' + uri;
			}
			return mHttpReq.responseText;
		};

		var vsSource = XMLHttpRequestGet(vsURL);
		var fsSource = XMLHttpRequestGet(fsURL);

		return new Shader(vsSource, fsSource);
	};

	Shader.from = function (vsURLorID, fsURLorID) {
		try {
			return new Shader(vsURLorID, fsURLorID);
		} catch (e) {
			return Shader.fromURL(vsURLorID, fsURLorID);
		}
	};

	// src/main.js
	// The internal `gl` variable holds the current WebGL context.
	var gl;

	var GL = {
		// ### Initialization
		//
		// `GL.create()` creates a new WebGL context and augments it with
		// more methods. Uses the HTML canvas given in 'options' or creates
		// a new one if necessary. The alpha channel is disabled by default
		// because it usually causes unintended transparencies in the
		// canvas.
		create: function create(options) {
			options = options || {};
			var canvas = options.canvas;
			if (!canvas) {
				canvas = document.createElement('canvas');
				canvas.width = options.width || 800;
				canvas.height = options.height || 600;
			}
			if (!('alpha' in options)) options.alpha = false;
			try {
				gl = canvas.getContext('webgl', options);
			} catch (e) {}
			try {
				gl = gl || canvas.getContext('experimental-webgl', options);
			} catch (e) {}
			if (!gl) throw 'WebGL not supported';
			addMatrixStack();
			addImmediateMode();
			//addEventListeners();
			addOtherMethods();
			return gl;
		},

		// `GL.keys` contains a mapping of key codes to booleans indicating whether
		// that key is currently pressed.
		keys: {},

		// Export all external classes.
		Matrix: Matrix,
		Indexer: Indexer,
		Buffer: Buffer,
		Mesh: Mesh,
		HitTest: HitTest,
		Raytracer: Raytracer,
		Shader: Shader,
		Texture: Texture,
		Vector: Vector
	};

	// ### Matrix stack
	//
	// Implement the OpenGL modelview and projection matrix stacks, along with some
	// other useful GLU matrix functions.

	function addMatrixStack() {
		gl.MODELVIEW = ENUM | 1;
		gl.PROJECTION = ENUM | 2;
		var tempMatrix = new Matrix();
		var resultMatrix = new Matrix();
		gl.modelviewMatrix = new Matrix();
		gl.projectionMatrix = new Matrix();
		var modelviewStack = [];
		var projectionStack = [];
		var matrix, stack;
		gl.matrixMode = function (mode) {
			switch (mode) {
				case gl.MODELVIEW:
					matrix = 'modelviewMatrix';
					stack = modelviewStack;
					break;
				case gl.PROJECTION:
					matrix = 'projectionMatrix';
					stack = projectionStack;
					break;
				default:
					throw 'invalid matrix mode ' + mode;
			}
		};
		gl.loadIdentity = function () {
			Matrix.identity(gl[matrix]);
		};
		gl.loadMatrix = function (m) {
			var from = m.m,
			    to = gl[matrix].m;
			for (var i = 0; i < 16; i++) {
				to[i] = from[i];
			}
		};
		gl.multMatrix = function (m) {
			gl.loadMatrix(Matrix.multiply(gl[matrix], m, resultMatrix));
		};
		gl.perspective = function (fov, aspect, near, far) {
			gl.multMatrix(Matrix.perspective(fov, aspect, near, far, tempMatrix));
		};
		gl.frustum = function (l, r, b, t, n, f) {
			gl.multMatrix(Matrix.frustum(l, r, b, t, n, f, tempMatrix));
		};
		gl.ortho = function (l, r, b, t, n, f) {
			gl.multMatrix(Matrix.ortho(l, r, b, t, n, f, tempMatrix));
		};
		gl.scale = function (x, y, z) {
			gl.multMatrix(Matrix.scale(x, y, z, tempMatrix));
		};
		gl.translate = function (x, y, z) {
			gl.multMatrix(Matrix.translate(x, y, z, tempMatrix));
		};
		gl.rotate = function (a, x, y, z) {
			gl.multMatrix(Matrix.rotate(a, x, y, z, tempMatrix));
		};
		gl.lookAt = function (ex, ey, ez, cx, cy, cz, ux, uy, uz) {
			gl.multMatrix(Matrix.lookAt(ex, ey, ez, cx, cy, cz, ux, uy, uz, tempMatrix));
		};
		gl.pushMatrix = function () {
			stack.push(Array.prototype.slice.call(gl[matrix].m));
		};
		gl.popMatrix = function () {
			var m = stack.pop();
			gl[matrix].m = hasFloat32Array ? new Float32Array(m) : m;
		};
		gl.project = function (objX, objY, objZ, modelview, projection, viewport) {
			modelview = modelview || gl.modelviewMatrix;
			projection = projection || gl.projectionMatrix;
			viewport = viewport || gl.getParameter(gl.VIEWPORT);
			var point = projection.transformPoint(modelview.transformPoint(new Vector(objX, objY, objZ)));
			return new Vector(viewport[0] + viewport[2] * (point.x * 0.5 + 0.5), viewport[1] + viewport[3] * (point.y * 0.5 + 0.5), point.z * 0.5 + 0.5);
		};
		gl.unProject = function (winX, winY, winZ, modelview, projection, viewport) {
			modelview = modelview || gl.modelviewMatrix;
			projection = projection || gl.projectionMatrix;
			viewport = viewport || gl.getParameter(gl.VIEWPORT);
			var point = new Vector((winX - viewport[0]) / viewport[2] * 2 - 1, (winY - viewport[1]) / viewport[3] * 2 - 1, winZ * 2 - 1);
			return Matrix.inverse(Matrix.multiply(projection, modelview, tempMatrix), resultMatrix).transformPoint(point);
		};
		gl.matrixMode(gl.MODELVIEW);
	}

	// ### Immediate mode
	//
	// Provide an implementation of OpenGL's deprecated immediate mode. This is
	// depricated for a reason: constantly re-specifying the geometry is a bad
	// idea for performance. You should use a `GL.Mesh` instead, which specifies
	// the geometry once and caches it on the graphics card. Still, nothing
	// beats a quick `gl.begin(gl.POINTS); gl.vertex(1, 2, 3); gl.end();` for
	// debugging. This intentionally doesn't implement fixed-function lighting
	// because it's only meant for quick debugging tasks.

	function addImmediateMode() {
		var immediateMode = {
			mesh: new Mesh({
				coords: true,
				colors: true,
				triangles: false
			}),
			mode: -1,
			coord: [0, 0, 0, 0],
			color: [1, 1, 1, 1],
			pointSize: 1,
			shader: new Shader('\
      uniform float pointSize;\
      varying vec4 color;\
      varying vec4 coord;\
      void main() {\
        color = gl_Color;\
        coord = gl_TexCoord;\
        gl_Position = gl_ModelViewProjectionMatrix * gl_Vertex;\
        gl_PointSize = pointSize;\
      }\
    ', '\
      uniform sampler2D texture;\
      uniform float pointSize;\
      uniform bool useTexture;\
      varying vec4 color;\
      varying vec4 coord;\
      void main() {\
        gl_FragColor = color;\
        if (useTexture) gl_FragColor *= texture2D(texture, coord.xy);\
      }\
    ')
		};
		gl.pointSize = function (pointSize) {
			immediateMode.shader.uniforms({
				pointSize: pointSize
			});
		};
		gl.begin = function (mode) {
			if (immediateMode.mode != -1) throw 'mismatched gl.begin() and gl.end() calls';
			immediateMode.mode = mode;
			immediateMode.mesh.colors = [];
			immediateMode.mesh.coords = [];
			immediateMode.mesh.vertices = [];
		};
		gl.color = function (r, g, b, a) {
			immediateMode.color = arguments.length == 1 ? r.toArray().concat(1) : [r, g, b, a || 1];
		};
		gl.texCoord = function (s, t) {
			immediateMode.coord = arguments.length == 1 ? s.toArray(2) : [s, t];
		};
		gl.vertex = function (x, y, z) {
			immediateMode.mesh.colors.push(immediateMode.color);
			immediateMode.mesh.coords.push(immediateMode.coord);
			immediateMode.mesh.vertices.push(arguments.length == 1 ? x.toArray() : [x, y, z]);
		};
		gl.end = function () {
			if (immediateMode.mode == -1) throw 'mismatched gl.begin() and gl.end() calls';
			immediateMode.mesh.compile();
			immediateMode.shader.uniforms({
				useTexture: !!gl.getParameter(gl.TEXTURE_BINDING_2D)
			}).draw(immediateMode.mesh, immediateMode.mode);
			immediateMode.mode = -1;
		};
	}

	// ### Improved mouse events
	//
	// This adds event listeners on the `gl.canvas` element that call
	// `gl.onmousedown()`, `gl.onmousemove()`, and `gl.onmouseup()` with an
	// augmented event object. The event object also has the properties `x`, `y`,
	// `deltaX`, `deltaY`, and `dragging`.


	function addEventListeners() {
		console.log('adding event listeners');

		var context = gl,
		    oldX = 0,
		    oldY = 0,
		    buttons = {},
		    hasOld = false;
		var has = Object.prototype.hasOwnProperty;

		function isDragging() {
			for (var b in buttons) {
				if (has.call(buttons, b) && buttons[b]) return true;
			}
			return false;
		}

		function augment(original) {
			// Make a copy of original, a native `MouseEvent`, so we can overwrite
			// WebKit's non-standard read-only `x` and `y` properties (which are just
			// duplicates of `pageX` and `pageY`). We can't just use
			// `Object.create(original)` because some `MouseEvent` functions must be
			// called in the context of the original event object.
			var e = {};
			for (var name in original) {
				if (typeof original[name] == 'function') {
					e[name] = function (callback) {
						return function () {
							callback.apply(original, arguments);
						};
					}(original[name]);
				} else {
					e[name] = original[name];
				}
			}
			e.original = original;
			e.x = e.pageX;
			e.y = e.pageY;
			for (var obj = gl.canvas; obj; obj = obj.offsetParent) {
				e.x -= obj.offsetLeft;
				e.y -= obj.offsetTop;
			}
			if (hasOld) {
				e.deltaX = e.x - oldX;
				e.deltaY = e.y - oldY;
			} else {
				e.deltaX = 0;
				e.deltaY = 0;
				hasOld = true;
			}
			oldX = e.x;
			oldY = e.y;
			e.dragging = isDragging();
			e.preventDefault = function () {
				e.original.preventDefault();
			};
			e.stopPropagation = function () {
				e.original.stopPropagation();
			};
			return e;
		}

		function augmentTouchEvent(original) {
			var e = {};
			for (var name in original) {
				if (typeof original[name] == 'function') {
					e[name] = function (callback) {
						return function () {
							callback.apply(original, arguments);
						};
					}(original[name]);
				} else {
					e[name] = original[name];
				}
			}
			e.original = original;

			if (e.targetTouches.length > 0) {
				var touch = e.targetTouches[0];
				e.x = touch.pageX;
				e.y = touch.pageY;

				for (var obj = gl.canvas; obj; obj = obj.offsetParent) {
					e.x -= obj.offsetLeft;
					e.y -= obj.offsetTop;
				}
				if (hasOld) {
					e.deltaX = e.x - oldX;
					e.deltaY = e.y - oldY;
				} else {
					e.deltaX = 0;
					e.deltaY = 0;
					hasOld = true;
				}
				oldX = e.x;
				oldY = e.y;
				e.dragging = true;
			}

			e.preventDefault = function () {
				e.original.preventDefault();
			};
			e.stopPropagation = function () {
				e.original.stopPropagation();
			};
			return e;
		}

		function mousedown(e) {
			gl = context;
			if (!isDragging()) {
				// Expand the event handlers to the document to handle dragging off canvas.
				on(document, 'mousemove', mousemove);
				on(document, 'mouseup', mouseup);
				off(gl.canvas, 'mousemove', mousemove);
				off(gl.canvas, 'mouseup', mouseup);
			}
			buttons[e.which] = true;
			e = augment(e);
			if (gl.onmousedown) gl.onmousedown(e);
			e.preventDefault();
		}

		function mousemove(e) {
			console.log('mousemove', e);
			gl = context;
			e = augment(e);
			if (gl.onmousemove) gl.onmousemove(e);
			e.preventDefault();
		}

		function mouseup(e) {
			gl = context;
			buttons[e.which] = false;
			if (!isDragging()) {
				// Shrink the event handlers back to the canvas when dragging ends.
				off(document, 'mousemove', mousemove);
				off(document, 'mouseup', mouseup);
				on(gl.canvas, 'mousemove', mousemove);
				on(gl.canvas, 'mouseup', mouseup);
			}
			e = augment(e);
			if (gl.onmouseup) gl.onmouseup(e);
			e.preventDefault();
		}

		function mousewheel(e) {
			gl = context;
			e = augment(e);
			if (gl.onmousewheel) gl.onmousewheel(e);
			e.preventDefault();
		}

		function touchstart(e) {
			resetAll();
			// Expand the event handlers to the document to handle dragging off canvas.
			on(document, 'touchmove', touchmove);
			on(document, 'touchend', touchend);
			off(gl.canvas, 'touchmove', touchmove);
			off(gl.canvas, 'touchend', touchend);
			gl = context;
			e = augmentTouchEvent(e);
			if (gl.ontouchstart) gl.ontouchstart(e);
			e.preventDefault();
		}

		function touchmove(e) {
			gl = context;
			if (e.targetTouches.length === 0) {
				touchend(e);
			}
			e = augmentTouchEvent(e);
			if (gl.ontouchmove) gl.ontouchmove(e);
			e.preventDefault();
		}

		function touchend(e) {
			// Shrink the event handlers back to the canvas when dragging ends.
			off(document, 'touchmove', touchmove);
			off(document, 'touchend', touchend);
			on(gl.canvas, 'touchmove', touchmove);
			on(gl.canvas, 'touchend', touchend);
			gl = context;
			e = augmentTouchEvent(e);
			if (gl.ontouchend) gl.ontouchend(e);
			e.preventDefault();
		}

		function reset() {
			hasOld = false;
		}

		function resetAll() {
			buttons = {};
			hasOld = false;
		}

		// We can keep mouse and touch events enabled at the same time,
		// because Google Chrome will apparently never fire both of them.
		on(gl.canvas, 'mousedown', mousedown);
		on(gl.canvas, 'mousemove', mousemove);
		on(gl.canvas, 'mouseup', mouseup);
		on(gl.canvas, 'mousewheel', mousewheel);
		on(gl.canvas, 'DOMMouseScroll', mousewheel);
		on(gl.canvas, 'mouseover', reset);
		on(gl.canvas, 'mouseout', reset);
		on(gl.canvas, 'touchstart', touchstart);
		on(gl.canvas, 'touchmove', touchmove);
		on(gl.canvas, 'touchend', touchend);
		on(document, 'contextmenu', resetAll);
	}

	// ### Automatic keyboard state
	//
	// The current keyboard state is stored in `GL.keys`, a map of integer key
	// codes to booleans indicating whether that key is currently pressed. Certain
	// keys also have named identifiers that can be used directly, such as
	// `GL.keys.SPACE`. Values in `GL.keys` are initially undefined until that
	// key is pressed for the first time. If you need a boolean value, you can
	// cast the value to boolean by applying the not operator twice (as in
	// `!!GL.keys.SPACE`).

	function mapKeyCode(code) {
		var named = {
			8: 'BACKSPACE',
			9: 'TAB',
			13: 'ENTER',
			16: 'SHIFT',
			27: 'ESCAPE',
			32: 'SPACE',
			37: 'LEFT',
			38: 'UP',
			39: 'RIGHT',
			40: 'DOWN'
		};
		return named[code] || (code >= 65 && code <= 90 ? String.fromCharCode(code) : null);
	}

	function on(element, name, callback) {
		element.addEventListener(name, callback);
	}

	function off(element, name, callback) {
		element.removeEventListener(name, callback);
	}

	on(document, 'keydown', function (e) {
		if (!e.altKey && !e.ctrlKey && !e.metaKey) {
			var key = mapKeyCode(e.keyCode);
			if (key) GL.keys[key] = true;
			GL.keys[e.keyCode] = true;
		}
	});

	on(document, 'keyup', function (e) {
		if (!e.altKey && !e.ctrlKey && !e.metaKey) {
			var key = mapKeyCode(e.keyCode);
			if (key) GL.keys[key] = false;
			GL.keys[e.keyCode] = false;
		}
	});

	function addOtherMethods() {
		// ### Multiple contexts
		//
		// When using multiple contexts in one web page, `gl.makeCurrent()` must be
		// called before issuing commands to a different context.
		(function (context) {
			gl.makeCurrent = function () {
				gl = context;
			};
		})(gl);

		// ### Animation
		//
		// Call `gl.animate()` to provide an animation loop that repeatedly calls
		// `gl.onupdate()` and `gl.ondraw()`.
		gl.animate = function () {
			var post = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || function (callback) {
				setTimeout(callback, 1000 / 60);
			};
			var time = new Date().getTime();
			var context = gl;

			function update() {
				gl = context;
				var now = new Date().getTime();
				if (gl.onupdate) gl.onupdate((now - time) / 1000);
				if (gl.ondraw) gl.ondraw();
				post(update);
				time = now;
			}
			update();
		};

		// ### Fullscreen
		//
		// Provide an easy way to get a fullscreen app running, including an
		// automatic 3D perspective projection matrix by default. This should be
		// called once.
		//
		// Just fullscreen, no automatic camera:
		//
		//     gl.fullscreen({ camera: false });
		//
		// Adjusting field of view, near plane distance, and far plane distance:
		//
		//     gl.fullscreen({ fov: 45, near: 0.1, far: 1000 });
		//
		// Adding padding from the edge of the window:
		//
		//     gl.fullscreen({ paddingLeft: 250, paddingBottom: 60 });
		//
		gl.fullscreen = function (options) {
			options = options || {};
			var top = options.paddingTop || 0;
			var left = options.paddingLeft || 0;
			var right = options.paddingRight || 0;
			var bottom = options.paddingBottom || 0;
			if (!document.body) {
				throw 'document.body doesn\'t exist yet (call gl.fullscreen() from ' + 'window.onload() or from inside the <body> tag)';
			}
			document.body.appendChild(gl.canvas);
			document.body.style.overflow = 'hidden';
			gl.canvas.style.position = 'absolute';
			gl.canvas.style.left = left + 'px';
			gl.canvas.style.top = top + 'px';

			function resize() {
				gl.canvas.width = window.innerWidth - left - right;
				gl.canvas.height = window.innerHeight - top - bottom;
				gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
				if (options.camera || !('camera' in options)) {
					gl.matrixMode(gl.PROJECTION);
					gl.loadIdentity();
					gl.perspective(options.fov || 45, gl.canvas.width / gl.canvas.height, options.near || 0.1, options.far || 1000);
					gl.matrixMode(gl.MODELVIEW);
				}
				if (gl.onresize) gl.onresize();
				if (gl.ondraw) gl.ondraw();
			}
			on(window, 'resize', resize);
			resize();
		};
	}

	// A value to bitwise-or with new enums to make them distinguishable from the
	// standard WebGL enums.
	var ENUM = 0x12340000;

	// src/matrix.js
	// Represents a 4x4 matrix stored in row-major order that uses Float32Arrays
	// when available. Matrix operations can either be done using convenient
	// methods that return a new matrix for the result or optimized methods
	// that store the result in an existing matrix to avoid generating garbage.
	var hasFloat32Array = typeof Float32Array != 'undefined';

	// ### new GL.Matrix([elements])
	//
	// This constructor takes 16 arguments in row-major order, which can be passed
	// individually, as a list, or even as four lists, one for each row. If the
	// arguments are omitted then the identity matrix is constructed instead.


	function Matrix() {
		var m = Array.prototype.concat.apply([], arguments);
		if (!m.length) {
			m = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
		}
		this.m = hasFloat32Array ? new Float32Array(m) : m;
	}

	Matrix.prototype = {
		// ### .inverse()
		//
		// Returns the matrix that when multiplied with this matrix results in the
		// identity matrix.
		inverse: function inverse() {
			return Matrix.inverse(this, new Matrix());
		},

		// ### .transpose()
		//
		// Returns this matrix, exchanging columns for rows.
		transpose: function transpose() {
			return Matrix.transpose(this, new Matrix());
		},

		// ### .multiply(matrix)
		//
		// Returns the concatenation of the transforms for this matrix and `matrix`.
		// This emulates the OpenGL function `glMultMatrix()`.
		multiply: function multiply(matrix) {
			return Matrix.multiply(this, matrix, new Matrix());
		},

		// ### .transformPoint(point)
		//
		// Transforms the vector as a point with a w coordinate of 1. This
		// means translations will have an effect, for example.
		transformPoint: function transformPoint(v) {
			var m = this.m;
			return new Vector(m[0] * v.x + m[1] * v.y + m[2] * v.z + m[3], m[4] * v.x + m[5] * v.y + m[6] * v.z + m[7], m[8] * v.x + m[9] * v.y + m[10] * v.z + m[11]).divide(m[12] * v.x + m[13] * v.y + m[14] * v.z + m[15]);
		},

		// ### .transformPoint(vector)
		//
		// Transforms the vector as a vector with a w coordinate of 0. This
		// means translations will have no effect, for example.
		transformVector: function transformVector(v) {
			var m = this.m;
			return new Vector(m[0] * v.x + m[1] * v.y + m[2] * v.z, m[4] * v.x + m[5] * v.y + m[6] * v.z, m[8] * v.x + m[9] * v.y + m[10] * v.z);
		}
	};

	// ### GL.Matrix.inverse(matrix[, result])
	//
	// Returns the matrix that when multiplied with `matrix` results in the
	// identity matrix. You can optionally pass an existing matrix in `result`
	// to avoid allocating a new matrix. This implementation is from the Mesa
	// OpenGL function `__gluInvertMatrixd()` found in `project.c`.
	Matrix.inverse = function (matrix, result) {
		result = result || new Matrix();
		var m = matrix.m,
		    r = result.m;

		r[0] = m[5] * m[10] * m[15] - m[5] * m[14] * m[11] - m[6] * m[9] * m[15] + m[6] * m[13] * m[11] + m[7] * m[9] * m[14] - m[7] * m[13] * m[10];
		r[1] = -m[1] * m[10] * m[15] + m[1] * m[14] * m[11] + m[2] * m[9] * m[15] - m[2] * m[13] * m[11] - m[3] * m[9] * m[14] + m[3] * m[13] * m[10];
		r[2] = m[1] * m[6] * m[15] - m[1] * m[14] * m[7] - m[2] * m[5] * m[15] + m[2] * m[13] * m[7] + m[3] * m[5] * m[14] - m[3] * m[13] * m[6];
		r[3] = -m[1] * m[6] * m[11] + m[1] * m[10] * m[7] + m[2] * m[5] * m[11] - m[2] * m[9] * m[7] - m[3] * m[5] * m[10] + m[3] * m[9] * m[6];

		r[4] = -m[4] * m[10] * m[15] + m[4] * m[14] * m[11] + m[6] * m[8] * m[15] - m[6] * m[12] * m[11] - m[7] * m[8] * m[14] + m[7] * m[12] * m[10];
		r[5] = m[0] * m[10] * m[15] - m[0] * m[14] * m[11] - m[2] * m[8] * m[15] + m[2] * m[12] * m[11] + m[3] * m[8] * m[14] - m[3] * m[12] * m[10];
		r[6] = -m[0] * m[6] * m[15] + m[0] * m[14] * m[7] + m[2] * m[4] * m[15] - m[2] * m[12] * m[7] - m[3] * m[4] * m[14] + m[3] * m[12] * m[6];
		r[7] = m[0] * m[6] * m[11] - m[0] * m[10] * m[7] - m[2] * m[4] * m[11] + m[2] * m[8] * m[7] + m[3] * m[4] * m[10] - m[3] * m[8] * m[6];

		r[8] = m[4] * m[9] * m[15] - m[4] * m[13] * m[11] - m[5] * m[8] * m[15] + m[5] * m[12] * m[11] + m[7] * m[8] * m[13] - m[7] * m[12] * m[9];
		r[9] = -m[0] * m[9] * m[15] + m[0] * m[13] * m[11] + m[1] * m[8] * m[15] - m[1] * m[12] * m[11] - m[3] * m[8] * m[13] + m[3] * m[12] * m[9];
		r[10] = m[0] * m[5] * m[15] - m[0] * m[13] * m[7] - m[1] * m[4] * m[15] + m[1] * m[12] * m[7] + m[3] * m[4] * m[13] - m[3] * m[12] * m[5];
		r[11] = -m[0] * m[5] * m[11] + m[0] * m[9] * m[7] + m[1] * m[4] * m[11] - m[1] * m[8] * m[7] - m[3] * m[4] * m[9] + m[3] * m[8] * m[5];

		r[12] = -m[4] * m[9] * m[14] + m[4] * m[13] * m[10] + m[5] * m[8] * m[14] - m[5] * m[12] * m[10] - m[6] * m[8] * m[13] + m[6] * m[12] * m[9];
		r[13] = m[0] * m[9] * m[14] - m[0] * m[13] * m[10] - m[1] * m[8] * m[14] + m[1] * m[12] * m[10] + m[2] * m[8] * m[13] - m[2] * m[12] * m[9];
		r[14] = -m[0] * m[5] * m[14] + m[0] * m[13] * m[6] + m[1] * m[4] * m[14] - m[1] * m[12] * m[6] - m[2] * m[4] * m[13] + m[2] * m[12] * m[5];
		r[15] = m[0] * m[5] * m[10] - m[0] * m[9] * m[6] - m[1] * m[4] * m[10] + m[1] * m[8] * m[6] + m[2] * m[4] * m[9] - m[2] * m[8] * m[5];

		var det = m[0] * r[0] + m[1] * r[4] + m[2] * r[8] + m[3] * r[12];
		for (var i = 0; i < 16; i++) {
			r[i] /= det;
		}return result;
	};

	// ### GL.Matrix.transpose(matrix[, result])
	//
	// Returns `matrix`, exchanging columns for rows. You can optionally pass an
	// existing matrix in `result` to avoid allocating a new matrix.
	Matrix.transpose = function (matrix, result) {
		result = result || new Matrix();
		var m = matrix.m,
		    r = result.m;
		r[0] = m[0];
		r[1] = m[4];
		r[2] = m[8];
		r[3] = m[12];
		r[4] = m[1];
		r[5] = m[5];
		r[6] = m[9];
		r[7] = m[13];
		r[8] = m[2];
		r[9] = m[6];
		r[10] = m[10];
		r[11] = m[14];
		r[12] = m[3];
		r[13] = m[7];
		r[14] = m[11];
		r[15] = m[15];
		return result;
	};

	// ### GL.Matrix.multiply(left, right[, result])
	//
	// Returns the concatenation of the transforms for `left` and `right`. You can
	// optionally pass an existing matrix in `result` to avoid allocating a new
	// matrix. This emulates the OpenGL function `glMultMatrix()`.
	Matrix.multiply = function (left, right, result) {
		result = result || new Matrix();
		var a = left.m,
		    b = right.m,
		    r = result.m;

		r[0] = a[0] * b[0] + a[1] * b[4] + a[2] * b[8] + a[3] * b[12];
		r[1] = a[0] * b[1] + a[1] * b[5] + a[2] * b[9] + a[3] * b[13];
		r[2] = a[0] * b[2] + a[1] * b[6] + a[2] * b[10] + a[3] * b[14];
		r[3] = a[0] * b[3] + a[1] * b[7] + a[2] * b[11] + a[3] * b[15];

		r[4] = a[4] * b[0] + a[5] * b[4] + a[6] * b[8] + a[7] * b[12];
		r[5] = a[4] * b[1] + a[5] * b[5] + a[6] * b[9] + a[7] * b[13];
		r[6] = a[4] * b[2] + a[5] * b[6] + a[6] * b[10] + a[7] * b[14];
		r[7] = a[4] * b[3] + a[5] * b[7] + a[6] * b[11] + a[7] * b[15];

		r[8] = a[8] * b[0] + a[9] * b[4] + a[10] * b[8] + a[11] * b[12];
		r[9] = a[8] * b[1] + a[9] * b[5] + a[10] * b[9] + a[11] * b[13];
		r[10] = a[8] * b[2] + a[9] * b[6] + a[10] * b[10] + a[11] * b[14];
		r[11] = a[8] * b[3] + a[9] * b[7] + a[10] * b[11] + a[11] * b[15];

		r[12] = a[12] * b[0] + a[13] * b[4] + a[14] * b[8] + a[15] * b[12];
		r[13] = a[12] * b[1] + a[13] * b[5] + a[14] * b[9] + a[15] * b[13];
		r[14] = a[12] * b[2] + a[13] * b[6] + a[14] * b[10] + a[15] * b[14];
		r[15] = a[12] * b[3] + a[13] * b[7] + a[14] * b[11] + a[15] * b[15];

		return result;
	};

	// ### GL.Matrix.identity([result])
	//
	// Returns an identity matrix. You can optionally pass an existing matrix in
	// `result` to avoid allocating a new matrix. This emulates the OpenGL function
	// `glLoadIdentity()`.
	Matrix.identity = function (result) {
		result = result || new Matrix();
		var m = result.m;
		m[0] = m[5] = m[10] = m[15] = 1;
		m[1] = m[2] = m[3] = m[4] = m[6] = m[7] = m[8] = m[9] = m[11] = m[12] = m[13] = m[14] = 0;
		return result;
	};

	// ### GL.Matrix.perspective(fov, aspect, near, far[, result])
	//
	// Returns a perspective transform matrix, which makes far away objects appear
	// smaller than nearby objects. The `aspect` argument should be the width
	// divided by the height of your viewport and `fov` is the top-to-bottom angle
	// of the field of view in degrees. You can optionally pass an existing matrix
	// in `result` to avoid allocating a new matrix. This emulates the OpenGL
	// function `gluPerspective()`.
	Matrix.perspective = function (fov, aspect, near, far, result) {
		var y = Math.tan(fov * Math.PI / 360) * near;
		var x = y * aspect;
		return Matrix.frustum(-x, x, -y, y, near, far, result);
	};

	// ### GL.Matrix.frustum(left, right, bottom, top, near, far[, result])
	//
	// Sets up a viewing frustum, which is shaped like a truncated pyramid with the
	// camera where the point of the pyramid would be. You can optionally pass an
	// existing matrix in `result` to avoid allocating a new matrix. This emulates
	// the OpenGL function `glFrustum()`.
	Matrix.frustum = function (l, r, b, t, n, f, result) {
		result = result || new Matrix();
		var m = result.m;

		m[0] = 2 * n / (r - l);
		m[1] = 0;
		m[2] = (r + l) / (r - l);
		m[3] = 0;

		m[4] = 0;
		m[5] = 2 * n / (t - b);
		m[6] = (t + b) / (t - b);
		m[7] = 0;

		m[8] = 0;
		m[9] = 0;
		m[10] = -(f + n) / (f - n);
		m[11] = -2 * f * n / (f - n);

		m[12] = 0;
		m[13] = 0;
		m[14] = -1;
		m[15] = 0;

		return result;
	};

	// ### GL.Matrix.ortho(left, right, bottom, top, near, far[, result])
	//
	// Returns an orthographic projection, in which objects are the same size no
	// matter how far away or nearby they are. You can optionally pass an existing
	// matrix in `result` to avoid allocating a new matrix. This emulates the OpenGL
	// function `glOrtho()`.
	Matrix.ortho = function (l, r, b, t, n, f, result) {
		result = result || new Matrix();
		var m = result.m;

		m[0] = 2 / (r - l);
		m[1] = 0;
		m[2] = 0;
		m[3] = -(r + l) / (r - l);

		m[4] = 0;
		m[5] = 2 / (t - b);
		m[6] = 0;
		m[7] = -(t + b) / (t - b);

		m[8] = 0;
		m[9] = 0;
		m[10] = -2 / (f - n);
		m[11] = -(f + n) / (f - n);

		m[12] = 0;
		m[13] = 0;
		m[14] = 0;
		m[15] = 1;

		return result;
	};

	// ### GL.Matrix.scale(x, y, z[, result])
	//
	// This emulates the OpenGL function `glScale()`. You can optionally pass an
	// existing matrix in `result` to avoid allocating a new matrix.
	Matrix.scale = function (x, y, z, result) {
		result = result || new Matrix();
		var m = result.m;

		m[0] = x;
		m[1] = 0;
		m[2] = 0;
		m[3] = 0;

		m[4] = 0;
		m[5] = y;
		m[6] = 0;
		m[7] = 0;

		m[8] = 0;
		m[9] = 0;
		m[10] = z;
		m[11] = 0;

		m[12] = 0;
		m[13] = 0;
		m[14] = 0;
		m[15] = 1;

		return result;
	};

	// ### GL.Matrix.translate(x, y, z[, result])
	//
	// This emulates the OpenGL function `glTranslate()`. You can optionally pass
	// an existing matrix in `result` to avoid allocating a new matrix.
	Matrix.translate = function (x, y, z, result) {
		result = result || new Matrix();
		var m = result.m;

		m[0] = 1;
		m[1] = 0;
		m[2] = 0;
		m[3] = x;

		m[4] = 0;
		m[5] = 1;
		m[6] = 0;
		m[7] = y;

		m[8] = 0;
		m[9] = 0;
		m[10] = 1;
		m[11] = z;

		m[12] = 0;
		m[13] = 0;
		m[14] = 0;
		m[15] = 1;

		return result;
	};

	// ### GL.Matrix.rotate(a, x, y, z[, result])
	//
	// Returns a matrix that rotates by `a` degrees around the vector `x, y, z`.
	// You can optionally pass an existing matrix in `result` to avoid allocating
	// a new matrix. This emulates the OpenGL function `glRotate()`.
	Matrix.rotate = function (a, x, y, z, result) {
		if (!a || !x && !y && !z) {
			return Matrix.identity(result);
		}

		result = result || new Matrix();
		var m = result.m;

		var d = Math.sqrt(x * x + y * y + z * z);
		a *= Math.PI / 180;
		x /= d;
		y /= d;
		z /= d;
		var c = Math.cos(a),
		    s = Math.sin(a),
		    t = 1 - c;

		m[0] = x * x * t + c;
		m[1] = x * y * t - z * s;
		m[2] = x * z * t + y * s;
		m[3] = 0;

		m[4] = y * x * t + z * s;
		m[5] = y * y * t + c;
		m[6] = y * z * t - x * s;
		m[7] = 0;

		m[8] = z * x * t - y * s;
		m[9] = z * y * t + x * s;
		m[10] = z * z * t + c;
		m[11] = 0;

		m[12] = 0;
		m[13] = 0;
		m[14] = 0;
		m[15] = 1;

		return result;
	};

	// ### GL.Matrix.lookAt(ex, ey, ez, cx, cy, cz, ux, uy, uz[, result])
	//
	// Returns a matrix that puts the camera at the eye point `ex, ey, ez` looking
	// toward the center point `cx, cy, cz` with an up direction of `ux, uy, uz`.
	// You can optionally pass an existing matrix in `result` to avoid allocating
	// a new matrix. This emulates the OpenGL function `gluLookAt()`.
	Matrix.lookAt = function (ex, ey, ez, cx, cy, cz, ux, uy, uz, result) {
		result = result || new Matrix();
		var m = result.m;

		var e = new Vector(ex, ey, ez);
		var c = new Vector(cx, cy, cz);
		var u = new Vector(ux, uy, uz);
		var f = e.subtract(c).unit();
		var s = u.cross(f).unit();
		var t = f.cross(s).unit();

		m[0] = s.x;
		m[1] = s.y;
		m[2] = s.z;
		m[3] = -s.dot(e);

		m[4] = t.x;
		m[5] = t.y;
		m[6] = t.z;
		m[7] = -t.dot(e);

		m[8] = f.x;
		m[9] = f.y;
		m[10] = f.z;
		m[11] = -f.dot(e);

		m[12] = 0;
		m[13] = 0;
		m[14] = 0;
		m[15] = 1;

		return result;
	};

	// src/raytracer.js
	// Provides a convenient raytracing interface.
	// ### new GL.HitTest([t, hit, normal])
	//
	// This is the object used to return hit test results. If there are no
	// arguments, the constructed argument represents a hit infinitely far
	// away.


	function HitTest(t, hit, normal) {
		this.t = arguments.length ? t : Number.MAX_VALUE;
		this.hit = hit;
		this.normal = normal;
	}

	// ### .mergeWith(other)
	//
	// Changes this object to be the closer of the two hit test results.
	HitTest.prototype = {
		mergeWith: function mergeWith(other) {
			if (other.t > 0 && other.t < this.t) {
				this.t = other.t;
				this.hit = other.hit;
				this.normal = other.normal;
			}
		}
	};

	// ### new GL.Raytracer()
	//
	// This will read the current modelview matrix, projection matrix, and viewport,
	// reconstruct the eye position, and store enough information to later generate
	// per-pixel rays using `getRayForPixel()`.
	//
	// Example usage:
	//
	//     var tracer = new GL.Raytracer();
	//     var ray = tracer.getRayForPixel(
	//       gl.canvas.width / 2,
	//       gl.canvas.height / 2);
	//     var result = GL.Raytracer.hitTestSphere(
	//       tracer.eye, ray, new GL.Vector(0, 0, 0), 1);


	function Raytracer() {
		var v = gl.getParameter(gl.VIEWPORT);
		var m = gl.modelviewMatrix.m;

		var axisX = new Vector(m[0], m[4], m[8]);
		var axisY = new Vector(m[1], m[5], m[9]);
		var axisZ = new Vector(m[2], m[6], m[10]);
		var offset = new Vector(m[3], m[7], m[11]);
		this.eye = new Vector(-offset.dot(axisX), -offset.dot(axisY), -offset.dot(axisZ));

		var minX = v[0],
		    maxX = minX + v[2];
		var minY = v[1],
		    maxY = minY + v[3];
		this.ray00 = gl.unProject(minX, minY, 1).subtract(this.eye);
		this.ray10 = gl.unProject(maxX, minY, 1).subtract(this.eye);
		this.ray01 = gl.unProject(minX, maxY, 1).subtract(this.eye);
		this.ray11 = gl.unProject(maxX, maxY, 1).subtract(this.eye);
		this.viewport = v;
	}

	Raytracer.prototype = {
		// ### .getRayForPixel(x, y)
		//
		// Returns the ray originating from the camera and traveling through the pixel `x, y`.
		getRayForPixel: function getRayForPixel(x, y) {
			x = (x - this.viewport[0]) / this.viewport[2];
			y = 1 - (y - this.viewport[1]) / this.viewport[3];
			var ray0 = Vector.lerp(this.ray00, this.ray10, x);
			var ray1 = Vector.lerp(this.ray01, this.ray11, x);
			return Vector.lerp(ray0, ray1, y).unit();
		}
	};

	// ### GL.Raytracer.hitTestBox(origin, ray, min, max)
	//
	// Traces the ray starting from `origin` along `ray` against the axis-aligned box
	// whose coordinates extend from `min` to `max`. Returns a `HitTest` with the
	// information or `null` for no intersection.
	//
	// This implementation uses the [slab intersection method](http://www.siggraph.org/education/materials/HyperGraph/raytrace/rtinter3.htm).
	Raytracer.hitTestBox = function (origin, ray, min, max) {
		var tMin = min.subtract(origin).divide(ray);
		var tMax = max.subtract(origin).divide(ray);
		var t1 = Vector.min(tMin, tMax);
		var t2 = Vector.max(tMin, tMax);
		var tNear = t1.max();
		var tFar = t2.min();

		if (tNear > 0 && tNear < tFar) {
			var epsilon = 1.0e-6,
			    hit = origin.add(ray.multiply(tNear));
			min = min.add(epsilon);
			max = max.subtract(epsilon);
			return new HitTest(tNear, hit, new Vector((hit.x > max.x) - (hit.x < min.x), (hit.y > max.y) - (hit.y < min.y), (hit.z > max.z) - (hit.z < min.z)));
		}

		return null;
	};

	// ### GL.Raytracer.hitTestSphere(origin, ray, center, radius)
	//
	// Traces the ray starting from `origin` along `ray` against the sphere defined
	// by `center` and `radius`. Returns a `HitTest` with the information or `null`
	// for no intersection.
	Raytracer.hitTestSphere = function (origin, ray, center, radius) {
		var offset = origin.subtract(center);
		var a = ray.dot(ray);
		var b = 2 * ray.dot(offset);
		var c = offset.dot(offset) - radius * radius;
		var discriminant = b * b - 4 * a * c;

		if (discriminant > 0) {
			var t = (-b - Math.sqrt(discriminant)) / (2 * a),
			    hit = origin.add(ray.multiply(t));
			return new HitTest(t, hit, hit.subtract(center).divide(radius));
		}

		return null;
	};

	// ### GL.Raytracer.hitTestTriangle(origin, ray, a, b, c)
	//
	// Traces the ray starting from `origin` along `ray` against the triangle defined
	// by the points `a`, `b`, and `c`. Returns a `HitTest` with the information or
	// `null` for no intersection.
	Raytracer.hitTestTriangle = function (origin, ray, a, b, c) {
		var ab = b.subtract(a);
		var ac = c.subtract(a);
		var normal = ab.cross(ac).unit();
		var t = normal.dot(a.subtract(origin)) / normal.dot(ray);

		if (t > 0) {
			var hit = origin.add(ray.multiply(t));
			var toHit = hit.subtract(a);
			var dot00 = ac.dot(ac);
			var dot01 = ac.dot(ab);
			var dot02 = ac.dot(toHit);
			var dot11 = ab.dot(ab);
			var dot12 = ab.dot(toHit);
			var divide = dot00 * dot11 - dot01 * dot01;
			var u = (dot11 * dot02 - dot01 * dot12) / divide;
			var v = (dot00 * dot12 - dot01 * dot02) / divide;
			if (u >= 0 && v >= 0 && u + v <= 1) return new HitTest(t, hit, normal);
		}

		return null;
	};

	return GL;
}();

module.exports = GL;

},{}],4:[function(require,module,exports){
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@most/prelude')) : typeof define === 'function' && define.amd ? define(['exports', '@most/prelude'], factory) : factory(global.mostMulticast = global.mostMulticast || {}, global.mostPrelude);
})(this, function (exports, _most_prelude) {
  'use strict';

  var MulticastDisposable = function MulticastDisposable(source, sink) {
    this.source = source;
    this.sink = sink;
    this.disposed = false;
  };

  MulticastDisposable.prototype.dispose = function dispose() {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    var remaining = this.source.remove(this.sink);
    return remaining === 0 && this.source._dispose();
  };

  function tryEvent(t, x, sink) {
    try {
      sink.event(t, x);
    } catch (e) {
      sink.error(t, e);
    }
  }

  function tryEnd(t, x, sink) {
    try {
      sink.end(t, x);
    } catch (e) {
      sink.error(t, e);
    }
  }

  var dispose = function (disposable) {
    return disposable.dispose();
  };

  var emptyDisposable = {
    dispose: function dispose$1() {}
  };

  var MulticastSource = function MulticastSource(source) {
    this.source = source;
    this.sinks = [];
    this._disposable = emptyDisposable;
  };

  MulticastSource.prototype.run = function run(sink, scheduler) {
    var n = this.add(sink);
    if (n === 1) {
      this._disposable = this.source.run(this, scheduler);
    }
    return new MulticastDisposable(this, sink);
  };

  MulticastSource.prototype._dispose = function _dispose() {
    var disposable = this._disposable;
    this._disposable = emptyDisposable;
    return Promise.resolve(disposable).then(dispose);
  };

  MulticastSource.prototype.add = function add(sink) {
    this.sinks = _most_prelude.append(sink, this.sinks);
    return this.sinks.length;
  };

  MulticastSource.prototype.remove = function remove$1(sink) {
    var i = _most_prelude.findIndex(sink, this.sinks);
    // istanbul ignore next
    if (i >= 0) {
      this.sinks = _most_prelude.remove(i, this.sinks);
    }

    return this.sinks.length;
  };

  MulticastSource.prototype.event = function event(time, value) {
    var s = this.sinks;
    if (s.length === 1) {
      return s[0].event(time, value);
    }
    for (var i = 0; i < s.length; ++i) {
      tryEvent(time, value, s[i]);
    }
  };

  MulticastSource.prototype.end = function end(time, value) {
    var s = this.sinks;
    for (var i = 0; i < s.length; ++i) {
      tryEnd(time, value, s[i]);
    }
  };

  MulticastSource.prototype.error = function error(time, err) {
    var s = this.sinks;
    for (var i = 0; i < s.length; ++i) {
      s[i].error(time, err);
    }
  };

  function multicast(stream) {
    var source = stream.source;
    return source instanceof MulticastSource ? stream : new stream.constructor(new MulticastSource(source));
  }

  exports['default'] = multicast;
  exports.MulticastSource = MulticastSource;

  Object.defineProperty(exports, '__esModule', { value: true });
});


},{"@most/prelude":5}],5:[function(require,module,exports){
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) : typeof define === 'function' && define.amd ? define(['exports'], factory) : factory(global.mostPrelude = {});
})(this, function (exports) {
  'use strict';

  /** @license MIT License (c) copyright 2010-2016 original author or authors */

  // Non-mutating array operations

  // cons :: a -> [a] -> [a]
  // a with x prepended

  function cons(x, a) {
    var l = a.length;
    var b = new Array(l + 1);
    b[0] = x;
    for (var i = 0; i < l; ++i) {
      b[i + 1] = a[i];
    }
    return b;
  }

  // append :: a -> [a] -> [a]
  // a with x appended
  function append(x, a) {
    var l = a.length;
    var b = new Array(l + 1);
    for (var i = 0; i < l; ++i) {
      b[i] = a[i];
    }

    b[l] = x;
    return b;
  }

  // drop :: Int -> [a] -> [a]
  // drop first n elements
  function drop(n, a) {
    // eslint-disable-line complexity
    if (n < 0) {
      throw new TypeError('n must be >= 0');
    }

    var l = a.length;
    if (n === 0 || l === 0) {
      return a;
    }

    if (n >= l) {
      return [];
    }

    return unsafeDrop(n, a, l - n);
  }

  // unsafeDrop :: Int -> [a] -> Int -> [a]
  // Internal helper for drop
  function unsafeDrop(n, a, l) {
    var b = new Array(l);
    for (var i = 0; i < l; ++i) {
      b[i] = a[n + i];
    }
    return b;
  }

  // tail :: [a] -> [a]
  // drop head element
  function tail(a) {
    return drop(1, a);
  }

  // copy :: [a] -> [a]
  // duplicate a (shallow duplication)
  function copy(a) {
    var l = a.length;
    var b = new Array(l);
    for (var i = 0; i < l; ++i) {
      b[i] = a[i];
    }
    return b;
  }

  // map :: (a -> b) -> [a] -> [b]
  // transform each element with f
  function map(f, a) {
    var l = a.length;
    var b = new Array(l);
    for (var i = 0; i < l; ++i) {
      b[i] = f(a[i]);
    }
    return b;
  }

  // reduce :: (a -> b -> a) -> a -> [b] -> a
  // accumulate via left-fold
  function reduce(f, z, a) {
    var r = z;
    for (var i = 0, l = a.length; i < l; ++i) {
      r = f(r, a[i], i);
    }
    return r;
  }

  // replace :: a -> Int -> [a]
  // replace element at index
  function replace(x, i, a) {
    // eslint-disable-line complexity
    if (i < 0) {
      throw new TypeError('i must be >= 0');
    }

    var l = a.length;
    var b = new Array(l);
    for (var j = 0; j < l; ++j) {
      b[j] = i === j ? x : a[j];
    }
    return b;
  }

  // remove :: Int -> [a] -> [a]
  // remove element at index
  function remove(i, a) {
    // eslint-disable-line complexity
    if (i < 0) {
      throw new TypeError('i must be >= 0');
    }

    var l = a.length;
    if (l === 0 || i >= l) {
      // exit early if index beyond end of array
      return a;
    }

    if (l === 1) {
      // exit early if index in bounds and length === 1
      return [];
    }

    return unsafeRemove(i, a, l - 1);
  }

  // unsafeRemove :: Int -> [a] -> Int -> [a]
  // Internal helper to remove element at index
  function unsafeRemove(i, a, l) {
    var b = new Array(l);
    var j = void 0;
    for (j = 0; j < i; ++j) {
      b[j] = a[j];
    }
    for (j = i; j < l; ++j) {
      b[j] = a[j + 1];
    }

    return b;
  }

  // removeAll :: (a -> boolean) -> [a] -> [a]
  // remove all elements matching a predicate
  // @deprecated
  function removeAll(f, a) {
    var l = a.length;
    var b = new Array(l);
    var j = 0;
    for (var x, i = 0; i < l; ++i) {
      x = a[i];
      if (!f(x)) {
        b[j] = x;
        ++j;
      }
    }

    b.length = j;
    return b;
  }

  // findIndex :: a -> [a] -> Int
  // find index of x in a, from the left
  function findIndex(x, a) {
    for (var i = 0, l = a.length; i < l; ++i) {
      if (x === a[i]) {
        return i;
      }
    }
    return -1;
  }

  // isArrayLike :: * -> boolean
  // Return true iff x is array-like
  function isArrayLike(x) {
    return x != null && typeof x.length === 'number' && typeof x !== 'function';
  }

  /** @license MIT License (c) copyright 2010-2016 original author or authors */

  // id :: a -> a
  var id = function id(x) {
    return x;
  };

  // compose :: (b -> c) -> (a -> b) -> (a -> c)
  var compose = function compose(f, g) {
    return function (x) {
      return f(g(x));
    };
  };

  // apply :: (a -> b) -> a -> b
  var apply = function apply(f, x) {
    return f(x);
  };

  // curry2 :: ((a, b) -> c) -> (a -> b -> c)
  function curry2(f) {
    function curried(a, b) {
      switch (arguments.length) {
        case 0:
          return curried;
        case 1:
          return function (b) {
            return f(a, b);
          };
        default:
          return f(a, b);
      }
    }
    return curried;
  }

  // curry3 :: ((a, b, c) -> d) -> (a -> b -> c -> d)
  function curry3(f) {
    function curried(a, b, c) {
      // eslint-disable-line complexity
      switch (arguments.length) {
        case 0:
          return curried;
        case 1:
          return curry2(function (b, c) {
            return f(a, b, c);
          });
        case 2:
          return function (c) {
            return f(a, b, c);
          };
        default:
          return f(a, b, c);
      }
    }
    return curried;
  }

  // curry4 :: ((a, b, c, d) -> e) -> (a -> b -> c -> d -> e)
  function curry4(f) {
    function curried(a, b, c, d) {
      // eslint-disable-line complexity
      switch (arguments.length) {
        case 0:
          return curried;
        case 1:
          return curry3(function (b, c, d) {
            return f(a, b, c, d);
          });
        case 2:
          return curry2(function (c, d) {
            return f(a, b, c, d);
          });
        case 3:
          return function (d) {
            return f(a, b, c, d);
          };
        default:
          return f(a, b, c, d);
      }
    }
    return curried;
  }

  /** @license MIT License (c) copyright 2016 original author or authors */

  exports.cons = cons;
  exports.append = append;
  exports.drop = drop;
  exports.tail = tail;
  exports.copy = copy;
  exports.map = map;
  exports.reduce = reduce;
  exports.replace = replace;
  exports.remove = remove;
  exports.removeAll = removeAll;
  exports.findIndex = findIndex;
  exports.isArrayLike = isArrayLike;
  exports.id = id;
  exports.compose = compose;
  exports.apply = apply;
  exports.curry2 = curry2;
  exports.curry3 = curry3;
  exports.curry4 = curry4;

  Object.defineProperty(exports, '__esModule', { value: true });
});


},{}],6:[function(require,module,exports){
const { merge } = require('most');

// based on http://jsfiddle.net/mattpodwysocki/pfCqq/
function mouseDrags(mouseDowns$, mouseUps, mouseMoves, settings) {
  const { pixelRatio } = settings;
  return mouseDowns$.flatMap(function (md) {
    // calculate offsets when mouse down
    let startX = md.pageX * pixelRatio;
    let startY = md.pageY * pixelRatio;
    // Calculate delta with mousemove until mouseup
    let prevX = startX;
    let prevY = startY;

    return mouseMoves.map(function (e) {
      let curX = e.pageX * pixelRatio;
      let curY = e.pageY * pixelRatio;

      let delta = {
        left: curX - startX,
        top: curY - startY,
        x: prevX - curX,
        y: curY - prevY
      };

      prevX = curX;
      prevY = curY;

      const normalized = { x: curX, y: curY };
      return { originalEvents: [e], delta, normalized, type: 'mouse' };
    }).takeUntil(mouseUps);
  });
}

function touchDrags(touchStarts$, touchEnds$, touchMoves$, settings) {
  const { pixelRatio } = settings;
  return touchStarts$.flatMap(function (e) {
    let startX = e.touches[0].pageX * pixelRatio;
    let startY = e.touches[0].pageY * pixelRatio;

    let prevX = startX;
    let prevY = startY;

    return touchMoves$.map(function (e) {
      let curX = e.touches[0].pageX * pixelRatio;
      let curY = e.touches[0].pageY * pixelRatio;

      let delta = {
        left: curX - startX,
        top: curY - startY,
        x: prevX - curX,
        y: curY - prevY
      };

      prevX = curX;
      prevY = curY;

      const normalized = { x: curX, y: curY };
      return { originalEvents: [e], delta, normalized, type: 'touch' };
    }).takeUntil(touchEnds$);
  });
}

/* drag move interactions press & move(continuously firing)
*/
function drags({ mouseDowns$, mouseUps$, mouseMoves$, touchStarts$, touchEnds$, longTaps$, touchMoves$ }, settings) {
  touchMoves$ = touchMoves$.filter(t => t.touches.length === 1);
  const drags$ = merge(mouseDrags(mouseDowns$, mouseUps$, mouseMoves$, settings), touchDrags(touchStarts$, touchEnds$, touchMoves$, settings));
  // .merge(merge(touchEnds$, mouseUps$).map(undefined))
  // .tap(e=>console.log('dragMoves',e))

  // .takeUntil(longTaps$) // .repeat() // no drag moves if there is a context action already taking place

  return drags$;
}

module.exports = { mouseDrags, touchDrags, drags };

},{"most":48}],7:[function(require,module,exports){
const { fromEvent, merge } = require('most');
const { normalizeWheel, preventDefault } = require('./utils');
const { presses } = require('./presses');
const { taps } = require('./taps');
const { drags } = require('./drags');
const { zooms } = require('./zooms');

function baseInteractionsFromEvents(targetEl, options) {
  const defaults = {
    preventScroll: true
  };
  options = Object.assign({}, defaults, options);

  const mouseDowns$ = fromEvent('mousedown', targetEl);
  const mouseUps$ = fromEvent('mouseup', targetEl);
  // const mouseLeaves$ = fromEvent('mouseleave', targetEl).merge(fromEvent('mouseout', targetEl))
  const mouseMoves$ = fromEvent('mousemove', targetEl); // .takeUntil(mouseLeaves$) // altMouseMoves(fromEvent(targetEl, 'mousemove')).takeUntil(mouseLeaves$)
  const rightClicks$ = fromEvent('contextmenu', targetEl).tap(preventDefault); // disable the context menu / right click

  const touchStarts$ = fromEvent('touchstart', targetEl);
  const touchMoves$ = fromEvent('touchmove', targetEl);
  const touchEnds$ = fromEvent('touchend', targetEl);

  // const gestureChange$ = fromEvent('gesturechange', targetEl)
  // const gestureStart$ = fromEvent('gesturestart', targetEl)
  // const gestureEnd$ = fromEvent('gestureend', targetEl)

  const pointerDowns$ = merge(mouseDowns$, touchStarts$); // mouse & touch interactions starts
  const pointerUps$ = merge(mouseUps$, touchEnds$); // mouse & touch interactions ends
  const pointerMoves$ = merge(mouseMoves$, touchMoves$.filter(t => t.touches.length === 1));

  function preventScroll(targetEl) {
    fromEvent('mousewheel', targetEl).forEach(preventDefault);
    fromEvent('DOMMouseScroll', targetEl).forEach(preventDefault);
    fromEvent('wheel', targetEl).forEach(preventDefault);
    fromEvent('touchmove', targetEl).forEach(preventDefault);
  }

  if (options.preventScroll) {
    preventScroll(targetEl);
  }

  const wheel$ = merge(fromEvent('wheel', targetEl), fromEvent('DOMMouseScroll', targetEl), fromEvent('mousewheel', targetEl)).map(normalizeWheel);

  return {
    mouseDowns$,
    mouseUps$,
    mouseMoves$,

    rightClicks$,
    wheel$,

    touchStarts$,
    touchMoves$,
    touchEnds$,

    pointerDowns$,
    pointerUps$,
    pointerMoves$ };
}

function pointerGestures(input, options) {
  let baseInteractions = 'addEventListener' in input ? baseInteractionsFromEvents(input, options) : input;

  const defaults = {
    multiTapDelay: 250, // delay between clicks/taps
    longPressDelay: 250, // delay after which we have a 'hold'
    maxStaticDeltaSqr: 100, // maximum delta (in pixels squared) above which we are not static
    zoomMultiplier: 200, // zoomFactor for normalized interactions across browsers
    pinchThreshold: 4000, // The minimum amount in pixels the inputs must move until it is fired.
    pixelRatio: typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1
  };
  const settings = Object.assign({}, defaults, options);

  const press$ = presses(baseInteractions, settings);
  const holds$ = press$ // longTaps/holds: either HELD leftmouse/pointer or HELD right click
  .filter(e => e.timeDelta > settings.longPressDelay).filter(e => e.moveDelta.sqrd < settings.maxStaticDeltaSqr); // when the square distance is bigger than this, it is a movement, not a tap
  // .map(e => e.value)
  const taps$ = taps(press$, settings);
  const drags$ = drags(baseInteractions, settings);
  const zooms$ = zooms(baseInteractions, settings);

  // FIXME: use 'press' as higher level above tap & click

  return {
    press: press$,
    holds: holds$,
    taps: taps$,
    drags: drags$,
    zooms: zooms$
  };
}

module.exports = { baseInteractionsFromEvents, pointerGestures };

},{"./drags":6,"./presses":8,"./taps":9,"./utils":10,"./zooms":11,"most":48}],8:[function(require,module,exports){
const { just, merge, empty } = require('most');
const { exists, isMoving } = require('./utils');
/* alternative "clicks" (ie mouseDown -> mouseUp ) implementation, with more fine
grained control
*/
function basePresses({ mouseDowns$, mouseUps$, mouseMoves$, touchStarts$, touchEnds$, touchMoves$ }, settings) {
  touchMoves$ = touchMoves$.filter(t => t.touches.length === 1);

  const starts$ = merge(mouseDowns$, touchStarts$); // mouse & touch interactions starts
  const ends$ = merge(mouseUps$, touchEnds$); // mouse & touch interactions ends
  const moves$ = merge(mouseMoves$, touchMoves$);
  // only doing any "clicks if the time between mDOWN and mUP is below longpressDelay"
  // any small mouseMove is ignored (shaky hands)

  return starts$.timestamp().flatMap(function (downEvent) {
    return merge(just(downEvent),
    // moves$.take(1).flatMap(x => empty()).timestamp(), // Skip if we get a movement before a mouse up
    ends$.take(1).timestamp());
  }).loop(function (acc, current) {
    let result;
    if (acc.length === 1) {
      const timeDelta = current.time - acc[0].time;

      const curX = 'touches' in current.value ? current.value.changedTouches[0].pageX : current.value.pageX; //* pixelRatio
      const curY = 'touches' in current.value ? current.value.changedTouches[0].pageY : current.value.pageY; //* pixelRatio

      const prevX = 'touches' in acc[0].value ? acc[0].value.touches[0].pageX : acc[0].value.pageX;
      const prevY = 'touches' in acc[0].value ? acc[0].value.touches[0].pageY : acc[0].value.pageY;

      let delta = [curX - prevX, curY - prevY]; // FIXME: duplicate of mouseDrags !
      delta = delta[0] * delta[0] + delta[1] * delta[1]; // squared distance
      let moveDelta = {
        x: prevX - curX,
        y: curY - prevY,
        sqrd: delta
      };

      result = { value: current.value, originalEvent: current.value, timeDelta, moveDelta, x: curX, y: curY };
      acc = [];
    } else {
      acc.push(current);
    }
    return { seed: acc, value: result };
  }, []).filter(exists).filter(x => x.value !== undefined).multicast();
}

function presses(baseInteractions, settings) {
  const presses$ = basePresses(baseInteractions, settings);

  /*
  // exploring of more composition based system : much clearer, but needs work
   // Imagine map and filter are curried
  const mapc = curry2(map)
  const filterc = curry2(filter)
   const deltaBelowMax = x => x.moveDelta < maxStaticDeltaSqr
  const intervalBelowLongPress = x => x.interval <= longPressDelay
  const validButton = event => 'button' in event && event.button === 0
  const exists = x => x !== undefined
   const pluckValue = x => x.value
  const pluckList = x => x.list
  const first = x => x[0]
   const shortTaps = compose(
    filterc(deltaBelowMax),
    filterc(intervalBelowLongPress),
    mapc(pluckValue),
    filterc(validButton)
  )
   const firstInList = compose(
    mapc(pluckList),
    mapc(first)
  )
   //const tapsByNumber = tapCount => compose(filterc(x => x.nb === tapCount), firstInList()) */

  return presses$;
}

module.exports = { presses };

},{"./utils":10,"most":48}],9:[function(require,module,exports){
const { exists } = require('./utils');

/**
 * tap on screen , either via gestures or clicks,
 * IF the movement was short (settable)
 * AND there was little movement only (settable)
 * @param  {Number} longPressDelay any tap shorter than this time is a short one
 * @param  {Number} maxStaticDeltaSqr  when the square distance is bigger than this, it is a movement, not a tap
 * @param  {Number} multiTapDelay  delay between taps for multi tap detection
 */
function taps(presses$, settings) {
  const { longPressDelay, maxStaticDeltaSqr, multiTapDelay } = settings;
  const taps$ = presses$.filter(e => e.timeDelta <= longPressDelay) // any tap shorter than this time is a short one
  .filter(e => e.moveDelta.sqrd < maxStaticDeltaSqr) // when the square distance is bigger than this, it is a movement, not a tap
  .map(data => ({ type: 'data', data })).merge(presses$.debounce(multiTapDelay).map(data => ({ type: 'reset' }))).loop(function (seed, { type, data }) {
    let value;
    if (type === 'data') {
      seed.push(data);
    } else {
      value = seed;
      seed = [];
    }
    return { seed, value };
  }, []).filter(exists)
  // .buffer(function () { return taps$.debounce(multiTapDelay) })// buffer all inputs, and emit at then end of multiTapDelay
  .map(list => ({ list: list, nb: list.length })).multicast();

  return taps$;
}

module.exports = { taps };

},{"./utils":10}],10:[function(require,module,exports){
const { empty, continueWith } = require('most');

// for most.js
const repeat = (n, stream) => n === 0 ? empty() : n === 1 ? stream : continueWith(() => repeat(n - 1, stream), stream);

// see https://github.com/cujojs/most/issues/20

// this is in another package/module normally
function preventDefault(event) {
  event.preventDefault();
  return event;
}

/* determine if distance was 'enough' to consider it a ...movement */
function isMoving(moveDelta, deltaSqr) {
  return true;
  /* let distSqr = (moveDelta.x * moveDelta.x + moveDelta.y * moveDelta.y)
  let isMoving = (distSqr > deltaSqr)
  // console.log("moving",isMoving)
  return isMoving */
}

function normalizeWheel(event) {
  let delta = { x: 0, y: 0 };
  if (event.wheelDelta) {
    // WebKit / Opera / Explorer 9
    delta = event.wheelDelta;
  } else if (event.detail) {
    // Firefox older
    delta = -event.detail;
  } else if (event.deltaY) {
    // Firefox
    delta = -event.deltaY;
  }
  delta = delta >= 0 ? 1 : -1;
  return delta;
}

function exists(data) {
  return data !== null && data !== undefined;
}

function bufferUntil(obsToBuffer, obsEnd) {
  return obsToBuffer.map(data => ({ type: 'data', data })).merge(taps$.debounce(multiTapDelay).map(data => ({ type: 'reset' }))).loop(function (seed, { type, data }) {
    let value;
    if (type === 'data') {
      seed.push(data);
    } else {
      value = seed;
      seed = [];
    }
    return { seed, value };
  }, []).filter(exists);

  /* const baseBuffer$ =
    obsToBuffer.scan(function (acc, current) {
      acc.push(current)
      return acc
  }, [])
  
  return baseBuffer$
    .until(obsEnd) */
}

module.exports = { repeat, preventDefault, isMoving, normalizeWheel, exists };

},{"most":48}],11:[function(require,module,exports){
const { merge } = require('most');

// this one is not reliable enough
function pinchZooms_old(gestureChange$, gestureStart$, gestureEnd$) {
  return gestureStart$.flatMap(function (gs) {
    return gestureChange$.map(x => x.scale)
    // .loop((prev, cur) => ({seed: cur, value: prev ? cur - prev : prev}), undefined)
    .loop(function (prev, cur) {
      console.log('prev', prev, 'cur', cur, 'value', prev ? cur - prev : prev);
      let value = prev ? cur - prev : prev;

      if (value > 0) {
        value = Math.min(Math.max(value, 0), 2);
      } else {
        value = Math.min(Math.max(value, 2), 0);
      }

      return { seed: cur, value };
    }, undefined).filter(x => x !== undefined)
    // .map(x => x / x)
    .takeUntil(gestureEnd$);
  }).tap(e => console.log('pinchZooms', e));
}

function pinchZooms({ touchStarts$, touchMoves$, touchEnds$ }, settings) {
  const { pixelRatio, pinchThreshold } = settings;
  // generic custom gesture handling
  // very very vaguely based on http://stackoverflow.com/questions/11183174/simplest-way-to-detect-a-pinch
  return touchStarts$.filter(t => t.touches.length === 2).flatMap(function (ts) {
    let startX1 = ts.touches[0].pageX * pixelRatio;
    let startY1 = ts.touches[0].pageY * pixelRatio;

    let startX2 = ts.touches[1].pageX * pixelRatio;
    let startY2 = ts.touches[1].pageY * pixelRatio;

    const startDist = (startX1 - startX2) * (startX1 - startX2) + (startY1 - startY2) * (startY1 - startY2);

    return touchMoves$.tap(e => e.preventDefault()).filter(t => t.touches.length === 2).map(function (e) {
      let curX1 = e.touches[0].pageX * pixelRatio;
      let curY1 = e.touches[0].pageY * pixelRatio;

      let curX2 = e.touches[1].pageX * pixelRatio;
      let curY2 = e.touches[1].pageY * pixelRatio;

      const currentDist = (curX1 - curX2) * (curX1 - curX2) + (curY1 - curY2) * (curY1 - curY2);
      return currentDist;
    }).loop(function (prev, cur) {
      if (prev) {
        if (Math.abs(cur - prev) < pinchThreshold) {
          return { seed: cur, value: undefined };
        }
        return { seed: cur, value: cur - prev };
      }
      return { seed: cur, value: cur - startDist };
    }, undefined).filter(x => x !== undefined).map(x => x * 0.000003) // arbitrary, in order to harmonise desktop /mobile up to a point
    /* .map(function (e) {
      const scale = e > 0 ? Math.sqrt(e) : -Math.sqrt(Math.abs(e))
      return scale
    }) */
    .takeUntil(touchEnds$);
  });
}

function zooms({ touchStarts$, touchMoves$, touchEnds$, wheel$ }, settings) {
  const zooms$ = merge(pinchZooms({ touchStarts$, touchMoves$, touchEnds$ }, settings), // for Android (no gestureXX events)
  wheel$).map(x => x * settings.zoomMultiplier);
  return zooms$;
}

module.exports = { pinchZooms, zooms };

},{"most":48}],12:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = LinkedList;
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

/**
 * Doubly linked list
 * @constructor
 */
function LinkedList() {
  this.head = null;
  this.length = 0;
}

/**
 * Add a node to the end of the list
 * @param {{prev:Object|null, next:Object|null, dispose:function}} x node to add
 */
LinkedList.prototype.add = function (x) {
  if (this.head !== null) {
    this.head.prev = x;
    x.next = this.head;
  }
  this.head = x;
  ++this.length;
};

/**
 * Remove the provided node from the list
 * @param {{prev:Object|null, next:Object|null, dispose:function}} x node to remove
 */
LinkedList.prototype.remove = function (x) {
  // eslint-disable-line  complexity
  --this.length;
  if (x === this.head) {
    this.head = this.head.next;
  }
  if (x.next !== null) {
    x.next.prev = x.prev;
    x.next = null;
  }
  if (x.prev !== null) {
    x.prev.next = x.next;
    x.prev = null;
  }
};

/**
 * @returns {boolean} true iff there are no nodes in the list
 */
LinkedList.prototype.isEmpty = function () {
  return this.length === 0;
};

/**
 * Dispose all nodes
 * @returns {Promise} promise that fulfills when all nodes have been disposed,
 *  or rejects if an error occurs while disposing
 */
LinkedList.prototype.dispose = function () {
  if (this.isEmpty()) {
    return Promise.resolve();
  }

  var promises = [];
  var x = this.head;
  this.head = null;
  this.length = 0;

  while (x !== null) {
    promises.push(x.dispose());
    x = x.next;
  }

  return Promise.all(promises);
};

},{}],13:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isPromise = isPromise;
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function isPromise(p) {
  return p !== null && typeof p === 'object' && typeof p.then === 'function';
}

},{}],14:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Queue;
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

// Based on https://github.com/petkaantonov/deque

function Queue(capPow2) {
  this._capacity = capPow2 || 32;
  this._length = 0;
  this._head = 0;
}

Queue.prototype.push = function (x) {
  var len = this._length;
  this._checkCapacity(len + 1);

  var i = this._head + len & this._capacity - 1;
  this[i] = x;
  this._length = len + 1;
};

Queue.prototype.shift = function () {
  var head = this._head;
  var x = this[head];

  this[head] = void 0;
  this._head = head + 1 & this._capacity - 1;
  this._length--;
  return x;
};

Queue.prototype.isEmpty = function () {
  return this._length === 0;
};

Queue.prototype.length = function () {
  return this._length;
};

Queue.prototype._checkCapacity = function (size) {
  if (this._capacity < size) {
    this._ensureCapacity(this._capacity << 1);
  }
};

Queue.prototype._ensureCapacity = function (capacity) {
  var oldCapacity = this._capacity;
  this._capacity = capacity;

  var last = this._head + this._length;

  if (last > oldCapacity) {
    copy(this, 0, this, oldCapacity, last & oldCapacity - 1);
  }
};

function copy(src, srcIndex, dst, dstIndex, len) {
  for (var j = 0; j < len; ++j) {
    dst[j + dstIndex] = src[j + srcIndex];
    src[j + srcIndex] = void 0;
  }
}

},{}],15:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Stream;
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function Stream(source) {
  this.source = source;
}

Stream.prototype.run = function (sink, scheduler) {
  return this.source.run(sink, scheduler);
};

},{}],16:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.scan = scan;
exports.reduce = reduce;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

var _runSource = require('../runSource');

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _PropagateTask = require('../scheduler/PropagateTask');

var _PropagateTask2 = _interopRequireDefault(_PropagateTask);

function _interopRequireWildcard(obj) {
  if (obj && obj.__esModule) {
    return obj;
  } else {
    var newObj = {};if (obj != null) {
      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          newObj[key] = obj[key];
        }
      }
    }newObj.default = obj;return newObj;
  }
}

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

/**
 * Create a stream containing successive reduce results of applying f to
 * the previous reduce result and the current stream item.
 * @param {function(result:*, x:*):*} f reducer function
 * @param {*} initial initial value
 * @param {Stream} stream stream to scan
 * @returns {Stream} new stream containing successive reduce results
 */
function scan(f, initial, stream) {
  return new _Stream2.default(new Scan(f, initial, stream.source));
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function Scan(f, z, source) {
  this.source = source;
  this.f = f;
  this.value = z;
}

Scan.prototype.run = function (sink, scheduler) {
  var d1 = scheduler.asap(_PropagateTask2.default.event(this.value, sink));
  var d2 = this.source.run(new ScanSink(this.f, this.value, sink), scheduler);
  return dispose.all([d1, d2]);
};

function ScanSink(f, z, sink) {
  this.f = f;
  this.value = z;
  this.sink = sink;
}

ScanSink.prototype.event = function (t, x) {
  var f = this.f;
  this.value = f(this.value, x);
  this.sink.event(t, this.value);
};

ScanSink.prototype.error = _Pipe2.default.prototype.error;
ScanSink.prototype.end = _Pipe2.default.prototype.end;

/**
* Reduce a stream to produce a single result.  Note that reducing an infinite
* stream will return a Promise that never fulfills, but that may reject if an error
* occurs.
* @param {function(result:*, x:*):*} f reducer function
* @param {*} initial initial value
* @param {Stream} stream to reduce
* @returns {Promise} promise for the file result of the reduce
*/
function reduce(f, initial, stream) {
  return (0, _runSource.withDefaultScheduler)(new Reduce(f, initial, stream.source));
}

function Reduce(f, z, source) {
  this.source = source;
  this.f = f;
  this.value = z;
}

Reduce.prototype.run = function (sink, scheduler) {
  return this.source.run(new ReduceSink(this.f, this.value, sink), scheduler);
};

function ReduceSink(f, z, sink) {
  this.f = f;
  this.value = z;
  this.sink = sink;
}

ReduceSink.prototype.event = function (t, x) {
  var f = this.f;
  this.value = f(this.value, x);
  this.sink.event(t, this.value);
};

ReduceSink.prototype.error = _Pipe2.default.prototype.error;

ReduceSink.prototype.end = function (t) {
  this.sink.end(t, this.value);
};

},{"../Stream":15,"../disposable/dispose":43,"../runSource":54,"../scheduler/PropagateTask":56,"../sink/Pipe":63}],17:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ap = ap;

var _combine = require('./combine');

var _prelude = require('@most/prelude');

/**
 * Assume fs is a stream containing functions, and apply the latest function
 * in fs to the latest value in xs.
 * fs:         --f---------g--------h------>
 * xs:         -a-------b-------c-------d-->
 * ap(fs, xs): --fa-----fb-gb---gc--hc--hd->
 * @param {Stream} fs stream of functions to apply to the latest x
 * @param {Stream} xs stream of values to which to apply all the latest f
 * @returns {Stream} stream containing all the applications of fs to xs
 */
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function ap(fs, xs) {
  return (0, _combine.combine)(_prelude.apply, fs, xs);
}

},{"./combine":19,"@most/prelude":5}],18:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.cons = cons;
exports.concat = concat;

var _core = require('../source/core');

var _continueWith = require('./continueWith');

/**
 * @param {*} x value to prepend
 * @param {Stream} stream
 * @returns {Stream} new stream with x prepended
 */
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function cons(x, stream) {
  return concat((0, _core.of)(x), stream);
}

/**
* @param {Stream} left
* @param {Stream} right
* @returns {Stream} new stream containing all events in left followed by all
*  events in right.  This *timeshifts* right to the end of left.
*/
function concat(left, right) {
  return (0, _continueWith.continueWith)(function () {
    return right;
  }, left);
}

},{"../source/core":67,"./continueWith":21}],19:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.combine = combine;
exports.combineArray = combineArray;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _transform = require('./transform');

var transform = _interopRequireWildcard(_transform);

var _core = require('../source/core');

var core = _interopRequireWildcard(_core);

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

var _IndexSink = require('../sink/IndexSink');

var _IndexSink2 = _interopRequireDefault(_IndexSink);

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _prelude = require('@most/prelude');

var base = _interopRequireWildcard(_prelude);

var _invoke = require('../invoke');

var _invoke2 = _interopRequireDefault(_invoke);

function _interopRequireWildcard(obj) {
  if (obj && obj.__esModule) {
    return obj;
  } else {
    var newObj = {};if (obj != null) {
      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          newObj[key] = obj[key];
        }
      }
    }newObj.default = obj;return newObj;
  }
}

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

var map = base.map;
var tail = base.tail;

/**
 * Combine latest events from all input streams
 * @param {function(...events):*} f function to combine most recent events
 * @returns {Stream} stream containing the result of applying f to the most recent
 *  event of each input stream, whenever a new event arrives on any stream.
 */
function combine(f /*, ...streams */) {
  return combineArray(f, tail(arguments));
}

/**
* Combine latest events from all input streams
* @param {function(...events):*} f function to combine most recent events
* @param {[Stream]} streams most recent events
* @returns {Stream} stream containing the result of applying f to the most recent
*  event of each input stream, whenever a new event arrives on any stream.
*/
function combineArray(f, streams) {
  var l = streams.length;
  return l === 0 ? core.empty() : l === 1 ? transform.map(f, streams[0]) : new _Stream2.default(combineSources(f, streams));
}

function combineSources(f, streams) {
  return new Combine(f, map(getSource, streams));
}

function getSource(stream) {
  return stream.source;
}

function Combine(f, sources) {
  this.f = f;
  this.sources = sources;
}

Combine.prototype.run = function (sink, scheduler) {
  var this$1 = this;

  var l = this.sources.length;
  var disposables = new Array(l);
  var sinks = new Array(l);

  var mergeSink = new CombineSink(disposables, sinks, sink, this.f);

  for (var indexSink, i = 0; i < l; ++i) {
    indexSink = sinks[i] = new _IndexSink2.default(i, mergeSink);
    disposables[i] = this$1.sources[i].run(indexSink, scheduler);
  }

  return dispose.all(disposables);
};

function CombineSink(disposables, sinks, sink, f) {
  var this$1 = this;

  this.sink = sink;
  this.disposables = disposables;
  this.sinks = sinks;
  this.f = f;

  var l = sinks.length;
  this.awaiting = l;
  this.values = new Array(l);
  this.hasValue = new Array(l);
  for (var i = 0; i < l; ++i) {
    this$1.hasValue[i] = false;
  }

  this.activeCount = sinks.length;
}

CombineSink.prototype.error = _Pipe2.default.prototype.error;

CombineSink.prototype.event = function (t, indexedValue) {
  var i = indexedValue.index;
  var awaiting = this._updateReady(i);

  this.values[i] = indexedValue.value;
  if (awaiting === 0) {
    this.sink.event(t, (0, _invoke2.default)(this.f, this.values));
  }
};

CombineSink.prototype._updateReady = function (index) {
  if (this.awaiting > 0) {
    if (!this.hasValue[index]) {
      this.hasValue[index] = true;
      this.awaiting -= 1;
    }
  }
  return this.awaiting;
};

CombineSink.prototype.end = function (t, indexedValue) {
  dispose.tryDispose(t, this.disposables[indexedValue.index], this.sink);
  if (--this.activeCount === 0) {
    this.sink.end(t, indexedValue.value);
  }
};

},{"../Stream":15,"../disposable/dispose":43,"../invoke":49,"../sink/IndexSink":62,"../sink/Pipe":63,"../source/core":67,"./transform":39,"@most/prelude":5}],20:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.concatMap = concatMap;

var _mergeConcurrently = require('./mergeConcurrently');

/**
 * Map each value in stream to a new stream, and concatenate them all
 * stream:              -a---b---cX
 * f(a):                 1-1-1-1X
 * f(b):                        -2-2-2-2X
 * f(c):                                -3-3-3-3X
 * stream.concatMap(f): -1-1-1-1-2-2-2-2-3-3-3-3X
 * @param {function(x:*):Stream} f function to map each value to a stream
 * @param {Stream} stream
 * @returns {Stream} new stream containing all events from each stream returned by f
 */
function concatMap(f, stream) {
  return (0, _mergeConcurrently.mergeMapConcurrently)(f, 1, stream);
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

},{"./mergeConcurrently":29}],21:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.continueWith = continueWith;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

function _interopRequireWildcard(obj) {
  if (obj && obj.__esModule) {
    return obj;
  } else {
    var newObj = {};if (obj != null) {
      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          newObj[key] = obj[key];
        }
      }
    }newObj.default = obj;return newObj;
  }
}

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function continueWith(f, stream) {
  return new _Stream2.default(new ContinueWith(f, stream.source));
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function ContinueWith(f, source) {
  this.f = f;
  this.source = source;
}

ContinueWith.prototype.run = function (sink, scheduler) {
  return new ContinueWithSink(this.f, this.source, sink, scheduler);
};

function ContinueWithSink(f, source, sink, scheduler) {
  this.f = f;
  this.sink = sink;
  this.scheduler = scheduler;
  this.active = true;
  this.disposable = dispose.once(source.run(this, scheduler));
}

ContinueWithSink.prototype.error = _Pipe2.default.prototype.error;

ContinueWithSink.prototype.event = function (t, x) {
  if (!this.active) {
    return;
  }
  this.sink.event(t, x);
};

ContinueWithSink.prototype.end = function (t, x) {
  if (!this.active) {
    return;
  }

  dispose.tryDispose(t, this.disposable, this.sink);
  this._startNext(t, x, this.sink);
};

ContinueWithSink.prototype._startNext = function (t, x, sink) {
  try {
    this.disposable = this._continue(this.f, x, sink);
  } catch (e) {
    sink.error(t, e);
  }
};

ContinueWithSink.prototype._continue = function (f, x, sink) {
  return f(x).source.run(sink, this.scheduler);
};

ContinueWithSink.prototype.dispose = function () {
  this.active = false;
  return this.disposable.dispose();
};

},{"../Stream":15,"../disposable/dispose":43,"../sink/Pipe":63}],22:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.delay = delay;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _PropagateTask = require('../scheduler/PropagateTask');

var _PropagateTask2 = _interopRequireDefault(_PropagateTask);

function _interopRequireWildcard(obj) {
  if (obj && obj.__esModule) {
    return obj;
  } else {
    var newObj = {};if (obj != null) {
      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          newObj[key] = obj[key];
        }
      }
    }newObj.default = obj;return newObj;
  }
}

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

/**
 * @param {Number} delayTime milliseconds to delay each item
 * @param {Stream} stream
 * @returns {Stream} new stream containing the same items, but delayed by ms
 */
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function delay(delayTime, stream) {
  return delayTime <= 0 ? stream : new _Stream2.default(new Delay(delayTime, stream.source));
}

function Delay(dt, source) {
  this.dt = dt;
  this.source = source;
}

Delay.prototype.run = function (sink, scheduler) {
  var delaySink = new DelaySink(this.dt, sink, scheduler);
  return dispose.all([delaySink, this.source.run(delaySink, scheduler)]);
};

function DelaySink(dt, sink, scheduler) {
  this.dt = dt;
  this.sink = sink;
  this.scheduler = scheduler;
}

DelaySink.prototype.dispose = function () {
  var self = this;
  this.scheduler.cancelAll(function (scheduledTask) {
    return scheduledTask.task.sink === self.sink;
  });
};

DelaySink.prototype.event = function (t, x) {
  this.scheduler.delay(this.dt, _PropagateTask2.default.event(x, this.sink));
};

DelaySink.prototype.end = function (t, x) {
  this.scheduler.delay(this.dt, _PropagateTask2.default.end(x, this.sink));
};

DelaySink.prototype.error = _Pipe2.default.prototype.error;

},{"../Stream":15,"../disposable/dispose":43,"../scheduler/PropagateTask":56,"../sink/Pipe":63}],23:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.flatMapError = undefined;
exports.recoverWith = recoverWith;
exports.throwError = throwError;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _SafeSink = require('../sink/SafeSink');

var _SafeSink2 = _interopRequireDefault(_SafeSink);

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _tryEvent = require('../source/tryEvent');

var tryEvent = _interopRequireWildcard(_tryEvent);

var _PropagateTask = require('../scheduler/PropagateTask');

var _PropagateTask2 = _interopRequireDefault(_PropagateTask);

function _interopRequireWildcard(obj) {
  if (obj && obj.__esModule) {
    return obj;
  } else {
    var newObj = {};if (obj != null) {
      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          newObj[key] = obj[key];
        }
      }
    }newObj.default = obj;return newObj;
  }
}

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

/**
 * If stream encounters an error, recover and continue with items from stream
 * returned by f.
 * @param {function(error:*):Stream} f function which returns a new stream
 * @param {Stream} stream
 * @returns {Stream} new stream which will recover from an error by calling f
 */
function recoverWith(f, stream) {
  return new _Stream2.default(new RecoverWith(f, stream.source));
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

var flatMapError = exports.flatMapError = recoverWith;

/**
 * Create a stream containing only an error
 * @param {*} e error value, preferably an Error or Error subtype
 * @returns {Stream} new stream containing only an error
 */
function throwError(e) {
  return new _Stream2.default(new ErrorSource(e));
}

function ErrorSource(e) {
  this.value = e;
}

ErrorSource.prototype.run = function (sink, scheduler) {
  return scheduler.asap(new _PropagateTask2.default(runError, this.value, sink));
};

function runError(t, e, sink) {
  sink.error(t, e);
}

function RecoverWith(f, source) {
  this.f = f;
  this.source = source;
}

RecoverWith.prototype.run = function (sink, scheduler) {
  return new RecoverWithSink(this.f, this.source, sink, scheduler);
};

function RecoverWithSink(f, source, sink, scheduler) {
  this.f = f;
  this.sink = new _SafeSink2.default(sink);
  this.scheduler = scheduler;
  this.disposable = source.run(this, scheduler);
}

RecoverWithSink.prototype.event = function (t, x) {
  tryEvent.tryEvent(t, x, this.sink);
};

RecoverWithSink.prototype.end = function (t, x) {
  tryEvent.tryEnd(t, x, this.sink);
};

RecoverWithSink.prototype.error = function (t, e) {
  var nextSink = this.sink.disable();

  dispose.tryDispose(t, this.disposable, this.sink);
  this._startNext(t, e, nextSink);
};

RecoverWithSink.prototype._startNext = function (t, x, sink) {
  try {
    this.disposable = this._continue(this.f, x, sink);
  } catch (e) {
    sink.error(t, e);
  }
};

RecoverWithSink.prototype._continue = function (f, x, sink) {
  var stream = f(x);
  return stream.source.run(sink, this.scheduler);
};

RecoverWithSink.prototype.dispose = function () {
  return this.disposable.dispose();
};

},{"../Stream":15,"../disposable/dispose":43,"../scheduler/PropagateTask":56,"../sink/SafeSink":64,"../source/tryEvent":75}],24:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.filter = filter;
exports.skipRepeats = skipRepeats;
exports.skipRepeatsWith = skipRepeatsWith;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

var _Filter = require('../fusion/Filter');

var _Filter2 = _interopRequireDefault(_Filter);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

/**
 * Retain only items matching a predicate
 * @param {function(x:*):boolean} p filtering predicate called for each item
 * @param {Stream} stream stream to filter
 * @returns {Stream} stream containing only items for which predicate returns truthy
 */
function filter(p, stream) {
  return new _Stream2.default(_Filter2.default.create(p, stream.source));
}

/**
 * Skip repeated events, using === to detect duplicates
 * @param {Stream} stream stream from which to omit repeated events
 * @returns {Stream} stream without repeated events
 */
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function skipRepeats(stream) {
  return skipRepeatsWith(same, stream);
}

/**
 * Skip repeated events using the provided equals function to detect duplicates
 * @param {function(a:*, b:*):boolean} equals optional function to compare items
 * @param {Stream} stream stream from which to omit repeated events
 * @returns {Stream} stream without repeated events
 */
function skipRepeatsWith(equals, stream) {
  return new _Stream2.default(new SkipRepeats(equals, stream.source));
}

function SkipRepeats(equals, source) {
  this.equals = equals;
  this.source = source;
}

SkipRepeats.prototype.run = function (sink, scheduler) {
  return this.source.run(new SkipRepeatsSink(this.equals, sink), scheduler);
};

function SkipRepeatsSink(equals, sink) {
  this.equals = equals;
  this.sink = sink;
  this.value = void 0;
  this.init = true;
}

SkipRepeatsSink.prototype.end = _Pipe2.default.prototype.end;
SkipRepeatsSink.prototype.error = _Pipe2.default.prototype.error;

SkipRepeatsSink.prototype.event = function (t, x) {
  if (this.init) {
    this.init = false;
    this.value = x;
    this.sink.event(t, x);
  } else if (!this.equals(this.value, x)) {
    this.value = x;
    this.sink.event(t, x);
  }
};

function same(a, b) {
  return a === b;
}

},{"../Stream":15,"../fusion/Filter":45,"../sink/Pipe":63}],25:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.flatMap = flatMap;
exports.join = join;

var _mergeConcurrently = require('./mergeConcurrently');

/**
 * Map each value in the stream to a new stream, and merge it into the
 * returned outer stream. Event arrival times are preserved.
 * @param {function(x:*):Stream} f chaining function, must return a Stream
 * @param {Stream} stream
 * @returns {Stream} new stream containing all events from each stream returned by f
 */
function flatMap(f, stream) {
  return (0, _mergeConcurrently.mergeMapConcurrently)(f, Infinity, stream);
}

/**
 * Monadic join. Flatten a Stream<Stream<X>> to Stream<X> by merging inner
 * streams to the outer. Event arrival times are preserved.
 * @param {Stream<Stream<X>>} stream stream of streams
 * @returns {Stream<X>} new stream containing all events of all inner streams
 */
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function join(stream) {
  return (0, _mergeConcurrently.mergeConcurrently)(Infinity, stream);
}

},{"./mergeConcurrently":29}],26:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.throttle = throttle;
exports.debounce = debounce;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

var _Map = require('../fusion/Map');

var _Map2 = _interopRequireDefault(_Map);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

/**
 * Limit the rate of events by suppressing events that occur too often
 * @param {Number} period time to suppress events
 * @param {Stream} stream
 * @returns {Stream}
 */
function throttle(period, stream) {
  return new _Stream2.default(throttleSource(period, stream.source));
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function throttleSource(period, source) {
  return source instanceof _Map2.default ? commuteMapThrottle(period, source) : source instanceof Throttle ? fuseThrottle(period, source) : new Throttle(period, source);
}

function commuteMapThrottle(period, source) {
  return _Map2.default.create(source.f, throttleSource(period, source.source));
}

function fuseThrottle(period, source) {
  return new Throttle(Math.max(period, source.period), source.source);
}

function Throttle(period, source) {
  this.period = period;
  this.source = source;
}

Throttle.prototype.run = function (sink, scheduler) {
  return this.source.run(new ThrottleSink(this.period, sink), scheduler);
};

function ThrottleSink(period, sink) {
  this.time = 0;
  this.period = period;
  this.sink = sink;
}

ThrottleSink.prototype.event = function (t, x) {
  if (t >= this.time) {
    this.time = t + this.period;
    this.sink.event(t, x);
  }
};

ThrottleSink.prototype.end = _Pipe2.default.prototype.end;

ThrottleSink.prototype.error = _Pipe2.default.prototype.error;

/**
 * Wait for a burst of events to subside and emit only the last event in the burst
 * @param {Number} period events occuring more frequently than this
 *  will be suppressed
 * @param {Stream} stream stream to debounce
 * @returns {Stream} new debounced stream
 */
function debounce(period, stream) {
  return new _Stream2.default(new Debounce(period, stream.source));
}

function Debounce(dt, source) {
  this.dt = dt;
  this.source = source;
}

Debounce.prototype.run = function (sink, scheduler) {
  return new DebounceSink(this.dt, this.source, sink, scheduler);
};

function DebounceSink(dt, source, sink, scheduler) {
  this.dt = dt;
  this.sink = sink;
  this.scheduler = scheduler;
  this.value = void 0;
  this.timer = null;
  this.disposable = source.run(this, scheduler);
}

DebounceSink.prototype.event = function (t, x) {
  this._clearTimer();
  this.value = x;
  this.timer = this.scheduler.delay(this.dt, new DebounceTask(this, x));
};

DebounceSink.prototype._event = function (t, x) {
  this._clearTimer();
  this.sink.event(t, x);
};

DebounceSink.prototype.end = function (t, x) {
  if (this._clearTimer()) {
    this.sink.event(t, this.value);
    this.value = void 0;
  }
  this.sink.end(t, x);
};

DebounceSink.prototype.error = function (t, x) {
  this._clearTimer();
  this.sink.error(t, x);
};

DebounceSink.prototype.dispose = function () {
  this._clearTimer();
  return this.disposable.dispose();
};

DebounceSink.prototype._clearTimer = function () {
  if (this.timer === null) {
    return false;
  }
  this.timer.dispose();
  this.timer = null;
  return true;
};

function DebounceTask(debounce, value) {
  this.debounce = debounce;
  this.value = value;
}

DebounceTask.prototype.run = function (t) {
  this.debounce._event(t, this.value);
};

DebounceTask.prototype.error = function (t, e) {
  this.debounce.error(t, e);
};

DebounceTask.prototype.dispose = function () {};

},{"../Stream":15,"../fusion/Map":47,"../sink/Pipe":63}],27:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.loop = loop;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

/**
 * Generalized feedback loop. Call a stepper function for each event. The stepper
 * will be called with 2 params: the current seed and the an event value.  It must
 * return a new { seed, value } pair. The `seed` will be fed back into the next
 * invocation of stepper, and the `value` will be propagated as the event value.
 * @param {function(seed:*, value:*):{seed:*, value:*}} stepper loop step function
 * @param {*} seed initial seed value passed to first stepper call
 * @param {Stream} stream event stream
 * @returns {Stream} new stream whose values are the `value` field of the objects
 * returned by the stepper
 */
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function loop(stepper, seed, stream) {
  return new _Stream2.default(new Loop(stepper, seed, stream.source));
}

function Loop(stepper, seed, source) {
  this.step = stepper;
  this.seed = seed;
  this.source = source;
}

Loop.prototype.run = function (sink, scheduler) {
  return this.source.run(new LoopSink(this.step, this.seed, sink), scheduler);
};

function LoopSink(stepper, seed, sink) {
  this.step = stepper;
  this.seed = seed;
  this.sink = sink;
}

LoopSink.prototype.error = _Pipe2.default.prototype.error;

LoopSink.prototype.event = function (t, x) {
  var result = this.step(this.seed, x);
  this.seed = result.seed;
  this.sink.event(t, result.value);
};

LoopSink.prototype.end = function (t) {
  this.sink.end(t, this.seed);
};

},{"../Stream":15,"../sink/Pipe":63}],28:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.merge = merge;
exports.mergeArray = mergeArray;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

var _IndexSink = require('../sink/IndexSink');

var _IndexSink2 = _interopRequireDefault(_IndexSink);

var _core = require('../source/core');

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _prelude = require('@most/prelude');

var base = _interopRequireWildcard(_prelude);

function _interopRequireWildcard(obj) {
  if (obj && obj.__esModule) {
    return obj;
  } else {
    var newObj = {};if (obj != null) {
      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          newObj[key] = obj[key];
        }
      }
    }newObj.default = obj;return newObj;
  }
}

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

var copy = base.copy;
var reduce = base.reduce;

/**
 * @returns {Stream} stream containing events from all streams in the argument
 * list in time order.  If two events are simultaneous they will be merged in
 * arbitrary order.
 */
function merge() /* ...streams */{
  return mergeArray(copy(arguments));
}

/**
 * @param {Array} streams array of stream to merge
 * @returns {Stream} stream containing events from all input observables
 * in time order.  If two events are simultaneous they will be merged in
 * arbitrary order.
 */
function mergeArray(streams) {
  var l = streams.length;
  return l === 0 ? (0, _core.empty)() : l === 1 ? streams[0] : new _Stream2.default(mergeSources(streams));
}

/**
 * This implements fusion/flattening for merge.  It will
 * fuse adjacent merge operations.  For example:
 * - a.merge(b).merge(c) effectively becomes merge(a, b, c)
 * - merge(a, merge(b, c)) effectively becomes merge(a, b, c)
 * It does this by concatenating the sources arrays of
 * any nested Merge sources, in effect "flattening" nested
 * merge operations into a single merge.
 */
function mergeSources(streams) {
  return new Merge(reduce(appendSources, [], streams));
}

function appendSources(sources, stream) {
  var source = stream.source;
  return source instanceof Merge ? sources.concat(source.sources) : sources.concat(source);
}

function Merge(sources) {
  this.sources = sources;
}

Merge.prototype.run = function (sink, scheduler) {
  var this$1 = this;

  var l = this.sources.length;
  var disposables = new Array(l);
  var sinks = new Array(l);

  var mergeSink = new MergeSink(disposables, sinks, sink);

  for (var indexSink, i = 0; i < l; ++i) {
    indexSink = sinks[i] = new _IndexSink2.default(i, mergeSink);
    disposables[i] = this$1.sources[i].run(indexSink, scheduler);
  }

  return dispose.all(disposables);
};

function MergeSink(disposables, sinks, sink) {
  this.sink = sink;
  this.disposables = disposables;
  this.activeCount = sinks.length;
}

MergeSink.prototype.error = _Pipe2.default.prototype.error;

MergeSink.prototype.event = function (t, indexValue) {
  this.sink.event(t, indexValue.value);
};

MergeSink.prototype.end = function (t, indexedValue) {
  dispose.tryDispose(t, this.disposables[indexedValue.index], this.sink);
  if (--this.activeCount === 0) {
    this.sink.end(t, indexedValue.value);
  }
};

},{"../Stream":15,"../disposable/dispose":43,"../sink/IndexSink":62,"../sink/Pipe":63,"../source/core":67,"@most/prelude":5}],29:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.mergeConcurrently = mergeConcurrently;
exports.mergeMapConcurrently = mergeMapConcurrently;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _LinkedList = require('../LinkedList');

var _LinkedList2 = _interopRequireDefault(_LinkedList);

var _prelude = require('@most/prelude');

function _interopRequireWildcard(obj) {
  if (obj && obj.__esModule) {
    return obj;
  } else {
    var newObj = {};if (obj != null) {
      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          newObj[key] = obj[key];
        }
      }
    }newObj.default = obj;return newObj;
  }
}

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function mergeConcurrently(concurrency, stream) {
  return mergeMapConcurrently(_prelude.id, concurrency, stream);
}

function mergeMapConcurrently(f, concurrency, stream) {
  return new _Stream2.default(new MergeConcurrently(f, concurrency, stream.source));
}

function MergeConcurrently(f, concurrency, source) {
  this.f = f;
  this.concurrency = concurrency;
  this.source = source;
}

MergeConcurrently.prototype.run = function (sink, scheduler) {
  return new Outer(this.f, this.concurrency, this.source, sink, scheduler);
};

function Outer(f, concurrency, source, sink, scheduler) {
  this.f = f;
  this.concurrency = concurrency;
  this.sink = sink;
  this.scheduler = scheduler;
  this.pending = [];
  this.current = new _LinkedList2.default();
  this.disposable = dispose.once(source.run(this, scheduler));
  this.active = true;
}

Outer.prototype.event = function (t, x) {
  this._addInner(t, x);
};

Outer.prototype._addInner = function (t, x) {
  if (this.current.length < this.concurrency) {
    this._startInner(t, x);
  } else {
    this.pending.push(x);
  }
};

Outer.prototype._startInner = function (t, x) {
  try {
    this._initInner(t, x);
  } catch (e) {
    this.error(t, e);
  }
};

Outer.prototype._initInner = function (t, x) {
  var innerSink = new Inner(t, this, this.sink);
  innerSink.disposable = mapAndRun(this.f, x, innerSink, this.scheduler);
  this.current.add(innerSink);
};

function mapAndRun(f, x, sink, scheduler) {
  return f(x).source.run(sink, scheduler);
}

Outer.prototype.end = function (t, x) {
  this.active = false;
  dispose.tryDispose(t, this.disposable, this.sink);
  this._checkEnd(t, x);
};

Outer.prototype.error = function (t, e) {
  this.active = false;
  this.sink.error(t, e);
};

Outer.prototype.dispose = function () {
  this.active = false;
  this.pending.length = 0;
  return Promise.all([this.disposable.dispose(), this.current.dispose()]);
};

Outer.prototype._endInner = function (t, x, inner) {
  this.current.remove(inner);
  dispose.tryDispose(t, inner, this);

  if (this.pending.length === 0) {
    this._checkEnd(t, x);
  } else {
    this._startInner(t, this.pending.shift());
  }
};

Outer.prototype._checkEnd = function (t, x) {
  if (!this.active && this.current.isEmpty()) {
    this.sink.end(t, x);
  }
};

function Inner(time, outer, sink) {
  this.prev = this.next = null;
  this.time = time;
  this.outer = outer;
  this.sink = sink;
  this.disposable = void 0;
}

Inner.prototype.event = function (t, x) {
  this.sink.event(Math.max(t, this.time), x);
};

Inner.prototype.end = function (t, x) {
  this.outer._endInner(Math.max(t, this.time), x, this);
};

Inner.prototype.error = function (t, e) {
  this.outer.error(Math.max(t, this.time), e);
};

Inner.prototype.dispose = function () {
  return this.disposable.dispose();
};

},{"../LinkedList":12,"../Stream":15,"../disposable/dispose":43,"@most/prelude":5}],30:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.observe = observe;
exports.drain = drain;

var _runSource = require('../runSource');

var _transform = require('./transform');

/**
 * Observe all the event values in the stream in time order. The
 * provided function `f` will be called for each event value
 * @param {function(x:T):*} f function to call with each event value
 * @param {Stream<T>} stream stream to observe
 * @return {Promise} promise that fulfills after the stream ends without
 *  an error, or rejects if the stream ends with an error.
 */
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function observe(f, stream) {
  return drain((0, _transform.tap)(f, stream));
}

/**
 * "Run" a stream by creating demand and consuming all events
 * @param {Stream<T>} stream stream to drain
 * @return {Promise} promise that fulfills after the stream ends without
 *  an error, or rejects if the stream ends with an error.
 */
function drain(stream) {
  return (0, _runSource.withDefaultScheduler)(stream.source);
}

},{"../runSource":54,"./transform":39}],31:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fromPromise = fromPromise;
exports.awaitPromises = awaitPromises;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _fatalError = require('../fatalError');

var _fatalError2 = _interopRequireDefault(_fatalError);

var _core = require('../source/core');

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

/**
 * Create a stream containing only the promise's fulfillment
 * value at the time it fulfills.
 * @param {Promise<T>} p promise
 * @return {Stream<T>} stream containing promise's fulfillment value.
 *  If the promise rejects, the stream will error
 */
function fromPromise(p) {
  return awaitPromises((0, _core.of)(p));
}

/**
 * Turn a Stream<Promise<T>> into Stream<T> by awaiting each promise.
 * Event order is preserved.
 * @param {Stream<Promise<T>>} stream
 * @return {Stream<T>} stream of fulfillment values.  The stream will
 * error if any promise rejects.
 */
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function awaitPromises(stream) {
  return new _Stream2.default(new Await(stream.source));
}

function Await(source) {
  this.source = source;
}

Await.prototype.run = function (sink, scheduler) {
  return this.source.run(new AwaitSink(sink, scheduler), scheduler);
};

function AwaitSink(sink, scheduler) {
  this.sink = sink;
  this.scheduler = scheduler;
  this.queue = Promise.resolve();
  var self = this;

  // Pre-create closures, to avoid creating them per event
  this._eventBound = function (x) {
    self.sink.event(self.scheduler.now(), x);
  };

  this._endBound = function (x) {
    self.sink.end(self.scheduler.now(), x);
  };

  this._errorBound = function (e) {
    self.sink.error(self.scheduler.now(), e);
  };
}

AwaitSink.prototype.event = function (t, promise) {
  var self = this;
  this.queue = this.queue.then(function () {
    return self._event(promise);
  }).catch(this._errorBound);
};

AwaitSink.prototype.end = function (t, x) {
  var self = this;
  this.queue = this.queue.then(function () {
    return self._end(x);
  }).catch(this._errorBound);
};

AwaitSink.prototype.error = function (t, e) {
  var self = this;
  // Don't resolve error values, propagate directly
  this.queue = this.queue.then(function () {
    return self._errorBound(e);
  }).catch(_fatalError2.default);
};

AwaitSink.prototype._event = function (promise) {
  return promise.then(this._eventBound);
};

AwaitSink.prototype._end = function (x) {
  return Promise.resolve(x).then(this._endBound);
};

},{"../Stream":15,"../fatalError":44,"../source/core":67}],32:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.sample = sample;
exports.sampleWith = sampleWith;
exports.sampleArray = sampleArray;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _prelude = require('@most/prelude');

var base = _interopRequireWildcard(_prelude);

var _invoke = require('../invoke');

var _invoke2 = _interopRequireDefault(_invoke);

function _interopRequireWildcard(obj) {
  if (obj && obj.__esModule) {
    return obj;
  } else {
    var newObj = {};if (obj != null) {
      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          newObj[key] = obj[key];
        }
      }
    }newObj.default = obj;return newObj;
  }
}

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

/**
 * When an event arrives on sampler, emit the result of calling f with the latest
 * values of all streams being sampled
 * @param {function(...values):*} f function to apply to each set of sampled values
 * @param {Stream} sampler streams will be sampled whenever an event arrives
 *  on sampler
 * @returns {Stream} stream of sampled and transformed values
 */
function sample(f, sampler /*, ...streams */) {
  return sampleArray(f, sampler, base.drop(2, arguments));
}

/**
 * When an event arrives on sampler, emit the latest event value from stream.
 * @param {Stream} sampler stream of events at whose arrival time
 *  stream's latest value will be propagated
 * @param {Stream} stream stream of values
 * @returns {Stream} sampled stream of values
 */
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function sampleWith(sampler, stream) {
  return new _Stream2.default(new Sampler(base.id, sampler.source, [stream.source]));
}

function sampleArray(f, sampler, streams) {
  return new _Stream2.default(new Sampler(f, sampler.source, base.map(getSource, streams)));
}

function getSource(stream) {
  return stream.source;
}

function Sampler(f, sampler, sources) {
  this.f = f;
  this.sampler = sampler;
  this.sources = sources;
}

Sampler.prototype.run = function (sink, scheduler) {
  var this$1 = this;

  var l = this.sources.length;
  var disposables = new Array(l + 1);
  var sinks = new Array(l);

  var sampleSink = new SampleSink(this.f, sinks, sink);

  for (var hold, i = 0; i < l; ++i) {
    hold = sinks[i] = new Hold(sampleSink);
    disposables[i] = this$1.sources[i].run(hold, scheduler);
  }

  disposables[i] = this.sampler.run(sampleSink, scheduler);

  return dispose.all(disposables);
};

function Hold(sink) {
  this.sink = sink;
  this.hasValue = false;
}

Hold.prototype.event = function (t, x) {
  this.value = x;
  this.hasValue = true;
  this.sink._notify(this);
};

Hold.prototype.end = function () {};
Hold.prototype.error = _Pipe2.default.prototype.error;

function SampleSink(f, sinks, sink) {
  this.f = f;
  this.sinks = sinks;
  this.sink = sink;
  this.active = false;
}

SampleSink.prototype._notify = function () {
  if (!this.active) {
    this.active = this.sinks.every(hasValue);
  }
};

SampleSink.prototype.event = function (t) {
  if (this.active) {
    this.sink.event(t, (0, _invoke2.default)(this.f, base.map(getValue, this.sinks)));
  }
};

SampleSink.prototype.end = _Pipe2.default.prototype.end;
SampleSink.prototype.error = _Pipe2.default.prototype.error;

function hasValue(hold) {
  return hold.hasValue;
}

function getValue(hold) {
  return hold.value;
}

},{"../Stream":15,"../disposable/dispose":43,"../invoke":49,"../sink/Pipe":63,"@most/prelude":5}],33:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.take = take;
exports.skip = skip;
exports.slice = slice;
exports.takeWhile = takeWhile;
exports.skipWhile = skipWhile;
exports.skipAfter = skipAfter;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

var _core = require('../source/core');

var core = _interopRequireWildcard(_core);

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _Map = require('../fusion/Map');

var _Map2 = _interopRequireDefault(_Map);

function _interopRequireWildcard(obj) {
  if (obj && obj.__esModule) {
    return obj;
  } else {
    var newObj = {};if (obj != null) {
      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          newObj[key] = obj[key];
        }
      }
    }newObj.default = obj;return newObj;
  }
}

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

/**
 * @param {number} n
 * @param {Stream} stream
 * @returns {Stream} new stream containing only up to the first n items from stream
 */
function take(n, stream) {
  return slice(0, n, stream);
}

/**
 * @param {number} n
 * @param {Stream} stream
 * @returns {Stream} new stream with the first n items removed
 */
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function skip(n, stream) {
  return slice(n, Infinity, stream);
}

/**
 * Slice a stream by index. Negative start/end indexes are not supported
 * @param {number} start
 * @param {number} end
 * @param {Stream} stream
 * @returns {Stream} stream containing items where start <= index < end
 */
function slice(start, end, stream) {
  return end <= start ? core.empty() : new _Stream2.default(sliceSource(start, end, stream.source));
}

function sliceSource(start, end, source) {
  return source instanceof _Map2.default ? commuteMapSlice(start, end, source) : source instanceof Slice ? fuseSlice(start, end, source) : new Slice(start, end, source);
}

function commuteMapSlice(start, end, source) {
  return _Map2.default.create(source.f, sliceSource(start, end, source.source));
}

function fuseSlice(start, end, source) {
  start += source.min;
  end = Math.min(end + source.min, source.max);
  return new Slice(start, end, source.source);
}

function Slice(min, max, source) {
  this.source = source;
  this.min = min;
  this.max = max;
}

Slice.prototype.run = function (sink, scheduler) {
  var disposable = dispose.settable();
  var sliceSink = new SliceSink(this.min, this.max - this.min, sink, disposable);

  disposable.setDisposable(this.source.run(sliceSink, scheduler));
  return disposable;
};

function SliceSink(skip, take, sink, disposable) {
  this.sink = sink;
  this.skip = skip;
  this.take = take;
  this.disposable = disposable;
}

SliceSink.prototype.end = _Pipe2.default.prototype.end;
SliceSink.prototype.error = _Pipe2.default.prototype.error;

SliceSink.prototype.event = function (t, x) {
  /* eslint complexity: [1, 4] */
  if (this.skip > 0) {
    this.skip -= 1;
    return;
  }

  if (this.take === 0) {
    return;
  }

  this.take -= 1;
  this.sink.event(t, x);
  if (this.take === 0) {
    this.disposable.dispose();
    this.sink.end(t, x);
  }
};

function takeWhile(p, stream) {
  return new _Stream2.default(new TakeWhile(p, stream.source));
}

function TakeWhile(p, source) {
  this.p = p;
  this.source = source;
}

TakeWhile.prototype.run = function (sink, scheduler) {
  var disposable = dispose.settable();
  var takeWhileSink = new TakeWhileSink(this.p, sink, disposable);

  disposable.setDisposable(this.source.run(takeWhileSink, scheduler));
  return disposable;
};

function TakeWhileSink(p, sink, disposable) {
  this.p = p;
  this.sink = sink;
  this.active = true;
  this.disposable = disposable;
}

TakeWhileSink.prototype.end = _Pipe2.default.prototype.end;
TakeWhileSink.prototype.error = _Pipe2.default.prototype.error;

TakeWhileSink.prototype.event = function (t, x) {
  if (!this.active) {
    return;
  }

  var p = this.p;
  this.active = p(x);
  if (this.active) {
    this.sink.event(t, x);
  } else {
    this.disposable.dispose();
    this.sink.end(t, x);
  }
};

function skipWhile(p, stream) {
  return new _Stream2.default(new SkipWhile(p, stream.source));
}

function SkipWhile(p, source) {
  this.p = p;
  this.source = source;
}

SkipWhile.prototype.run = function (sink, scheduler) {
  return this.source.run(new SkipWhileSink(this.p, sink), scheduler);
};

function SkipWhileSink(p, sink) {
  this.p = p;
  this.sink = sink;
  this.skipping = true;
}

SkipWhileSink.prototype.end = _Pipe2.default.prototype.end;
SkipWhileSink.prototype.error = _Pipe2.default.prototype.error;

SkipWhileSink.prototype.event = function (t, x) {
  if (this.skipping) {
    var p = this.p;
    this.skipping = p(x);
    if (this.skipping) {
      return;
    }
  }

  this.sink.event(t, x);
};

function skipAfter(p, stream) {
  return new _Stream2.default(new SkipAfter(p, stream.source));
}

function SkipAfter(p, source) {
  this.p = p;
  this.source = source;
}

SkipAfter.prototype.run = function run(sink, scheduler) {
  return this.source.run(new SkipAfterSink(this.p, sink), scheduler);
};

function SkipAfterSink(p, sink) {
  this.p = p;
  this.sink = sink;
  this.skipping = false;
}

SkipAfterSink.prototype.event = function event(t, x) {
  if (this.skipping) {
    return;
  }

  var p = this.p;
  this.skipping = p(x);
  this.sink.event(t, x);

  if (this.skipping) {
    this.sink.end(t, x);
  }
};

SkipAfterSink.prototype.end = _Pipe2.default.prototype.end;
SkipAfterSink.prototype.error = _Pipe2.default.prototype.error;

},{"../Stream":15,"../disposable/dispose":43,"../fusion/Map":47,"../sink/Pipe":63,"../source/core":67}],34:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.switch = undefined;
exports.switchLatest = switchLatest;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

function _interopRequireWildcard(obj) {
  if (obj && obj.__esModule) {
    return obj;
  } else {
    var newObj = {};if (obj != null) {
      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          newObj[key] = obj[key];
        }
      }
    }newObj.default = obj;return newObj;
  }
}

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

/**
 * Given a stream of streams, return a new stream that adopts the behavior
 * of the most recent inner stream.
 * @param {Stream} stream of streams on which to switch
 * @returns {Stream} switching stream
 */
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function switchLatest(stream) {
  return new _Stream2.default(new Switch(stream.source));
}

exports.switch = switchLatest;

function Switch(source) {
  this.source = source;
}

Switch.prototype.run = function (sink, scheduler) {
  var switchSink = new SwitchSink(sink, scheduler);
  return dispose.all([switchSink, this.source.run(switchSink, scheduler)]);
};

function SwitchSink(sink, scheduler) {
  this.sink = sink;
  this.scheduler = scheduler;
  this.current = null;
  this.ended = false;
}

SwitchSink.prototype.event = function (t, stream) {
  this._disposeCurrent(t); // TODO: capture the result of this dispose
  this.current = new Segment(t, Infinity, this, this.sink);
  this.current.disposable = stream.source.run(this.current, this.scheduler);
};

SwitchSink.prototype.end = function (t, x) {
  this.ended = true;
  this._checkEnd(t, x);
};

SwitchSink.prototype.error = function (t, e) {
  this.ended = true;
  this.sink.error(t, e);
};

SwitchSink.prototype.dispose = function () {
  return this._disposeCurrent(this.scheduler.now());
};

SwitchSink.prototype._disposeCurrent = function (t) {
  if (this.current !== null) {
    return this.current._dispose(t);
  }
};

SwitchSink.prototype._disposeInner = function (t, inner) {
  inner._dispose(t); // TODO: capture the result of this dispose
  if (inner === this.current) {
    this.current = null;
  }
};

SwitchSink.prototype._checkEnd = function (t, x) {
  if (this.ended && this.current === null) {
    this.sink.end(t, x);
  }
};

SwitchSink.prototype._endInner = function (t, x, inner) {
  this._disposeInner(t, inner);
  this._checkEnd(t, x);
};

SwitchSink.prototype._errorInner = function (t, e, inner) {
  this._disposeInner(t, inner);
  this.sink.error(t, e);
};

function Segment(min, max, outer, sink) {
  this.min = min;
  this.max = max;
  this.outer = outer;
  this.sink = sink;
  this.disposable = dispose.empty();
}

Segment.prototype.event = function (t, x) {
  if (t < this.max) {
    this.sink.event(Math.max(t, this.min), x);
  }
};

Segment.prototype.end = function (t, x) {
  this.outer._endInner(Math.max(t, this.min), x, this);
};

Segment.prototype.error = function (t, e) {
  this.outer._errorInner(Math.max(t, this.min), e, this);
};

Segment.prototype._dispose = function (t) {
  this.max = t;
  dispose.tryDispose(t, this.disposable, this.sink);
};

},{"../Stream":15,"../disposable/dispose":43}],35:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.thru = thru;
/** @license MIT License (c) copyright 2010-2017 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function thru(f, stream) {
  return f(stream);
}

},{}],36:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.takeUntil = takeUntil;
exports.skipUntil = skipUntil;
exports.during = during;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _flatMap = require('../combinator/flatMap');

function _interopRequireWildcard(obj) {
  if (obj && obj.__esModule) {
    return obj;
  } else {
    var newObj = {};if (obj != null) {
      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          newObj[key] = obj[key];
        }
      }
    }newObj.default = obj;return newObj;
  }
}

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function takeUntil(signal, stream) {
  return new _Stream2.default(new Until(signal.source, stream.source));
}

function skipUntil(signal, stream) {
  return new _Stream2.default(new Since(signal.source, stream.source));
}

function during(timeWindow, stream) {
  return takeUntil((0, _flatMap.join)(timeWindow), skipUntil(timeWindow, stream));
}

function Until(maxSignal, source) {
  this.maxSignal = maxSignal;
  this.source = source;
}

Until.prototype.run = function (sink, scheduler) {
  var min = new Bound(-Infinity, sink);
  var max = new UpperBound(this.maxSignal, sink, scheduler);
  var disposable = this.source.run(new TimeWindowSink(min, max, sink), scheduler);

  return dispose.all([min, max, disposable]);
};

function Since(minSignal, source) {
  this.minSignal = minSignal;
  this.source = source;
}

Since.prototype.run = function (sink, scheduler) {
  var min = new LowerBound(this.minSignal, sink, scheduler);
  var max = new Bound(Infinity, sink);
  var disposable = this.source.run(new TimeWindowSink(min, max, sink), scheduler);

  return dispose.all([min, max, disposable]);
};

function Bound(value, sink) {
  this.value = value;
  this.sink = sink;
}

Bound.prototype.error = _Pipe2.default.prototype.error;
Bound.prototype.event = noop;
Bound.prototype.end = noop;
Bound.prototype.dispose = noop;

function TimeWindowSink(min, max, sink) {
  this.min = min;
  this.max = max;
  this.sink = sink;
}

TimeWindowSink.prototype.event = function (t, x) {
  if (t >= this.min.value && t < this.max.value) {
    this.sink.event(t, x);
  }
};

TimeWindowSink.prototype.error = _Pipe2.default.prototype.error;
TimeWindowSink.prototype.end = _Pipe2.default.prototype.end;

function LowerBound(signal, sink, scheduler) {
  this.value = Infinity;
  this.sink = sink;
  this.disposable = signal.run(this, scheduler);
}

LowerBound.prototype.event = function (t /*, x */) {
  if (t < this.value) {
    this.value = t;
  }
};

LowerBound.prototype.end = noop;
LowerBound.prototype.error = _Pipe2.default.prototype.error;

LowerBound.prototype.dispose = function () {
  return this.disposable.dispose();
};

function UpperBound(signal, sink, scheduler) {
  this.value = Infinity;
  this.sink = sink;
  this.disposable = signal.run(this, scheduler);
}

UpperBound.prototype.event = function (t, x) {
  if (t < this.value) {
    this.value = t;
    this.sink.end(t, x);
  }
};

UpperBound.prototype.end = noop;
UpperBound.prototype.error = _Pipe2.default.prototype.error;

UpperBound.prototype.dispose = function () {
  return this.disposable.dispose();
};

function noop() {}

},{"../Stream":15,"../combinator/flatMap":25,"../disposable/dispose":43,"../sink/Pipe":63}],37:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.timestamp = timestamp;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function timestamp(stream) {
  return new _Stream2.default(new Timestamp(stream.source));
}

function Timestamp(source) {
  this.source = source;
}

Timestamp.prototype.run = function (sink, scheduler) {
  return this.source.run(new TimestampSink(sink), scheduler);
};

function TimestampSink(sink) {
  this.sink = sink;
}

TimestampSink.prototype.end = _Pipe2.default.prototype.end;
TimestampSink.prototype.error = _Pipe2.default.prototype.error;

TimestampSink.prototype.event = function (t, x) {
  this.sink.event(t, { time: t, value: x });
};

},{"../Stream":15,"../sink/Pipe":63}],38:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.transduce = transduce;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

/**
 * Transform a stream by passing its events through a transducer.
 * @param  {function} transducer transducer function
 * @param  {Stream} stream stream whose events will be passed through the
 *  transducer
 * @return {Stream} stream of events transformed by the transducer
 */
function transduce(transducer, stream) {
  return new _Stream2.default(new Transduce(transducer, stream.source));
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function Transduce(transducer, source) {
  this.transducer = transducer;
  this.source = source;
}

Transduce.prototype.run = function (sink, scheduler) {
  var xf = this.transducer(new Transformer(sink));
  return this.source.run(new TransduceSink(getTxHandler(xf), sink), scheduler);
};

function TransduceSink(adapter, sink) {
  this.xf = adapter;
  this.sink = sink;
}

TransduceSink.prototype.event = function (t, x) {
  var next = this.xf.step(t, x);

  return this.xf.isReduced(next) ? this.sink.end(t, this.xf.getResult(next)) : next;
};

TransduceSink.prototype.end = function (t, x) {
  return this.xf.result(x);
};

TransduceSink.prototype.error = function (t, e) {
  return this.sink.error(t, e);
};

function Transformer(sink) {
  this.time = -Infinity;
  this.sink = sink;
}

Transformer.prototype['@@transducer/init'] = Transformer.prototype.init = function () {};

Transformer.prototype['@@transducer/step'] = Transformer.prototype.step = function (t, x) {
  if (!isNaN(t)) {
    this.time = Math.max(t, this.time);
  }
  return this.sink.event(this.time, x);
};

Transformer.prototype['@@transducer/result'] = Transformer.prototype.result = function (x) {
  return this.sink.end(this.time, x);
};

/**
* Given an object supporting the new or legacy transducer protocol,
* create an adapter for it.
* @param {object} tx transform
* @returns {TxAdapter|LegacyTxAdapter}
*/
function getTxHandler(tx) {
  return typeof tx['@@transducer/step'] === 'function' ? new TxAdapter(tx) : new LegacyTxAdapter(tx);
}

/**
* Adapter for new official transducer protocol
* @param {object} tx transform
* @constructor
*/
function TxAdapter(tx) {
  this.tx = tx;
}

TxAdapter.prototype.step = function (t, x) {
  return this.tx['@@transducer/step'](t, x);
};
TxAdapter.prototype.result = function (x) {
  return this.tx['@@transducer/result'](x);
};
TxAdapter.prototype.isReduced = function (x) {
  return x != null && x['@@transducer/reduced'];
};
TxAdapter.prototype.getResult = function (x) {
  return x['@@transducer/value'];
};

/**
* Adapter for older transducer protocol
* @param {object} tx transform
* @constructor
*/
function LegacyTxAdapter(tx) {
  this.tx = tx;
}

LegacyTxAdapter.prototype.step = function (t, x) {
  return this.tx.step(t, x);
};
LegacyTxAdapter.prototype.result = function (x) {
  return this.tx.result(x);
};
LegacyTxAdapter.prototype.isReduced = function (x) {
  return x != null && x.__transducers_reduced__;
};
LegacyTxAdapter.prototype.getResult = function (x) {
  return x.value;
};

},{"../Stream":15}],39:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.map = map;
exports.constant = constant;
exports.tap = tap;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _Map = require('../fusion/Map');

var _Map2 = _interopRequireDefault(_Map);

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

/**
 * Transform each value in the stream by applying f to each
 * @param {function(*):*} f mapping function
 * @param {Stream} stream stream to map
 * @returns {Stream} stream containing items transformed by f
 */
function map(f, stream) {
  return new _Stream2.default(_Map2.default.create(f, stream.source));
}

/**
* Replace each value in the stream with x
* @param {*} x
* @param {Stream} stream
* @returns {Stream} stream containing items replaced with x
*/
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function constant(x, stream) {
  return map(function () {
    return x;
  }, stream);
}

/**
* Perform a side effect for each item in the stream
* @param {function(x:*):*} f side effect to execute for each item. The
*  return value will be discarded.
* @param {Stream} stream stream to tap
* @returns {Stream} new stream containing the same items as this stream
*/
function tap(f, stream) {
  return new _Stream2.default(new Tap(f, stream.source));
}

function Tap(f, source) {
  this.source = source;
  this.f = f;
}

Tap.prototype.run = function (sink, scheduler) {
  return this.source.run(new TapSink(this.f, sink), scheduler);
};

function TapSink(f, sink) {
  this.sink = sink;
  this.f = f;
}

TapSink.prototype.end = _Pipe2.default.prototype.end;
TapSink.prototype.error = _Pipe2.default.prototype.error;

TapSink.prototype.event = function (t, x) {
  var f = this.f;
  f(x);
  this.sink.event(t, x);
};

},{"../Stream":15,"../fusion/Map":47,"../sink/Pipe":63}],40:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.zip = zip;
exports.zipArray = zipArray;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _transform = require('./transform');

var transform = _interopRequireWildcard(_transform);

var _core = require('../source/core');

var core = _interopRequireWildcard(_core);

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

var _IndexSink = require('../sink/IndexSink');

var _IndexSink2 = _interopRequireDefault(_IndexSink);

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _prelude = require('@most/prelude');

var base = _interopRequireWildcard(_prelude);

var _invoke = require('../invoke');

var _invoke2 = _interopRequireDefault(_invoke);

var _Queue = require('../Queue');

var _Queue2 = _interopRequireDefault(_Queue);

function _interopRequireWildcard(obj) {
  if (obj && obj.__esModule) {
    return obj;
  } else {
    var newObj = {};if (obj != null) {
      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          newObj[key] = obj[key];
        }
      }
    }newObj.default = obj;return newObj;
  }
}

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

var map = base.map; /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

var tail = base.tail;

/**
 * Combine streams pairwise (or tuple-wise) by index by applying f to values
 * at corresponding indices.  The returned stream ends when any of the input
 * streams ends.
 * @param {function} f function to combine values
 * @returns {Stream} new stream with items at corresponding indices combined
 *  using f
 */
function zip(f /*, ...streams */) {
  return zipArray(f, tail(arguments));
}

/**
* Combine streams pairwise (or tuple-wise) by index by applying f to values
* at corresponding indices.  The returned stream ends when any of the input
* streams ends.
* @param {function} f function to combine values
* @param {[Stream]} streams streams to zip using f
* @returns {Stream} new stream with items at corresponding indices combined
*  using f
*/
function zipArray(f, streams) {
  return streams.length === 0 ? core.empty() : streams.length === 1 ? transform.map(f, streams[0]) : new _Stream2.default(new Zip(f, map(getSource, streams)));
}

function getSource(stream) {
  return stream.source;
}

function Zip(f, sources) {
  this.f = f;
  this.sources = sources;
}

Zip.prototype.run = function (sink, scheduler) {
  var this$1 = this;

  var l = this.sources.length;
  var disposables = new Array(l);
  var sinks = new Array(l);
  var buffers = new Array(l);

  var zipSink = new ZipSink(this.f, buffers, sinks, sink);

  for (var indexSink, i = 0; i < l; ++i) {
    buffers[i] = new _Queue2.default();
    indexSink = sinks[i] = new _IndexSink2.default(i, zipSink);
    disposables[i] = this$1.sources[i].run(indexSink, scheduler);
  }

  return dispose.all(disposables);
};

function ZipSink(f, buffers, sinks, sink) {
  this.f = f;
  this.sinks = sinks;
  this.sink = sink;
  this.buffers = buffers;
}

ZipSink.prototype.event = function (t, indexedValue) {
  // eslint-disable-line complexity
  var buffers = this.buffers;
  var buffer = buffers[indexedValue.index];

  buffer.push(indexedValue.value);

  if (buffer.length() === 1) {
    if (!ready(this.buffers)) {
      return;
    }

    emitZipped(this.f, t, buffers, this.sink);

    if (ended(this.buffers, this.sinks)) {
      this.sink.end(t, void 0);
    }
  }
};

ZipSink.prototype.end = function (t, indexedValue) {
  var buffer = this.buffers[indexedValue.index];
  if (buffer.isEmpty()) {
    this.sink.end(t, indexedValue.value);
  }
};

ZipSink.prototype.error = _Pipe2.default.prototype.error;

function emitZipped(f, t, buffers, sink) {
  sink.event(t, (0, _invoke2.default)(f, map(head, buffers)));
}

function head(buffer) {
  return buffer.shift();
}

function ended(buffers, sinks) {
  for (var i = 0, l = buffers.length; i < l; ++i) {
    if (buffers[i].isEmpty() && !sinks[i].active) {
      return true;
    }
  }
  return false;
}

function ready(buffers) {
  for (var i = 0, l = buffers.length; i < l; ++i) {
    if (buffers[i].isEmpty()) {
      return false;
    }
  }
  return true;
}

},{"../Queue":14,"../Stream":15,"../disposable/dispose":43,"../invoke":49,"../sink/IndexSink":62,"../sink/Pipe":63,"../source/core":67,"./transform":39,"@most/prelude":5}],41:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Disposable;
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

/**
 * Create a new Disposable which will dispose its underlying resource.
 * @param {function} dispose function
 * @param {*?} data any data to be passed to disposer function
 * @constructor
 */
function Disposable(dispose, data) {
  this._dispose = dispose;
  this._data = data;
}

Disposable.prototype.dispose = function () {
  return this._dispose(this._data);
};

},{}],42:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = SettableDisposable;
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function SettableDisposable() {
  this.disposable = void 0;
  this.disposed = false;
  this._resolve = void 0;

  var self = this;
  this.result = new Promise(function (resolve) {
    self._resolve = resolve;
  });
}

SettableDisposable.prototype.setDisposable = function (disposable) {
  if (this.disposable !== void 0) {
    throw new Error('setDisposable called more than once');
  }

  this.disposable = disposable;

  if (this.disposed) {
    this._resolve(disposable.dispose());
  }
};

SettableDisposable.prototype.dispose = function () {
  if (this.disposed) {
    return this.result;
  }

  this.disposed = true;

  if (this.disposable !== void 0) {
    this.result = this.disposable.dispose();
  }

  return this.result;
};

},{}],43:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.tryDispose = tryDispose;
exports.create = create;
exports.empty = empty;
exports.all = all;
exports.promised = promised;
exports.settable = settable;
exports.once = once;

var _Disposable = require('./Disposable');

var _Disposable2 = _interopRequireDefault(_Disposable);

var _SettableDisposable = require('./SettableDisposable');

var _SettableDisposable2 = _interopRequireDefault(_SettableDisposable);

var _Promise = require('../Promise');

var _prelude = require('@most/prelude');

var base = _interopRequireWildcard(_prelude);

function _interopRequireWildcard(obj) {
  if (obj && obj.__esModule) {
    return obj;
  } else {
    var newObj = {};if (obj != null) {
      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          newObj[key] = obj[key];
        }
      }
    }newObj.default = obj;return newObj;
  }
}

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */
var map = base.map;
var identity = base.id;

/**
 * Call disposable.dispose.  If it returns a promise, catch promise
 * error and forward it through the provided sink.
 * @param {number} t time
 * @param {{dispose: function}} disposable
 * @param {{error: function}} sink
 * @return {*} result of disposable.dispose
 */
function tryDispose(t, disposable, sink) {
  var result = disposeSafely(disposable);
  return (0, _Promise.isPromise)(result) ? result.catch(function (e) {
    sink.error(t, e);
  }) : result;
}

/**
 * Create a new Disposable which will dispose its underlying resource
 * at most once.
 * @param {function} dispose function
 * @param {*?} data any data to be passed to disposer function
 * @return {Disposable}
 */
function create(dispose, data) {
  return once(new _Disposable2.default(dispose, data));
}

/**
 * Create a noop disposable. Can be used to satisfy a Disposable
 * requirement when no actual resource needs to be disposed.
 * @return {Disposable|exports|module.exports}
 */
function empty() {
  return new _Disposable2.default(identity, void 0);
}

/**
 * Create a disposable that will dispose all input disposables in parallel.
 * @param {Array<Disposable>} disposables
 * @return {Disposable}
 */
function all(disposables) {
  return create(disposeAll, disposables);
}

function disposeAll(disposables) {
  return Promise.all(map(disposeSafely, disposables));
}

function disposeSafely(disposable) {
  try {
    return disposable.dispose();
  } catch (e) {
    return Promise.reject(e);
  }
}

/**
 * Create a disposable from a promise for another disposable
 * @param {Promise<Disposable>} disposablePromise
 * @return {Disposable}
 */
function promised(disposablePromise) {
  return create(disposePromise, disposablePromise);
}

function disposePromise(disposablePromise) {
  return disposablePromise.then(disposeOne);
}

function disposeOne(disposable) {
  return disposable.dispose();
}

/**
 * Create a disposable proxy that allows its underlying disposable to
 * be set later.
 * @return {SettableDisposable}
 */
function settable() {
  return new _SettableDisposable2.default();
}

/**
 * Wrap an existing disposable (which may not already have been once()d)
 * so that it will only dispose its underlying resource at most once.
 * @param {{ dispose: function() }} disposable
 * @return {Disposable} wrapped disposable
 */
function once(disposable) {
  return new _Disposable2.default(disposeMemoized, memoized(disposable));
}

function disposeMemoized(memoized) {
  if (!memoized.disposed) {
    memoized.disposed = true;
    memoized.value = disposeSafely(memoized.disposable);
    memoized.disposable = void 0;
  }

  return memoized.value;
}

function memoized(disposable) {
  return { disposed: false, disposable: disposable, value: void 0 };
}

},{"../Promise":13,"./Disposable":41,"./SettableDisposable":42,"@most/prelude":5}],44:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = fatalError;
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function fatalError(e) {
  setTimeout(function () {
    throw e;
  }, 0);
}

},{}],45:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Filter;

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function Filter(p, source) {
  this.p = p;
  this.source = source;
}

/**
 * Create a filtered source, fusing adjacent filter.filter if possible
 * @param {function(x:*):boolean} p filtering predicate
 * @param {{run:function}} source source to filter
 * @returns {Filter} filtered source
 */
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

Filter.create = function createFilter(p, source) {
  if (source instanceof Filter) {
    return new Filter(and(source.p, p), source.source);
  }

  return new Filter(p, source);
};

Filter.prototype.run = function (sink, scheduler) {
  return this.source.run(new FilterSink(this.p, sink), scheduler);
};

function FilterSink(p, sink) {
  this.p = p;
  this.sink = sink;
}

FilterSink.prototype.end = _Pipe2.default.prototype.end;
FilterSink.prototype.error = _Pipe2.default.prototype.error;

FilterSink.prototype.event = function (t, x) {
  var p = this.p;
  p(x) && this.sink.event(t, x);
};

function and(p, q) {
  return function (x) {
    return p(x) && q(x);
  };
}

},{"../sink/Pipe":63}],46:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = FilterMap;

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function FilterMap(p, f, source) {
  this.p = p;
  this.f = f;
  this.source = source;
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

FilterMap.prototype.run = function (sink, scheduler) {
  return this.source.run(new FilterMapSink(this.p, this.f, sink), scheduler);
};

function FilterMapSink(p, f, sink) {
  this.p = p;
  this.f = f;
  this.sink = sink;
}

FilterMapSink.prototype.event = function (t, x) {
  var f = this.f;
  var p = this.p;
  p(x) && this.sink.event(t, f(x));
};

FilterMapSink.prototype.end = _Pipe2.default.prototype.end;
FilterMapSink.prototype.error = _Pipe2.default.prototype.error;

},{"../sink/Pipe":63}],47:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Map;

var _Pipe = require('../sink/Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

var _Filter = require('./Filter');

var _Filter2 = _interopRequireDefault(_Filter);

var _FilterMap = require('./FilterMap');

var _FilterMap2 = _interopRequireDefault(_FilterMap);

var _prelude = require('@most/prelude');

var base = _interopRequireWildcard(_prelude);

function _interopRequireWildcard(obj) {
  if (obj && obj.__esModule) {
    return obj;
  } else {
    var newObj = {};if (obj != null) {
      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          newObj[key] = obj[key];
        }
      }
    }newObj.default = obj;return newObj;
  }
}

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function Map(f, source) {
  this.f = f;
  this.source = source;
}

/**
 * Create a mapped source, fusing adjacent map.map, filter.map,
 * and filter.map.map if possible
 * @param {function(*):*} f mapping function
 * @param {{run:function}} source source to map
 * @returns {Map|FilterMap} mapped source, possibly fused
 */
Map.create = function createMap(f, source) {
  if (source instanceof Map) {
    return new Map(base.compose(f, source.f), source.source);
  }

  if (source instanceof _Filter2.default) {
    return new _FilterMap2.default(source.p, f, source.source);
  }

  return new Map(f, source);
};

Map.prototype.run = function (sink, scheduler) {
  // eslint-disable-line no-extend-native
  return this.source.run(new MapSink(this.f, sink), scheduler);
};

function MapSink(f, sink) {
  this.f = f;
  this.sink = sink;
}

MapSink.prototype.end = _Pipe2.default.prototype.end;
MapSink.prototype.error = _Pipe2.default.prototype.error;

MapSink.prototype.event = function (t, x) {
  var f = this.f;
  this.sink.event(t, f(x));
};

},{"../sink/Pipe":63,"./Filter":45,"./FilterMap":46,"@most/prelude":5}],48:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PropagateTask = exports.defaultScheduler = exports.multicast = exports.throwError = exports.flatMapError = exports.recoverWith = exports.await = exports.awaitPromises = exports.fromPromise = exports.debounce = exports.throttle = exports.timestamp = exports.delay = exports.during = exports.since = exports.skipUntil = exports.until = exports.takeUntil = exports.skipAfter = exports.skipWhile = exports.takeWhile = exports.slice = exports.skip = exports.take = exports.distinctBy = exports.skipRepeatsWith = exports.distinct = exports.skipRepeats = exports.filter = exports.switch = exports.switchLatest = exports.zipArray = exports.zip = exports.sampleWith = exports.sampleArray = exports.sample = exports.combineArray = exports.combine = exports.mergeArray = exports.merge = exports.mergeConcurrently = exports.concatMap = exports.flatMapEnd = exports.continueWith = exports.join = exports.chain = exports.flatMap = exports.transduce = exports.ap = exports.tap = exports.constant = exports.map = exports.startWith = exports.concat = exports.generate = exports.iterate = exports.unfold = exports.reduce = exports.scan = exports.loop = exports.drain = exports.forEach = exports.observe = exports.fromEvent = exports.periodic = exports.from = exports.never = exports.empty = exports.just = exports.of = exports.Stream = undefined;

var _fromEvent = require('./source/fromEvent');

Object.defineProperty(exports, 'fromEvent', {
  enumerable: true,
  get: function () {
    return _fromEvent.fromEvent;
  }
});

var _unfold = require('./source/unfold');

Object.defineProperty(exports, 'unfold', {
  enumerable: true,
  get: function () {
    return _unfold.unfold;
  }
});

var _iterate = require('./source/iterate');

Object.defineProperty(exports, 'iterate', {
  enumerable: true,
  get: function () {
    return _iterate.iterate;
  }
});

var _generate = require('./source/generate');

Object.defineProperty(exports, 'generate', {
  enumerable: true,
  get: function () {
    return _generate.generate;
  }
});

var _Stream = require('./Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _prelude = require('@most/prelude');

var base = _interopRequireWildcard(_prelude);

var _core = require('./source/core');

var _from = require('./source/from');

var _periodic = require('./source/periodic');

var _symbolObservable = require('symbol-observable');

var _symbolObservable2 = _interopRequireDefault(_symbolObservable);

var _subscribe = require('./observable/subscribe');

var _thru = require('./combinator/thru');

var _observe = require('./combinator/observe');

var _loop = require('./combinator/loop');

var _accumulate = require('./combinator/accumulate');

var _build = require('./combinator/build');

var _transform = require('./combinator/transform');

var _applicative = require('./combinator/applicative');

var _transduce = require('./combinator/transduce');

var _flatMap = require('./combinator/flatMap');

var _continueWith = require('./combinator/continueWith');

var _concatMap = require('./combinator/concatMap');

var _mergeConcurrently = require('./combinator/mergeConcurrently');

var _merge = require('./combinator/merge');

var _combine = require('./combinator/combine');

var _sample = require('./combinator/sample');

var _zip = require('./combinator/zip');

var _switch = require('./combinator/switch');

var _filter = require('./combinator/filter');

var _slice = require('./combinator/slice');

var _timeslice = require('./combinator/timeslice');

var _delay = require('./combinator/delay');

var _timestamp = require('./combinator/timestamp');

var _limit = require('./combinator/limit');

var _promises = require('./combinator/promises');

var _errors = require('./combinator/errors');

var _multicast = require('@most/multicast');

var _multicast2 = _interopRequireDefault(_multicast);

var _defaultScheduler = require('./scheduler/defaultScheduler');

var _defaultScheduler2 = _interopRequireDefault(_defaultScheduler);

var _PropagateTask = require('./scheduler/PropagateTask');

var _PropagateTask2 = _interopRequireDefault(_PropagateTask);

function _interopRequireWildcard(obj) {
  if (obj && obj.__esModule) {
    return obj;
  } else {
    var newObj = {};if (obj != null) {
      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          newObj[key] = obj[key];
        }
      }
    }newObj.default = obj;return newObj;
  }
}

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

/**
 * Core stream type
 * @type {Stream}
 */
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

/* eslint import/first: 0 */

exports.Stream = _Stream2.default;

// Add of and empty to constructor for fantasy-land compat

_Stream2.default.of = _core.of;
_Stream2.default.empty = _core.empty;
// Add from to constructor for ES Observable compat
_Stream2.default.from = _from.from;
exports.of = _core.of;
exports.just = _core.of;
exports.empty = _core.empty;
exports.never = _core.never;
exports.from = _from.from;
exports.periodic = _periodic.periodic;

// -----------------------------------------------------------------------
// Draft ES Observable proposal interop
// https://github.com/zenparsing/es-observable

_Stream2.default.prototype.subscribe = function (subscriber) {
  return (0, _subscribe.subscribe)(subscriber, this);
};

_Stream2.default.prototype[_symbolObservable2.default] = function () {
  return this;
};

// -----------------------------------------------------------------------
// Fluent adapter

/**
 * Adapt a functional stream transform to fluent style.
 * It applies f to the this stream object
 * @param  {function(s: Stream): Stream} f function that
 * receives the stream itself and must return a new stream
 * @return {Stream}
 */
_Stream2.default.prototype.thru = function (f) {
  return (0, _thru.thru)(f, this);
};

// -----------------------------------------------------------------------
// Adapting other sources

/**
 * Create a stream of events from the supplied EventTarget or EventEmitter
 * @param {String} event event name
 * @param {EventTarget|EventEmitter} source EventTarget or EventEmitter. The source
 *  must support either addEventListener/removeEventListener (w3c EventTarget:
 *  http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-EventTarget),
 *  or addListener/removeListener (node EventEmitter: http://nodejs.org/api/events.html)
 * @returns {Stream} stream of events of the specified type from the source
 */

// -----------------------------------------------------------------------
// Observing

exports.observe = _observe.observe;
exports.forEach = _observe.observe;
exports.drain = _observe.drain;

/**
 * Process all the events in the stream
 * @returns {Promise} promise that fulfills when the stream ends, or rejects
 *  if the stream fails with an unhandled error.
 */

_Stream2.default.prototype.observe = _Stream2.default.prototype.forEach = function (f) {
  return (0, _observe.observe)(f, this);
};

/**
 * Consume all events in the stream, without providing a function to process each.
 * This causes a stream to become active and begin emitting events, and is useful
 * in cases where all processing has been setup upstream via other combinators, and
 * there is no need to process the terminal events.
 * @returns {Promise} promise that fulfills when the stream ends, or rejects
 *  if the stream fails with an unhandled error.
 */
_Stream2.default.prototype.drain = function () {
  return (0, _observe.drain)(this);
};

// -------------------------------------------------------

exports.loop = _loop.loop;

/**
 * Generalized feedback loop. Call a stepper function for each event. The stepper
 * will be called with 2 params: the current seed and the an event value.  It must
 * return a new { seed, value } pair. The `seed` will be fed back into the next
 * invocation of stepper, and the `value` will be propagated as the event value.
 * @param {function(seed:*, value:*):{seed:*, value:*}} stepper loop step function
 * @param {*} seed initial seed value passed to first stepper call
 * @returns {Stream} new stream whose values are the `value` field of the objects
 * returned by the stepper
 */

_Stream2.default.prototype.loop = function (stepper, seed) {
  return (0, _loop.loop)(stepper, seed, this);
};

// -------------------------------------------------------

exports.scan = _accumulate.scan;
exports.reduce = _accumulate.reduce;

/**
 * Create a stream containing successive reduce results of applying f to
 * the previous reduce result and the current stream item.
 * @param {function(result:*, x:*):*} f reducer function
 * @param {*} initial initial value
 * @returns {Stream} new stream containing successive reduce results
 */

_Stream2.default.prototype.scan = function (f, initial) {
  return (0, _accumulate.scan)(f, initial, this);
};

/**
 * Reduce the stream to produce a single result.  Note that reducing an infinite
 * stream will return a Promise that never fulfills, but that may reject if an error
 * occurs.
 * @param {function(result:*, x:*):*} f reducer function
 * @param {*} initial optional initial value
 * @returns {Promise} promise for the file result of the reduce
 */
_Stream2.default.prototype.reduce = function (f, initial) {
  return (0, _accumulate.reduce)(f, initial, this);
};

// -----------------------------------------------------------------------
// Building and extending

exports.concat = _build.concat;
exports.startWith = _build.cons;

/**
 * @param {Stream} tail
 * @returns {Stream} new stream containing all items in this followed by
 *  all items in tail
 */

_Stream2.default.prototype.concat = function (tail) {
  return (0, _build.concat)(this, tail);
};

/**
 * @param {*} x value to prepend
 * @returns {Stream} a new stream with x prepended
 */
_Stream2.default.prototype.startWith = function (x) {
  return (0, _build.cons)(x, this);
};

// -----------------------------------------------------------------------
// Transforming

exports.map = _transform.map;
exports.constant = _transform.constant;
exports.tap = _transform.tap;
exports.ap = _applicative.ap;

/**
 * Transform each value in the stream by applying f to each
 * @param {function(*):*} f mapping function
 * @returns {Stream} stream containing items transformed by f
 */

_Stream2.default.prototype.map = function (f) {
  return (0, _transform.map)(f, this);
};

/**
 * Assume this stream contains functions, and apply each function to each item
 * in the provided stream.  This generates, in effect, a cross product.
 * @param {Stream} xs stream of items to which
 * @returns {Stream} stream containing the cross product of items
 */
_Stream2.default.prototype.ap = function (xs) {
  return (0, _applicative.ap)(this, xs);
};

/**
 * Replace each value in the stream with x
 * @param {*} x
 * @returns {Stream} stream containing items replaced with x
 */
_Stream2.default.prototype.constant = function (x) {
  return (0, _transform.constant)(x, this);
};

/**
 * Perform a side effect for each item in the stream
 * @param {function(x:*):*} f side effect to execute for each item. The
 *  return value will be discarded.
 * @returns {Stream} new stream containing the same items as this stream
 */
_Stream2.default.prototype.tap = function (f) {
  return (0, _transform.tap)(f, this);
};

// -----------------------------------------------------------------------
// Transducer support

exports.transduce = _transduce.transduce;

/**
 * Transform this stream by passing its events through a transducer.
 * @param  {function} transducer transducer function
 * @return {Stream} stream of events transformed by the transducer
 */

_Stream2.default.prototype.transduce = function (transducer) {
  return (0, _transduce.transduce)(transducer, this);
};

// -----------------------------------------------------------------------
// FlatMapping

// @deprecated flatMap, use chain instead
exports.flatMap = _flatMap.flatMap;
exports.chain = _flatMap.flatMap;
exports.join = _flatMap.join;

/**
 * Map each value in the stream to a new stream, and merge it into the
 * returned outer stream. Event arrival times are preserved.
 * @param {function(x:*):Stream} f chaining function, must return a Stream
 * @returns {Stream} new stream containing all events from each stream returned by f
 */

_Stream2.default.prototype.chain = function (f) {
  return (0, _flatMap.flatMap)(f, this);
};

// @deprecated use chain instead
_Stream2.default.prototype.flatMap = _Stream2.default.prototype.chain;

/**
* Monadic join. Flatten a Stream<Stream<X>> to Stream<X> by merging inner
* streams to the outer. Event arrival times are preserved.
* @returns {Stream<X>} new stream containing all events of all inner streams
*/
_Stream2.default.prototype.join = function () {
  return (0, _flatMap.join)(this);
};

// @deprecated flatMapEnd, use continueWith instead
exports.continueWith = _continueWith.continueWith;
exports.flatMapEnd = _continueWith.continueWith;

/**
 * Map the end event to a new stream, and begin emitting its values.
 * @param {function(x:*):Stream} f function that receives the end event value,
 * and *must* return a new Stream to continue with.
 * @returns {Stream} new stream that emits all events from the original stream,
 * followed by all events from the stream returned by f.
 */

_Stream2.default.prototype.continueWith = function (f) {
  return (0, _continueWith.continueWith)(f, this);
};

// @deprecated use continueWith instead
_Stream2.default.prototype.flatMapEnd = _Stream2.default.prototype.continueWith;

exports.concatMap = _concatMap.concatMap;

_Stream2.default.prototype.concatMap = function (f) {
  return (0, _concatMap.concatMap)(f, this);
};

// -----------------------------------------------------------------------
// Concurrent merging

exports.mergeConcurrently = _mergeConcurrently.mergeConcurrently;

/**
 * Flatten a Stream<Stream<X>> to Stream<X> by merging inner
 * streams to the outer, limiting the number of inner streams that may
 * be active concurrently.
 * @param {number} concurrency at most this many inner streams will be
 *  allowed to be active concurrently.
 * @return {Stream<X>} new stream containing all events of all inner
 *  streams, with limited concurrency.
 */

_Stream2.default.prototype.mergeConcurrently = function (concurrency) {
  return (0, _mergeConcurrently.mergeConcurrently)(concurrency, this);
};

// -----------------------------------------------------------------------
// Merging

exports.merge = _merge.merge;
exports.mergeArray = _merge.mergeArray;

/**
 * Merge this stream and all the provided streams
 * @returns {Stream} stream containing items from this stream and s in time
 * order.  If two events are simultaneous they will be merged in
 * arbitrary order.
 */

_Stream2.default.prototype.merge = function () /* ...streams */{
  return (0, _merge.mergeArray)(base.cons(this, arguments));
};

// -----------------------------------------------------------------------
// Combining

exports.combine = _combine.combine;
exports.combineArray = _combine.combineArray;

/**
 * Combine latest events from all input streams
 * @param {function(...events):*} f function to combine most recent events
 * @returns {Stream} stream containing the result of applying f to the most recent
 *  event of each input stream, whenever a new event arrives on any stream.
 */

_Stream2.default.prototype.combine = function (f /*, ...streams */) {
  return (0, _combine.combineArray)(f, base.replace(this, 0, arguments));
};

// -----------------------------------------------------------------------
// Sampling

exports.sample = _sample.sample;
exports.sampleArray = _sample.sampleArray;
exports.sampleWith = _sample.sampleWith;

/**
 * When an event arrives on sampler, emit the latest event value from stream.
 * @param {Stream} sampler stream of events at whose arrival time
 *  signal's latest value will be propagated
 * @returns {Stream} sampled stream of values
 */

_Stream2.default.prototype.sampleWith = function (sampler) {
  return (0, _sample.sampleWith)(sampler, this);
};

/**
 * When an event arrives on this stream, emit the result of calling f with the latest
 * values of all streams being sampled
 * @param {function(...values):*} f function to apply to each set of sampled values
 * @returns {Stream} stream of sampled and transformed values
 */
_Stream2.default.prototype.sample = function (f /* ...streams */) {
  return (0, _sample.sampleArray)(f, this, base.tail(arguments));
};

// -----------------------------------------------------------------------
// Zipping

exports.zip = _zip.zip;
exports.zipArray = _zip.zipArray;

/**
 * Pair-wise combine items with those in s. Given 2 streams:
 * [1,2,3] zipWith f [4,5,6] -> [f(1,4),f(2,5),f(3,6)]
 * Note: zip causes fast streams to buffer and wait for slow streams.
 * @param {function(a:Stream, b:Stream, ...):*} f function to combine items
 * @returns {Stream} new stream containing pairs
 */

_Stream2.default.prototype.zip = function (f /*, ...streams */) {
  return (0, _zip.zipArray)(f, base.replace(this, 0, arguments));
};

// -----------------------------------------------------------------------
// Switching

// @deprecated switch, use switchLatest instead
exports.switchLatest = _switch.switchLatest;
exports.switch = _switch.switchLatest;

/**
 * Given a stream of streams, return a new stream that adopts the behavior
 * of the most recent inner stream.
 * @returns {Stream} switching stream
 */

_Stream2.default.prototype.switchLatest = function () {
  return (0, _switch.switchLatest)(this);
};

// @deprecated use switchLatest instead
_Stream2.default.prototype.switch = _Stream2.default.prototype.switchLatest;

// -----------------------------------------------------------------------
// Filtering

// @deprecated distinct, use skipRepeats instead
// @deprecated distinctBy, use skipRepeatsWith instead
exports.filter = _filter.filter;
exports.skipRepeats = _filter.skipRepeats;
exports.distinct = _filter.skipRepeats;
exports.skipRepeatsWith = _filter.skipRepeatsWith;
exports.distinctBy = _filter.skipRepeatsWith;

/**
 * Retain only items matching a predicate
 * stream:                           -12345678-
 * filter(x => x % 2 === 0, stream): --2-4-6-8-
 * @param {function(x:*):boolean} p filtering predicate called for each item
 * @returns {Stream} stream containing only items for which predicate returns truthy
 */

_Stream2.default.prototype.filter = function (p) {
  return (0, _filter.filter)(p, this);
};

/**
 * Skip repeated events, using === to compare items
 * stream:           -abbcd-
 * distinct(stream): -ab-cd-
 * @returns {Stream} stream with no repeated events
 */
_Stream2.default.prototype.skipRepeats = function () {
  return (0, _filter.skipRepeats)(this);
};

/**
 * Skip repeated events, using supplied equals function to compare items
 * @param {function(a:*, b:*):boolean} equals function to compare items
 * @returns {Stream} stream with no repeated events
 */
_Stream2.default.prototype.skipRepeatsWith = function (equals) {
  return (0, _filter.skipRepeatsWith)(equals, this);
};

// -----------------------------------------------------------------------
// Slicing

exports.take = _slice.take;
exports.skip = _slice.skip;
exports.slice = _slice.slice;
exports.takeWhile = _slice.takeWhile;
exports.skipWhile = _slice.skipWhile;
exports.skipAfter = _slice.skipAfter;

/**
 * stream:          -abcd-
 * take(2, stream): -ab|
 * @param {Number} n take up to this many events
 * @returns {Stream} stream containing at most the first n items from this stream
 */

_Stream2.default.prototype.take = function (n) {
  return (0, _slice.take)(n, this);
};

/**
 * stream:          -abcd->
 * skip(2, stream): ---cd->
 * @param {Number} n skip this many events
 * @returns {Stream} stream not containing the first n events
 */
_Stream2.default.prototype.skip = function (n) {
  return (0, _slice.skip)(n, this);
};

/**
 * Slice a stream by event index. Equivalent to, but more efficient than
 * stream.take(end).skip(start);
 * NOTE: Negative start and end are not supported
 * @param {Number} start skip all events before the start index
 * @param {Number} end allow all events from the start index to the end index
 * @returns {Stream} stream containing items where start <= index < end
 */
_Stream2.default.prototype.slice = function (start, end) {
  return (0, _slice.slice)(start, end, this);
};

/**
 * stream:                        -123451234->
 * takeWhile(x => x < 5, stream): -1234|
 * @param {function(x:*):boolean} p predicate
 * @returns {Stream} stream containing items up to, but not including, the
 * first item for which p returns falsy.
 */
_Stream2.default.prototype.takeWhile = function (p) {
  return (0, _slice.takeWhile)(p, this);
};

/**
 * stream:                        -123451234->
 * skipWhile(x => x < 5, stream): -----51234->
 * @param {function(x:*):boolean} p predicate
 * @returns {Stream} stream containing items following *and including* the
 * first item for which p returns falsy.
 */
_Stream2.default.prototype.skipWhile = function (p) {
  return (0, _slice.skipWhile)(p, this);
};

/**
 * stream:                         -123456789->
 * skipAfter(x => x === 5, stream):-12345|
 * @param {function(x:*):boolean} p predicate
 * @returns {Stream} stream containing items up to, *and including*, the
 * first item for which p returns truthy.
 */
_Stream2.default.prototype.skipAfter = function (p) {
  return (0, _slice.skipAfter)(p, this);
};

// -----------------------------------------------------------------------
// Time slicing

// @deprecated takeUntil, use until instead
// @deprecated skipUntil, use since instead
exports.takeUntil = _timeslice.takeUntil;
exports.until = _timeslice.takeUntil;
exports.skipUntil = _timeslice.skipUntil;
exports.since = _timeslice.skipUntil;
exports.during = _timeslice.during;

/**
 * stream:                    -a-b-c-d-e-f-g->
 * signal:                    -------x
 * takeUntil(signal, stream): -a-b-c-|
 * @param {Stream} signal retain only events in stream before the first
 * event in signal
 * @returns {Stream} new stream containing only events that occur before
 * the first event in signal.
 */

_Stream2.default.prototype.until = function (signal) {
  return (0, _timeslice.takeUntil)(signal, this);
};

// @deprecated use until instead
_Stream2.default.prototype.takeUntil = _Stream2.default.prototype.until;

/**
* stream:                    -a-b-c-d-e-f-g->
* signal:                    -------x
* takeUntil(signal, stream): -------d-e-f-g->
* @param {Stream} signal retain only events in stream at or after the first
* event in signal
* @returns {Stream} new stream containing only events that occur after
* the first event in signal.
*/
_Stream2.default.prototype.since = function (signal) {
  return (0, _timeslice.skipUntil)(signal, this);
};

// @deprecated use since instead
_Stream2.default.prototype.skipUntil = _Stream2.default.prototype.since;

/**
* stream:                    -a-b-c-d-e-f-g->
* timeWindow:                -----s
* s:                               -----t
* stream.during(timeWindow): -----c-d-e-|
* @param {Stream<Stream>} timeWindow a stream whose first event (s) represents
*  the window start time.  That event (s) is itself a stream whose first event (t)
*  represents the window end time
* @returns {Stream} new stream containing only events within the provided timespan
*/
_Stream2.default.prototype.during = function (timeWindow) {
  return (0, _timeslice.during)(timeWindow, this);
};

// -----------------------------------------------------------------------
// Delaying

exports.delay = _delay.delay;

/**
 * @param {Number} delayTime milliseconds to delay each item
 * @returns {Stream} new stream containing the same items, but delayed by ms
 */

_Stream2.default.prototype.delay = function (delayTime) {
  return (0, _delay.delay)(delayTime, this);
};

// -----------------------------------------------------------------------
// Getting event timestamp

exports.timestamp = _timestamp.timestamp;

/**
 * Expose event timestamps into the stream. Turns a Stream<X> into
 * Stream<{time:t, value:X}>
 * @returns {Stream<{time:number, value:*}>}
 */

_Stream2.default.prototype.timestamp = function () {
  return (0, _timestamp.timestamp)(this);
};

// -----------------------------------------------------------------------
// Rate limiting

exports.throttle = _limit.throttle;
exports.debounce = _limit.debounce;

/**
 * Limit the rate of events
 * stream:              abcd----abcd----
 * throttle(2, stream): a-c-----a-c-----
 * @param {Number} period time to suppress events
 * @returns {Stream} new stream that skips events for throttle period
 */

_Stream2.default.prototype.throttle = function (period) {
  return (0, _limit.throttle)(period, this);
};

/**
 * Wait for a burst of events to subside and emit only the last event in the burst
 * stream:              abcd----abcd----
 * debounce(2, stream): -----d-------d--
 * @param {Number} period events occuring more frequently than this
 *  on the provided scheduler will be suppressed
 * @returns {Stream} new debounced stream
 */
_Stream2.default.prototype.debounce = function (period) {
  return (0, _limit.debounce)(period, this);
};

// -----------------------------------------------------------------------
// Awaiting Promises

// @deprecated await, use awaitPromises instead
exports.fromPromise = _promises.fromPromise;
exports.awaitPromises = _promises.awaitPromises;
exports.await = _promises.awaitPromises;

/**
 * Await promises, turning a Stream<Promise<X>> into Stream<X>.  Preserves
 * event order, but timeshifts events based on promise resolution time.
 * @returns {Stream<X>} stream containing non-promise values
 */

_Stream2.default.prototype.awaitPromises = function () {
  return (0, _promises.awaitPromises)(this);
};

// @deprecated use awaitPromises instead
_Stream2.default.prototype.await = _Stream2.default.prototype.awaitPromises;

// -----------------------------------------------------------------------
// Error handling

// @deprecated flatMapError, use recoverWith instead
exports.recoverWith = _errors.recoverWith;
exports.flatMapError = _errors.flatMapError;
exports.throwError = _errors.throwError;

/**
 * If this stream encounters an error, recover and continue with items from stream
 * returned by f.
 * stream:                  -a-b-c-X-
 * f(X):                           d-e-f-g-
 * flatMapError(f, stream): -a-b-c-d-e-f-g-
 * @param {function(error:*):Stream} f function which returns a new stream
 * @returns {Stream} new stream which will recover from an error by calling f
 */

_Stream2.default.prototype.recoverWith = function (f) {
  return (0, _errors.flatMapError)(f, this);
};

// @deprecated use recoverWith instead
_Stream2.default.prototype.flatMapError = _Stream2.default.prototype.recoverWith;

// -----------------------------------------------------------------------
// Multicasting

exports.multicast = _multicast2.default;

/**
 * Transform the stream into multicast stream.  That means that many subscribers
 * to the stream will not cause multiple invocations of the internal machinery.
 * @returns {Stream} new stream which will multicast events to all observers.
 */

_Stream2.default.prototype.multicast = function () {
  return (0, _multicast2.default)(this);
};

// export the instance of the defaultScheduler for third-party libraries
exports.defaultScheduler = _defaultScheduler2.default;

// export an implementation of Task used internally for third-party libraries

exports.PropagateTask = _PropagateTask2.default;

},{"./Stream":15,"./combinator/accumulate":16,"./combinator/applicative":17,"./combinator/build":18,"./combinator/combine":19,"./combinator/concatMap":20,"./combinator/continueWith":21,"./combinator/delay":22,"./combinator/errors":23,"./combinator/filter":24,"./combinator/flatMap":25,"./combinator/limit":26,"./combinator/loop":27,"./combinator/merge":28,"./combinator/mergeConcurrently":29,"./combinator/observe":30,"./combinator/promises":31,"./combinator/sample":32,"./combinator/slice":33,"./combinator/switch":34,"./combinator/thru":35,"./combinator/timeslice":36,"./combinator/timestamp":37,"./combinator/transduce":38,"./combinator/transform":39,"./combinator/zip":40,"./observable/subscribe":53,"./scheduler/PropagateTask":56,"./scheduler/defaultScheduler":60,"./source/core":67,"./source/from":68,"./source/fromEvent":70,"./source/generate":72,"./source/iterate":73,"./source/periodic":74,"./source/unfold":76,"@most/multicast":4,"@most/prelude":5,"symbol-observable":78}],49:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = invoke;
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function invoke(f, args) {
  /* eslint complexity: [2,7] */
  switch (args.length) {
    case 0:
      return f();
    case 1:
      return f(args[0]);
    case 2:
      return f(args[0], args[1]);
    case 3:
      return f(args[0], args[1], args[2]);
    case 4:
      return f(args[0], args[1], args[2], args[3]);
    case 5:
      return f(args[0], args[1], args[2], args[3], args[4]);
    default:
      return f.apply(void 0, args);
  }
}

},{}],50:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isIterable = isIterable;
exports.getIterator = getIterator;
exports.makeIterable = makeIterable;
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

/* global Set, Symbol */
var iteratorSymbol;
// Firefox ships a partial implementation using the name @@iterator.
// https://bugzilla.mozilla.org/show_bug.cgi?id=907077#c14
if (typeof Set === 'function' && typeof new Set()['@@iterator'] === 'function') {
  iteratorSymbol = '@@iterator';
} else {
  iteratorSymbol = typeof Symbol === 'function' ? Symbol.iterator : '_es6shim_iterator_';
}

function isIterable(o) {
  return typeof o[iteratorSymbol] === 'function';
}

function getIterator(o) {
  return o[iteratorSymbol]();
}

function makeIterable(f, o) {
  o[iteratorSymbol] = f;
  return o;
}

},{}],51:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fromObservable = fromObservable;
exports.ObservableSource = ObservableSource;
exports.SubscriberSink = SubscriberSink;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _tryEvent = require('../source/tryEvent');

function _interopRequireWildcard(obj) {
  if (obj && obj.__esModule) {
    return obj;
  } else {
    var newObj = {};if (obj != null) {
      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          newObj[key] = obj[key];
        }
      }
    }newObj.default = obj;return newObj;
  }
}

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function fromObservable(observable) {
  return new _Stream2.default(new ObservableSource(observable));
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function ObservableSource(observable) {
  this.observable = observable;
}

ObservableSource.prototype.run = function (sink, scheduler) {
  var sub = this.observable.subscribe(new SubscriberSink(sink, scheduler));
  if (typeof sub === 'function') {
    return dispose.create(sub);
  } else if (sub && typeof sub.unsubscribe === 'function') {
    return dispose.create(unsubscribe, sub);
  }

  throw new TypeError('Observable returned invalid subscription ' + String(sub));
};

function SubscriberSink(sink, scheduler) {
  this.sink = sink;
  this.scheduler = scheduler;
}

SubscriberSink.prototype.next = function (x) {
  (0, _tryEvent.tryEvent)(this.scheduler.now(), x, this.sink);
};

SubscriberSink.prototype.complete = function (x) {
  (0, _tryEvent.tryEnd)(this.scheduler.now(), x, this.sink);
};

SubscriberSink.prototype.error = function (e) {
  this.sink.error(this.scheduler.now(), e);
};

function unsubscribe(subscription) {
  return subscription.unsubscribe();
}

},{"../Stream":15,"../disposable/dispose":43,"../source/tryEvent":75}],52:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = getObservable;

var _symbolObservable = require('symbol-observable');

var _symbolObservable2 = _interopRequireDefault(_symbolObservable);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function getObservable(o) {
  // eslint-disable-line complexity
  var obs = null;
  if (o) {
    // Access foreign method only once
    var method = o[_symbolObservable2.default];
    if (typeof method === 'function') {
      obs = method.call(o);
      if (!(obs && typeof obs.subscribe === 'function')) {
        throw new TypeError('invalid observable ' + obs);
      }
    }
  }

  return obs;
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

},{"symbol-observable":78}],53:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.subscribe = subscribe;
exports.SubscribeObserver = SubscribeObserver;
exports.Subscription = Subscription;

var _defaultScheduler = require('../scheduler/defaultScheduler');

var _defaultScheduler2 = _interopRequireDefault(_defaultScheduler);

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _fatalError = require('../fatalError');

var _fatalError2 = _interopRequireDefault(_fatalError);

function _interopRequireWildcard(obj) {
  if (obj && obj.__esModule) {
    return obj;
  } else {
    var newObj = {};if (obj != null) {
      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          newObj[key] = obj[key];
        }
      }
    }newObj.default = obj;return newObj;
  }
}

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function subscribe(subscriber, stream) {
  if (Object(subscriber) !== subscriber) {
    throw new TypeError('subscriber must be an object');
  }

  var disposable = dispose.settable();
  var observer = new SubscribeObserver(_fatalError2.default, subscriber, disposable);

  disposable.setDisposable(stream.source.run(observer, _defaultScheduler2.default));

  return new Subscription(disposable);
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function SubscribeObserver(fatalError, subscriber, disposable) {
  this.fatalError = fatalError;
  this.subscriber = subscriber;
  this.disposable = disposable;
}

SubscribeObserver.prototype.event = function (t, x) {
  if (!this.disposable.disposed && typeof this.subscriber.next === 'function') {
    this.subscriber.next(x);
  }
};

SubscribeObserver.prototype.end = function (t, x) {
  if (!this.disposable.disposed) {
    var s = this.subscriber;
    var fatalError = this.fatalError;
    Promise.resolve(this.disposable.dispose()).then(function () {
      if (typeof s.complete === 'function') {
        s.complete(x);
      }
    }).catch(function (e) {
      throwError(e, s, fatalError);
    });
  }
};

SubscribeObserver.prototype.error = function (t, e) {
  var s = this.subscriber;
  var fatalError = this.fatalError;
  Promise.resolve(this.disposable.dispose()).then(function () {
    throwError(e, s, fatalError);
  });
};

function Subscription(disposable) {
  this.disposable = disposable;
}

Subscription.prototype.unsubscribe = function () {
  this.disposable.dispose();
};

function throwError(e1, subscriber, throwError) {
  if (typeof subscriber.error === 'function') {
    try {
      subscriber.error(e1);
    } catch (e2) {
      throwError(e2);
    }
  } else {
    throwError(e1);
  }
}

},{"../disposable/dispose":43,"../fatalError":44,"../scheduler/defaultScheduler":60}],54:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.withDefaultScheduler = withDefaultScheduler;
exports.withScheduler = withScheduler;

var _dispose = require('./disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _defaultScheduler = require('./scheduler/defaultScheduler');

var _defaultScheduler2 = _interopRequireDefault(_defaultScheduler);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function _interopRequireWildcard(obj) {
  if (obj && obj.__esModule) {
    return obj;
  } else {
    var newObj = {};if (obj != null) {
      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          newObj[key] = obj[key];
        }
      }
    }newObj.default = obj;return newObj;
  }
}

/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function withDefaultScheduler(source) {
  return withScheduler(source, _defaultScheduler2.default);
}

function withScheduler(source, scheduler) {
  return new Promise(function (resolve, reject) {
    runSource(source, scheduler, resolve, reject);
  });
}

function runSource(source, scheduler, resolve, reject) {
  var disposable = dispose.settable();
  var observer = new Drain(resolve, reject, disposable);

  disposable.setDisposable(source.run(observer, scheduler));
}

function Drain(end, error, disposable) {
  this._end = end;
  this._error = error;
  this._disposable = disposable;
  this.active = true;
}

Drain.prototype.event = function (t, x) {};

Drain.prototype.end = function (t, x) {
  if (!this.active) {
    return;
  }
  this.active = false;
  disposeThen(this._end, this._error, this._disposable, x);
};

Drain.prototype.error = function (t, e) {
  this.active = false;
  disposeThen(this._error, this._error, this._disposable, e);
};

function disposeThen(end, error, disposable, x) {
  Promise.resolve(disposable.dispose()).then(function () {
    end(x);
  }, error);
}

},{"./disposable/dispose":43,"./scheduler/defaultScheduler":60}],55:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = ClockTimer;

var _task = require('../task');

/* global setTimeout, clearTimeout */

function ClockTimer() {} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

ClockTimer.prototype.now = Date.now;

ClockTimer.prototype.setTimer = function (f, dt) {
  return dt <= 0 ? runAsap(f) : setTimeout(f, dt);
};

ClockTimer.prototype.clearTimer = function (t) {
  return t instanceof Asap ? t.cancel() : clearTimeout(t);
};

function Asap(f) {
  this.f = f;
  this.active = true;
}

Asap.prototype.run = function () {
  return this.active && this.f();
};

Asap.prototype.error = function (e) {
  throw e;
};

Asap.prototype.cancel = function () {
  this.active = false;
};

function runAsap(f) {
  var task = new Asap(f);
  (0, _task.defer)(task);
  return task;
}

},{"../task":77}],56:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = PropagateTask;

var _fatalError = require('../fatalError');

var _fatalError2 = _interopRequireDefault(_fatalError);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function PropagateTask(run, value, sink) {
  this._run = run;
  this.value = value;
  this.sink = sink;
  this.active = true;
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

PropagateTask.event = function (value, sink) {
  return new PropagateTask(emit, value, sink);
};

PropagateTask.end = function (value, sink) {
  return new PropagateTask(end, value, sink);
};

PropagateTask.error = function (value, sink) {
  return new PropagateTask(error, value, sink);
};

PropagateTask.prototype.dispose = function () {
  this.active = false;
};

PropagateTask.prototype.run = function (t) {
  if (!this.active) {
    return;
  }
  this._run(t, this.value, this.sink);
};

PropagateTask.prototype.error = function (t, e) {
  if (!this.active) {
    return (0, _fatalError2.default)(e);
  }
  this.sink.error(t, e);
};

function error(t, e, sink) {
  sink.error(t, e);
}

function emit(t, x, sink) {
  sink.event(t, x);
}

function end(t, x, sink) {
  sink.end(t, x);
}

},{"../fatalError":44}],57:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = ScheduledTask;
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function ScheduledTask(delay, period, task, scheduler) {
  this.time = delay;
  this.period = period;
  this.task = task;
  this.scheduler = scheduler;
  this.active = true;
}

ScheduledTask.prototype.run = function () {
  return this.task.run(this.time);
};

ScheduledTask.prototype.error = function (e) {
  return this.task.error(this.time, e);
};

ScheduledTask.prototype.dispose = function () {
  this.scheduler.cancel(this);
  return this.task.dispose();
};

},{}],58:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Scheduler;

var _ScheduledTask = require('./ScheduledTask');

var _ScheduledTask2 = _interopRequireDefault(_ScheduledTask);

var _task = require('../task');

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function Scheduler(timer, timeline) {
  this.timer = timer;
  this.timeline = timeline;

  this._timer = null;
  this._nextArrival = Infinity;

  var self = this;
  this._runReadyTasksBound = function () {
    self._runReadyTasks(self.now());
  };
}

Scheduler.prototype.now = function () {
  return this.timer.now();
};

Scheduler.prototype.asap = function (task) {
  return this.schedule(0, -1, task);
};

Scheduler.prototype.delay = function (delay, task) {
  return this.schedule(delay, -1, task);
};

Scheduler.prototype.periodic = function (period, task) {
  return this.schedule(0, period, task);
};

Scheduler.prototype.schedule = function (delay, period, task) {
  var now = this.now();
  var st = new _ScheduledTask2.default(now + Math.max(0, delay), period, task, this);

  this.timeline.add(st);
  this._scheduleNextRun(now);
  return st;
};

Scheduler.prototype.cancel = function (task) {
  task.active = false;
  if (this.timeline.remove(task)) {
    this._reschedule();
  }
};

Scheduler.prototype.cancelAll = function (f) {
  this.timeline.removeAll(f);
  this._reschedule();
};

Scheduler.prototype._reschedule = function () {
  if (this.timeline.isEmpty()) {
    this._unschedule();
  } else {
    this._scheduleNextRun(this.now());
  }
};

Scheduler.prototype._unschedule = function () {
  this.timer.clearTimer(this._timer);
  this._timer = null;
};

Scheduler.prototype._scheduleNextRun = function (now) {
  // eslint-disable-line complexity
  if (this.timeline.isEmpty()) {
    return;
  }

  var nextArrival = this.timeline.nextArrival();

  if (this._timer === null) {
    this._scheduleNextArrival(nextArrival, now);
  } else if (nextArrival < this._nextArrival) {
    this._unschedule();
    this._scheduleNextArrival(nextArrival, now);
  }
};

Scheduler.prototype._scheduleNextArrival = function (nextArrival, now) {
  this._nextArrival = nextArrival;
  var delay = Math.max(0, nextArrival - now);
  this._timer = this.timer.setTimer(this._runReadyTasksBound, delay);
};

Scheduler.prototype._runReadyTasks = function (now) {
  this._timer = null;
  this.timeline.runTasks(now, _task.runTask);
  this._scheduleNextRun(this.now());
};

},{"../task":77,"./ScheduledTask":57}],59:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Timeline;

var _prelude = require('@most/prelude');

var base = _interopRequireWildcard(_prelude);

function _interopRequireWildcard(obj) {
  if (obj && obj.__esModule) {
    return obj;
  } else {
    var newObj = {};if (obj != null) {
      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          newObj[key] = obj[key];
        }
      }
    }newObj.default = obj;return newObj;
  }
}

function Timeline() {
  this.tasks = [];
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

Timeline.prototype.nextArrival = function () {
  return this.isEmpty() ? Infinity : this.tasks[0].time;
};

Timeline.prototype.isEmpty = function () {
  return this.tasks.length === 0;
};

Timeline.prototype.add = function (st) {
  insertByTime(st, this.tasks);
};

Timeline.prototype.remove = function (st) {
  var i = binarySearch(st.time, this.tasks);

  if (i >= 0 && i < this.tasks.length) {
    var at = base.findIndex(st, this.tasks[i].events);
    if (at >= 0) {
      this.tasks[i].events.splice(at, 1);
      return true;
    }
  }

  return false;
};

Timeline.prototype.removeAll = function (f) {
  var this$1 = this;

  for (var i = 0, l = this.tasks.length; i < l; ++i) {
    removeAllFrom(f, this$1.tasks[i]);
  }
};

Timeline.prototype.runTasks = function (t, runTask) {
  var this$1 = this;

  var tasks = this.tasks;
  var l = tasks.length;
  var i = 0;

  while (i < l && tasks[i].time <= t) {
    ++i;
  }

  this.tasks = tasks.slice(i);

  // Run all ready tasks
  for (var j = 0; j < i; ++j) {
    this$1.tasks = runTasks(runTask, tasks[j], this$1.tasks);
  }
};

function runTasks(runTask, timeslot, tasks) {
  // eslint-disable-line complexity
  var events = timeslot.events;
  for (var i = 0; i < events.length; ++i) {
    var task = events[i];

    if (task.active) {
      runTask(task);

      // Reschedule periodic repeating tasks
      // Check active again, since a task may have canceled itself
      if (task.period >= 0 && task.active) {
        task.time = task.time + task.period;
        insertByTime(task, tasks);
      }
    }
  }

  return tasks;
}

function insertByTime(task, timeslots) {
  // eslint-disable-line complexity
  var l = timeslots.length;

  if (l === 0) {
    timeslots.push(newTimeslot(task.time, [task]));
    return;
  }

  var i = binarySearch(task.time, timeslots);

  if (i >= l) {
    timeslots.push(newTimeslot(task.time, [task]));
  } else if (task.time === timeslots[i].time) {
    timeslots[i].events.push(task);
  } else {
    timeslots.splice(i, 0, newTimeslot(task.time, [task]));
  }
}

function removeAllFrom(f, timeslot) {
  timeslot.events = base.removeAll(f, timeslot.events);
}

function binarySearch(t, sortedArray) {
  // eslint-disable-line complexity
  var lo = 0;
  var hi = sortedArray.length;
  var mid, y;

  while (lo < hi) {
    mid = Math.floor((lo + hi) / 2);
    y = sortedArray[mid];

    if (t === y.time) {
      return mid;
    } else if (t < y.time) {
      hi = mid;
    } else {
      lo = mid + 1;
    }
  }
  return hi;
}

function newTimeslot(t, events) {
  return { time: t, events: events };
}

},{"@most/prelude":5}],60:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _Scheduler = require('./Scheduler');

var _Scheduler2 = _interopRequireDefault(_Scheduler);

var _ClockTimer = require('./ClockTimer');

var _ClockTimer2 = _interopRequireDefault(_ClockTimer);

var _Timeline = require('./Timeline');

var _Timeline2 = _interopRequireDefault(_Timeline);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

var defaultScheduler = new _Scheduler2.default(new _ClockTimer2.default(), new _Timeline2.default()); /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

exports.default = defaultScheduler;

},{"./ClockTimer":55,"./Scheduler":58,"./Timeline":59}],61:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = DeferredSink;

var _task = require('../task');

function DeferredSink(sink) {
  this.sink = sink;
  this.events = [];
  this.active = true;
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

DeferredSink.prototype.event = function (t, x) {
  if (!this.active) {
    return;
  }

  if (this.events.length === 0) {
    (0, _task.defer)(new PropagateAllTask(this.sink, t, this.events));
  }

  this.events.push({ time: t, value: x });
};

DeferredSink.prototype.end = function (t, x) {
  if (!this.active) {
    return;
  }

  this._end(new EndTask(t, x, this.sink));
};

DeferredSink.prototype.error = function (t, e) {
  this._end(new ErrorTask(t, e, this.sink));
};

DeferredSink.prototype._end = function (task) {
  this.active = false;
  (0, _task.defer)(task);
};

function PropagateAllTask(sink, time, events) {
  this.sink = sink;
  this.events = events;
  this.time = time;
}

PropagateAllTask.prototype.run = function () {
  var this$1 = this;

  var events = this.events;
  var sink = this.sink;
  var event;

  for (var i = 0, l = events.length; i < l; ++i) {
    event = events[i];
    this$1.time = event.time;
    sink.event(event.time, event.value);
  }

  events.length = 0;
};

PropagateAllTask.prototype.error = function (e) {
  this.sink.error(this.time, e);
};

function EndTask(t, x, sink) {
  this.time = t;
  this.value = x;
  this.sink = sink;
}

EndTask.prototype.run = function () {
  this.sink.end(this.time, this.value);
};

EndTask.prototype.error = function (e) {
  this.sink.error(this.time, e);
};

function ErrorTask(t, e, sink) {
  this.time = t;
  this.value = e;
  this.sink = sink;
}

ErrorTask.prototype.run = function () {
  this.sink.error(this.time, this.value);
};

ErrorTask.prototype.error = function (e) {
  throw e;
};

},{"../task":77}],62:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = IndexSink;

var _Pipe = require('./Pipe');

var _Pipe2 = _interopRequireDefault(_Pipe);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function IndexSink(i, sink) {
  this.sink = sink;
  this.index = i;
  this.active = true;
  this.value = void 0;
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

IndexSink.prototype.event = function (t, x) {
  if (!this.active) {
    return;
  }
  this.value = x;
  this.sink.event(t, this);
};

IndexSink.prototype.end = function (t, x) {
  if (!this.active) {
    return;
  }
  this.active = false;
  this.sink.end(t, { index: this.index, value: x });
};

IndexSink.prototype.error = _Pipe2.default.prototype.error;

},{"./Pipe":63}],63:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Pipe;
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

/**
 * A sink mixin that simply forwards event, end, and error to
 * another sink.
 * @param sink
 * @constructor
 */
function Pipe(sink) {
  this.sink = sink;
}

Pipe.prototype.event = function (t, x) {
  return this.sink.event(t, x);
};

Pipe.prototype.end = function (t, x) {
  return this.sink.end(t, x);
};

Pipe.prototype.error = function (t, e) {
  return this.sink.error(t, e);
};

},{}],64:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = SafeSink;
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function SafeSink(sink) {
  this.sink = sink;
  this.active = true;
}

SafeSink.prototype.event = function (t, x) {
  if (!this.active) {
    return;
  }
  this.sink.event(t, x);
};

SafeSink.prototype.end = function (t, x) {
  if (!this.active) {
    return;
  }
  this.disable();
  this.sink.end(t, x);
};

SafeSink.prototype.error = function (t, e) {
  this.disable();
  this.sink.error(t, e);
};

SafeSink.prototype.disable = function () {
  this.active = false;
  return this.sink;
};

},{}],65:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = EventEmitterSource;

var _DeferredSink = require('../sink/DeferredSink');

var _DeferredSink2 = _interopRequireDefault(_DeferredSink);

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _tryEvent = require('./tryEvent');

var tryEvent = _interopRequireWildcard(_tryEvent);

function _interopRequireWildcard(obj) {
  if (obj && obj.__esModule) {
    return obj;
  } else {
    var newObj = {};if (obj != null) {
      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          newObj[key] = obj[key];
        }
      }
    }newObj.default = obj;return newObj;
  }
}

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function EventEmitterSource(event, source) {
  this.event = event;
  this.source = source;
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

EventEmitterSource.prototype.run = function (sink, scheduler) {
  // NOTE: Because EventEmitter allows events in the same call stack as
  // a listener is added, use a DeferredSink to buffer events
  // until the stack clears, then propagate.  This maintains most.js's
  // invariant that no event will be delivered in the same call stack
  // as an observer begins observing.
  var dsink = new _DeferredSink2.default(sink);

  function addEventVariadic(a) {
    var arguments$1 = arguments;

    var l = arguments.length;
    if (l > 1) {
      var arr = new Array(l);
      for (var i = 0; i < l; ++i) {
        arr[i] = arguments$1[i];
      }
      tryEvent.tryEvent(scheduler.now(), arr, dsink);
    } else {
      tryEvent.tryEvent(scheduler.now(), a, dsink);
    }
  }

  this.source.addListener(this.event, addEventVariadic);

  return dispose.create(disposeEventEmitter, { target: this, addEvent: addEventVariadic });
};

function disposeEventEmitter(info) {
  var target = info.target;
  target.source.removeListener(target.event, info.addEvent);
}

},{"../disposable/dispose":43,"../sink/DeferredSink":61,"./tryEvent":75}],66:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = EventTargetSource;

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _tryEvent = require('./tryEvent');

var tryEvent = _interopRequireWildcard(_tryEvent);

function _interopRequireWildcard(obj) {
  if (obj && obj.__esModule) {
    return obj;
  } else {
    var newObj = {};if (obj != null) {
      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          newObj[key] = obj[key];
        }
      }
    }newObj.default = obj;return newObj;
  }
}

/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function EventTargetSource(event, source, capture) {
  this.event = event;
  this.source = source;
  this.capture = capture;
}

EventTargetSource.prototype.run = function (sink, scheduler) {
  function addEvent(e) {
    tryEvent.tryEvent(scheduler.now(), e, sink);
  }

  this.source.addEventListener(this.event, addEvent, this.capture);

  return dispose.create(disposeEventTarget, { target: this, addEvent: addEvent });
};

function disposeEventTarget(info) {
  var target = info.target;
  target.source.removeEventListener(target.event, info.addEvent, target.capture);
}

},{"../disposable/dispose":43,"./tryEvent":75}],67:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.of = of;
exports.empty = empty;
exports.never = never;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _dispose = require('../disposable/dispose');

var dispose = _interopRequireWildcard(_dispose);

var _PropagateTask = require('../scheduler/PropagateTask');

var _PropagateTask2 = _interopRequireDefault(_PropagateTask);

function _interopRequireWildcard(obj) {
  if (obj && obj.__esModule) {
    return obj;
  } else {
    var newObj = {};if (obj != null) {
      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          newObj[key] = obj[key];
        }
      }
    }newObj.default = obj;return newObj;
  }
}

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

/**
 * Stream containing only x
 * @param {*} x
 * @returns {Stream}
 */
function of(x) {
  return new _Stream2.default(new Just(x));
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function Just(x) {
  this.value = x;
}

Just.prototype.run = function (sink, scheduler) {
  return scheduler.asap(new _PropagateTask2.default(runJust, this.value, sink));
};

function runJust(t, x, sink) {
  sink.event(t, x);
  sink.end(t, void 0);
}

/**
 * Stream containing no events and ends immediately
 * @returns {Stream}
 */
function empty() {
  return EMPTY;
}

function EmptySource() {}

EmptySource.prototype.run = function (sink, scheduler) {
  var task = _PropagateTask2.default.end(void 0, sink);
  scheduler.asap(task);

  return dispose.create(disposeEmpty, task);
};

function disposeEmpty(task) {
  return task.dispose();
}

var EMPTY = new _Stream2.default(new EmptySource());

/**
 * Stream containing no events and never ends
 * @returns {Stream}
 */
function never() {
  return NEVER;
}

function NeverSource() {}

NeverSource.prototype.run = function () {
  return dispose.empty();
};

var NEVER = new _Stream2.default(new NeverSource());

},{"../Stream":15,"../disposable/dispose":43,"../scheduler/PropagateTask":56}],68:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.from = from;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _fromArray = require('./fromArray');

var _iterable = require('../iterable');

var _fromIterable = require('./fromIterable');

var _getObservable = require('../observable/getObservable');

var _getObservable2 = _interopRequireDefault(_getObservable);

var _fromObservable = require('../observable/fromObservable');

var _prelude = require('@most/prelude');

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function from(a) {
  // eslint-disable-line complexity
  if (a instanceof _Stream2.default) {
    return a;
  }

  var observable = (0, _getObservable2.default)(a);
  if (observable != null) {
    return (0, _fromObservable.fromObservable)(observable);
  }

  if (Array.isArray(a) || (0, _prelude.isArrayLike)(a)) {
    return (0, _fromArray.fromArray)(a);
  }

  if ((0, _iterable.isIterable)(a)) {
    return (0, _fromIterable.fromIterable)(a);
  }

  throw new TypeError('from(x) must be observable, iterable, or array-like: ' + a);
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

},{"../Stream":15,"../iterable":50,"../observable/fromObservable":51,"../observable/getObservable":52,"./fromArray":69,"./fromIterable":71,"@most/prelude":5}],69:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fromArray = fromArray;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _PropagateTask = require('../scheduler/PropagateTask');

var _PropagateTask2 = _interopRequireDefault(_PropagateTask);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function fromArray(a) {
  return new _Stream2.default(new ArraySource(a));
}

function ArraySource(a) {
  this.array = a;
}

ArraySource.prototype.run = function (sink, scheduler) {
  return scheduler.asap(new _PropagateTask2.default(runProducer, this.array, sink));
};

function runProducer(t, array, sink) {
  for (var i = 0, l = array.length; i < l && this.active; ++i) {
    sink.event(t, array[i]);
  }

  this.active && sink.end(t);
}

},{"../Stream":15,"../scheduler/PropagateTask":56}],70:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fromEvent = fromEvent;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _EventTargetSource = require('./EventTargetSource');

var _EventTargetSource2 = _interopRequireDefault(_EventTargetSource);

var _EventEmitterSource = require('./EventEmitterSource');

var _EventEmitterSource2 = _interopRequireDefault(_EventEmitterSource);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

/**
 * Create a stream from an EventTarget, such as a DOM Node, or EventEmitter.
 * @param {String} event event type name, e.g. 'click'
 * @param {EventTarget|EventEmitter} source EventTarget or EventEmitter
 * @param {*?} capture for DOM events, whether to use
 *  capturing--passed as 3rd parameter to addEventListener.
 * @returns {Stream} stream containing all events of the specified type
 * from the source.
 */
function fromEvent(event, source, capture) {
  // eslint-disable-line complexity
  var s;

  if (typeof source.addEventListener === 'function' && typeof source.removeEventListener === 'function') {
    if (arguments.length < 3) {
      capture = false;
    }

    s = new _EventTargetSource2.default(event, source, capture);
  } else if (typeof source.addListener === 'function' && typeof source.removeListener === 'function') {
    s = new _EventEmitterSource2.default(event, source);
  } else {
    throw new Error('source must support addEventListener/removeEventListener or addListener/removeListener');
  }

  return new _Stream2.default(s);
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

},{"../Stream":15,"./EventEmitterSource":65,"./EventTargetSource":66}],71:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fromIterable = fromIterable;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _iterable = require('../iterable');

var _PropagateTask = require('../scheduler/PropagateTask');

var _PropagateTask2 = _interopRequireDefault(_PropagateTask);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function fromIterable(iterable) {
  return new _Stream2.default(new IterableSource(iterable));
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function IterableSource(iterable) {
  this.iterable = iterable;
}

IterableSource.prototype.run = function (sink, scheduler) {
  return scheduler.asap(new _PropagateTask2.default(runProducer, (0, _iterable.getIterator)(this.iterable), sink));
};

function runProducer(t, iterator, sink) {
  var r = iterator.next();

  while (!r.done && this.active) {
    sink.event(t, r.value);
    r = iterator.next();
  }

  sink.end(t, r.value);
}

},{"../Stream":15,"../iterable":50,"../scheduler/PropagateTask":56}],72:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.generate = generate;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _prelude = require('@most/prelude');

var base = _interopRequireWildcard(_prelude);

function _interopRequireWildcard(obj) {
  if (obj && obj.__esModule) {
    return obj;
  } else {
    var newObj = {};if (obj != null) {
      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          newObj[key] = obj[key];
        }
      }
    }newObj.default = obj;return newObj;
  }
}

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

/**
 * Compute a stream using an *async* generator, which yields promises
 * to control event times.
 * @param f
 * @returns {Stream}
 */
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function generate(f /*, ...args */) {
  return new _Stream2.default(new GenerateSource(f, base.tail(arguments)));
}

function GenerateSource(f, args) {
  this.f = f;
  this.args = args;
}

GenerateSource.prototype.run = function (sink, scheduler) {
  return new Generate(this.f.apply(void 0, this.args), sink, scheduler);
};

function Generate(iterator, sink, scheduler) {
  this.iterator = iterator;
  this.sink = sink;
  this.scheduler = scheduler;
  this.active = true;

  var self = this;
  function err(e) {
    self.sink.error(self.scheduler.now(), e);
  }

  Promise.resolve(this).then(next).catch(err);
}

function next(generate, x) {
  return generate.active ? handle(generate, generate.iterator.next(x)) : x;
}

function handle(generate, result) {
  if (result.done) {
    return generate.sink.end(generate.scheduler.now(), result.value);
  }

  return Promise.resolve(result.value).then(function (x) {
    return emit(generate, x);
  }, function (e) {
    return error(generate, e);
  });
}

function emit(generate, x) {
  generate.sink.event(generate.scheduler.now(), x);
  return next(generate, x);
}

function error(generate, e) {
  return handle(generate, generate.iterator.throw(e));
}

Generate.prototype.dispose = function () {
  this.active = false;
};

},{"../Stream":15,"@most/prelude":5}],73:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.iterate = iterate;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

/**
 * Compute a stream by iteratively calling f to produce values
 * Event times may be controlled by returning a Promise from f
 * @param {function(x:*):*|Promise<*>} f
 * @param {*} x initial value
 * @returns {Stream}
 */
function iterate(f, x) {
  return new _Stream2.default(new IterateSource(f, x));
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function IterateSource(f, x) {
  this.f = f;
  this.value = x;
}

IterateSource.prototype.run = function (sink, scheduler) {
  return new Iterate(this.f, this.value, sink, scheduler);
};

function Iterate(f, initial, sink, scheduler) {
  this.f = f;
  this.sink = sink;
  this.scheduler = scheduler;
  this.active = true;

  var x = initial;

  var self = this;
  function err(e) {
    self.sink.error(self.scheduler.now(), e);
  }

  function start(iterate) {
    return stepIterate(iterate, x);
  }

  Promise.resolve(this).then(start).catch(err);
}

Iterate.prototype.dispose = function () {
  this.active = false;
};

function stepIterate(iterate, x) {
  iterate.sink.event(iterate.scheduler.now(), x);

  if (!iterate.active) {
    return x;
  }

  var f = iterate.f;
  return Promise.resolve(f(x)).then(function (y) {
    return continueIterate(iterate, y);
  });
}

function continueIterate(iterate, x) {
  return !iterate.active ? iterate.value : stepIterate(iterate, x);
}

},{"../Stream":15}],74:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.periodic = periodic;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

var _PropagateTask = require('../scheduler/PropagateTask');

var _PropagateTask2 = _interopRequireDefault(_PropagateTask);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

/**
 * Create a stream that emits the current time periodically
 * @param {Number} period periodicity of events in millis
 * @param {*} deprecatedValue @deprecated value to emit each period
 * @returns {Stream} new stream that emits the current time every period
 */
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function periodic(period, deprecatedValue) {
  return new _Stream2.default(new Periodic(period, deprecatedValue));
}

function Periodic(period, value) {
  this.period = period;
  this.value = value;
}

Periodic.prototype.run = function (sink, scheduler) {
  return scheduler.periodic(this.period, _PropagateTask2.default.event(this.value, sink));
};

},{"../Stream":15,"../scheduler/PropagateTask":56}],75:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.tryEvent = tryEvent;
exports.tryEnd = tryEnd;
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function tryEvent(t, x, sink) {
  try {
    sink.event(t, x);
  } catch (e) {
    sink.error(t, e);
  }
}

function tryEnd(t, x, sink) {
  try {
    sink.end(t, x);
  } catch (e) {
    sink.error(t, e);
  }
}

},{}],76:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.unfold = unfold;

var _Stream = require('../Stream');

var _Stream2 = _interopRequireDefault(_Stream);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

/**
 * Compute a stream by unfolding tuples of future values from a seed value
 * Event times may be controlled by returning a Promise from f
 * @param {function(seed:*):{value:*, seed:*, done:boolean}|Promise<{value:*, seed:*, done:boolean}>} f unfolding function accepts
 *  a seed and returns a new tuple with a value, new seed, and boolean done flag.
 *  If tuple.done is true, the stream will end.
 * @param {*} seed seed value
 * @returns {Stream} stream containing all value of all tuples produced by the
 *  unfolding function.
 */
function unfold(f, seed) {
  return new _Stream2.default(new UnfoldSource(f, seed));
} /** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function UnfoldSource(f, seed) {
  this.f = f;
  this.value = seed;
}

UnfoldSource.prototype.run = function (sink, scheduler) {
  return new Unfold(this.f, this.value, sink, scheduler);
};

function Unfold(f, x, sink, scheduler) {
  this.f = f;
  this.sink = sink;
  this.scheduler = scheduler;
  this.active = true;

  var self = this;
  function err(e) {
    self.sink.error(self.scheduler.now(), e);
  }

  function start(unfold) {
    return stepUnfold(unfold, x);
  }

  Promise.resolve(this).then(start).catch(err);
}

Unfold.prototype.dispose = function () {
  this.active = false;
};

function stepUnfold(unfold, x) {
  var f = unfold.f;
  return Promise.resolve(f(x)).then(function (tuple) {
    return continueUnfold(unfold, tuple);
  });
}

function continueUnfold(unfold, tuple) {
  if (tuple.done) {
    unfold.sink.end(unfold.scheduler.now(), tuple.value);
    return tuple.value;
  }

  unfold.sink.event(unfold.scheduler.now(), tuple.value);

  if (!unfold.active) {
    return tuple.value;
  }
  return stepUnfold(unfold, tuple.seed);
}

},{"../Stream":15}],77:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.defer = defer;
exports.runTask = runTask;
/** @license MIT License (c) copyright 2010-2016 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

function defer(task) {
  return Promise.resolve(task).then(runTask);
}

function runTask(task) {
  try {
    return task.run();
  } catch (e) {
    return task.error(e);
  }
}

},{}],78:[function(require,module,exports){
(function (global){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _ponyfill = require('./ponyfill.js');

var _ponyfill2 = _interopRequireDefault(_ponyfill);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { 'default': obj };
}

var root; /* global window */

if (typeof self !== 'undefined') {
  root = self;
} else if (typeof window !== 'undefined') {
  root = window;
} else if (typeof global !== 'undefined') {
  root = global;
} else if (typeof module !== 'undefined') {
  root = module;
} else {
  root = Function('return this')();
}

var result = (0, _ponyfill2['default'])(root);
exports['default'] = result;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./ponyfill.js":79}],79:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports['default'] = symbolObservablePonyfill;
function symbolObservablePonyfill(root) {
	var result;
	var _Symbol = root.Symbol;

	if (typeof _Symbol === 'function') {
		if (_Symbol.observable) {
			result = _Symbol.observable;
		} else {
			result = _Symbol('observable');
			_Symbol.observable = result;
		}
	} else {
		result = '@@observable';
	}

	return result;
};

},{}]},{},["@jscad/viewer"]);
