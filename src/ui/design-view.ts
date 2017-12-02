namespace JscadGallery {

  export class DesignView extends App {
    private worker: Worker;
    private inputParams: InputParams;
    private inputDiv: HTMLElement;

    constructor(public viewerOptions = {}) {
      super(viewerOptions);

      this.worker = new Worker('/js/worker.js');
      this.worker.onmessage = (e) => {
        const cmd = e.data as WorkerResponse;
        if (cmd.loaded) {
          this.loaded(cmd.loaded);
        } else if (cmd.ran) {
          this.viewCompactBinary(cmd.ran.compactBinary);
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
  }
}
