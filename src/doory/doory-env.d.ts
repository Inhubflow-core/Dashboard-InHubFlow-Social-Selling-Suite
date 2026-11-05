declare module '*?url' {
  const url: string;
  export default url;
}

declare module 'onnxruntime-web' {
  export const env: any;
  export class InferenceSession {
    static create(model: any, options?: any): Promise<any>;
    run(feeds: any, ...args: any[]): Promise<any>;
  }
  export class Tensor {
    constructor(type: string, data: any, dims?: number[]);
    data: any;
    dims: number[];
    type: string;
  }
}

declare module 'onnxruntime-web/wasm' {
  export const env: any;
  export class InferenceSession {
    static create(model: any, options?: any): Promise<any>;
    run(feeds: any, ...args: any[]): Promise<any>;
  }
  export const Tensor: any;
}

declare module 'mp4box' {
  const mp4box: any;
  export default mp4box;
  export const createFile: any;
  export const Log: any;
  export const DataStream: any;
  export const Endianness: any;
  export const MP4BoxBuffer: any;
}

declare module 'mp4-muxer' {
  export const Muxer: any;
  export const ArrayBufferTarget: any;
  export const FileSystemWritableFileStreamTarget: any;
}

declare module 'webm-muxer' {
  export const Muxer: any;
  export const ArrayBufferTarget: any;
}

interface ImportMetaEnv {
  VITE_E2E?: string;
  [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
