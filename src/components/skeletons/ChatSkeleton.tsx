import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export const ChatSkeleton = () => {
    return (
        <Layout>
            <div className="space-y-4 sm:space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-32" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-220px)] md:h-[calc(100vh-240px)]">
                    {/* Contacts Sidebar Skeleton */}
                    <Card className="md:col-span-1 flex flex-col">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center justify-between">
                                <span>Contacts</span>
                                <Skeleton className="h-6 w-8 rounded-full" />
                            </CardTitle>
                            <div className="pt-2">
                                <div className="relative">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground opacity-50" />
                                    <Skeleton className="h-9 w-full rounded-md" />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden p-0">
                            <ScrollArea className="h-full">
                                <div className="space-y-1 p-4 pt-0">
                                    {[...Array(8)].map((_, i) => (
                                        <div key={i} className="flex items-start gap-3 p-3 rounded-lg">
                                            <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                                            <div className="flex-1 space-y-2 mt-1">
                                                <div className="flex items-center justify-between">
                                                    <Skeleton className="h-4 w-24" />
                                                    <Skeleton className="h-3 w-10" />
                                                </div>
                                                <Skeleton className="h-3 w-3/4" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    {/* Chat Area Skeleton */}
                    <Card className="md:col-span-2 flex flex-col">
                        <CardHeader className="border-b">
                            <div className="flex items-center gap-3">
                                <Skeleton className="w-10 h-10 rounded-full" />
                                <div className="space-y-2">
                                    <Skeleton className="h-5 w-32" />
                                    <Skeleton className="h-3 w-40" />
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="flex-1 flex flex-col p-0">
                            <ScrollArea className="flex-1 p-4">
                                <div className="space-y-6">
                                    {/* Date Badge */}
                                    <div className="flex justify-center my-4">
                                        <Skeleton className="h-5 w-20 rounded-full" />
                                    </div>

                                    {/* Received Message */}
                                    <div className="flex justify-start">
                                        <div className="flex items-end gap-2 max-w-[70%] flex-row">
                                            <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                                            <Skeleton className="h-16 w-64 rounded-2xl rounded-bl-sm" />
                                        </div>
                                    </div>

                                    {/* Sent Message */}
                                    <div className="flex justify-end">
                                        <div className="flex items-end gap-2 max-w-[70%] flex-row-reverse">
                                            <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                                            <Skeleton className="h-12 w-48 rounded-2xl rounded-br-sm" />
                                        </div>
                                    </div>

                                    {/* Received Message */}
                                    <div className="flex justify-start">
                                        <div className="flex items-end gap-2 max-w-[70%] flex-row">
                                            <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                                            <Skeleton className="h-10 w-32 rounded-2xl rounded-bl-sm" />
                                        </div>
                                    </div>

                                    {/* Sent Message */}
                                    <div className="flex justify-end">
                                        <div className="flex items-end gap-2 max-w-[70%] flex-row-reverse">
                                            <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                                            <Skeleton className="h-20 w-72 rounded-2xl rounded-br-sm" />
                                        </div>
                                    </div>
                                </div>
                            </ScrollArea>

                            <CardFooter className="border-t p-3 sm:p-4">
                                <div className="flex items-center gap-2 w-full">
                                    <Skeleton className="h-10 flex-1 rounded-md" />
                                    <Skeleton className="h-10 w-24 rounded-md flex-shrink-0" />
                                </div>
                            </CardFooter>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </Layout>
    );
};
