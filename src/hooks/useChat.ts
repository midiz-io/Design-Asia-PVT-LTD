import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface Profile {
    id: string;
    full_name: string;
    email: string;
}

export interface Message {
    id: string;
    sender_id: string;
    receiver_id: string;
    message: string;
    created_at: string;
    is_read: boolean;
}

export interface UserWithUnread extends Profile {
    unreadCount: number;
    lastMessage?: string;
    lastMessageTime?: string;
}

// Custom hook to fetch the chat users list, unread counts, and last messages
export const useChatUsers = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data: users, isLoading, error } = useQuery<UserWithUnread[]>({
        queryKey: ['chat_users', user?.id],
        enabled: !!user?.id,
        queryFn: async () => {
            // 1. Fetch all profiles except current user
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('*')
                .neq('id', user?.id)
                .order('full_name');

            if (profilesError) throw profilesError;
            if (!profiles || profiles.length === 0) return [];

            const profileIds = profiles.map(p => p.id);

            // 2. Fetch all unread messages addressed to the current user
            const { data: unreadMessages, error: unreadError } = await supabase
                .from('chat_messages')
                .select('sender_id')
                .eq('receiver_id', user?.id)
                .eq('is_read', false);

            if (unreadError) throw unreadError;

            // Group unread counts by sender_id
            const unreadCountsMap: Record<string, number> = {};
            unreadMessages?.forEach(msg => {
                unreadCountsMap[msg.sender_id] = (unreadCountsMap[msg.sender_id] || 0) + 1;
            });

            // 3. To get the last message for each conversation efficiently, 
            // we query messages where the user is either sender or receiver
            // We will sort and filter in memory to avoid N+1 queries
            const { data: recentMessages, error: recentError } = await supabase
                .from('chat_messages')
                .select('sender_id, receiver_id, message, created_at')
                .or(`sender_id.eq.${user?.id},receiver_id.eq.${user?.id}`)
                .order('created_at', { ascending: false });

            if (recentError) throw recentError;

            // Find the most recent message per other user
            const lastMessageMap: Record<string, { message: string, created_at: string }> = {};
            recentMessages?.forEach(msg => {
                const otherUserId = msg.sender_id === user?.id ? msg.receiver_id : msg.sender_id;
                // Since they are ordered by created_at desc, the first one we see is the latest
                if (!lastMessageMap[otherUserId]) {
                    lastMessageMap[otherUserId] = {
                        message: msg.message,
                        created_at: msg.created_at
                    };
                }
            });

            // 4. Combine all the data
            const usersWithData = profiles.map(profile => ({
                ...profile,
                unreadCount: unreadCountsMap[profile.id] || 0,
                lastMessage: lastMessageMap[profile.id]?.message,
                lastMessageTime: lastMessageMap[profile.id]?.created_at,
            }));

            // Sort by unread messages first, then by last message time, then name
            usersWithData.sort((a, b) => {
                if (a.unreadCount !== b.unreadCount) {
                    return b.unreadCount - a.unreadCount; // Descending unread
                }
                if (a.lastMessageTime && b.lastMessageTime) {
                    return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime(); // Descending recent time
                }
                if (a.lastMessageTime && !b.lastMessageTime) return -1;
                if (!a.lastMessageTime && b.lastMessageTime) return 1;
                return a.full_name.localeCompare(b.full_name);
            });

            return usersWithData;
        }
    });

    // Global realtime subscription for ANY chat messages involving the current user
    // This helps keep the sidebar up to date without needing selectedUser
    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase
            .channel('public:chat_users_updates')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `receiver_id=eq.${user.id}`,
                },
                () => {
                    // If we receive a message from anyone, invalidate the users list to get new unread counts & last msgs
                    void queryClient.invalidateQueries({ queryKey: ['chat_users', user.id] });
                    // Also check if we need to update the dashboard stats due to new chat notifications
                    void queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
                }
            )
            .subscribe();

        return () => {
            void supabase.removeChannel(channel);
        };
    }, [user, queryClient]);

    return {
        users,
        isLoading,
        error,
    };
};


// Custom hook to fetch a specific conversation's messages
export const useChatMessages = (selectedUserId: string | null) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data: messages, isLoading, error } = useQuery<Message[]>({
        queryKey: ['chat_messages', user?.id, selectedUserId],
        enabled: !!user?.id && !!selectedUserId,
        queryFn: async () => {
            if (!selectedUserId) return [];

            const { data, error } = await supabase
                .from('chat_messages')
                .select('*')
                .or(`and(sender_id.eq.${user?.id},receiver_id.eq.${selectedUserId}),and(sender_id.eq.${selectedUserId},receiver_id.eq.${user?.id})`)
                .order('created_at', { ascending: true });

            if (error) throw error;
            return data || [];
        }
    });

    // Mark messages as read function that automatically updates react query cache
    const markMessagesAsRead = async () => {
        if (!selectedUserId || !user?.id) return;

        try {
            const { error } = await supabase
                .from('chat_messages')
                .update({ is_read: true })
                .eq('sender_id', selectedUserId)
                .eq('receiver_id', user.id)
                .eq('is_read', false);

            if (error) throw error;

            // Invalidate both the messages flow and the sidebar
            void queryClient.invalidateQueries({ queryKey: ['chat_messages', user.id, selectedUserId] });
            void queryClient.invalidateQueries({ queryKey: ['chat_users', user.id] });
            void queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
        } catch (e) {
            console.error('Error marking messages as read', e);
        }
    };

    // Dedicated realtime listener for the selected user conversation
    useEffect(() => {
        if (!user?.id || !selectedUserId) return;

        markMessagesAsRead(); // Mark as read immediately when switching to this user

        const channel = supabase
            .channel(`chat_conversation_${selectedUserId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `or(and(sender_id=eq.${user.id},receiver_id=eq.${selectedUserId}),and(sender_id=eq.${selectedUserId},receiver_id=eq.${user.id}))`,
                },
                () => {
                    // New message in current conversation
                    void queryClient.invalidateQueries({ queryKey: ['chat_messages', user.id, selectedUserId] });
                    void queryClient.invalidateQueries({ queryKey: ['chat_users', user.id] });
                    markMessagesAsRead(); // Mark incoming ones as read if we are looking at them
                }
            )
            .subscribe();

        return () => {
            void supabase.removeChannel(channel);
        };
    }, [user?.id, selectedUserId, queryClient]);

    // Handle sending message
    const sendMessage = async (messageText: string) => {
        if (!selectedUserId || !user?.id || !messageText.trim()) return false;

        try {
            const { error } = await supabase.from('chat_messages').insert([
                {
                    sender_id: user.id,
                    receiver_id: selectedUserId,
                    message: messageText.trim(),
                },
            ]);

            if (error) throw error;

            // Update local state by invalidating
            void queryClient.invalidateQueries({ queryKey: ['chat_messages', user.id, selectedUserId] });
            void queryClient.invalidateQueries({ queryKey: ['chat_users', user.id] });
            return true;
        } catch (error: any) {
            console.error('Error sending message:', error.message);
            return false;
        }
    };

    return {
        messages,
        isLoading,
        error,
        sendMessage,
        markMessagesAsRead
    };
};
