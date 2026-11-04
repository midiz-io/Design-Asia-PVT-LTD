import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const PermissionManagementSkeleton = () => {
    const roles = ['Administrator', 'Manager', 'Supervisor', 'Employee'];

    return (
        <Layout>
            <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                    <div className="space-y-1 sm:space-y-2">
                        <Skeleton className="h-8 w-56" />
                        <Skeleton className="h-4 w-96 max-w-full" />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <Skeleton className="h-10 w-full sm:w-28" />
                        <Skeleton className="h-10 w-full sm:w-36" />
                    </div>
                </div>

                {/* Role Tabs */}
                <Tabs defaultValue="admin" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
                        {roles.map((role) => (
                            <TabsTrigger key={role} value={role.toLowerCase()} disabled>
                                {role}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {/* Permission Rows */}
                    <div className="mt-4">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-5 w-5 rounded-full" />
                                    <Skeleton className="h-6 w-44" />
                                </div>
                                <Skeleton className="h-4 w-64" />
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-3 sm:gap-4">
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                                        <div
                                            key={i}
                                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 border rounded-lg bg-muted/30"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Skeleton className="w-2 h-2 rounded-full" />
                                                <div className="space-y-1.5">
                                                    <Skeleton className="h-4 w-28" />
                                                    <Skeleton className="h-3 w-52 max-w-full" />
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Skeleton className="h-6 w-20 rounded-full" />
                                                <Skeleton className="h-9 w-32" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </Tabs>

                {/* Permission Types Legend */}
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-36" />
                        <Skeleton className="h-4 w-56" />
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-start gap-3 p-4 border rounded-lg">
                                    <Skeleton className="h-6 w-20 rounded-full" />
                                    <div className="flex-1 space-y-1.5">
                                        <Skeleton className="h-4 w-20" />
                                        <Skeleton className="h-3 w-full" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
};
