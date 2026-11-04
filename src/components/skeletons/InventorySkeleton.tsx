import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const InventorySkeleton = () => {
    return (
        <Layout>
            <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-32" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        <Skeleton className="h-10 w-full sm:w-32" />
                        <Skeleton className="h-10 w-full sm:w-32" />
                        <Skeleton className="h-10 w-full sm:w-32" />
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border-l-4 border-l-primary/30">
                        <CardHeader className="pb-3">
                            <Skeleton className="h-4 w-24" />
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-8 w-16" />
                                <Skeleton className="h-8 w-8 rounded-full" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-warning/30">
                        <CardHeader className="pb-3">
                            <Skeleton className="h-4 w-24" />
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-8 w-16" />
                                <Skeleton className="h-8 w-8 rounded-full" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-success/30">
                        <CardHeader className="pb-3">
                            <Skeleton className="h-4 w-24" />
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-8 w-32" />
                                <Skeleton className="h-8 w-8 rounded-full" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="items" className="w-full">
                    <TabsList>
                        <TabsTrigger value="items" disabled>
                            Items <Skeleton className="w-4 h-4 ml-2 rounded-full inline-block" />
                        </TabsTrigger>
                        <TabsTrigger value="locations" disabled>
                            Locations <Skeleton className="w-4 h-4 ml-2 rounded-full inline-block" />
                        </TabsTrigger>
                        <TabsTrigger value="movements" disabled>Movements</TabsTrigger>
                        <TabsTrigger value="alerts" disabled>Alerts</TabsTrigger>
                    </TabsList>

                    <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <Card key={i} className="hover:shadow-lg transition-all">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 space-y-2">
                                            <Skeleton className="h-5 w-3/4" />
                                            <Skeleton className="h-4 w-1/2" />
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Skeleton className="h-4 w-12" />
                                        <Skeleton className="h-4 w-8" />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Skeleton className="h-4 w-20" />
                                        <Skeleton className="h-4 w-16" />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Skeleton className="h-4 w-10" />
                                        <Skeleton className="h-4 w-24" />
                                    </div>
                                    <div className="pt-2">
                                        <Skeleton className="h-8 w-full" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </Tabs>
            </div>
        </Layout>
    );
};
