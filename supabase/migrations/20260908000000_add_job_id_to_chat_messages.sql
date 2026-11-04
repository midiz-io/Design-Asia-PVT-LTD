ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS job_id UUID;
