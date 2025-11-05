import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { packageService } from "@/services/packageService";
import { providerConfigService } from "@/services/providerService";
import { toast } from "sonner";
import type { ProviderConfigDTO } from "../provider/types";

import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, ArrowLeft, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";

export default function EditPackagePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    cost: "",
    value: "",
    provider_id: "",
    status: true
  });

  const [selectedProviderName, setSelectedProviderName] = useState("");

  const { data: packageData, isLoading, error } = useQuery({
    queryKey: ["package", id],
    queryFn: async () => {
      try {
        const response = await packageService.getAdminPackages();
        const packageId = Number(id);
        const packageItem = response.data.find(pkg => pkg.id === packageId);
        if (!packageItem) throw new Error("Package not found");
        return packageItem;
      } catch (err) {
        throw new Error(`Failed to load package: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    },
    enabled: !!id,
  });

  const { data: providers } = useQuery<ProviderConfigDTO[]>({
    queryKey: ["active-providers"],
    queryFn: async () => {
      const response = await providerConfigService.getActive();
      return response.data;
    },
  });

  useEffect(() => {
    if (packageData && providers) {
      const currentProviderId = packageData.provider?.id || "";
      const currentProvider = providers.find(p => p.id === currentProviderId);
      
      setFormData({
        cost: packageData.cost?.toString() || "",
        value: packageData.value?.toString() || "",
        provider_id: currentProviderId,
        status: packageData.status
      });

      if (currentProvider) {
        setSelectedProviderName(`${currentProvider.name} (${currentProvider.provider})`);
      } else if (packageData.provider) {
        setSelectedProviderName(`${packageData.provider.name} (${packageData.provider.provider})`);
      }
    }
  }, [packageData, providers]);

  const handleProviderChange = (value: string) => {
    const selectedProvider = providers?.find(p => p.id === value);
    setFormData({ ...formData, provider_id: value });
    
    if (selectedProvider) {
      setSelectedProviderName(`${selectedProvider.name} (${selectedProvider.provider})`);
    }
  };

  const updateMutation = useMutation({
    mutationFn: async (data: { 
      cost: number; 
      value: number; 
      provider_id: string; 
      status: boolean 
    }) => {
      const response = await packageService.update(id!, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["package", id] });
      queryClient.invalidateQueries({ queryKey: ["packages"] });
      toast.success("Package updated successfully");
      setTimeout(() => navigate("/packages"), 1000);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Error, Something went wrong");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cost || !formData.value ) {
      toast.error("Cost, value, and provider are required");
      return;
    }

    updateMutation.mutate({
      cost: parseFloat(formData.cost),
      value: parseFloat(formData.value),
      provider_id: formData.provider_id,
      status: formData.status
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-muted-foreground">Loading package...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-red-800 font-semibold text-lg mb-2">Error Loading Package</h3>
          <p className="text-red-600 mb-4">{error.message}</p>
          <Link to="/packages">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Packages
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/packages">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Packages
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <Package className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">Edit Package</h1>
        </div>
      </div>

      <div className="bg-white  ">
        <CardHeader>
          <CardTitle>Package Details</CardTitle>
          {packageData && (
            <div className="text-sm text-muted-foreground">
              Editing package #{packageData.id}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cost">Cost *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    placeholder="Enter amount"
                    className="pl-10"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Currency: {packageData?.cost_currency || 'USD'}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="value">Value *</Label>
                <Input
                  id="value"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder="Enter amount"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Currency: {packageData?.value_currency || 'AFN'}
                </p>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="provider">Provider *</Label>
                <Select 
                  value={formData.provider_id} 
                  onValueChange={handleProviderChange}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a provider">
                      {selectedProviderName || "Select a provider"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {providers?.map(provider => (
                      <SelectItem key={provider.id} value={provider.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>
                            {provider.name} ({provider.provider})
                          </span>
                          {provider.id === packageData?.provider?.id && (
                            <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              Current
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {packageData?.provider && (
                  <p className="text-xs text-muted-foreground">
                    Current provider: {packageData.provider.name} ({packageData.provider.provider})
                  </p>
                )}
              </div>
              <div className="flex items-center space-x-2 md:col-span-2">
                <input
                  type="checkbox"
                  id="status"
                  checked={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="status" className="text-sm font-medium">
                  Active
                </Label>
              </div>
            </div>
            <div className="flex justify-end gap-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate("/packages")}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Updating..." : "Update Package"}
              </Button>
            </div>
          </form>
        </CardContent>
      </div>
    </div>
  );
}