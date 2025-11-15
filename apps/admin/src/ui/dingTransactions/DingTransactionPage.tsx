import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
    Search, Filter,  Eye, Download,  Phone, 
    Database, TrendingUp, PieChart, Calculator
} from "lucide-react";

interface DingTransaction {
    id: string;
    transaction_id: string;
    ding_transfer_ref: string;
    processing_state: string;
    provider_txn_id: string;
    original_amount: number;
    cost_amount: number;
    rate_used: number;
    phone_number: string;
    prefix: string;
    provider_name: string;
    status: string;
    error_message: string;
    cost_calculation: string;
    customer_mobile: string;
    request_id: string;
    response_data: any;
    createdAt: string;
    Transaction?: {
        id: string;
        uid: string;
        payment_id: string;
        status: string;
        amount: number;
        currency: string;
    };
}

interface DingStats {
    total: number;
    totalOriginalAmount: number;
    totalCostAmount: number;
    successRate: number;
    byStatus: {
        [key: string]: {
            count: number;
            originalAmount: number;
            costAmount: number;
        };
    };
}

interface DingTransactionsResponse {
    data: DingTransaction[];
    pagination: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        itemsPerPage: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}

export default function DingTransactionsPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedStatus, setSelectedStatus] = useState<string>("all");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [page, setPage] = useState(1);

    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        setStartDate(today);
        setEndDate(today);
    }, []);

    const { data: transactionsResponse, isLoading, error } = useQuery<DingTransactionsResponse>({
        queryKey: ["ding-transactions", page, searchTerm, selectedStatus, startDate, endDate, phoneNumber],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: "20",
                ...(searchTerm && { search: searchTerm }),
                ...(selectedStatus !== "all" && { status: selectedStatus }),
                ...(startDate && { startDate }),
                ...(endDate && { endDate }),
                ...(phoneNumber && { phone_number: phoneNumber })
            });
            
            const response = await api.get(`/admin/ding-transactions?${params}`);
            return response.data;
        },
    });

    const { data: stats } = useQuery<DingStats>({
        queryKey: ["ding-stats", startDate, endDate],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            
            const response = await api.get(`/admin/ding-transactions/stats?${params}`);
            return response.data.data;
        },
    });

    const transactions = transactionsResponse?.data || [];
    const pagination = transactionsResponse?.pagination;

    const clearFilters = () => {
        setSearchTerm("");
        setSelectedStatus("all");
        setPhoneNumber("");
        const today = new Date().toISOString().split('T')[0];
        setStartDate(today);
        setEndDate(today);
        setPage(1);
    };

    const handleExport = async () => {
        try {
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            
            const response = await api.get(`/admin/ding-transactions/export/csv?${params}`, {
                responseType: 'blob'
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `ding-transactions-${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            toast.success("Export completed successfully");
        } catch (error) {
            toast.error("Failed to export data");
        }
    };

    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <Database className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-red-600">Error Loading Ding Transactions</h2>
                    <p className="text-muted-foreground mt-2">
                        {error.message || "Failed to load transactions. Please try again."}
                    </p>
                    <Button 
                        onClick={() => window.location.reload()} 
                        className="mt-4"
                    >
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
           
                    <h1 className="text-3xl font-bold">Ding Transactions</h1>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                    </Button>
                </div>
            </div>

    
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Transactions</p>
                                <p className="text-2xl font-bold">{stats?.total || 0}</p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Original Amount</p>
                                <p className="text-2xl font-bold">{stats?.totalOriginalAmount?.toFixed(2) || '0.00'}</p>
                            </div>
                            {/* <DollarSign className="h-8 w-8 text-green-500" /> */}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Cost Amount</p>
                                <p className="text-2xl font-bold">${stats?.totalCostAmount?.toFixed(2) || '0.00'}</p>
                            </div>
                            <Calculator className="h-8 w-8 text-purple-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                                <p className="text-2xl font-bold">{stats?.successRate?.toFixed(1) || 0}%</p>
                            </div>
                            <PieChart className="h-8 w-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

  
            <Card>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search transactions..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="p-2 border rounded-md"
                        >
                            <option value="all">All Status</option>
                            <option value="success">Success</option>
                            <option value="failed">Failed</option>
                            <option value="pending">Pending</option>
                            <option value="accepted">Accepted</option>
                        </select>

                        <Input
                            placeholder="Phone Number"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                        />

                        <div className="flex gap-2">
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full"
                            />
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full"
                            />
                        </div>
                    </div>
                    
                    <div className="flex justify-between items-center mt-4">
                        <Button 
                            variant="outline" 
                            onClick={clearFilters}
                            className="flex items-center gap-2"
                        >
                            <Filter className="h-4 w-4" />
                            Clear Filters
                        </Button>
                        
                        <div className="text-sm text-muted-foreground">
                            Showing {transactions.length} of {pagination?.totalItems || 0} transactions
                        </div>
                    </div>
                </CardContent>
            </Card>

            
       
                <CardHeader>
                    <CardTitle>Transaction History</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Transaction ID</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead>Prefix</TableHead>
                                    <TableHead>Original Amount</TableHead>
                                    <TableHead>Cost Amount</TableHead>
                                    <TableHead>Rate</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Ding Ref</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading && (
                                    <TableRow>
                                        <TableCell colSpan={10} className="text-center py-8">
                                            <div className="flex justify-center">
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                                
                                {!isLoading && transactions.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                                            No Ding transactions found
                                        </TableCell>
                                    </TableRow>
                                )}

                                {transactions.map((transaction) => (
                                    <DingTransactionTableRow key={transaction.id} transaction={transaction} />
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {pagination && pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                            <div className="text-sm text-muted-foreground">
                                Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
                                {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
                                {pagination.totalItems} entries
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(pagination.currentPage - 1)}
                                    disabled={!pagination.hasPrevPage}
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(pagination.currentPage + 1)}
                                    disabled={!pagination.hasNextPage}
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

function DingTransactionTableRow({ transaction }: { transaction: DingTransaction }) {
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'success':
                return <Badge variant="default" className="bg-green-500/10 text-green-500">Success</Badge>;
            case 'failed':
                return <Badge variant="destructive">Failed</Badge>;
            case 'pending':
                return <Badge variant="secondary">Pending</Badge>;
            case 'accepted':
                return <Badge variant="default" className="bg-blue-500/10 text-blue-500">Accepted</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <TableRow key={transaction.id}>
            <TableCell className="font-mono text-xs">
                {transaction.transaction_id.toString().slice(-8)}
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{transaction.phone_number}</span>
                </div>
            </TableCell>
            <TableCell>
                <Badge variant="outline">{transaction.prefix}</Badge>
            </TableCell>
            <TableCell>
                <div className="font-medium">{transaction.original_amount}</div>
            </TableCell>
            <TableCell>
                <div className="font-medium text-amber-600">${transaction.cost_amount.toFixed(4)}</div>
            </TableCell>
            <TableCell>
                <div className="text-sm">{transaction.rate_used}</div>
            </TableCell>
            <TableCell>{getStatusBadge(transaction.status)}</TableCell>
            <TableCell className="font-mono text-xs">
                {transaction.ding_transfer_ref ? transaction.ding_transfer_ref.slice(-8) : 'N/A'}
            </TableCell>
            <TableCell className="text-sm">
                {formatDate(transaction.createdAt)}
            </TableCell>
            <TableCell className="text-right">
                <DingTransactionDetailsDialog transaction={transaction} />
            </TableCell>
        </TableRow>
    );
}

function DingTransactionDetailsDialog({ transaction }: { transaction: DingTransaction }) {
    const [open, setOpen] = useState(false);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Ding Transaction Details</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-6">
                    <Card>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Transaction ID</label>
                                    <p className="font-mono text-sm">{transaction.transaction_id}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Ding Transfer Ref</label>
                                    <p className="font-mono text-sm">{transaction.ding_transfer_ref || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                                    <p>{transaction.phone_number}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Prefix</label>
                                    <p>{transaction.prefix}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Original Amount</label>
                                    <p className="text-lg font-bold">{transaction.original_amount}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Cost Amount</label>
                                    <p className="text-lg font-bold text-amber-500">${transaction.cost_amount.toFixed(4)}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Rate Used</label>
                                    <p>{transaction.rate_used}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                                    <div className="mt-1">
                                        {transaction.status === 'success' ? (
                                            <Badge variant="default" className="bg-green-500/10">Success</Badge>
                                        ) : transaction.status === 'failed' ? (
                                            <Badge variant="destructive">Failed</Badge>
                                        ) : (
                                            <Badge variant="secondary">{transaction.status}</Badge>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Provider TXN ID</label>
                                    <p className="font-mono text-sm">{transaction.provider_txn_id || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Processing State</label>
                                    <p>{transaction.processing_state || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Provider Name</label>
                                    <p>{transaction.provider_name}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Request ID</label>
                                    <p className="font-mono text-sm">{transaction.request_id}</p>
                                </div>
                            </div>
                            
                            {transaction.cost_calculation && (
                                <div className="mt-4 p-3 bg-amber-50 rounded-lg">
                                    <h4 className="font-medium text-blue-800">Cost Calculation</h4>
                                    <p className="text-sm text-blue-700 font-mono">{transaction.cost_calculation}</p>
                                </div>
                            )}

                            {transaction.error_message && transaction.status === 'failed' && (
                                <div className="mt-4 p-3 bg-red-50 rounded-lg">
                                    <h4 className="font-medium text-red-800">Error Message</h4>
                                    <p className="text-sm text-red-700">{transaction.error_message}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {transaction.Transaction && (
                        <div>
                            <CardHeader>
                                <CardTitle>Related Transaction</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Customer UID</label>
                                        <p>{transaction.Transaction.uid}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Payment ID</label>
                                        <p className="font-mono text-sm">{transaction.Transaction.payment_id}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Transaction Status</label>
                                        <p>{transaction.Transaction.status}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Currency</label>
                                        <p>{transaction.Transaction.currency}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </div>
                    )}

                    <div>
                        <CardHeader>
                            <CardTitle>Timestamps</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-sm font-medium">Created At:</span>
                                    <span className="text-sm text-muted-foreground">{formatDate(transaction.createdAt)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}