import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const JobsSkeleton = () => {
    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="space-y-1 sm:space-y-2">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-64" />
            </div>

            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-24 mb-2" />
                    <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="space-y-2">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                            ))}
                        </div>

                        <div className="space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <Skeleton className="h-6 w-32" />
                                <Skeleton className="h-10 w-full sm:w-24" />
                            </div>
                            <div className="space-y-2">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                                        <Skeleton className="sm:col-span-2 h-10 w-full" />
                                        <Skeleton className="sm:col-span-6 h-10 w-full" />
                                        <Skeleton className="sm:col-span-2 h-10 w-full" />
                                        <Skeleton className="sm:col-span-2 h-10 w-full" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Skeleton className="h-10 w-full" />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-16 mb-2" />
                    <Skeleton className="h-4 w-40" />
                </CardHeader>
                <CardContent className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="p-3 sm:p-4 border rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="space-y-2 flex-1">
                                <Skeleton className="h-5 w-1/2" />
                                <Skeleton className="h-4 w-1/3" />
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <Skeleton className="h-9 w-9" />
                                <Skeleton className="h-9 w-9" />
                                <Skeleton className="h-9 w-24 flex-1 sm:flex-initial" />
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
};
