import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, TrendingUp, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export const PettyCashSkeleton = () => {
    const { isAdmin } = useAuth();

    return (
        <Layout>
            <div className="space-y-4 sm:space-y-6">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1 sm:space-y-2">
                        <h1 className="text-2xl sm:text-3xl font-bold">Petty Cash</h1>
                        <p className="text-sm sm:text-base text-muted-foreground">Manage expense transactions and budgets</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <Button variant="outline" className="w-full sm:w-auto" disabled>
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Budget Tracker
                        </Button>
                        <Button className="w-full sm:w-auto" disabled>
                            <Plus className="w-4 h-4 mr-2" />
                            New Transaction
                        </Button>
                        {isAdmin && (
                            <Button variant="outline" className="w-full sm:w-auto" disabled>
                                <Settings className="w-4 h-4 mr-2" />
                                New Category
                            </Button>
                        )}
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { title: "Total Approved", color: "success" },
                        { title: "Pending Approval", color: "warning" },
                        { title: "Active Categories", color: "primary" }
                    ].map((card, idx) => (
                        <Card key={idx} className={`border-l-4 border-l-${card.color}`}>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <Skeleton className="h-8 w-32" />
                                    <Skeleton className="h-8 w-8 rounded-full" />
                                </div>
                                {idx === 1 && <Skeleton className="h-3 w-24 mt-2" />}
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Tabs and Transaction List Skeleton */}
                <Tabs defaultValue="transactions" className="w-full">
                    <TabsList>
                        <TabsTrigger value="transactions" disabled>Expenses</TabsTrigger>
                        <TabsTrigger value="iou" disabled>IOU System</TabsTrigger>
                    </TabsList>

                    <div className="mt-4 space-y-4">
                        <Tabs defaultValue="all" className="w-full">
                            <TabsList>
                                <TabsTrigger value="all" disabled>All Transactions</TabsTrigger>
                                <TabsTrigger value="pending" disabled>Pending</TabsTrigger>
                                <TabsTrigger value="approved" disabled>Approved</TabsTrigger>
                                <TabsTrigger value="rejected" disabled>Rejected</TabsTrigger>
                            </TabsList>

                            <div className="mt-4 space-y-4">
                                {[1, 2, 3].map((_, idx) => (
                                    <Card key={idx}>
                                        <CardHeader>
                                            <div className="flex items-start justify-between">
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <Skeleton className="h-6 w-32" />
                                                        <Skeleton className="h-5 w-20 rounded-full" />
                                                    </div>
                                                    <Skeleton className="h-4 w-64" />
                                                    <Skeleton className="h-3 w-32" />
                                                    <Skeleton className="h-3 w-40" />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Skeleton className="h-4 w-4 rounded-full" />
                                                    <Skeleton className="h-5 w-20 rounded-full" />
                                                </div>
                                            </div>
                                        </CardHeader>
                                    </Card>
                                ))}
                            </div>
                        </Tabs>
                    </div>
                </Tabs>
            </div>
        </Layout>
    );
};
