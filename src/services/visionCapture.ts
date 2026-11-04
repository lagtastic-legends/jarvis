import { VisualPayload } from '../types/jarvis';

/**
 * Live Screen & Camera Visual Awareness Engine (Mark-LVI Screen Processor)
 * 
 * Captures high-definition offscreen frames from user screen/app windows
 * or webcam sensor streams, scales to optimal neural token resolution (max 1920px),
 * and supports continuous visual awareness with explicit privacy kill switches.
 */

export interface VisionState {
  isScreenSharing: boolean;
  isCameraStreaming: boolean;
  continuousMode: boolean;
}

export class VisionCaptureService {
  private screenStream: MediaStream | null = null;
  private cameraStream: MediaStream | null = null;
  private continuousMode: boolean = false;
  private stateListeners: Set<(state: VisionState) => void> = new Set();

  /**
   * Captures an instant frame of the user's active monitor or selected application window
   */
  public async captureScreenFrame(quality: number = 0.85): Promise<VisualPayload> {
    let stream = this.screenStream;
    let shouldCloseAfter = false;

    if (!stream || !stream.active) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('Screen capture (getDisplayMedia) is not supported in this browser environment.');
      }

      stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
          cursor: 'always',
        } as any,
        audio: false,
      });

      // Hook native browser "Stop sharing" bar
      const track = stream.getVideoTracks()[0];
      if (track) {
        track.onended = () => {
          this.stopContinuousScreen();
        };
      }

      if (this.continuousMode) {
        this.screenStream = stream;
        this.notifyState();
      } else {
        shouldCloseAfter = true;
      }
    }

    try {
      const frame = await this.extractFrameFromStream(stream, 1920, 1080, quality);
      return {
        imageBase64: frame.base64,
        imageMimeType: frame.mimeType,
        visualSource: 'screen',
        width: frame.width,
        height: frame.height,
        dataUrl: frame.dataUrl,
        capturedAt: new Date().toISOString(),
      };
    } finally {
      if (shouldCloseAfter) {
        stream.getTracks().forEach((t) => t.stop());
      }
    }
  }

  /**
   * Captures an instant frame from the user's webcam or Android rear camera
   */
  public async captureCameraFrame(quality: number = 0.85): Promise<VisualPayload> {
    let stream = this.cameraStream;
    let shouldCloseAfter = false;

    if (!stream || !stream.active) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access (getUserMedia) is not supported in this browser environment.');
      }

      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      const track = stream.getVideoTracks()[0];
      if (track) {
        track.onended = () => {
          this.stopContinuousCamera();
        };
      }

      if (this.continuousMode) {
        this.cameraStream = stream;
        this.notifyState();
      } else {
        shouldCloseAfter = true;
      }
    }

    try {
      const frame = await this.extractFrameFromStream(stream, 1920, 1080, quality);
      return {
        imageBase64: frame.base64,
        imageMimeType: frame.mimeType,
        visualSource: 'camera',
        width: frame.width,
        height: frame.height,
        dataUrl: frame.dataUrl,
        capturedAt: new Date().toISOString(),
      };
    } finally {
      if (shouldCloseAfter) {
        stream.getTracks().forEach((t) => t.stop());
      }
    }
  }

  /**
   * Starts persistent Continuous Screen Awareness mode
   */
  public async startContinuousScreen(): Promise<void> {
    this.continuousMode = true;
    if (!this.screenStream || !this.screenStream.active) {
      await this.captureScreenFrame();
    }
    this.notifyState();
  }

  /**
   * Stops active screen-share stream and releases display hardware
   */
  public stopContinuousScreen(): void {
    if (this.screenStream) {
      try {
        this.screenStream.getTracks().forEach((t) => t.stop());
      } catch {
        // Ignore
      }
      this.screenStream = null;
    }
    this.notifyState();
  }

  /**
   * Starts persistent Continuous Camera mode
   */
  public async startContinuousCamera(): Promise<void> {
    this.continuousMode = true;
    if (!this.cameraStream || !this.cameraStream.active) {
      await this.captureCameraFrame();
    }
    this.notifyState();
  }

  /**
   * Stops active camera stream and releases camera sensor
   */
  public stopContinuousCamera(): void {
    if (this.cameraStream) {
      try {
        this.cameraStream.getTracks().forEach((t) => t.stop());
      } catch {
        // Ignore
      }
      this.cameraStream = null;
    }
    this.notifyState();
  }

  /**
   * 1-Click Privacy Kill Switch: Instantly terminates all visual sensor streams
   */
  public stopAllVision(): void {
    this.continuousMode = false;
    this.stopContinuousScreen();
    this.stopContinuousCamera();
    this.notifyState();
  }

  public isScreenActive(): boolean {
    return Boolean(this.screenStream && this.screenStream.active);
  }

  public isCameraActive(): boolean {
    return Boolean(this.cameraStream && this.cameraStream.active);
  }

  public getVisionState(): VisionState {
    return {
      isScreenSharing: this.isScreenActive(),
      isCameraStreaming: this.isCameraActive(),
      continuousMode: this.continuousMode,
    };
  }

  /**
   * Subscribes to live visual streaming state changes
   */
  public onVisionStateChange(listener: (state: VisionState) => void): () => void {
    this.stateListeners.add(listener);
    listener(this.getVisionState());
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  private notifyState(): void {
    const st = this.getVisionState();
    this.stateListeners.forEach((l) => {
      try {
        l(st);
      } catch {
        // Ignore
      }
    });
  }

  /**
   * Offscreen canvas rasterizer: extracts crisp scaled frame without rendering to DOM
   */
  private async extractFrameFromStream(
    stream: MediaStream,
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.85
  ): Promise<{ base64: string; mimeType: string; width: number; height: number; dataUrl: string }> {
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) throw new Error('No video track available in stream');

    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => resolve(), 2200);
      video.onloadedmetadata = () => {
        video.play().then(() => {
          clearTimeout(timeout);
          // Wait 80ms for GPU frame render pass
          requestAnimationFrame(() => setTimeout(resolve, 80));
        }).catch(reject);
      };
      video.onerror = (e) => {
        clearTimeout(timeout);
        reject(e);
      };
    });

    const vWidth = video.videoWidth || 1920;
    const vHeight = video.videoHeight || 1080;

    let targetWidth = vWidth;
    let targetHeight = vHeight;

    if (targetWidth > maxWidth) {
      targetHeight = Math.round((targetHeight * maxWidth) / targetWidth);
      targetWidth = maxWidth;
    }
    if (targetHeight > maxHeight) {
      targetWidth = Math.round((targetWidth * maxHeight) / targetHeight);
      targetHeight = maxHeight;
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Unable to create 2D canvas context');

    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

    // Clean up temporary video element
    video.pause();
    video.srcObject = null;

    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '');

    return {
      base64,
      mimeType: 'image/jpeg',
      width: targetWidth,
      height: targetHeight,
      dataUrl,
    };
  }
}

export const visionCapture = new VisionCaptureService();
