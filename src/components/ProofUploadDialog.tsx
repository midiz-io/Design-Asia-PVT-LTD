import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X, RotateCcw, RefreshCw } from 'lucide-react';
import FileUpload from './FileUpload';

interface ProofUploadDialogProps {
  isOpen: boolean;
  onCapture: (imageBlob: Blob) => void;
  onFileUpload: (fileUrl: string, fileName: string) => void;
  onClose: () => void;
}

const ProofUploadDialog = ({ 
  isOpen, 
  onCapture, 
  onFileUpload,
  onClose 
}: ProofUploadDialogProps) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'file'>('camera');
  const [fileUploaded, setFileUploaded] = useState(false);
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
    if (isOpen && activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab]);

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

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(dataUrl);
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
      if (capturedImage) {
        const response = await fetch(capturedImage);
        const blob = await response.blob();
        onCapture(blob);
        onClose();
        return;
      }

      if (!canvasRef.current) {
        console.error('Canvas ref not available');
        return;
      }

      await new Promise<void>((resolve, reject) => {
        canvasRef.current!.toBlob((blob) => {
          if (blob) {
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

  useEffect(() => {
    if (isOpen && stream && activeTab === 'camera') {
      startCamera();
    }
  }, [facingMode]);

  const handleFileUploadComplete = (fileUrl: string, fileName: string) => {
    setFileUploaded(true);
    onFileUpload(fileUrl, fileName);
    setTimeout(() => {
      onClose();
      setFileUploaded(false);
      setActiveTab('camera');
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Task Proof
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden flex flex-col">
          <Tabs value={activeTab} onValueChange={(value) => {
            setActiveTab(value as 'camera' | 'file');
            setCapturedImage(null);
          }} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="camera" className="flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Camera
              </TabsTrigger>
              <TabsTrigger value="file" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload File
              </TabsTrigger>
            </TabsList>
            
            <div className="flex-1 overflow-auto">
              <TabsContent value="camera" className="mt-0 space-y-4">
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
              </TabsContent>
              
              <TabsContent value="file" className="mt-0">
                <div className="space-y-4">
                  <FileUpload
                    onUploadComplete={handleFileUploadComplete}
                    accept="*"
                    maxSize={100}
                    uploadPath="proofs"
                    className="w-full"
                  />
                  {fileUploaded && (
                    <div className="text-sm text-green-600 text-center">
                      File uploaded successfully!
                    </div>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProofUploadDialog;

