import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {  CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

import { 
  Search,  
  Plus,
  Edit, 
  Trash2, 
  MoreVertical, 
  Eye, 
  EyeOff,
  Calendar,
  Image as ImageIcon,
  Upload,
  X
} from "lucide-react";

export interface DialogDTO {
  id: string;
  title: string;
  description: string;
  image?: string;
  show_dialog: boolean;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  createdAt: string;
  updatedAt: string;
}

export default function DialogsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [filteredDialogs, setFilteredDialogs] = useState<DialogDTO[]>([]);

  const { data: dialogsData, isLoading, error } = useQuery({
    queryKey: ["dialogs"],
    queryFn: async () => {
      const response = await apiClient.get("/admin/dialogs");
      return response.data;
    },
  });

  useEffect(() => {
    if (dialogsData?.data) {
        console.log("🔍 ALL DIALOGS FROM API:", dialogsData.data);
      const filtered = dialogsData.data.filter((dialog: DialogDTO) =>
        dialog.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dialog.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      console.log("🔍 FILTERED DIALOGS:", filtered);
      setFilteredDialogs(filtered);
    }
  }, [dialogsData, searchTerm]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Eye className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Popup Dialogs</h1>
          </div>
        </div>
        <AddDialogDialog />
      </div>

 
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Dialog List</CardTitle>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search dialogs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full sm:w-64"
                  />
                </div>
                <Button type="submit" variant="outline">
                  Search
                </Button>
              </form>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Image</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Date Range</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                
                {error && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-red-500">
                      Error loading dialogs
                    </TableCell>
                  </TableRow>
                )}
                
                {!isLoading && !error && filteredDialogs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {dialogsData?.data && dialogsData.data.length > 0 ? 'No dialogs match your search' : 'No dialogs found'}
                    </TableCell>
                  </TableRow>
                )}

                {filteredDialogs.map((dialog) => (
                  <DialogTableRow key={dialog.id} dialog={dialog} />
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
 
    </div>
  );
}

function DialogTableRow({ dialog }: { dialog: DialogDTO }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (dialog.image) {
      setIsLoading(true);
      setImageError(false);
      
      // Create a new image object to handle loading
      const img = new Image();
      
      img.onload = () => {
        console.log("✅ IMAGE LOADED SUCCESSFULLY:", dialog.image);
        setImageUrl(dialog.image || null);
        setIsLoading(false);
        setImageError(false);
      };
      
      img.onerror = () => {
        console.log("❌ IMAGE FAILED TO LOAD:", dialog.image);
        setIsLoading(false);
        setImageError(true);
        
        // Try with CORS proxy as fallback
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(dialog.image!)}`;
        const proxyImg = new Image();
        proxyImg.onload = () => {
          setImageUrl(proxyUrl);
          setImageError(false);
        };
        proxyImg.onerror = () => {
          setImageError(true);
        };
        proxyImg.src = proxyUrl;
      };
      
      // Add crossorigin attribute to handle CORS
      img.crossOrigin = "anonymous";
      img.src = dialog.image;
    } else {
      setIsLoading(false);
      setImageError(false);
    }
  }, [dialog.image]);

  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/admin/dialogs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dialogs"] });
      toast.success("Dialog deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to delete dialog");
    },
  });
const toggleMutation = useMutation({
  mutationFn: async (id: string) => {
    await apiClient.patch(`/admin/dialogs/${id}/toggle`, {}); 
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["dialogs"] });
    toast.success("Dialog status updated successfully");
  },
  onError: (error: any) => {
    toast.error(error.response?.data?.error || "Failed to update dialog status");
  },
});

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete dialog "${dialog.title}"?`)) {
      deleteMutation.mutate(dialog.id);
    }
  };

  const handleToggle = () => {
    toggleMutation.mutate(dialog.id);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getDateRangeText = (dialog: DialogDTO) => {
    if (!dialog.start_date && !dialog.end_date) return "Always active";
    if (dialog.start_date && !dialog.end_date) return `From ${formatDate(dialog.start_date)}`;
    if (!dialog.start_date && dialog.end_date) return `Until ${formatDate(dialog.end_date)}`;
    return `${formatDate(dialog.start_date!)} - ${formatDate(dialog.end_date!)}`;
  };

  return (
    <TableRow>
      <TableCell className="font-medium">
        <div className="max-w-48 truncate" title={dialog.title}>
          {dialog.title}
        </div>
      </TableCell>
      <TableCell>
        <div className="max-w-64 truncate" title={dialog.description}>
          {dialog.description}
        </div>
      </TableCell>
      <TableCell>
        {dialog.image ? (
          <div className="flex items-center gap-2">
            {isLoading && (
              <div className="h-10 w-10 bg-gray-200 animate-pulse rounded flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              </div>
            )}
            
            {!isLoading && imageUrl && !imageError && (
              <img 
                src={imageUrl} 
                alt="Dialog" 
                className="h-10 w-10 object-cover rounded"
                crossOrigin="anonymous"
                onError={() => setImageError(true)}
              />
            )}
            
            {imageError && (
              <div className="h-10 w-10 bg-gray-200 rounded flex items-center justify-center">
                <ImageIcon className="h-4 w-4 text-gray-400" />
              </div>
            )}
            
            <Badge variant={imageError ? "secondary" : "outline"} className="text-xs">
              {imageError ? 'Load Failed' : 'Has Image'}
            </Badge>
          </div>
        ) : (
          <Badge variant="secondary" className="text-xs">
            No Image
          </Badge>
        )}
      </TableCell>
      <TableCell>
        <Badge variant={dialog.show_dialog ? "default" : "secondary"}>
          {dialog.show_dialog ? "Showing" : "Hidden"}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant={dialog.is_active ? "default" : "secondary"}>
          {dialog.is_active ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          {getDateRangeText(dialog)}
        </div>
      </TableCell>
      <TableCell>
        {formatDate(dialog.createdAt)}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <EditDialogDialog dialog={dialog} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleToggle}>
                {dialog.show_dialog ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {dialog.show_dialog ? 'Hide' : 'Show'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
}

function AddDialogDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    show_dialog: true,
    is_active: true,
    start_date: "",
    end_date: ""
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiClient.post("/admin/dialogs", formData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dialogs"] });
      toast.success("Dialog added successfully");
      setOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Error creating dialog");
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      show_dialog: true,
      is_active: true,
      start_date: "",
      end_date: ""
    });
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      toast.error("Title and description are required");
      return;
    }

    const submitFormData = new FormData();
    submitFormData.append('title', formData.title);
    submitFormData.append('description', formData.description);
    submitFormData.append('show_dialog', formData.show_dialog.toString());
    submitFormData.append('is_active', formData.is_active.toString());
    if (formData.start_date) submitFormData.append('start_date', formData.start_date);
    if (formData.end_date) submitFormData.append('end_date', formData.end_date);
    if (imageFile) submitFormData.append('image', imageFile);

    createMutation.mutate(submitFormData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Dialog
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Popup Dialog</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter dialog title"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter dialog description"
              rows={4}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="image">Image</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
              {imagePreview ? (
                <div className="relative">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="mx-auto h-32 object-cover rounded"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2"
                    onClick={removeImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div>
                  <Upload className="mx-auto h-8 w-8 text-gray-400" />
                  <Label htmlFor="image-upload" className="cursor-pointer">
                    <span className="text-sm text-gray-600">Click to upload image</span>
                    <Input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </Label>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>
          <div className="flex items-center justify-between space-x-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="show_dialog"
                checked={formData.show_dialog}
                onCheckedChange={(checked) => setFormData({ ...formData, show_dialog: checked })}
              />
              <Label htmlFor="show_dialog" className="text-sm font-medium">
                Show in App
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active" className="text-sm font-medium">
                Active
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Adding..." : "Add Dialog"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditDialogDialog({ dialog }: { dialog: DialogDTO }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: dialog.title,
    description: dialog.description,
    show_dialog: dialog.show_dialog,
    is_active: dialog.is_active,
    start_date: dialog.start_date || "",
    end_date: dialog.end_date || ""
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(dialog.image || null);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  // Load current image when dialog opens
  useEffect(() => {
    if (open && dialog.image) {
      setIsLoading(true);
      setImageError(false);
      
      const img = new Image();
      
      img.onload = () => {
        console.log("✅ CURRENT IMAGE LOADED SUCCESSFULLY:", dialog.image);
        setCurrentImageUrl(dialog.image || null);
        setIsLoading(false);
        setImageError(false);
      };
      
      img.onerror = () => {
        console.log("❌ CURRENT IMAGE FAILED TO LOAD:", dialog.image);
        setIsLoading(false);
        setImageError(true);
        
        // Try with CORS proxy as fallback
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(dialog.image!)}`;
        const proxyImg = new Image();
        proxyImg.onload = () => {
          setCurrentImageUrl(proxyUrl);
          setImageError(false);
        };
        proxyImg.onerror = () => {
          setImageError(true);
        };
        proxyImg.src = proxyUrl;
      };
      
      img.crossOrigin = "anonymous";
      img.src = dialog.image;
    } else {
      setIsLoading(false);
    }
  }, [open, dialog.image]);

  // Set image preview when imageFile changes
  useEffect(() => {
    if (imageFile) {
      const previewUrl = URL.createObjectURL(imageFile);
      setImagePreview(previewUrl);
    } else {
      setImagePreview(null);
    }
  }, [imageFile]);

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const updateMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiClient.put(`/admin/dialogs/${dialog.id}`, formData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dialogs"] });
      toast.success("Dialog updated successfully");
      setOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Error updating dialog");
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const resetForm = () => {
    setFormData({
      title: dialog.title,
      description: dialog.description,
      show_dialog: dialog.show_dialog,
      is_active: dialog.is_active,
      start_date: dialog.start_date || "",
      end_date: dialog.end_date || ""
    });
    setImageFile(null);
    setImagePreview(null);
    setCurrentImageUrl(dialog.image || null);
    setImageError(false);
    setIsLoading(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      toast.error("Title and description are required");
      return;
    }

    const submitFormData = new FormData();
    submitFormData.append('title', formData.title);
    submitFormData.append('description', formData.description);
    submitFormData.append('show_dialog', formData.show_dialog.toString());
    submitFormData.append('is_active', formData.is_active.toString());
    if (formData.start_date) submitFormData.append('start_date', formData.start_date);
    if (formData.end_date) submitFormData.append('end_date', formData.end_date);
    if (imageFile) {
      submitFormData.append('image', imageFile);
    } else if (!dialog.image) {
      // If no existing image and no new image, ensure we don't send image field
      submitFormData.append('image', '');
    }

    updateMutation.mutate(submitFormData);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        resetForm();
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-1" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Popup Dialog</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title *</Label>
            <Input
              id="edit-title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter dialog title"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description *</Label>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter dialog description"
              rows={4}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit-image">Image</Label>
            
            {/* Show current image or new image preview */}
            {!imagePreview && dialog.image && (
              <div className="mb-4">
                <Label className="text-sm font-medium mb-2 block">Current Image</Label>
                <div className="border rounded-lg p-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : imageError ? (
                    <div className="text-center text-muted-foreground">
                      <ImageIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p>Failed to load current image</p>
                    </div>
                  ) : currentImageUrl ? (
                    <div className="relative">
                      <img 
                        src={currentImageUrl} 
                        alt="Current dialog" 
                        className="mx-auto h-32 object-cover rounded"
                        crossOrigin="anonymous"
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {/* Image upload area */}
            <Label className="text-sm font-medium mb-2 block">
              {imagePreview ? 'New Image Preview' : 'Upload New Image (optional)'}
            </Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
              {imagePreview ? (
                <div className="relative">
                  <img 
                    src={imagePreview} 
                    alt="New preview" 
                    className="mx-auto h-32 object-cover rounded"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2"
                    onClick={removeImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <div className="mt-2 text-sm text-green-600">
                    New image selected - will replace current image
                  </div>
                </div>
              ) : (
                <div>
                  <Upload className="mx-auto h-8 w-8 text-gray-400" />
                  <Label htmlFor="edit-image-upload" className="cursor-pointer">
                    <span className="text-sm text-gray-600">Click to upload new image</span>
                    <Input
                      id="edit-image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </Label>
                  {dialog.image && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Leave empty to keep current image
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-start_date">Start Date</Label>
              <Input
                id="edit-start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-end_date">End Date</Label>
              <Input
                id="edit-end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>
          <div className="flex items-center justify-between space-x-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-show_dialog"
                checked={formData.show_dialog}
                onCheckedChange={(checked) => setFormData({ ...formData, show_dialog: checked })}
              />
              <Label htmlFor="edit-show_dialog" className="text-sm font-medium">
                Show in App
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="edit-is_active" className="text-sm font-medium">
                Active
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Updating..." : "Update Dialog"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}