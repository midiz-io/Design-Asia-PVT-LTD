import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Send, MessageSquare, Search, CheckCheck, Check, Circle } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import Layout from '@/components/Layout';
import Alert from '@/utils/alert';
import { useChatUsers, useChatMessages, UserWithUnread } from '@/hooks/useChat';
import { ChatSkeleton } from '@/components/skeletons/ChatSkeleton';

import { usePermissions } from '@/contexts/PermissionContext';
import { useNavigate } from 'react-router-dom';

const Chat = () => {
  const [selectedUser, setSelectedUser] = useState<UserWithUnread | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();
  const { hasAccess, canEdit, loading: permissionsLoading } = usePermissions();
  const navigate = useNavigate();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { users = [], isLoading: usersLoading } = useChatUsers();
  const { messages = [], sendMessage } = useChatMessages(selectedUser?.id || null);

  useEffect(() => {
    if (user && !permissionsLoading && !hasAccess('chat')) {
      Alert.error('Access Denied', 'You do not have permission to access Chat');
      navigate('/dashboard');
    }
  }, [user, permissionsLoading, hasAccess, navigate]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (!selectedUser || !newMessage.trim()) return;
    if (!canEdit('chat')) {
      Alert.error('Permission Denied', 'You have view-only access to Chat');
      return;
    }

    const success = await sendMessage(newMessage);
    if (success) {
      setNewMessage('');
      scrollToBottom();
    } else {
      Alert.error('Error', 'Failed to send message');
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const filteredUsers = (users || []).filter((u) =>
    u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalUnread = (users || []).reduce((sum, u) => sum + (u.unreadCount || 0), 0);

  if (usersLoading) {
    return <ChatSkeleton />;
  }

  return (
    <Layout>
      <div className="h-[calc(100vh-120px)] flex flex-col space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
          <div className="space-y-1 sm:space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold">Chat</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Real-time messaging with team members
              {totalUnread > 0 && ` • ${totalUnread} unread`}
            </p>
          </div>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Contacts Sidebar */}
          <Card className="md:col-span-1 flex flex-col h-full overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span>Contacts</span>
                <Badge variant="outline">{filteredUsers.length}</Badge>
              </CardTitle>
              <div className="pt-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search contacts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full">
                <div className="space-y-1 p-4 pt-0">
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No contacts found</p>
                    </div>
                  ) : (
                    filteredUsers.map((profile) => (
                      <div
                        key={profile.id}
                        onClick={() => setSelectedUser(profile)}
                        className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all hover:bg-accent ${selectedUser?.id === profile.id ? 'bg-accent' : ''
                          }`}
                      >
                        <div className="relative">
                          <Avatar className="flex-shrink-0">
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {profile.full_name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          {profile.unreadCount > 0 && (
                            <Circle className="absolute -top-1 -right-1 w-3 h-3 fill-destructive text-destructive" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium truncate">{profile.full_name}</p>
                            {profile.lastMessageTime && (
                              <span className="text-xs text-muted-foreground">
                                {formatTime(profile.lastMessageTime)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground truncate">
                              {profile.lastMessage || profile.email}
                            </p>
                            {profile.unreadCount > 0 && (
                              <Badge variant="destructive" className="ml-2 h-5 min-w-5 flex items-center justify-center px-1">
                                {profile.unreadCount}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="md:col-span-2 flex flex-col h-full overflow-hidden">
            <CardHeader className="border-b">
              {selectedUser ? (
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {selectedUser.full_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{selectedUser.full_name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  </div>
                </div>
              ) : (
                <CardTitle>Select a user to chat</CardTitle>
              )}
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0">
              {selectedUser ? (
                <>
                  <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                    {messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <MessageSquare className="w-16 h-16 mb-4 opacity-50" />
                        <p className="text-lg font-medium">No messages yet</p>
                        <p className="text-sm">Start the conversation!</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((msg, index) => {
                          const isOwn = msg.sender_id === user?.id;
                          const showTimestamp = index === 0 ||
                            new Date(messages[index - 1].created_at).getTime() < new Date(msg.created_at).getTime() - 300000;

                          return (
                            <div key={msg.id}>
                              {showTimestamp && (
                                <div className="text-center my-4">
                                  <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                                    {formatTime(msg.created_at)}
                                  </span>
                                </div>
                              )}
                              <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex items-end gap-2 max-w-[70%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                                  <Avatar className="w-8 h-8">
                                    <AvatarFallback className={`text-xs ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                      {isOwn ? user?.email?.charAt(0).toUpperCase() : selectedUser.full_name.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div
                                    className={`px-4 py-2 rounded-2xl ${isOwn
                                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                                        : 'bg-muted rounded-bl-sm'
                                      }`}
                                  >
                                    <p className="break-words">{msg.message}</p>
                                    <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                      <span className="text-[10px] opacity-70">
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                      {isOwn && (
                                        msg.is_read ?
                                          <CheckCheck className="w-3 h-3 opacity-70" /> :
                                          <Check className="w-3 h-3 opacity-70" />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>
                  <CardFooter className="border-t p-3 sm:p-4">
                    <div className="flex items-center gap-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={selectedUser ? `Message ${selectedUser.full_name}...` : 'Select a user to start chatting'}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSendMessage();
                        }}
                        disabled={!selectedUser}
                      />
                      <Button onClick={handleSendMessage} disabled={!newMessage.trim() || !selectedUser}>
                        <Send className="w-4 h-4 mr-2" />
                        Send
                      </Button>
                    </div>
                  </CardFooter>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground p-4">
                  <div className="text-center">
                    <MessageSquare className="w-20 h-20 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Welcome to Chat</p>
                    <p className="text-sm mt-2">Select a contact from the list to start messaging</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Chat;
