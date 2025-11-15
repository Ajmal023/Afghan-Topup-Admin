import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RefreshCw,
  Play,
  Pause,
  Save,
} from "lucide-react";

// Define types for the rate data
interface Rate {
  id: string;
  name: string;
  prefix: string;
  skuCode: string;
  rate: number;
  autoSyncInterval: number;
  lastSynced: string | null;
  isActive: boolean;
}

interface RatesResponse {
  data: Rate[];
}

interface EditingRates {
  [key: string]: {
    rate?: number;
  };
}

interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
}

export default function RatesManagement() {
  const queryClient = useQueryClient();
  const [editingRates, setEditingRates] = useState<EditingRates>({});

  const { data: ratesData, isLoading } = useQuery<RatesResponse>({
    queryKey: ["rates"],
    queryFn: async () => {
      const response = await api.get("/admin/rates");
      return response.data;
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post("/admin/rates/sync");
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rates"] });
      toast.success("Rates synced successfully");
    },
    onError: (error: ApiError) => {
      toast.error(error.response?.data?.error || "Sync failed");
    },
  });

  const updateRateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Rate> }) => {
      const response = await api.put(`/admin/rates/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rates"] });
      toast.success("Rate updated successfully");
    },
    onError: (error: ApiError) => {
      toast.error(error.response?.data?.error || "Update failed");
    },
  });

  const updateSyncIntervalMutation = useMutation({
    mutationFn: async ({ skuCode, prefix, interval }: { skuCode: string; prefix: string; interval: number }) => {
      const response = await api.put(`/admin/rates/${skuCode}/${prefix}/sync-interval`, { interval });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rates"] });
      toast.success("Sync interval updated");
    },
    onError: (error: ApiError) => {
      toast.error(error.response?.data?.error || "Failed to update interval");
    },
  });

  const handleRateChange = (rateId: string, field: string, value: string) => {
    setEditingRates(prev => ({
      ...prev,
      [rateId]: {
        ...prev[rateId],
        [field]: field === 'rate' ? parseFloat(value) : value
      }
    }));
  };

  const saveRate = (rate: Rate) => {
    const editedData = editingRates[rate.id];
    if (!editedData) return;

    updateRateMutation.mutate({
      id: rate.id,
      data: editedData
    });

    setEditingRates(prev => {
      const newState = { ...prev };
      delete newState[rate.id];
      return newState;
    });
  };

  const handleSyncIntervalChange = (rate: Rate, interval: string) => {
    updateSyncIntervalMutation.mutate({
      skuCode: rate.skuCode,
      prefix: rate.prefix,
      interval: parseInt(interval)
    });
  };

  const toggleActive = (rate: Rate) => {
    updateRateMutation.mutate({
      id: rate.id,
      data: { isActive: !rate.isActive }
    });
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading rates...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ding Rates Management</h1>
          <p className="text-muted-foreground">Manage provider exchange rates and auto-sync intervals</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            {syncMutation.isPending ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      </div>

      <div>
        <CardHeader>
          <CardTitle>Provider Rates</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Prefix</TableHead>
                <TableHead>SKU Code</TableHead>
                <TableHead>Rate (AFN/USD)</TableHead>
                <TableHead>Auto Sync</TableHead>
                <TableHead>Last Synced</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ratesData?.data?.map((rate: Rate) => (
                <TableRow key={rate.id}>
                  <TableCell className="font-medium">{rate.name}</TableCell>
                  <TableCell>{rate.prefix}</TableCell>
                  <TableCell className="font-mono text-sm">{rate.skuCode}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        defaultValue={rate.rate}
                        onChange={(e) => handleRateChange(rate.id, 'rate', e.target.value)}
                        className="w-24"
                      />
                      {editingRates[rate.id]?.rate !== undefined && (
                        <Button
                          size="sm"
                          onClick={() => saveRate(rate)}
                          disabled={updateRateMutation.isPending}
                        >
                          <Save className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={rate.autoSyncInterval.toString()}
                      onValueChange={(value) => handleSyncIntervalChange(rate, value)}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 hour</SelectItem>
                        <SelectItem value="2">2 hours</SelectItem>
                        <SelectItem value="3">3 hours</SelectItem>
                        <SelectItem value="6">6 hours</SelectItem>
                        <SelectItem value="12">12 hours</SelectItem>
                        <SelectItem value="24">24 hours</SelectItem>
                        <SelectItem value="0">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {rate.lastSynced ? new Date(rate.lastSynced).toLocaleString() : 'Never'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={rate.isActive ? "default" : "secondary"}>
                      {rate.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(rate)}
                    >
                      {rate.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </div>

      {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Sync Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Active Providers:</span>
                <span className="font-medium">
                  {ratesData?.data?.filter(r => r.isActive).length || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Auto-sync Enabled:</span>
                <span className="font-medium">
                  {ratesData?.data?.filter(r => r.autoSyncInterval > 0).length || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                ratesData?.data?.forEach(rate => {
                  if (rate.isActive) {
                    updateRateMutation.mutate({
                      id: rate.id,
                      data: { rate: parseFloat(rate.rate.toString()) * 1.02 } // 2% increase
                    });
                  }
                });
              }}
            >
              Increase All by 2%
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
            >
              Force Sync All
            </Button>
          </CardContent>
        </Card>
      </div> */}
    </div>
  );
}