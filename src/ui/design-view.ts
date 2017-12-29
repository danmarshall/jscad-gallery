namespace JscadGallery {

  export class DesignView extends App {
    private worker: Worker;
    private inputParams: InputParams;
    private inputDiv: HTMLElement;
    private exportDiv: HTMLElement;

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
    }

    loadPreview(div: HTMLDivElement, design: Design, inputDiv: HTMLElement) {
      this.inputDiv = inputDiv;

      this.attachViewer(div);
      const message2: DownloadRequest = { preview: design };
      this.downloadWorker.postMessage(message2);
    }

    load(design: Design) {

      const message: WorkerRequest = { load: design };
      this.worker.postMessage(message);

      //TODO - show spinner while loading

    }

    loaded(loaded: LoadedItem) {
      this.inputParams = new InputParams(this.inputDiv);
      this.inputParams.onChange = (params) => {
        //TODO: throttle & terminate, show spinner
        var message: WorkerRequest = { run: { params } };
        this.worker.postMessage(message);
      };

      const params = {};
      if (loaded.parameterDefinitions) {
        this.inputParams.createParamControls(loaded.parameterDefinitions);

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
}
