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
    Search, Filter, Eye, Download, User, CreditCard, 
    DollarSign, PieChart, TrendingUp, FileText, Calendar,
    ExternalLink,
} from "lucide-react";

interface StripeTransactionLog {
    id: string;
    transaction_id: string;
    payment_intent_id: string;
    customer_uid: string;
    gross_amount: number;
    gross_amount_usd: number | string; 
    currency: string;
    fee: number;
    fee_usd: number | string;
    net_amount: number;
    net_amount_usd: number | string; 
    fee_breakdown: Array<{
        type: string;
        amount: number;
        amount_usd: string;
        description: string;
        application: any;
    }>;
    available_on: string;
    status: string;
    reporting_category: string;
    stripe_charge_id: string;
    balance_transaction_id: string;
    receipt_url: string;
    description: string;
    createdAt: string;
    Transaction?: {
        id: string;
        uid: string;
        payment_id: string;
        status: string;
        amount: number;
        currency: string;
        phone_number: string;
    };
}

interface StripeStats {
    total: number;
    totalGrossAmount: number;
    totalFees: number;
    totalNetAmount: number;
    averageFeePercentage: number;
    byStatus: {
        [key: string]: {
            count: number;
            grossAmount: number;
            fees: number;
            netAmount: number;
        };
    };
}

interface StripeTransactionLogsResponse {
    data: StripeTransactionLog[];
    pagination: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        itemsPerPage: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}


const safeToNumber = (value: number | string): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return parseFloat(value) || 0;
    return 0;
};


const safeToFixed = (value: number | string, decimals: number = 2): string => {
    const num = safeToNumber(value);
    return num.toFixed(decimals);
};

