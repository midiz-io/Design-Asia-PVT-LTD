-- Migration to create Helpdesk system tables and RLS policies

-- Create helpdesk_profiles table
CREATE TABLE IF NOT EXISTS public.helpdesk_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create helpdesk_tickets table
CREATE TABLE IF NOT EXISTS public.helpdesk_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.helpdesk_profiles(id) ON DELETE CASCADE,
    issue_type TEXT NOT NULL, -- 'Bug', 'Login Failure', 'Other'
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'resolved'
    admin_reply TEXT,
    estimated_duration TEXT, -- developer estimation (e.g., "2 days", "4 hours")
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.helpdesk_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helpdesk_tickets ENABLE ROW LEVEL SECURITY;

-- Create policies for helpdesk_profiles
CREATE POLICY "Allow public insert to helpdesk_profiles" ON public.helpdesk_profiles
    FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow public select from helpdesk_profiles" ON public.helpdesk_profiles
    FOR SELECT TO anon, authenticated USING (true);

-- Create policies for helpdesk_tickets
CREATE POLICY "Allow public insert to helpdesk_tickets" ON public.helpdesk_tickets
    FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow public select from helpdesk_tickets" ON public.helpdesk_tickets
    FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow public update to helpdesk_tickets" ON public.helpdesk_tickets
    FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
