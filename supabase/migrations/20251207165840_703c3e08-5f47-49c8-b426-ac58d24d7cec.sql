-- Create RLS policies that allow service role to bypass RLS for all tables
-- This enables edge functions and direct inserts with the PRIVATE_USER_ID

-- Products: Allow inserts/updates/deletes for any user_id (service role bypasses RLS anyway, but we need client-side to work)
DROP POLICY IF EXISTS "Allow all operations for private user" ON public.products;
CREATE POLICY "Allow all operations for private user" 
ON public.products 
FOR ALL 
USING (user_id = '00000000-0000-0000-0000-000000000001')
WITH CHECK (user_id = '00000000-0000-0000-0000-000000000001');

-- Repricing rules: Allow all operations for private user
DROP POLICY IF EXISTS "Allow all operations for private user" ON public.repricing_rules;
CREATE POLICY "Allow all operations for private user" 
ON public.repricing_rules 
FOR ALL 
USING (user_id = '00000000-0000-0000-0000-000000000001')
WITH CHECK (user_id = '00000000-0000-0000-0000-000000000001');

-- Price history: Allow all operations for products owned by private user
DROP POLICY IF EXISTS "Allow all operations for private user" ON public.price_history;
CREATE POLICY "Allow all operations for private user" 
ON public.price_history 
FOR ALL 
USING (EXISTS (SELECT 1 FROM products WHERE products.id = price_history.product_id AND products.user_id = '00000000-0000-0000-0000-000000000001'))
WITH CHECK (EXISTS (SELECT 1 FROM products WHERE products.id = price_history.product_id AND products.user_id = '00000000-0000-0000-0000-000000000001'));

-- Competitors: Allow all operations for private user
DROP POLICY IF EXISTS "Allow all operations for private user" ON public.competitors;
CREATE POLICY "Allow all operations for private user" 
ON public.competitors 
FOR ALL 
USING (user_id = '00000000-0000-0000-0000-000000000001')
WITH CHECK (user_id = '00000000-0000-0000-0000-000000000001');

-- Sales: Allow all operations for private user
DROP POLICY IF EXISTS "Allow all operations for private user" ON public.sales;
CREATE POLICY "Allow all operations for private user" 
ON public.sales 
FOR ALL 
USING (user_id = '00000000-0000-0000-0000-000000000001')
WITH CHECK (user_id = '00000000-0000-0000-0000-000000000001');