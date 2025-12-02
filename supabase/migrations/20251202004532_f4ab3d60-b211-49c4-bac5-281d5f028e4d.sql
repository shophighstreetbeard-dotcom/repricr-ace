-- Fix security issues: Add missing RLS policies
CREATE POLICY "Users can update own competitors" 
ON public.competitors 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own price history" 
ON public.price_history 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM products 
  WHERE products.id = price_history.product_id 
  AND products.user_id = auth.uid()
));

-- Add Takealot integration columns to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS takealot_offer_id text,
ADD COLUMN IF NOT EXISTS last_synced_at timestamp with time zone;

-- Create webhook_events table for logging
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own webhook events" 
ON public.webhook_events 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert webhook events" 
ON public.webhook_events 
FOR INSERT 
WITH CHECK (true);