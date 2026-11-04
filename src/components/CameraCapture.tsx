import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, RotateCcw, Upload, X, RefreshCw } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (imageBlob: Blob) => void;
  onClose: () => void;
  isOpen: boolean;
}

const CameraCapture = ({ onCapture, onClose, isOpen }: CameraCaptureProps) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isLoading, setIsLoading] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    try {
      setError(null);
      setIsLoading(true);
      
      // Stop existing stream first
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // Wait for video to load
        videoRef.current.onloadedmetadata = () => {
          setIsLoading(false);
          setIsVideoReady(true);
        };
        videoRef.current.oncanplay = () => {
          setIsVideoReady(true);
        };
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera. Please check permissions.');
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsVideoReady(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      console.error('Video or canvas ref not available');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) {
      console.error('Could not get canvas context');
      return;
    }

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    console.log('Capturing photo, video dimensions:', video.videoWidth, 'x', video.videoHeight);
    console.log('Canvas dimensions set to:', canvas.width, 'x', canvas.height);

    // Draw the current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Generate preview immediately; blob will be created on submit for reliability
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(dataUrl);
    // Stop camera to free device; canvas retains the drawn frame
    stopCamera();
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const submitPhoto = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Preferred: use captured preview image if available
      if (capturedImage) {
        const response = await fetch(capturedImage);
        const blob = await response.blob();
        console.log('Submitting from preview blob, size:', blob.size);
        onCapture(blob);
        onClose();
        return;
      }

      // Fallback: use canvas directly
      if (!canvasRef.current) {
        console.error('Canvas ref not available');
        return;
      }

      console.log('Submitting photo, canvas dimensions:', canvasRef.current.width, 'x', canvasRef.current.height);

      await new Promise<void>((resolve, reject) => {
        canvasRef.current!.toBlob((blob) => {
          if (blob) {
            console.log('Photo blob created from canvas, size:', blob.size);
            onCapture(blob);
            onClose();
            resolve();
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        }, 'image/jpeg', 0.9);
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Restart camera when facing mode changes
  useEffect(() => {
    if (isOpen && stream) {
      startCamera();
    }
  }, [facingMode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Capture Task Proof
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="text-destructive text-sm bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

          {!capturedImage && (
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-64 bg-gray-900 rounded-md"
              />
              <canvas ref={canvasRef} className="hidden" />
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75 rounded-md">
                  <div className="text-white text-center">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                    <p>Loading camera...</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {capturedImage && (
            <div className="relative">
              <img
                src={capturedImage}
                alt="Captured proof"
                className="w-full h-64 object-cover rounded-md"
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>

            {!capturedImage ? (
              <>
                <Button
                  variant="outline"
                  onClick={switchCamera}
                  disabled={isLoading || !!error}
                  className="flex-1"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {facingMode === 'environment' ? 'Front' : 'Back'}
                </Button>
                <Button
                  onClick={capturePhoto}
                  disabled={!stream || !!error || isLoading || !isVideoReady}
                  className="flex-1"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Capture
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={retakePhoto}
                  className="flex-1"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Retake
                </Button>
                <Button
                  onClick={submitPhoto}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CameraCapture;
