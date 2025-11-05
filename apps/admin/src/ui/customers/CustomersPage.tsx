import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { CustomerDTO, CustomersResponse, CustomerStats } from "./types";
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
import { Progress } from "@/components/ui/progress";

import { 
  Search,  
  Edit, 
  Trash2, 
  MoreVertical, 
  User, 
  Eye, 
  UserCheck, 
  UserX, 
  RefreshCw,
  Download,
  Database
} from "lucide-react";

interface SyncResult {
  totalFirebaseUsers: number;
  usersWithEmail: number;
  synced: number;
  updated: number;
  skipped: number;
  errors: Array<{ uid: string; error: string }>;
}


export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerDTO[]>([]);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);

  const { data: customersData, isLoading, error, refetch: refetchCustomers } = useQuery<CustomersResponse>({
    queryKey: ["customers", currentPage, statusFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== "all" && { status: statusFilter }),
      });
      
      const response = await api.get(`/admin/customers?${params}`);
      return response.data;
    },
  });

  const { data: stats, refetch: refetchStats } = useQuery<CustomerStats>({
    queryKey: ["customer-stats"],
    queryFn: async () => {
      const response = await api.get("/admin/customers/stats/summary");
      return response.data.data;
    },
  });


  useEffect(() => {
    if (customersData?.data) {
      const filtered = customersData.data.filter((customer: any) =>
        customer.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone_number?.includes(searchTerm) ||
        customer.uid?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCustomers(filtered);
    }
  }, [customersData, searchTerm]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <User className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Customers</h1>
            <p className="text-muted-foreground">Manage your customer accounts</p>
          </div>
        </div>
        <SyncCustomersDialog 
          open={syncDialogOpen} 
          onOpenChange={setSyncDialogOpen}
          onSyncSuccess={() => {
            refetchCustomers();
            refetchStats();
          }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Database Customers</p>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
              </div>
              <Database className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats?.active || 0}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Inactive</p>
                <p className="text-2xl font-bold text-red-600">{stats?.inactive || 0}</p>
              </div>
              <UserX className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Recent </p>
                <p className="text-2xl font-bold">{stats?.recent || 0}</p>
              </div>
              <User className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        {/* <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Firebase Users</p>
                <p className="text-2xl font-bold">{firebaseAnalytics?.totalUsers || 0}</p>
              </div>
              <RefreshCw className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card> */}
      </div>

 
     
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Customer List</CardTitle>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search customers..."
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
              <Button 
                onClick={() => setSyncDialogOpen(true)}
                className="whitespace-nowrap"
              >
                <Download className="h-4 w-4 mr-2" />
                Sync from Firebase
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>UID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                
                {error && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-red-500">
                      Error loading customers
                    </TableCell>
                  </TableRow>
                )}
                
                {!isLoading && !error && filteredCustomers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {customersData?.data && customersData.data.length > 0 ? 'No customers match your search' : 'No customers found'}
                    </TableCell>
                  </TableRow>
                )}

                {filteredCustomers.map((customer) => (
                  <CustomerTableRow key={customer.id} customer={customer} />
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {customersData?.pagination && customersData.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, customersData.pagination.totalItems)} of {customersData.pagination.totalItems} entries
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, customersData.pagination.totalPages))}
                  disabled={currentPage === customersData.pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
     
    </div>
  );
}


