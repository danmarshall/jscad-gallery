namespace JscadGallery {

    export class IndexView extends App {
        public spinInterval: number;
        public designs: Design[] = [];

        constructor() {
            super();
        }

        add(design: Design) {
            this.designs.push(design);
        }

        enter(div: HTMLDivElement, designIndex: number) {
            var design = this.designs[designIndex];

            if (!this.viewer) {
                this.attachViewer(div);
            } else {
                this.detachViewer();
                div.appendChild(this.viewerDiv);
            }

            this.viewerDiv.style.visibility = 'hidden';
            this.viewer.clear();

            //TODO show spinner

            const message: DownloadRequest = { preview: design };
            this.downloadWorker.postMessage(message);
        }

        view() {
            super.view();

            this.viewerDiv.style.visibility = '';

            clearInterval(this.spinInterval);
            
            this.spinInterval = setInterval(() => {
                this.preview.design.camera.angle.z += 0.25;
                this.viewer.setCameraOptions(this.preview.design.camera);
                this.viewer.resetCamera();
            }, 5);

            //TODO hide spinner
        }

        leave(div: HTMLDivElement) {
            this.detachViewer();
            clearInterval(this.spinInterval);
        }

    }
}