import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TakealotProduct {
  offer_id: string;
  sku: string;
  title: string;
  selling_price: number;
  leadtime_stock?: number;
  warehouse_stock?: number;
  image_url?: string;
  buy_box_winner?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const takealotApiKey = Deno.env.get('TAKEALOT_API_KEY');

    if (!takealotApiKey) {
      throw new Error('TAKEALOT_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header for user context
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    console.log(`Syncing products for user ${user.id}`);
    console.log(`Using API key: ${takealotApiKey.substring(0, 10)}...`);

    // Fetch products from Takealot API - Official endpoint
    const takealotResponse = await fetch('https://seller-api.takealot.com/v2/offers', {
      headers: {
        'Authorization': `Key ${takealotApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`Takealot API response status: ${takealotResponse.status}`);

    if (!takealotResponse.ok) {
      const errorText = await takealotResponse.text();
      console.error('Takealot API error response:', errorText);
      console.error('Response status:', takealotResponse.status);
      console.error('Response headers:', Object.fromEntries(takealotResponse.headers.entries()));
      throw new Error(`Takealot API error: ${takealotResponse.status} - ${errorText.substring(0, 200)}`);
    }

    const takealotData = await takealotResponse.json();
    const products: TakealotProduct[] = takealotData.data || [];

    console.log(`Fetched ${products.length} products from Takealot`);

    let syncedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;

    // Process each product
    for (const takealotProduct of products) {
      const stock = (takealotProduct.leadtime_stock || 0) + (takealotProduct.warehouse_stock || 0);
      
      // Check if product exists
      const { data: existingProducts } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .or(`sku.eq.${takealotProduct.sku},takealot_offer_id.eq.${takealotProduct.offer_id}`);

      const now = new Date().toISOString();

      if (existingProducts && existingProducts.length > 0) {
        // Update existing product
        const existing = existingProducts[0];
        
        // Log price change if price changed
        if (existing.current_price !== takealotProduct.selling_price) {
          await supabase.from('price_history').insert({
            product_id: existing.id,
            old_price: existing.current_price,
            new_price: takealotProduct.selling_price,
            reason: 'Takealot sync',
          });
        }

        await supabase
          .from('products')
          .update({
            title: takealotProduct.title,
            current_price: takealotProduct.selling_price,
            stock_quantity: stock,
            takealot_offer_id: takealotProduct.offer_id,
            last_synced_at: now,
            image_url: takealotProduct.image_url || existing.image_url,
            buy_box_status: takealotProduct.buy_box_winner ? 'won' : 'lost',
          })
          .eq('id', existing.id);
        
        updatedCount++;
      } else {
        // Create new product
        await supabase.from('products').insert({
          user_id: user.id,
          sku: takealotProduct.sku,
          title: takealotProduct.title,
          current_price: takealotProduct.selling_price,
          stock_quantity: stock,
          takealot_offer_id: takealotProduct.offer_id,
          last_synced_at: now,
          image_url: takealotProduct.image_url,
          buy_box_status: takealotProduct.buy_box_winner ? 'won' : 'unknown',
          is_active: true,
        });
        
        createdCount++;
      }
      
      syncedCount++;
    }

    console.log(`Sync complete: ${createdCount} created, ${updatedCount} updated`);

    return new Response(
      JSON.stringify({
        success: true,
        synced: syncedCount,
        created: createdCount,
        updated: updatedCount,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error syncing products:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
