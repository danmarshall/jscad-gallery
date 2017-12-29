var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
//Common interfaces
var JscadGallery;
(function (JscadGallery) {
    var App = /** @class */ (function () {
        function App(viewerOptions) {
            if (viewerOptions === void 0) { viewerOptions = {}; }
            var _this = this;
            this.viewerOptions = viewerOptions;
            this.downloadWorker = new Worker('js/download-worker.js');
            this.downloadWorker.onmessage = function (e) {
                var cmd = e.data;
                if (cmd.preview) {
                    _this.preview = cmd.preview;
                    _this.view();
                }
            };
        }
        App.prototype.attachViewer = function (div) {
            this.viewerDiv = document.createElement('div');
            this.viewerDiv.id = 'viewer';
            div.appendChild(this.viewerDiv);
            var Viewer = require('@jscad/viewer');
            this.viewer = new Viewer(this.viewerDiv, this.viewerOptions);
            this.canvas = this.viewerDiv.querySelector('canvas');
            this.setCssZoom();
        };
        App.prototype.detachViewer = function () {
            if (this.viewerDiv && this.viewerDiv.parentElement) {
                this.viewerDiv.parentElement.removeChild(this.viewerDiv);
            }
        };
        App.prototype.setCssZoom = function () {
            if (this.canvas) {
                this.canvas.style.zoom = (1 / window.devicePixelRatio).toString();
            }
        };
        App.prototype.viewCompactBinary = function (compactBinary) {
            var CSG = require('@jscad/csg').CSG;
            var solid = CSG.fromCompactBinary(compactBinary);
            this.viewer.setCsg(solid);
        };
        App.prototype.view = function () {
            this.viewCompactBinary(this.preview.compactBinary);
        };
        return App;
    }());
    JscadGallery.App = App;
})(JscadGallery || (JscadGallery = {}));
var JscadGallery;
(function (JscadGallery) {
    var DesignView = /** @class */ (function (_super) {
        __extends(DesignView, _super);
        function DesignView(viewerOptions) {
            if (viewerOptions === void 0) { viewerOptions = {}; }
            var _this = _super.call(this, viewerOptions) || this;
            _this.viewerOptions = viewerOptions;
            _this.worker = new Worker('js/worker.js');
            _this.worker.onmessage = function (e) {
                var cmd = e.data;
                if (cmd.loaded) {
                    _this.loaded(cmd.loaded);
                }
                else if (cmd.ran) {
                    _this.viewCompactBinary(cmd.ran.compactBinary);
                }
                else if (cmd.exportProgress) {
                    _this.exportProgress(cmd.exportProgress);
                }
                else if (cmd.exported) {
                    _this.exported(cmd.exported);
                }
            };
            window.addEventListener('hashchange', function () {
                _this.loadHash(true);
            });
            return _this;
        }
        DesignView.prototype.load = function (div, design, inputDiv) {
            this.inputDiv = inputDiv;
            this.attachViewer(div);
            this.viewer.setCameraOptions(design.camera);
            this.viewer.resetCamera();
            //load the actual model
            var message = { load: design };
            this.worker.postMessage(message);
            if (!document.location.hash.substring(1)) {
                //load the preview
                var message2 = { preview: design };
                this.downloadWorker.postMessage(message2);
            }
            //TODO - show spinner while loading
        };
        DesignView.prototype.loaded = function (loaded) {
            var _this = this;
            this.inputParams = new JscadGallery.InputParams(this.inputDiv);
            this.inputParams.onChange = function (params) {
                _this.run(params);
            };
            var params = {};
            if (loaded.parameterDefinitions) {
                this.paramDefs = loaded.parameterDefinitions;
                this.loadHash(false);
            }
        };
        DesignView.prototype.loadHash = function (force) {
            if (!this.paramDefs)
                return;
            var paramsFromUrl = this.getParamsFromUrl(this.paramDefs);
            this.inputParams.createParamControls(this.paramDefs, paramsFromUrl);
            if (paramsFromUrl || force) {
                this.run(this.inputParams.getParamValues());
            }
        };
        DesignView.prototype.run = function (params) {
            //TODO: throttle & terminate, show spinner
            var message = { run: { params: params } };
            this.worker.postMessage(message);
        };
        DesignView.prototype.getParamsFromUrl = function (defs) {
            if (document.location.hash) {
                var qs = document.location.hash.substring(1);
                return new QueryStringParams(qs);
            }
        };
        DesignView.prototype["export"] = function (format, exportDiv) {
            this.exportDiv = exportDiv;
            exportDiv.innerHTML = '';
            var message = { "export": { format: format } };
            this.worker.postMessage(message);
        };
        DesignView.prototype.exportProgress = function (progress) {
            this.exportDiv.innerText = Math.ceil(progress) + '%';
        };
        DesignView.prototype.exported = function (exportedItem) {
            this.exportDiv.innerHTML = "<a href=\"data:application/" + exportedItem.format + "," + encodeURIComponent(exportedItem.data) + "\" download=\"export." + exportedItem.format + "\">download " + exportedItem.format + "</a>";
        };
        return DesignView;
    }(JscadGallery.App));
    JscadGallery.DesignView = DesignView;
    var QueryStringParams = /** @class */ (function () {
        function QueryStringParams(querystring) {
            if (querystring === void 0) { querystring = document.location.search.substring(1); }
            if (querystring) {
                var pairs = querystring.split('&');
                for (var i = 0; i < pairs.length; i++) {
                    var pair = pairs[i].split('=');
                    this[pair[0]] = decodeURIComponent(pair[1]);
                }
            }
        }
        return QueryStringParams;
    }());
})(JscadGallery || (JscadGallery = {}));
var JscadGallery;
(function (JscadGallery) {
    var InputParams = /** @class */ (function () {
        function InputParams(div) {
            this.parameterstable = document.createElement('table');
            div.appendChild(this.parameterstable);
        }
        InputParams.prototype.createGroupControl = function (definition) {
            var control = document.createElement('title');
            control.attributes['data-paramName'] = definition.name;
            control.attributes['data-paramType'] = definition.type;
            if ('caption' in definition) {
                control.text = definition.caption;
                control.className = 'caption';
            }
            else {
                control.text = definition.name;
            }
            return control;
        };
        InputParams.prototype.createChoiceControl = function (definition, prevValue) {
            if (!('values' in definition)) {
                throw new Error('Definition of choice parameter (' + definition.name + ") should include a 'values' parameter");
            }
            var control = document.createElement('select');
            control.paramName = definition.name;
            control.paramType = definition.type;
            var values = definition.values;
            var captions;
            if ('captions' in definition) {
                captions = definition.captions;
                if (captions.length != values.length) {
                    throw new Error('Definition of choice parameter (' + definition.name + ") should have the same number of items for 'captions' and 'values'");
                }
            }
            else {
                captions = values;
            }
            var selectedindex = 0;
            for (var valueindex = 0; valueindex < values.length; valueindex++) {
                var option = document.createElement('option');
                option.value = values[valueindex];
                option.text = captions[valueindex];
                control.add(option);
                if (prevValue !== undefined) {
                    if (prevValue === values[valueindex]) {
                        selectedindex = valueindex;
                    }
                }
                else if ('default' in definition) {
                    if (definition['default'] === values[valueindex]) {
                        selectedindex = valueindex;
                    }
                }
                else if ('initial' in definition) {
                    if (definition.initial === values[valueindex]) {
                        selectedindex = valueindex;
                    }
                }
            }
            if (values.length > 0) {
                control.selectedIndex = selectedindex;
            }
            return control;
        };
        InputParams.prototype.setValue = function (control, definition, value) {
            switch (definition.type) {
                case 'checkbox':
                    control.checked = value.toString() === 'true';
                default:
                    control.value = value;
            }
        };
        InputParams.prototype.createControl = function (definition, prevValue) {
            var control_list = [
                { type: 'text', control: 'text', required: ['index', 'type', 'name'], initial: '' },
                { type: 'int', control: 'number', required: ['index', 'type', 'name'], initial: 0 },
                { type: 'float', control: 'number', required: ['index', 'type', 'name'], initial: 0.0 },
                { type: 'number', control: 'number', required: ['index', 'type', 'name'], initial: 0.0 },
                { type: 'checkbox', control: 'checkbox', required: ['index', 'type', 'name', 'checked'], initial: '' },
                { type: 'radio', control: 'radio', required: ['index', 'type', 'name', 'checked'], initial: '' },
                { type: 'color', control: 'color', required: ['index', 'type', 'name'], initial: '#000000' },
                { type: 'date', control: 'date', required: ['index', 'type', 'name'], initial: '' },
                { type: 'email', control: 'email', required: ['index', 'type', 'name'], initial: '' },
                { type: 'password', control: 'password', required: ['index', 'type', 'name'], initial: '' },
                { type: 'url', control: 'url', required: ['index', 'type', 'name'], initial: '' },
                { type: 'slider', control: 'range', required: ['index', 'type', 'name', 'min', 'max'], initial: 0, label: true }
            ];
            // check for required parameters
            if (!('type' in definition)) {
                throw new Error('Parameter definition (' + definition.index + ") must include a 'type' parameter");
            }
            var control = document.createElement('input');
            var i, j, c_type, p_name;
            for (i = 0; i < control_list.length; i++) {
                c_type = control_list[i];
                if (c_type.type === definition.type) {
                    for (j = 0; j < c_type.required.length; j++) {
                        p_name = c_type.required[j];
                        if (p_name in definition) {
                            if (p_name === 'index')
                                continue;
                            if (p_name === 'type')
                                continue;
                            if (p_name === 'checked') {
                                control.checked = definition.checked;
                            }
                            else {
                                control.setAttribute(p_name, definition[p_name]);
                            }
                        }
                        else {
                            throw new Error('Parameter definition (' + definition.index + ") must include a '" + p_name + "' parameter");
                        }
                    }
                    break;
                }
            }
            if (i === control_list.length) {
                throw new Error('Parameter definition (' + definition.index + ") is not a valid 'type'");
            }
            // set the control type
            control.setAttribute('type', c_type.control);
            // set name and type for obtaining values
            control.attributes['data-paramName'] = definition.name;
            control.attributes['data-paramType'] = definition.type;
            // determine initial value of control
            if (prevValue !== undefined) {
                this.setValue(control, definition, prevValue);
            }
            else if ('initial' in definition) {
                control.value = definition.initial;
            }
            else if ('default' in definition) {
                control.value = definition["default"];
            }
            else {
                control.value = c_type.initial;
            }
            // set generic HTML attributes
            for (var property in definition) {
                if (definition.hasOwnProperty(property)) {
                    if (c_type.required.indexOf(property) < 0) {
                        control.setAttribute(property, definition[property]);
                    }
                }
            }
            // add a label if necessary
            // if ('label' in c_type) {
            //     control.label = document.createElement('label')
            //     control.label.innerHTML = control.value
            // }
            return control;
        };
        InputParams.prototype.createCustomUrl = function () {
            var tr = document.createElement('tr');
            this.parameterstable.appendChild(tr);
            var td = document.createElement('td');
            td.colSpan = 2;
            tr.appendChild(td);
            this.customUrl = document.createElement('a');
            this.customUrl.innerText = 'link to these customizations';
            td.appendChild(this.customUrl);
        };
        InputParams.prototype.createParamControls = function (paramDefinitions, prevParamValues) {
            var _this = this;
            if (prevParamValues === void 0) { prevParamValues = {}; }
            this.parameterstable.innerHTML = '';
            this.paramControls = [];
            for (var i = 0; i < paramDefinitions.length; i++) {
                var paramdef = paramDefinitions[i];
                paramdef.index = i + 1;
                var control = null;
                var type = paramdef.type.toLowerCase();
                switch (type) {
                    case 'choice':
                        control = this.createChoiceControl(paramdef, prevParamValues[paramdef.name]);
                        break;
                    case 'group':
                        control = this.createGroupControl(paramdef);
                        break;
                    default:
                        control = this.createControl(paramdef, prevParamValues[paramdef.name]);
                        break;
                }
                // add the appropriate element to the table
                var tr = document.createElement('tr');
                if (type === 'group') {
                    var th = document.createElement('th');
                    if ('className' in control) {
                        th.className = control.className;
                    }
                    th.innerHTML = control.text;
                    tr.appendChild(th);
                }
                else {
                    // implementing instantUpdate
                    control.onchange = function (e) {
                        var l = e.currentTarget.nextElementSibling;
                        if (l !== null && l.nodeName === 'LABEL') {
                            l.innerHTML = e.currentTarget.value;
                        }
                        //if (document.getElementById('instantUpdate').checked === true) {
                        //that.rebuildSolid()
                        //}
                        if (_this.onChange) {
                            _this.onChange(_this.getParamValues());
                        }
                    };
                    this.paramControls.push(control);
                    var td = document.createElement('td');
                    var label = paramdef.name + ':';
                    if ('caption' in paramdef) {
                        label = paramdef.caption;
                        td.className = 'caption';
                    }
                    td.innerHTML = label;
                    tr.appendChild(td);
                    td = document.createElement('td');
                    td.appendChild(control);
                    if ('label' in control) {
                        td.appendChild(control.label);
                    }
                    tr.appendChild(td);
                }
                this.parameterstable.appendChild(tr);
            }
            if (paramDefinitions.length > 0) {
                this.createCustomUrl();
                this.getParamValues();
            }
        };
        InputParams.prototype.getParamValues = function () {
            var paramValues = {};
            var value;
            for (var i = 0; i < this.paramControls.length; i++) {
                var control = this.paramControls[i];
                switch (control.attributes['data-paramType']) {
                    case 'choice':
                        value = control.options[control.selectedIndex].value;
                        break;
                    case 'float':
                    case 'number':
                        value = control.value;
                        if (!isNaN(parseFloat(value)) && isFinite(value)) {
                            value = parseFloat(value);
                        }
                        else {
                            throw new Error('Parameter (' + control.attributes['data-paramName'] + ') is not a valid number (' + value + ')');
                        }
                        break;
                    case 'int':
                        value = control.value;
                        if (!isNaN(parseFloat(value)) && isFinite(value)) {
                            value = parseInt(value);
                        }
                        else {
                            throw new Error('Parameter (' + control.attributes['data-paramName'] + ') is not a valid number (' + value + ')');
                        }
                        break;
                    case 'checkbox':
                    case 'radio':
                        if (control.checked === true && control.value.length > 0) {
                            value = control.value;
                        }
                        else {
                            value = control.checked;
                        }
                        break;
                    default:
                        value = control.value;
                        break;
                }
                // if (onlyChanged) {
                //     if ('initial' in control && control.initial === value) {
                //         continue
                //     } else if ('default' in control && control.default === value) {
                //         continue
                //     }
                // }
                paramValues[control.attributes['data-paramName']] = value;
                // console.log(control.paramName+":"+paramValues[control.paramName])
            }
            var href = [];
            for (var id in paramValues) {
                href.push(id + "=" + encodeURIComponent(paramValues[id]));
            }
            this.customUrl.href = '#' + href.join('&');
            return paramValues;
        };
        return InputParams;
    }());
    JscadGallery.InputParams = InputParams;
})(JscadGallery || (JscadGallery = {}));
var JscadGallery;
(function (JscadGallery) {
    var IndexView = /** @class */ (function (_super) {
        __extends(IndexView, _super);
        function IndexView() {
            var _this = _super.call(this) || this;
            _this.designs = [];
            window.addEventListener('resize', function () {
                if (!_this.viewerDiv)
                    return;
                var div = _this.viewerDiv.parentElement;
                _this.detachViewer();
                if (div) {
                    _this.attachViewer(div);
                    _this.view();
                }
                else {
                    _this.viewer = null;
                }
            });
            return _this;
        }
        IndexView.prototype.add = function (design) {
            this.designs.push(design);
        };
        IndexView.prototype.enter = function (div, designIndex) {
            var design = this.designs[designIndex];
            if (!this.viewer) {
                this.attachViewer(div);
            }
            else {
                this.detachViewer();
                div.appendChild(this.viewerDiv);
            }
            this.viewerDiv.style.visibility = 'hidden';
            this.viewer.clear();
            this.viewer.setCameraOptions(design.camera);
            this.viewer.resetCamera();
            //TODO show spinner
            var message = { preview: design };
            this.downloadWorker.postMessage(message);
        };
        IndexView.prototype.view = function () {
            var _this = this;
            _super.prototype.view.call(this);
            this.viewerDiv.style.visibility = '';
            clearInterval(this.spinInterval);
            this.spinInterval = setInterval(function () {
                _this.preview.design.camera.angle.z += 0.25;
                _this.viewer.setCameraOptions(_this.preview.design.camera);
                _this.viewer.resetCamera();
            }, 5);
            //TODO hide spinner
        };
        IndexView.prototype.leave = function (div) {
            this.detachViewer();
            clearInterval(this.spinInterval);
        };
        return IndexView;
    }(JscadGallery.App));
    JscadGallery.IndexView = IndexView;
})(JscadGallery || (JscadGallery = {}));
//# sourceMappingURL=ui.js.map