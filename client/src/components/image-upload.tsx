import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { X, Upload, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadProps {
  onImagesChange: (images: string[]) => void;
  existingImages?: string[];
  maxImages?: number;
}

export function ImageUpload({ 
  onImagesChange, 
  existingImages = [], 
  maxImages = 3 
}: ImageUploadProps) {
  const [images, setImages] = useState<string[]>(existingImages);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  // ✅ FIX: Jab existingImages change ho, toh images state update karo
  useEffect(() => {
    console.log("🔄 ImageUpload: Existing images updated", {
      existingImagesCount: existingImages.length,
      existingImages: existingImages
    });
    setImages(existingImages);
  }, [existingImages]);

  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    // Check max limit
    if (images.length + files.length > maxImages) {
      toast({
        title: "Limit Exceeded",
        description: `You can only upload up to ${maxImages} images`,
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const base64Images: string[] = [];

      // Convert files to base64
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast({
            title: "Invalid File",
            description: "Please upload only image files",
            variant: "destructive",
          });
          continue;
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
          toast({
            title: "File Too Large",
            description: "Image must be less than 2MB",
            variant: "destructive",
          });
          continue;
        }

        const base64 = await convertToBase64(file);
        base64Images.push(base64);
      }

      if (base64Images.length === 0) {
        toast({
          title: "No Valid Images",
          description: "No valid images were selected",
          variant: "destructive",
        });
        return;
      }

      console.log("📤 Uploading images to server:", base64Images.length);

      // Upload to server
      const response = await fetch('/api/upload/images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ images: base64Images })
      });

      const result = await response.json();

      if (result.success) {
        const newImageUrls = result.imageUrls;
        const updatedImages = [...images, ...newImageUrls];
        
        console.log("✅ Images after upload:", {
          oldCount: images.length,
          newCount: updatedImages.length,
          images: updatedImages
        });
        
        setImages(updatedImages);
        onImagesChange(updatedImages);

        toast({
          title: "Success",
          description: result.message,
        });
      } else {
        throw new Error(result.message);
      }

    } catch (error: any) {
      console.error("❌ Image upload failed:", error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload images",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Clear input
      event.target.value = '';
    }
  }, [images, maxImages, onImagesChange, toast]);

  const removeImage = (index: number) => {
    const imageUrl = images[index];
    
    console.log("🗑️ Removing image:", {
      index,
      imageUrl,
      totalImages: images.length
    });

    // Delete from server
    fetch('/api/upload/images', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ imageUrl })
    }).catch(error => {
      console.error('Failed to delete image from server:', error);
    });

    const updatedImages = images.filter((_, i) => i !== index);
    
    console.log("✅ Images after removal:", {
      newCount: updatedImages.length,
      images: updatedImages
    });
    
    setImages(updatedImages);
    onImagesChange(updatedImages);
    
    toast({
      title: "Image Removed",
      description: "Image has been removed",
    });
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    const updatedImages = [...images];
    const [movedImage] = updatedImages.splice(fromIndex, 1);
    updatedImages.splice(toIndex, 0, movedImage);
    
    console.log("🔄 Moving image:", {
      fromIndex,
      toIndex,
      totalImages: updatedImages.length
    });
    
    setImages(updatedImages);
    onImagesChange(updatedImages);
  };

  // Helper function to convert file to base64
  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Food Images</label>
        <span className="text-sm text-muted-foreground">
          {images.length}/{maxImages} images
        </span>
      </div>

      {/* Upload Button */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <Input
          type="file"
          multiple
          accept="image/*"
          onChange={handleImageUpload}
          disabled={isUploading || images.length >= maxImages}
          className="hidden"
          id="image-upload"
        />
        <label
          htmlFor="image-upload"
          className={`cursor-pointer flex flex-col items-center gap-2 ${
            (isUploading || images.length >= maxImages) ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <Upload className="w-8 h-8 text-muted-foreground" />
          <div>
            <p className="font-medium">Click to upload images</p>
            <p className="text-sm text-muted-foreground">
              PNG, JPG, JPEG up to 2MB each (max {maxImages} images)
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={isUploading || images.length >= maxImages}
          >
            {isUploading ? "Uploading..." : "Choose Images"}
          </Button>
        </label>
      </div>

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Uploaded Images:</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {images.map((image, index) => (
              <Card key={index} className="relative group border-2">
                <div className="aspect-square overflow-hidden rounded-lg">
                  <img
                    src={image}
                    alt={`Food image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Remove Button */}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeImage(index)}
                >
                  <X className="w-3 h-3" />
                </Button>

                {/* Image Number Badge */}
                <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                  {index + 1}
                </div>

                {/* Move Buttons */}
                <div className="absolute bottom-2 left-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {index > 0 && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1 text-xs h-6"
                      onClick={() => moveImage(index, index - 1)}
                    >
                      ← Move
                    </Button>
                  )}
                  {index < images.length - 1 && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1 text-xs h-6"
                      onClick={() => moveImage(index, index + 1)}
                    >
                      Move →
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {images.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
          <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No images uploaded yet</p>
          <p className="text-sm text-muted-foreground">
            Upload images to make your food look more appealing
          </p>
        </div>
      )}

      {/* Debug Info (Development ke liye) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="p-3 bg-gray-100 rounded-lg text-xs">
          <p className="font-medium">Debug Info:</p>
          <p>Images Count: {images.length}</p>
          <p>Is Uploading: {isUploading ? 'Yes' : 'No'}</p>
          <p>Existing Images: {existingImages.length}</p>
        </div>
      )}
    </div>
  );
}