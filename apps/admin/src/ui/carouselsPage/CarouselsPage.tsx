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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Image as ImageIcon,
  Upload,
  X,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Link as LinkIcon
} from "lucide-react";

export interface CarouselDTO {
  id: string;
  image_url: string;
  title?: string;
  description?: string;
  link?: string;
  order_index: number;
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function CarouselsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [filteredCarousels, setFilteredCarousels] = useState<CarouselDTO[]>([]);

  const { data: carouselsData, isLoading, error } = useQuery({
    queryKey: ["carousels"],
    queryFn: async () => {
      const response = await apiClient.get("/admin/carousels");
      return response.data;
    },
  });

  useEffect(() => {
    if (carouselsData?.data) {
      const filtered = carouselsData.data.filter((carousel: CarouselDTO) =>
        carousel.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        carousel.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        carousel.image_url.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCarousels(filtered);
    }
  }, [carouselsData, searchTerm]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ImageIcon className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Carousels</h1>
            <p className="text-muted-foreground">Manage your app carousel images</p>
          </div>
        </div>
        <AddCarouselDialog />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Carousel List</CardTitle>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search carousels..."
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
                  <TableHead className="w-12">Order</TableHead>
                  <TableHead>Image</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Link</TableHead>
                  <TableHead>Status</TableHead>
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
                      Error loading carousels
                    </TableCell>
                  </TableRow>
                )}
                
