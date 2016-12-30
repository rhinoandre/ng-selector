declare var $: any;

import 'selectize/dist/js/standalone/selectize';

import {
  Component,
  Input,
  ViewChild,
  Attribute,
  ElementRef,
  AfterViewInit,
  forwardRef,
  Output,
  EventEmitter,
} from '@angular/core';

import { NG_VALUE_ACCESSOR, ControlValueAccessor, Validator, AbstractControl, NG_VALIDATORS } from '@angular/forms';

@Component({
  selector: 'ng-selector',
  template: `<select #selector multiple="{{multiple}}"></select>`,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => NgSelectorComponent), multi: true }]
})
export class NgSelectorComponent implements AfterViewInit, ControlValueAccessor {

  // select element
  @ViewChild('selector') selector: ElementRef;

  @Input() set readonly(disabled: boolean) {
    this._disabled = disabled;
    this.checkDisabled();
  };

  // array of data
  @Input() set options(values: Array<any>) {
    this.optionsChanged(values)
  };

  // async input options (function which provide data)
  @Output() loadValues = new EventEmitter<{ query: string, result: (options: Array<any>) => void }>();
  // rendering method to change display of item and options
  @Output() renderer = new EventEmitter<{ val: any, html: (html: string) => void, type: string }>();

  private _disabled = false;

  // actual selectize component
  selectize: any;

  // keep data until tagsComponent is initialized
  private data: any;
  private tmpOptions: any;

  // function to clean object from selectize modifications
  private cleanOrder = (item: any) => {
    delete item.$order;
    return item;
  };

  constructor( @Attribute('placeholder') private placeholder = '',
    @Attribute('id-field') private idField = 'id',
    @Attribute('label-field') private labelField = 'label',
    @Attribute('multiple') private multiple = false,
    @Attribute('allow-creation') private allowCreation = true) {
  }

  ngAfterViewInit(): any {
    // initialize with default values
    this.placeholder = this.placeholder || '';
    this.idField = this.idField || 'id';
    this.labelField = this.labelField || 'label';
    this.multiple = this.multiple === undefined ? false : this.multiple;
    this.allowCreation = this.allowCreation === undefined ? true : this.allowCreation;

    let render;
    if (this.renderer.observers.length === 1) {
      render = {
        option: this.rendering('option'),
        item: this.rendering('item'),
      };
    }

    // prepare selectize compatible method to fetch data
    let load = null;
    if (this.loadValues.observers.length === 1) {
      load = (query: string, callback: (data: Array<any>) => void) => {
        // TODO find a way to display it to user
        // disabled async search if search string is below 3 characters long
        if (query.length < 3) {
          return callback([]);
        }
        this.loadValues.emit({ query, result: callback });
      };
    }

    // configure Selectize
    this.selectize = $(this.selector.nativeElement).selectize({
      valueField: this.idField,
      labelField: this.labelField,
      searchField: this.labelField,
      placeholder: this.placeholder,
      create: this.allowCreation,
      selectOnTab: true,
      persist: true,
      load: load,
      render: render,
      onChange: this.dataChanged.bind(this)
    })[0].selectize;

    // force form-control on
    $(this.selector.nativeElement).siblings().find('.selectize-input').addClass('form-control');

    // force refresh data when Selectize is initialized
    this.optionsChanged(this.tmpOptions);
    this.updateData(this.data);
    this.checkDisabled();
  }

  optionsChanged(options) {
    if (!options || !Object.keys(options).length) {
      return this.selectize && this.selectize.clearOptions();
    }

    if (this.selectize) {

      Object.keys(this.selectize.options)
        .forEach(id => {
          if (!options.find(elem => elem[this.idField] === id)) {
            this.selectize.removeOption(id);
          }
        })

      // this.tagsComponent.options = options;
      options.forEach(option => {
        const value = option[this.idField];
        // check if option exist to call the right method ... sorry ... -_-
        if (this.selectize.options[this.idField]) {
          this.selectize.updateOption(value, option);
        } else {
          this.selectize.addOption(option);
        }
      });
      this.selectize.refreshOptions(false);
    } else {
      this.tmpOptions = options;
    }
  }

  dataChanged(value) {
    if (!value || !value.length) {
      return this.onChange(this.multiple ? [] : null);
    }

    if (this.multiple) {
      const selectedValues = value
        .map(id => this.selectize.options[this.idField])
        .filter(item => !!item)
        .map(this.cleanOrder);
      this.onChange(selectedValues);
    } else {
      this.onChange(this.cleanOrder(this.selectize.options[value]));
    }
  }

  updateData(data) {
    if (!this.selectize) {
      return; // component not initialized yet
    }

    if (!data) {
      this.selectize.clear();
      return;
    }

    this.selectize.addOption(data);
    if (Array.isArray(data)) {
      this.selectize.setValue(data.map(item => item[this.idField]));
    } else if (data && typeof data === 'object') {
      this.selectize.setValue(data[this.idField]);
    }
  }

  checkDisabled() {
    if (!this.selectize) {
      return;
    }

    if (this._disabled === true) {
      this.selectize.disable();
    } else if (this._disabled === false) {
      this.selectize.enable();
    }
  }

  rendering(type) {
    return i => {
      let html = i[this.labelField];
      this.renderer.emit({ val: i, html: htmlContent => html = htmlContent, type });
      return html;
    }
  }

  onChange = (_) => { };

  onTouched = () => { };

  writeValue(value: any): void {
    this.updateData(value);
  }

  registerOnChange(fn: (_: any) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

}