import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const ReportsSkeleton = () => {
    return (
        <Layout>
            <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1 sm:space-y-2">
                        <Skeleton className="h-8 w-52" />
                        <Skeleton className="h-4 w-72" />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Skeleton className="h-4 w-4 rounded-full" />
                        <Skeleton className="h-10 w-full sm:w-40" />
                    </div>
                </div>

                {/* Overview Cards (4 across) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    {[
                        'border-l-primary',
                        'border-l-success',
                        'border-l-warning',
                        'border-l-accent',
                    ].map((color, i) => (
                        <Card key={i} className={`border-l-4 ${color}/40`}>
                            <CardHeader className="pb-3">
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-4 w-4 rounded-full" />
                                    <Skeleton className="h-4 w-28" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-9 w-24 mb-2" />
                                <Skeleton className="h-2 w-full mb-2" />
                                <Skeleton className="h-3 w-36" />
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Tabs */}
                <Tabs defaultValue="tasks" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 max-w-full">
                        <TabsTrigger value="tasks" disabled>Tasks</TabsTrigger>
                        <TabsTrigger value="expenses" disabled>Expenses</TabsTrigger>
                        <TabsTrigger value="inventory" disabled>Inventory</TabsTrigger>
                        <TabsTrigger value="users" disabled>Users</TabsTrigger>
                    </TabsList>

                    <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        <Card>
                            <CardHeader>
                                <Skeleton className="h-6 w-40" />
                                <Skeleton className="h-4 w-56" />
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Skeleton className="h-4 w-20" />
                                            <Skeleton className="h-4 w-8" />
                                        </div>
                                        <Skeleton className="h-2 w-full" />
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <Skeleton className="h-6 w-40" />
                                <Skeleton className="h-4 w-48" />
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[1, 2, 3, 4].map((i) => (
                                        <div key={i} className="text-center p-4 rounded-lg bg-muted space-y-2">
                                            <Skeleton className="h-8 w-8 rounded-full mx-auto" />
                                            <Skeleton className="h-7 w-10 mx-auto" />
                                            <Skeleton className="h-3 w-16 mx-auto" />
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </Tabs>
            </div>
        </Layout>
    );
};
