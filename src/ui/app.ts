namespace JscadGallery {

    export class App {
        public downloadWorker: Worker;
        public preview: DownloadCompactBinaryResponse;
        public viewer;
        public viewerDiv: HTMLDivElement;
        public canvas: HTMLCanvasElement;

        constructor(public viewerOptions = {}) {
            this.downloadWorker = new Worker('js/download-worker.js');
            this.downloadWorker.onmessage = (e) => {
                const cmd = e.data as DownloadResponse;
                if (cmd.preview) {
                    this.preview = cmd.preview;
                    this.view();
                }
            };
        }

        attachViewer(div: HTMLElement) {
            this.viewerDiv = document.createElement('div');
            this.viewerDiv.id = 'viewer';
            div.appendChild(this.viewerDiv);
            const Viewer = require('@jscad/viewer');
            this.viewer = new Viewer(this.viewerDiv, this.viewerOptions);
            this.canvas = this.viewerDiv.querySelector('canvas');
            this.setCssZoom();
        }

        detachViewer() {
            if (this.viewerDiv && this.viewerDiv.parentElement) {
                this.viewerDiv.parentElement.removeChild(this.viewerDiv);
            }
        }

        setCssZoom() {
            if (this.canvas) {
                this.canvas.style.zoom = (1 / window.devicePixelRatio).toString();
            }
        }

        viewCompactBinary(compactBinary) {
            const { CSG } = require('@jscad/csg');
            var solid = CSG.fromCompactBinary(compactBinary);
            this.viewer.setCsg(solid);
        }

        view() {
            this.viewCompactBinary(this.preview.compactBinary);
        }
    }
}
