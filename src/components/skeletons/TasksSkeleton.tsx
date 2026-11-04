import Layout from '@/components/Layout';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const TasksSkeleton = () => {
    return (
        <Layout>
            <div className="space-y-6">
                {/* Header & Stats Section Skeleton */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-72" />
                    </div>
                    <Skeleton className="h-10 w-full md:w-32" />
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-4 rounded-full" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-16 mb-2" />
                                <Skeleton className="h-3 w-32" />
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Filters Section Skeleton */}
                <Card className="mb-6">
                    <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                            <Skeleton className="h-6 w-32" />
                            <Skeleton className="h-10 w-full sm:w-64" />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                            {[...Array(7)].map((_, i) => (
                                <div key={i} className="space-y-2">
                                    <Skeleton className="h-4 w-16" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <Skeleton className="h-5 w-48" />
                            <div className="flex gap-2 w-full sm:w-auto">
                                <Skeleton className="h-10 w-full sm:w-32" />
                                <Skeleton className="h-10 w-10 sm:w-10" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* View Toggle Skeleton */}
                <div className="flex justify-end mb-4">
                    <Skeleton className="h-10 w-48" />
                </div>

                {/* Kanban Board Skeleton View */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, colIndex) => (
                        <div key={`col-${colIndex}`} className="space-y-4">
                            <div className="flex items-center justify-between mb-4">
                                <Skeleton className="h-6 w-24" />
                                <Skeleton className="h-5 w-8 rounded-full" />
                            </div>

                            {[...Array(3)].map((_, cardIndex) => (
                                <Card key={`card-${colIndex}-${cardIndex}`}>
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <Skeleton className="h-5 w-3/4" />
                                            <Skeleton className="h-4 w-12 rounded-full" />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <Skeleton className="h-3 w-full" />
                                        <Skeleton className="h-3 w-5/6" />

                                        <div className="flex flex-wrap gap-2 pt-2">
                                            <Skeleton className="h-4 w-16 rounded-full" />
                                            <Skeleton className="h-4 w-16 rounded-full" />
                                        </div>

                                        <div className="flex items-center justify-between pt-4 border-t">
                                            <Skeleton className="h-6 w-6 rounded-full" />
                                            <Skeleton className="h-4 w-20" />
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </Layout>
    );
};