function SyncCustomersDialog({ 
  open, 
  onOpenChange, 
  onSyncSuccess 
}: { 
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSyncSuccess: () => void;
}) {
  const [syncType, setSyncType] = useState<"full" | "recent">("full");
  const [batchSize, setBatchSize] = useState<number>(1000);
  const [lastNCustomers, setLastNCustomers] = useState<number>(1000);
  const [progress, setProgress] = useState(0);

  const syncMutation = useMutation({
    mutationFn: async (data: { batchSize: number; syncType: string; lastNCustomers?: number }) => {
      const response = await api.post("/admin/firebase/sync-customers", data);
      return response.data;
    },
    onMutate: () => {
      setProgress(0);
      toast.loading("Starting sync process...");
    },
    onSuccess: (data: { data: SyncResult; message: string }) => {
      toast.dismiss();
      toast.success(`Sync completed! ${data.data.synced} new, ${data.data.updated} updated`);
      onSyncSuccess();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.dismiss();
      toast.error(error.response?.data?.error || "Sync failed");
    },
  });

  const handleSync = () => {
    const syncData = {
      batchSize,
      syncType,
      ...(syncType === "recent" && { lastNCustomers })
    };
    
    syncMutation.mutate(syncData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Sync from Firebase
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Sync Type</label>
            <Select value={syncType} onValueChange={(value: "full" | "recent") => setSyncType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full Sync (All Users)</SelectItem>
                <SelectItem value="recent">Sync Recent Users</SelectItem>
              </SelectContent>
            </Select>
          </div>

    
          <div className="space-y-2">
            <label className="text-sm font-medium">Batch Size</label>
            <Select value={batchSize.toString()} onValueChange={(value) => setBatchSize(parseInt(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="100">100 users per batch</SelectItem>
                <SelectItem value="500">500 users per batch</SelectItem>
                <SelectItem value="1000">1000 users per batch</SelectItem>
                <SelectItem value="2000">2000 users per batch</SelectItem>
              </SelectContent>
            </Select>
          </div>

     
          {syncType === "recent" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Number of Recent Users</label>
              <Select value={lastNCustomers.toString()} onValueChange={(value) => setLastNCustomers(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">Last 10 users</SelectItem>
                  <SelectItem value="100">Last 100 users</SelectItem>
                  <SelectItem value="500">Last 500 users</SelectItem>
                  <SelectItem value="1000">Last 1000 users</SelectItem>
                  <SelectItem value="5000">Last 5000 users</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

    
          {syncMutation.isPending && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Syncing...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

  
          <div className="text-sm text-muted-foreground">
            {syncType === "full" ? (
              <p>This will sync ALL Firebase users with your database. This may take a while for large user bases.</p>
            ) : (
              <p>This will sync only the most recent {lastNCustomers} users from Firebase.</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={syncMutation.isPending}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSync}
            disabled={syncMutation.isPending}
            className="min-w-20"
          >
            {syncMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Start Sync
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function CustomerTableRow({ customer }: { customer: CustomerDTO }) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/customers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customer-stats"] });
      toast.success("Customer deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to delete customer");
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'active' | 'inactive' }) => {
      await api.patch(`/admin/customers/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customer-stats"] });
      toast.success(`Customer ${customer.status === 'active' ? 'deactivated' : 'activated'} successfully`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to update customer status");
    },
  });

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete customer ${customer.first_name} ${customer.last_name}? This action cannot be undone.`)) {
      deleteMutation.mutate(customer.id);
    }
  };

  const handleStatusToggle = () => {
    const newStatus = customer.status === 'active' ? 'inactive' : 'active';
    statusMutation.mutate({ id: customer.id, status: newStatus });
  };

  const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown Customer';

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            {customer.profile_image ? (
              <img
                src={customer.profile_image}
                alt={fullName}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
          </div>
          <div>
            <div className="font-medium">{fullName}</div>
            <div className="text-sm text-muted-foreground">{customer.email}</div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          {customer.phone_number && (
            <div className="text-sm">{customer.phone_number}</div>
          )}
          {customer.whatsapp_number && (
            <div className="text-sm text-muted-foreground">
              WhatsApp: {customer.whatsapp_number}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell>
        <code className="text-xs bg-muted px-2 py-1 rounded">{customer.uid}</code>
      </TableCell>
      <TableCell>
        <Badge 
          variant={customer.status === 'active' ? 'default' : 'secondary'}
          className={customer.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
        >
          {customer.status}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="text-sm">
          {new Date(customer.created_at).toLocaleDateString()}
        </div>
        <div className="text-xs text-muted-foreground">
          {new Date(customer.created_at).toLocaleTimeString()}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <ViewCustomerDialog customer={customer} />
          <EditCustomerDialog customer={customer} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleStatusToggle}>
                {customer.status === 'active' ? <UserX className="h-4 w-4 mr-2" /> : <UserCheck className="h-4 w-4 mr-2" />}
                {customer.status === 'active' ? 'Deactivate' : 'Activate'}
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


function ViewCustomerDialog({ customer }: { customer: CustomerDTO }) {
  const [open, setOpen] = useState(false);

  const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown Customer';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4 mr-1" />
          View
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Customer Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 ">
          <div className="flex items-center gap-4">
            {customer.profile_image ? (
              <img
                src={customer.profile_image}
                alt={fullName}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-lg">{fullName}</h3>
              <Badge 
                variant={customer.status === 'active' ? 'default' : 'secondary'}
                className={customer.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
              >
                {customer.status}
              </Badge>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <label className="font-medium text-muted-foreground">Email</label>
              <p>{customer.email}</p>
            </div>
            <div>
              <label className="font-medium text-muted-foreground">UID</label>
              <p className="font-mono">{customer.uid}</p>
            </div>
            <div>
              <label className="font-medium text-muted-foreground">Phone</label>
              <p>{customer.phone_number || 'Not provided'}</p>
            </div>
            <div>
              <label className="font-medium text-muted-foreground">WhatsApp</label>
              <p>{customer.whatsapp_number || 'Not provided'}</p>
            </div>
            <div>
              <label className="font-medium text-muted-foreground">Country</label>
              <p>{customer.country_code}</p>
            </div>
            <div>
              <label className="font-medium text-muted-foreground">Joined</label>
              <p>{new Date(customer.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditCustomerDialog({ customer }: { customer: CustomerDTO }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    first_name: customer.first_name || '',
    last_name: customer.last_name || '',
    email: customer.email,
    phone_number: customer.phone_number || '',
    whatsapp_number: customer.whatsapp_number || '',
    country_code: customer.country_code,
    status: customer.status,
  });
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await api.put(`/admin/customers/${customer.id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer updated successfully");
      setOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to update customer");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-1" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="first_name" className="text-sm font-medium">
                First Name
              </label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => handleChange('first_name', e.target.value)}
                placeholder="First name"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="last_name" className="text-sm font-medium">
                Last Name
              </label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => handleChange('last_name', e.target.value)}
                placeholder="Last name"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email *
            </label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="Email address"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="phone_number" className="text-sm font-medium">
                Phone Number
              </label>
              <Input
                id="phone_number"
                value={formData.phone_number}
                onChange={(e) => handleChange('phone_number', e.target.value)}
                placeholder="Phone number"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="whatsapp_number" className="text-sm font-medium">
                WhatsApp Number
              </label>
              <Input
                id="whatsapp_number"
                value={formData.whatsapp_number}
                onChange={(e) => handleChange('whatsapp_number', e.target.value)}
                placeholder="WhatsApp number"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="country_code" className="text-sm font-medium">
                Country Code
              </label>
              <Input
                id="country_code"
                value={formData.country_code}
                onChange={(e) => handleChange('country_code', e.target.value)}
                placeholder="Country code"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="status" className="text-sm font-medium">
                Status
              </label>
              <Select 
                value={formData.status} 
                onValueChange={(value: 'active' | 'inactive') => handleChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
              {updateMutation.isPending ? "Updating..." : "Update Customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}