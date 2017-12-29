namespace JscadGallery {

  export class DesignView extends App {
    private worker: Worker;
    private inputParams: InputParams;
    private inputDiv: HTMLElement;
    private exportDiv: HTMLElement;
    private paramDefs: ParameterDefinition[];

    constructor(public viewerOptions = {}) {
      super(viewerOptions);

      this.worker = new Worker('js/worker.js');
      this.worker.onmessage = (e) => {
        const cmd = e.data as WorkerResponse;
        if (cmd.loaded) {
          this.loaded(cmd.loaded);
        } else if (cmd.ran) {
          this.viewCompactBinary(cmd.ran.compactBinary);
        } else if (cmd.exportProgress) {
          this.exportProgress(cmd.exportProgress);
        } else if (cmd.exported) {
          this.exported(cmd.exported);
        }
      };

      window.addEventListener('hashchange', () => {
        this.loadHash(true);
      });

    }

    load(div: HTMLDivElement, design: Design, inputDiv: HTMLElement) {
      this.inputDiv = inputDiv;

      this.attachViewer(div);
      this.viewer.setCameraOptions(design.camera);
      this.viewer.resetCamera();

      //load the actual model
      const message: WorkerRequest = { load: design };
      this.worker.postMessage(message);

      if (!document.location.hash.substring(1)) {
        //load the preview
        const message2: DownloadRequest = { preview: design };
        this.downloadWorker.postMessage(message2);
      }

      //TODO - show spinner while loading

    }

    loaded(loaded: LoadedItem) {
      this.inputParams = new InputParams(this.inputDiv);
      this.inputParams.onChange = (params) => {
        this.run(params);
      };

      const params = {};
      if (loaded.parameterDefinitions) {
        this.paramDefs = loaded.parameterDefinitions;
        this.loadHash(false);
      }
    }

    loadHash(force: boolean) {
      if (!this.paramDefs) return;
      var paramsFromUrl = this.getParamsFromUrl(this.paramDefs);
      this.inputParams.createParamControls(this.paramDefs, paramsFromUrl);
      if (paramsFromUrl || force) {
        this.run(this.inputParams.getParamValues());
      }

    }

    run(params: ParamValues) {
      //TODO: throttle & terminate, show spinner
      var message: WorkerRequest = { run: { params } };
      this.worker.postMessage(message);
    }

    getParamsFromUrl(defs: ParameterDefinition[]): ParamValues {
      if (document.location.hash) {
        const qs = document.location.hash.substring(1);
        return new QueryStringParams(qs) as ParamValues;
      }
    }

    export(format: string, exportDiv: HTMLElement) {
      this.exportDiv = exportDiv;
      exportDiv.innerHTML = '';

      var message: WorkerRequest = { export: { format } };
      this.worker.postMessage(message);
    }

    exportProgress(progress: number) {
      this.exportDiv.innerText = Math.ceil(progress) + '%';
    }

    exported(exportedItem: ExportedItem) {
      this.exportDiv.innerHTML = `<a href="data:application/${exportedItem.format},${encodeURIComponent(exportedItem.data)}" download="export.${exportedItem.format}">download ${exportedItem.format}</a>`;
    }

  }

  class QueryStringParams {

    constructor(querystring: string = document.location.search.substring(1)) {
      if (querystring) {
        var pairs = querystring.split('&');
        for (var i = 0; i < pairs.length; i++) {
          var pair = pairs[i].split('=');
          this[pair[0]] = decodeURIComponent(pair[1]);
        }
      }
    }
  }

}