                {!isLoading && !error && filteredCarousels.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {carouselsData?.data && carouselsData.data.length > 0 ? 'No carousels match your search' : 'No carousels found'}
                    </TableCell>
                  </TableRow>
                )}

                {filteredCarousels.map((carousel, index) => (
                  <CarouselTableRow 
                    key={carousel.id} 
                    carousel={carousel} 
                    index={index}
                    totalItems={filteredCarousels.length}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CarouselTableRow({ 
  carousel, 
  index, 
  totalItems 
}: { 
  carousel: CarouselDTO; 
  index: number;
  totalItems: number;
}) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/admin/carousels/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["carousels"] });
      toast.success("Carousel deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to delete carousel");
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: async (updates: { id: string; order_index: number }[]) => {
      await apiClient.put("/admin/carousels/order/update", { updates });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["carousels"] });
      toast.success("Order updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to update order");
    },
  });

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete this carousel?`)) {
      deleteMutation.mutate(carousel.id);
    }
  };

  const handleMove = (direction: 'up' | 'down') => {
    const currentCarousels = queryClient.getQueryData<{ data: CarouselDTO[] }>(["carousels"]);
    if (!currentCarousels?.data) return;

    const updatedCarousels = [...currentCarousels.data];
    const currentIndex = updatedCarousels.findIndex(c => c.id === carousel.id);
    
    if (direction === 'up' && currentIndex > 0) {
      // Swap with previous item
      const tempOrder = updatedCarousels[currentIndex].order_index;
      updatedCarousels[currentIndex].order_index = updatedCarousels[currentIndex - 1].order_index;
      updatedCarousels[currentIndex - 1].order_index = tempOrder;
      
      updateOrderMutation.mutate([
        { id: carousel.id, order_index: updatedCarousels[currentIndex].order_index },
        { id: updatedCarousels[currentIndex - 1].id, order_index: updatedCarousels[currentIndex - 1].order_index }
      ]);
    } else if (direction === 'down' && currentIndex < updatedCarousels.length - 1) {
      // Swap with next item
      const tempOrder = updatedCarousels[currentIndex].order_index;
      updatedCarousels[currentIndex].order_index = updatedCarousels[currentIndex + 1].order_index;
      updatedCarousels[currentIndex + 1].order_index = tempOrder;
      
      updateOrderMutation.mutate([
        { id: carousel.id, order_index: updatedCarousels[currentIndex].order_index },
        { id: updatedCarousels[currentIndex + 1].id, order_index: updatedCarousels[currentIndex + 1].order_index }
      ]);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const truncateText = (text: string | undefined, maxLength: number) => {
    if (!text) return "N/A";
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-1">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{carousel.order_index}</span>
          <div className="flex flex-col">
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0"
              onClick={() => handleMove('up')}
              disabled={updateOrderMutation.isPending || index === 0}
            >
              <ArrowUp className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0"
              onClick={() => handleMove('down')}
              disabled={updateOrderMutation.isPending || index === totalItems - 1}
            >
              <ArrowDown className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {carousel.image_url ? (
            <>
              <img 
                src={carousel.image_url} 
                alt="Carousel" 
                className="h-10 w-10 object-cover rounded"
              />
              <Badge variant="outline" className="text-xs">
                Has Image
              </Badge>
            </>
          ) : (
            <Badge variant="secondary" className="text-xs">
              No Image
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="max-w-32 truncate" title={carousel.title}>
          {truncateText(carousel.title, 20)}
        </div>
      </TableCell>
      <TableCell>
        <div className="max-w-48 truncate" title={carousel.description}>
          {truncateText(carousel.description, 30)}
        </div>
      </TableCell>
      <TableCell>
        {carousel.link ? (
          <div className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-green-600" />
            <Badge variant="outline" className="text-xs">
              Has Link
            </Badge>
          </div>
        ) : (
          <Badge variant="secondary" className="text-xs">
            No Link
          </Badge>
        )}
      </TableCell>
      <TableCell>
        <Badge variant={carousel.is_active ? "default" : "secondary"}>
          {carousel.is_active ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
      <TableCell>
        {formatDate(carousel.createdAt)}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <EditCarouselDialog carousel={carousel} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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

function AddCarouselDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    link: "",
    order_index: "" as string | number,
    is_active: true
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiClient.post("/admin/carousels", formData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["carousels"] });
      toast.success("Carousel added successfully");
      setOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Error creating carousel");
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
      link: "",
      order_index: "",
      is_active: true
    });
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) {
      toast.error("Image is required");
      return;
    }

    const submitFormData = new FormData();
    if (formData.title) submitFormData.append('title', formData.title);
    if (formData.description) submitFormData.append('description', formData.description);
    if (formData.link) submitFormData.append('link', formData.link);
    if (formData.order_index) submitFormData.append('order_index', formData.order_index.toString());
    submitFormData.append('is_active', formData.is_active.toString());
    submitFormData.append('image', imageFile);

    createMutation.mutate(submitFormData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Carousel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Carousel Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="image" className="text-sm font-medium">
              Image *
            </Label>
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
                      required
                    />
                  </Label>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter carousel title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter carousel description"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="link">Link URL</Label>
            <Input
              id="link"
              type="url"
              value={formData.link}
              onChange={(e) => setFormData({ ...formData, link: e.target.value })}
              placeholder="https://example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="order_index">Order Index</Label>
            <Input
              id="order_index"
              type="number"
              value={formData.order_index}
              onChange={(e) => setFormData({ ...formData, order_index: e.target.value })}
              placeholder="Leave empty for auto-assignment"
              min="1"
            />
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
              disabled={createMutation.isPending || !imageFile}
            >
              {createMutation.isPending ? "Adding..." : "Add Carousel"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditCarouselDialog({ carousel }: { carousel: CarouselDTO }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: carousel.title || "",
    description: carousel.description || "",
    link: carousel.link || "",
    order_index: carousel.order_index,
    is_active: carousel.is_active
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(carousel.image_url || null);
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiClient.put(`/admin/carousels/${carousel.id}`, formData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["carousels"] });
      toast.success("Carousel updated successfully");
      setOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Error updating carousel");
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const submitFormData = new FormData();
    submitFormData.append('title', formData.title);
    submitFormData.append('description', formData.description);
    submitFormData.append('link', formData.link);
    submitFormData.append('order_index', formData.order_index.toString());
    submitFormData.append('is_active', formData.is_active.toString());
    if (imageFile) submitFormData.append('image', imageFile);

    updateMutation.mutate(submitFormData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-1" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Carousel Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-image" className="text-sm font-medium">
              Image
            </Label>
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
                  <Label htmlFor="edit-image-upload" className="cursor-pointer">
                    <span className="text-sm text-gray-600">Click to upload image</span>
                    <Input
                      id="edit-image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </Label>
                </div>
              )}
            </div>
            {carousel.image_url && !imageFile && (
              <p className="text-xs text-muted-foreground">
                Current image will be kept if no new image is selected
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter carousel title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter carousel description"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-link">Link URL</Label>
            <Input
              id="edit-link"
              type="url"
              value={formData.link}
              onChange={(e) => setFormData({ ...formData, link: e.target.value })}
              placeholder="https://example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-order_index">Order Index</Label>
            <Input
              id="edit-order_index"
              type="number"
              value={formData.order_index}
              onChange={(e) => setFormData({ ...formData, order_index: Number(e.target.value) })}
              min="1"
            />
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
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Updating..." : "Update Carousel"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}