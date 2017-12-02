//Common interfaces

//browserify loader
declare function require(name: string): any;

interface DependencyVersion {
    [name: string]: string;
}

interface Design {
    title: string;
    updated: string;
    author: any;
    version: string;
    dependencies: DependencyVersion[];
    image: string;
    camera: CameraOptions;
}

interface ParameterDefinition {
    type: string;
    caption: string;
    captions: string[];
    checked: boolean;
    default: string;
    index: number;
    name: string;
    initial: any;
    values: string[];
}

interface ParamValues {
    [name: string]: string | number
}

interface Vector3D {
    x: number;
    y: number;
    z: number;
}

interface CameraOptions {
    angle: Vector3D;
    position: Vector3D;
}

//worker stuff
interface DownloadRequest {
    preview?: Design;
}

interface DownloadCompactBinaryResponse {
    design: Design;
    compactBinary: any; //TODO compactbinary type
}

interface DownloadResponse {
    preview?: DownloadCompactBinaryResponse;
}

interface WorkerRequest {
    load?: Design;
    run?: { params?: ParamValues };
}

interface LoadedItem {
    parameterDefinitions?: ParameterDefinition[];
}

interface RanItem {
    compactBinary: any; //TODO CSG
}

interface WorkerResponse {
    loaded?: LoadedItem;
    ran?: RanItem;
}
