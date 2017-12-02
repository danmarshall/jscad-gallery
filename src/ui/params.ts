namespace JscadGallery {

    export class InputParams {
        private parameterstable: HTMLTableElement;
        private paramControls: HTMLElement[];

        public onChange: (paramValues: ParamValues) => void;

        constructor(div: HTMLElement) {
            this.parameterstable = document.createElement('table');
            div.appendChild(this.parameterstable);
        }

        private createGroupControl(definition) {
            var control = document.createElement('title')
            control.attributes['data-paramName'] = definition.name
            control.attributes['data-paramType'] = definition.type
            if ('caption' in definition) {
                control.text = definition.caption
                control.className = 'caption'
            } else {
                control.text = definition.name
            }
            return control
        }

        private createChoiceControl(definition: ParameterDefinition, prevValue) {
            if (!('values' in definition)) {
                throw new Error('Definition of choice parameter (' + definition.name + ") should include a 'values' parameter")
            }
            var control = document.createElement('select')
            control.paramName = definition.name
            control.paramType = definition.type
            var values = definition.values
            var captions
            if ('captions' in definition) {
                captions = definition.captions
                if (captions.length != values.length) {
                    throw new Error('Definition of choice parameter (' + definition.name + ") should have the same number of items for 'captions' and 'values'")
                }
            } else {
                captions = values
            }
            var selectedindex = 0
            for (var valueindex = 0; valueindex < values.length; valueindex++) {
                var option = document.createElement('option') as HTMLOptionElement
                option.value = values[valueindex]
                option.text = captions[valueindex]
                control.add(option)
                if (prevValue !== undefined) {
                    if (prevValue === values[valueindex]) {
                        selectedindex = valueindex
                    }
                } else if ('default' in definition) {
                    if (definition['default'] === values[valueindex]) {
                        selectedindex = valueindex
                    }
                } else if ('initial' in definition) {
                    if (definition.initial === values[valueindex]) {
                        selectedindex = valueindex
                    }
                }
            }
            if (values.length > 0) {
                control.selectedIndex = selectedindex
            }
            return control
        }

        private createControl(definition: ParameterDefinition, prevValue) {
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
            ]
            // check for required parameters
            if (!('type' in definition)) {
                throw new Error('Parameter definition (' + definition.index + ") must include a 'type' parameter")
            }
            var control = document.createElement('input')
            var i, j, c_type, p_name
            for (i = 0; i < control_list.length; i++) {
                c_type = control_list[i]
                if (c_type.type === definition.type) {
                    for (j = 0; j < c_type.required.length; j++) {
                        p_name = c_type.required[j]
                        if (p_name in definition) {
                            if (p_name === 'index') continue
                            if (p_name === 'type') continue
                            if (p_name === 'checked') { // setAttribute() only accepts strings
                                control.checked = definition.checked
                            } else {
                                control.setAttribute(p_name, definition[p_name])
                            }
                        } else {
                            throw new Error('Parameter definition (' + definition.index + ") must include a '" + p_name + "' parameter")
                        }
                    }
                    break
                }
            }
            if (i === control_list.length) {
                throw new Error('Parameter definition (' + definition.index + ") is not a valid 'type'")
            }
            // set the control type
            control.setAttribute('type', c_type.control)
            // set name and type for obtaining values
            control.attributes['data-paramName'] = definition.name
            control.attributes['data-paramType'] = definition.type
            // determine initial value of control
            if (prevValue !== undefined) {
                control.value = prevValue
            } else if ('initial' in definition) {
                control.value = definition.initial
            } else if ('default' in definition) {
                control.value = definition.default
            } else {
                control.value = c_type.initial
            }
            // set generic HTML attributes
            for (var property in definition) {
                if (definition.hasOwnProperty(property)) {
                    if (c_type.required.indexOf(property) < 0) {
                        control.setAttribute(property, definition[property])
                    }
                }
            }
            // add a label if necessary
            // if ('label' in c_type) {
            //     control.label = document.createElement('label')
            //     control.label.innerHTML = control.value
            // }
            return control
        }

        createParamControls(paramDefinitions: ParameterDefinition[], prevParamValues: ParamValues = {}) {
            this.parameterstable.innerHTML = ''
            this.paramControls = []

            for (var i = 0; i < paramDefinitions.length; i++) {
                var paramdef = paramDefinitions[i]
                paramdef.index = i + 1

                var control = null
                var type = paramdef.type.toLowerCase()
                switch (type) {
                    case 'choice':
                        control = this.createChoiceControl(paramdef, prevParamValues[paramdef.name])
                        break
                    case 'group':
                        control = this.createGroupControl(paramdef)
                        break
                    default:
                        control = this.createControl(paramdef, prevParamValues[paramdef.name])
                        break
                }
                // add the appropriate element to the table
                var tr = document.createElement('tr')
                if (type === 'group') {
                    var th = document.createElement('th')
                    if ('className' in control) {
                        th.className = control.className
                    }
                    th.innerHTML = control.text
                    tr.appendChild(th)
                } else {
                    // implementing instantUpdate
                    control.onchange = (e) => {
                        var l = e.currentTarget.nextElementSibling
                        if (l !== null && l.nodeName === 'LABEL') {
                            l.innerHTML = e.currentTarget.value
                        }
                        //if (document.getElementById('instantUpdate').checked === true) {
                        //that.rebuildSolid()
                        //}
                        if (this.onChange) {
                            this.onChange(this.getParamValues());
                        }
                    }
                    this.paramControls.push(control)

                    var td = document.createElement('td')
                    var label = paramdef.name + ':'
                    if ('caption' in paramdef) {
                        label = paramdef.caption
                        td.className = 'caption'
                    }
                    td.innerHTML = label
                    tr.appendChild(td)
                    td = document.createElement('td')
                    td.appendChild(control)
                    if ('label' in control) {
                        td.appendChild(control.label)
                    }
                    tr.appendChild(td)
                }
                this.parameterstable.appendChild(tr)
            }
        }

        getParamValues() {
            let paramValues = {}
            let value
            for (var i = 0; i < this.paramControls.length; i++) {
                var control = this.paramControls[i]
                switch (control.attributes['data-paramType']) {
                    case 'choice':
                        value = (control as HTMLSelectElement).options[(control as HTMLSelectElement).selectedIndex].value
                        break
                    case 'float':
                    case 'number':
                        value = (control as HTMLInputElement).value
                        if (!isNaN(parseFloat(value)) && isFinite(value)) {
                            value = parseFloat(value)
                        } else {
                            throw new Error('Parameter (' + control.attributes['data-paramName'] + ') is not a valid number (' + value + ')')
                        }
                        break
                    case 'int':
                        value = (control as HTMLInputElement).value
                        if (!isNaN(parseFloat(value)) && isFinite(value)) {
                            value = parseInt(value)
                        } else {
                            throw new Error('Parameter (' + control.attributes['data-paramName'] + ') is not a valid number (' + value + ')')
                        }
                        break
                    case 'checkbox':
                    case 'radio':
                        if ((control as HTMLInputElement).checked === true && (control as HTMLInputElement).value.length > 0) {
                            value = (control as HTMLInputElement).value
                        } else {
                            value = (control as HTMLInputElement).checked
                        }
                        break
                    default:
                        value = (control as HTMLInputElement).value
                        break
                }
                // if (onlyChanged) {
                //     if ('initial' in control && control.initial === value) {
                //         continue
                //     } else if ('default' in control && control.default === value) {
                //         continue
                //     }
                // }
                paramValues[control.attributes['data-paramName']] = value
                // console.log(control.paramName+":"+paramValues[control.paramName])
            }
            return paramValues
        }
    }
}
