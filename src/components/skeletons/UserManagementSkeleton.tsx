import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const UserManagementSkeleton = () => {
    return (
        <Layout>
            <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1 sm:space-y-2">
                        <Skeleton className="h-8 w-44" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                    <Skeleton className="h-10 w-full sm:w-28" />
                </div>

                {/* Stats Cards (5 across) */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                    {['primary', 'destructive', 'accent', 'warning', 'success'].map((color, i) => (
                        <Card key={i} className={`border-l-4 border-l-${color}/40`}>
                            <CardHeader className="pb-3">
                                <Skeleton className="h-4 w-20" />
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <Skeleton className="h-9 w-10" />
                                    <Skeleton className="h-8 w-8 rounded-full" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Filter Bar */}
                <Card>
                    <CardHeader>
                        <Skeleton className="h-5 w-24" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-10 w-full sm:w-64" />
                    </CardContent>
                </Card>

                {/* User Cards Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Card key={i} className="hover:shadow-lg transition-all">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="h-12 w-12 rounded-full" />
                                        <div className="space-y-2">
                                            <Skeleton className="h-5 w-32" />
                                            <Skeleton className="h-5 w-16 rounded-full" />
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="w-4 h-4 rounded-full" />
                                        <Skeleton className="h-4 w-40" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="w-4 h-4 rounded-full" />
                                        <Skeleton className="h-4 w-28" />
                                    </div>
                                    <Skeleton className="h-3 w-36" />
                                </div>
                                <div className="flex gap-2 pt-2 border-t">
                                    <Skeleton className="h-8 flex-1" />
                                    <Skeleton className="h-8 flex-1" />
                                    <Skeleton className="h-8 w-20" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </Layout>
    );
};
