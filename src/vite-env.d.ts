/// <reference types="vite/client" />

declare module 'js-aruco2' {
  export interface ArucoCorner {
    x: number;
    y: number;
  }

  export interface ArucoMarker {
    id: number;
    corners: ArucoCorner[];
  }

  export interface ArucoDetector {
    detect(imageData: ImageData): ArucoMarker[];
  }

  export const AR: {
    Detector: new () => ArucoDetector;
  };
}