export default function StripeTransactionLogsPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedStatus, setSelectedStatus] = useState<string>("all");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [customerUid, setCustomerUid] = useState("");
    const [page, setPage] = useState(1);

    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
        setEndDate(today);
    }, []);

    const { data: logsResponse, isLoading, error } = useQuery<StripeTransactionLogsResponse>({
        queryKey: ["stripe-transaction-logs", page, searchTerm, selectedStatus, startDate, endDate, customerUid],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: "20",
                ...(searchTerm && { search: searchTerm }),
                ...(selectedStatus !== "all" && { status: selectedStatus }),
                ...(startDate && { startDate }),
                ...(endDate && { endDate }),
                ...(customerUid && { customer_uid: customerUid })
            });
            
            const response = await api.get(`/admin/stripe-transaction-logs?${params}`);
            return response.data;
        },
    });

    const { data: stats } = useQuery<StripeStats>({
        queryKey: ["stripe-stats", startDate, endDate],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            
            const response = await api.get(`/admin/stripe-transaction-logs/stats?${params}`);
            return response.data.data;
        },
    });

    const logs = logsResponse?.data || [];
    const pagination = logsResponse?.pagination;

    const clearFilters = () => {
        setSearchTerm("");
        setSelectedStatus("all");
        setCustomerUid("");
        const today = new Date().toISOString().split('T')[0];
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
        setEndDate(today);
        setPage(1);
    };

    const handleExport = async () => {
        try {
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            
            const response = await api.get(`/admin/stripe-transaction-logs/export/csv?${params}`, {
                responseType: 'blob'
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `stripe-transaction-logs-${new Date().toISOString().split('T')[0]}.csv`);
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
                    <CreditCard className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-red-600">Error Loading Stripe Transaction Logs</h2>
                    <p className="text-muted-foreground mt-2">
                        {error.message || "Failed to load transaction logs. Please try again."}
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
                    <CreditCard className="h-8 w-8 text-blue-500" />
                    <h1 className="text-3xl font-bold">Stripe Transaction Logs</h1>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                    </Button>
                </div>
            </div>

     
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                                <p className="text-sm font-medium text-muted-foreground">Gross Amount</p>
                                <p className="text-2xl font-bold">${safeToFixed(stats?.totalGrossAmount || 0)}</p>
                            </div>
                            <DollarSign className="h-8 w-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Fees</p>
                                <p className="text-2xl font-bold">${safeToFixed(stats?.totalFees || 0)}</p>
                            </div>
                            <FileText className="h-8 w-8 text-amber-500" />
                        </div>
                    </CardContent>
                </Card>
                    <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Net Amount</p>
                                <p className="text-2xl font-bold">${safeToFixed(stats?.totalNetAmount || 0)}</p>
                            </div>
                            <DollarSign className="h-8 w-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Avg Fee %</p>
                                <p className="text-2xl font-bold">{stats?.averageFeePercentage?.toFixed(2) || 0}%</p>
                            </div>
                            <PieChart className="h-8 w-8 text-purple-500" />
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
                            <option value="pending">Pending</option>
                            <option value="available">Available</option>
                            <option value="complete">Complete</option>
                        </select>

                        <Input
                            placeholder="Customer UID"
                            value={customerUid}
                            onChange={(e) => setCustomerUid(e.target.value)}
                        />

                        <div className="flex gap-2 col-span-2">
                            <div className="flex-1 relative">
                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <div className="flex-1 relative">
                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
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
                            Showing {logs.length} of {pagination?.totalItems || 0} transactions
                        </div>
                    </div>
                </CardContent>
            </Card>


    
                <CardHeader>
                    <CardTitle>Stripe Transaction History</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Payment Intent ID</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Gross Amount</TableHead>
                                    <TableHead>Fee</TableHead>
                                    <TableHead>Net Amount</TableHead>
                                    <TableHead>Fee %</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Available On</TableHead>
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
                                
                                {!isLoading && logs.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                                            No Stripe transaction logs found
                                        </TableCell>
                                    </TableRow>
                                )}

                                {logs.map((log) => (
                                    <StripeTransactionLogTableRow key={log.id} log={log} />
                                ))}
                            </TableBody>
                        </Table>
                    </div>

             
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

function StripeTransactionLogTableRow({ log }: { log: StripeTransactionLog }) {
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatAvailableDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'available':
                return <Badge variant="default" className="bg-green-500/10 text-green-500">Available</Badge>;
            case 'pending':
                return <Badge variant="secondary">Pending</Badge>;
            case 'complete':
                return <Badge variant="default" className="bg-blue-500/10 text-blue-500">Complete</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };


    const grossAmountUsd = safeToNumber(log.gross_amount_usd);
    const feeUsd = safeToNumber(log.fee_usd);
    const netAmountUsd = safeToNumber(log.net_amount_usd);
    const feePercentage = grossAmountUsd > 0 ? (feeUsd / grossAmountUsd) * 100 : 0;

    return (
        <TableRow key={log.id}>
            <TableCell className="font-mono text-xs">
                {log.payment_intent_id.slice(-8)}
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                        <div className="font-medium">{log.customer_uid}</div>
                        {log.Transaction?.phone_number && (
                            <div className="text-xs text-muted-foreground">{log.Transaction.phone_number}</div>
                        )}
                    </div>
                </div>
            </TableCell>
            <TableCell>
                <div className="font-medium">${safeToFixed(grossAmountUsd)}</div>
                <div className="text-xs text-muted-foreground">{log.gross_amount} {log.currency.toUpperCase()}</div>
            </TableCell>
            <TableCell>
                <div className="font-medium text-amber-600">${safeToFixed(feeUsd)}</div>
            </TableCell>
            <TableCell>
                <div className="font-medium text-green-600">${safeToFixed(netAmountUsd)}</div>
            </TableCell>
            <TableCell>
                <div className="text-sm">{feePercentage.toFixed(2)}%</div>
            </TableCell>
            <TableCell>{getStatusBadge(log.status)}</TableCell>
            <TableCell className="text-sm">
                {formatAvailableDate(log.available_on)}
            </TableCell>
            <TableCell className="text-sm">
                {formatDate(log.createdAt)}
            </TableCell>
            <TableCell className="text-right">
                <StripeTransactionLogDetailsDialog log={log} />
            </TableCell>
        </TableRow>
    );
}

function StripeTransactionLogDetailsDialog({ log }: { log: StripeTransactionLog }) {
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


    const grossAmountUsd = safeToNumber(log.gross_amount_usd);
    const feeUsd = safeToNumber(log.fee_usd);
    const netAmountUsd = safeToNumber(log.net_amount_usd);
    const feePercentage = grossAmountUsd > 0 ? (feeUsd / grossAmountUsd) * 100 : 0;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Stripe Transaction Details</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-6">
               
                    <Card>
                        <CardContent className="p-6">
                            <h3 className="text-lg font-semibold mb-4">Transaction Information</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Log ID</label>
                                    <p className="font-mono text-sm">{log.id}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Payment Intent ID</label>
                                    <p className="font-mono text-sm">{log.payment_intent_id}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Customer UID</label>
                                    <p>{log.customer_uid}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Stripe Charge ID</label>
                                    <p className="font-mono text-sm">{log.stripe_charge_id || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Balance Transaction ID</label>
                                    <p className="font-mono text-sm">{log.balance_transaction_id || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                                    <div className="mt-1">
                                        {log.status === 'available' ? (
                                            <Badge variant="default" className="bg-green-500/10">Available</Badge>
                                        ) : log.status === 'pending' ? (
                                            <Badge variant="secondary">Pending</Badge>
                                        ) : (
                                            <Badge variant="default" className="bg-blue-500/10">{log.status}</Badge>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Reporting Category</label>
                                    <p>{log.reporting_category || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Currency</label>
                                    <p className="uppercase">{log.currency}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <h3 className="text-lg font-semibold mb-4">Amount Details</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Gross Amount</label>
                                    <p className="text-lg font-bold">${safeToFixed(grossAmountUsd)}</p>
                                    <p className="text-sm text-muted-foreground">{log.gross_amount} {log.currency.toUpperCase()}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Fee Amount</label>
                                    <p className="text-lg font-bold text-amber-600">${safeToFixed(feeUsd)}</p>
                                    <p className="text-sm text-muted-foreground">{feePercentage.toFixed(2)}% of gross</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Net Amount</label>
                                    <p className="text-lg font-bold text-green-600">${safeToFixed(netAmountUsd)}</p>
                                    <p className="text-sm text-muted-foreground">{log.net_amount} {log.currency.toUpperCase()}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Fee Percentage</label>
                                    <p className="text-lg font-bold">{feePercentage.toFixed(2)}%</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

           
                    {log.fee_breakdown && log.fee_breakdown.length > 0 && (
                        <Card>
                            <CardContent className="p-6">
                                <h3 className="text-lg font-semibold mb-4">Fee Breakdown</h3>
                                <div className="space-y-3">
                                    {log.fee_breakdown.map((fee, index) => (
                                        <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                            <div>
                                                <p className="font-medium capitalize">{fee.type.replace('_', ' ')}</p>
                                                <p className="text-sm text-muted-foreground">{fee.description}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-medium text-amber-600">${fee.amount_usd}</p>
                                                <p className="text-sm text-muted-foreground">{fee.amount} Cent</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

          
                    <Card>
                        <CardContent className="p-6">
                            <h3 className="text-lg font-semibold mb-4">Timestamps</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-sm font-medium">Created At:</span>
                                    <span className="text-sm text-muted-foreground">{formatDate(log.createdAt)}</span>
                                </div>
                                {log.available_on && (
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium">Available On:</span>
                                        <span className="text-sm text-muted-foreground">{formatDate(log.available_on)}</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

           
                    {log.Transaction && (
                        <Card>
                            <CardContent className="p-6">
                                <h3 className="text-lg font-semibold mb-4">Related Transaction</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Transaction ID</label>
                                        <p className="font-mono text-sm">{log.Transaction.id}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Payment ID</label>
                                        <p className="font-mono text-sm">{log.Transaction.payment_id}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                                        <p>{log.Transaction.phone_number}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Transaction Status</label>
                                        <p>{log.Transaction.status}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Amount</label>
                                        <p>{log.Transaction.amount} {log.Transaction.currency}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

             
                    <Card>
                        <CardContent className="p-6">
                            <h3 className="text-lg font-semibold mb-4">Actions</h3>
                            <div className="flex gap-2">
                                {/* {log.receipt_url && (
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => window.open(log.receipt_url, '_blank')}
                                        className="flex items-center gap-2"
                                    >
                                        <Receipt className="h-4 w-4" />
                                        View Receipt
                                    </Button>
                                )} */}
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => window.open(`https://dashboard.stripe.com/payments/${log.payment_intent_id}`, '_blank')}
                                    className="flex items-center gap-2"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                    View in Stripe
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </DialogContent>
        </Dialog>
    );
}