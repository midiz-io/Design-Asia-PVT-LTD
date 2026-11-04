import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, File, Image, FileText, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { uploadImageToGeekHirusha } from '@/utils/whatsapp';

interface FileUploadProps {
  onUploadComplete: (fileUrl: string, fileName: string) => void;
  accept?: string;
  maxSize?: number; // in MB
  disabled?: boolean;
  className?: string;
  uploadPath?: string; // Custom upload path (e.g., 'proofs' or 'uploads')
}

interface UploadedFile {
  file: File;
  preview?: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  url?: string;
  error?: string;
}

const FileUpload = ({ 
  onUploadComplete, 
  accept = "*", 
  maxSize = 10, 
  disabled = false,
  className = "",
  uploadPath = "uploads"
}: FileUploadProps) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      return `File size must be less than ${maxSize}MB`;
    }

    // Check file type if accept is specified
    if (accept !== "*") {
      const acceptedTypes = accept.split(',').map(type => type.trim());
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      const mimeType = file.type;
      
      const isValidType = acceptedTypes.some(type => 
        type === fileExtension || 
        type === mimeType ||
        (type.startsWith('.') && fileExtension === type) ||
        (type.includes('*') && mimeType.startsWith(type.replace('*', '')))
      );

      if (!isValidType) {
        return `File type not supported. Accepted types: ${accept}`;
      }
    }

    return null;
  };

  const generateFileName = (originalName: string): string => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop();
    return `${timestamp}_${randomString}.${extension}`;
  };

  const compressImageFile = (file: File, maxWidth = 800, maxHeight = 800, quality = 0.6): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas 2d context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Canvas to Blob conversion failed'));
              }
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const uploadFile = async (file: File): Promise<string> => {
    // If the file is an image, highly compress it and upload to GeekHirusha API
    if (file.type.startsWith('image/')) {
      try {
        console.log('Compressing image file...', file.name);
        const compressedBlob = await compressImageFile(file);
        
        console.log('Uploading compressed image to external API...');
        const externalUrl = await uploadImageToGeekHirusha(compressedBlob);
        if (externalUrl) {
          console.log('Image uploaded successfully to GeekHirusha:', externalUrl);
          return externalUrl;
        }
        console.warn('GeekHirusha upload failed, falling back to Supabase storage');
      } catch (err) {
        console.error('Error compressing/uploading image, falling back to Supabase:', err);
      }
    }

    const fileName = generateFileName(file.name);
    const filePath = `${uploadPath}/${fileName}`;

    // Try to upload directly first
    const { data, error } = await supabase.storage
      .from('files')
      .upload(filePath, file, {
        upsert: false
      });

    if (error) {
      console.error('Storage upload error:', error);
      
      // If bucket doesn't exist, try to create it
      if (error.message.includes('Bucket not found') || error.message.includes('does not exist')) {
        console.log('Attempting to create files bucket...');
        
        // Try to create the bucket
        const { data: bucketData, error: bucketError } = await supabase.storage.createBucket('files', {
          public: true,
          fileSizeLimit: 10485760, // 10MB
          allowedMimeTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif'
          ]
        });

        if (bucketError) {
          throw new Error('Files storage bucket not found and could not be created. Please contact administrator to set up file storage.');
        }

        // Retry upload after creating bucket
        const { data: retryData, error: retryError } = await supabase.storage
          .from('files')
          .upload(filePath, file, {
            upsert: false
          });

        if (retryError) {
          throw new Error(`Upload failed after creating bucket: ${retryError.message}`);
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('files')
          .getPublicUrl(filePath);

        return publicUrl;
      }
      
      if (error.message.includes('row-level security')) {
        throw new Error('File upload failed due to security policy. Please run the storage setup script in Supabase SQL Editor.');
      }
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('files')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const newFiles: UploadedFile[] = [];

    fileArray.forEach(file => {
      const validationError = validateFile(file);
      if (validationError) {
        toast({
          title: 'Invalid File',
          description: validationError,
          variant: 'destructive',
        });
        return;
      }

      const uploadedFile: UploadedFile = {
        file,
        progress: 0,
        status: 'pending',
      };

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          uploadedFile.preview = e.target?.result as string;
        };
        reader.readAsDataURL(file);
      }

      newFiles.push(uploadedFile);
    });

    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Auto-upload files
    newFiles.forEach(uploadedFile => {
      uploadFileAsync(uploadedFile);
    });
  };

  const uploadFileAsync = async (uploadedFile: UploadedFile) => {
    try {
      setUploadedFiles(prev => 
        prev.map(f => 
          f === uploadedFile 
            ? { ...f, status: 'uploading' as const, progress: 0 }
            : f
        )
      );

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadedFiles(prev => 
          prev.map(f => 
            f === uploadedFile && f.progress < 90
              ? { ...f, progress: f.progress + 10 }
              : f
          )
        );
      }, 100);

      const url = await uploadFile(uploadedFile.file);
      
      clearInterval(progressInterval);

      setUploadedFiles(prev => 
        prev.map(f => 
          f === uploadedFile 
            ? { ...f, status: 'completed' as const, progress: 100, url }
            : f
        )
      );

      // Call completion callback
      onUploadComplete(url, uploadedFile.file.name);

      toast({
        title: 'Upload Successful',
        description: `${uploadedFile.file.name} uploaded successfully`,
      });

    } catch (error: any) {
      setUploadedFiles(prev => 
        prev.map(f => 
          f === uploadedFile 
            ? { ...f, status: 'error' as const, error: error.message }
            : f
        )
      );

      toast({
        title: 'Upload Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const removeFile = (fileToRemove: UploadedFile) => {
    setUploadedFiles(prev => prev.filter(f => f !== fileToRemove));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const getFileIcon = (file: UploadedFile) => {
    if (file.file.type.startsWith('image/')) {
      return <Image className="w-4 h-4" />;
    } else if (file.file.type.includes('pdf') || file.file.type.includes('document')) {
      return <FileText className="w-4 h-4" />;
    } else {
      return <File className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-success';
      case 'error': return 'text-destructive';
      case 'uploading': return 'text-primary';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className={className}>
      {/* Upload Area */}
      <Card 
        className={`border-2 border-dashed transition-colors cursor-pointer ${
          isDragging 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/25 hover:border-primary/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <Upload className="w-8 h-8 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {isDragging ? 'Drop files here' : 'Upload Files'}
          </h3>
          <p className="text-muted-foreground mb-4">
            Drag and drop files here, or click to select
          </p>
          <p className="text-sm text-muted-foreground">
            Max size: {maxSize}MB • Accepted: {accept === "*" ? "All files" : accept}
          </p>
          <Input
            ref={fileInputRef}
            type="file"
            accept={accept}
            multiple
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
            disabled={disabled}
          />
        </CardContent>
      </Card>

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <Label className="text-sm font-medium">Uploaded Files</Label>
          {uploadedFiles.map((uploadedFile, index) => (
            <Card key={index} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {uploadedFile.preview ? (
                    <img 
                      src={uploadedFile.preview} 
                      alt="Preview" 
                      className="w-8 h-8 object-cover rounded"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                      {getFileIcon(uploadedFile)}
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {uploadedFile.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    {uploadedFile.status === 'uploading' && (
                      <div className="w-16">
                        <Progress value={uploadedFile.progress} className="h-2" />
                      </div>
                    )}
                    
                    {uploadedFile.status === 'completed' && (
                      <CheckCircle className="w-4 h-4 text-success" />
                    )}
                    
                    {uploadedFile.status === 'error' && (
                      <span className="text-xs text-destructive">
                        {uploadedFile.error}
                      </span>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(uploadedFile);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
