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
  cost_price?: number;
  rrp?: number;
}

// Fixed user ID for private use
const PRIVATE_USER_ID = '00000000-0000-0000-0000-000000000001';

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

    console.log(`Syncing products for private user`);
    console.log(`Using API key: ${takealotApiKey.substring(0, 20)}...`);

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
    console.log('Takealot API response structure:', JSON.stringify(takealotData).substring(0, 500));
    
    // Handle different possible response structures
    let products: TakealotProduct[] = [];
    if (Array.isArray(takealotData)) {
      products = takealotData;
    } else if (takealotData.data && Array.isArray(takealotData.data)) {
      products = takealotData.data;
    } else if (takealotData.offers && Array.isArray(takealotData.offers)) {
      products = takealotData.offers;
    } else if (takealotData.results && Array.isArray(takealotData.results)) {
      products = takealotData.results;
    }

    console.log(`Fetched ${products.length} products from Takealot`);

    let syncedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;

    // Process each product
    for (const takealotProduct of products) {
      const stock = (takealotProduct.leadtime_stock || 0) + (takealotProduct.warehouse_stock || 0);
      
      // Check if product exists
      const { data: existingProducts, error: queryError } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', PRIVATE_USER_ID)
        .or(`sku.eq.${takealotProduct.sku},takealot_offer_id.eq.${takealotProduct.offer_id}`);

      if (queryError) {
        console.error('Error querying products:', queryError);
        continue;
      }

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

        const { error: updateError } = await supabase
          .from('products')
          .update({
            title: takealotProduct.title,
            current_price: takealotProduct.selling_price,
            stock_quantity: stock,
            takealot_offer_id: takealotProduct.offer_id,
            last_synced_at: now,
            image_url: takealotProduct.image_url || existing.image_url,
            buy_box_status: takealotProduct.buy_box_winner ? 'won' : 'lost',
            cost_price: takealotProduct.cost_price || existing.cost_price,
          })
          .eq('id', existing.id);
        
        if (updateError) {
          console.error('Error updating product:', updateError);
        } else {
          updatedCount++;
        }
      } else {
        // Create new product
        const { error: insertError } = await supabase.from('products').insert({
          user_id: PRIVATE_USER_ID,
          sku: takealotProduct.sku,
          title: takealotProduct.title,
          current_price: takealotProduct.selling_price,
          stock_quantity: stock,
          takealot_offer_id: takealotProduct.offer_id,
          last_synced_at: now,
          image_url: takealotProduct.image_url,
          buy_box_status: takealotProduct.buy_box_winner ? 'won' : 'unknown',
          is_active: true,
          cost_price: takealotProduct.cost_price,
        });
        
        if (insertError) {
          console.error('Error inserting product:', insertError);
        } else {
          createdCount++;
        }
      }
      
      syncedCount++;
    }

    // Update last sync time in profiles
    await supabase
      .from('profiles')
      .upsert({
        user_id: PRIVATE_USER_ID,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

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
