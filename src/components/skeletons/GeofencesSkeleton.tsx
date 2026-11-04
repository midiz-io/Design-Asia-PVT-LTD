import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const GeofencesSkeleton = () => {
    return (
        <Layout>
            <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1 sm:space-y-2">
                        <Skeleton className="h-8 w-40" />
                        <Skeleton className="h-4 w-60" />
                    </div>
                    <Skeleton className="h-10 w-full sm:w-40" />
                </div>

                <div className="mt-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                        <div className="space-y-1">
                            <Skeleton className="h-6 w-32" />
                            <Skeleton className="h-4 w-80" />
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        {[1, 2, 3, 4].map((i) => (
                            <Card key={i} className="hover:shadow-lg transition-all">
                                <CardHeader className="space-y-2 pb-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="space-y-2 flex-1">
                                            <Skeleton className="h-5 w-3/4" />
                                            <Skeleton className="h-4 w-full" />
                                        </div>
                                        <Skeleton className="h-6 w-16 rounded-full" />
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="w-4 h-4 rounded-full" />
                                        <Skeleton className="h-4 w-40" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="w-4 h-4 rounded-full" />
                                        <Skeleton className="h-4 w-32" />
                                    </div>
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        <Skeleton className="h-9 w-full sm:w-24" />
                                        <Skeleton className="h-9 w-full sm:w-28" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </Layout>
    );
};
