# Task 7.3: Vehicle CRUD Update

> **Phase**: 7 - Vehicle Data Schema Extension
> **Status**: [ ] Pending
> **Priority**: High
> **Depends On**: 07_01
> **Estimated Effort**: 1.5 hours

---

## Objective

Update the Vehicle CRUD Edge Function to handle all new fields from Phase 7:
- Accept `tachometer_km` in POST/PUT requests (manual input)
- Accept all OCR-populated fields in PUT requests (from OCR flow)
- Update TypeScript interfaces
- Update validation schemas

---

## Prerequisites

- [ ] Task 07_01 completed (database columns exist)

---

## Architecture Reference

See: [PHASE7_00_ARCHITECTURE.md](./PHASE7_00_ARCHITECTURE.md)

### Field Categories

| Category | Fields | Source | Editable |
|----------|--------|--------|----------|
| **Manual Input** | `tachometer_km` | User form | Yes |
| **OCR Auto-fill** | `barva`, `palivo`, `objem_motoru`, etc. | OCR extraction | Read-only in UI |
| **Extended VTP** | `karoserie`, dimensions, weights, etc. | VTP OCR | Read-only in UI |

---

## Implementation Steps

### Step 1: Update Vehicle Types

Update file: `supabase/functions/vehicle/types.ts` (create if doesn't exist)

```typescript
/**
 * Vehicle entity types - Phase 7 Extended
 */

// Base vehicle fields (original)
export interface VehicleBase {
  spz: string;
  vin?: string;
  znacka?: string;
  model?: string;
  rok_vyroby?: number;
  datum_1_registrace?: string;
  majitel?: string;
  motor?: string;
  vykon_kw?: number;
}

// Phase 7.1: Fraud detection fields
export interface VehicleFraudFields {
  tachometer_km?: number;
  datum_posledni_preregistrace?: string;
}

// Phase 7.2: OCR-extractable fields
export interface VehicleOCRFields {
  barva?: string;
  palivo?: string;
  objem_motoru?: number;
  pocet_mist?: number;
  max_rychlost?: number;
  kategorie_vozidla?: string;
}

// Phase 7.3: Extended VTP fields
export interface VehicleVTPFields {
  karoserie?: string;
  cislo_motoru?: string;
  provozni_hmotnost?: number;
  povolena_hmotnost?: number;
  delka?: number;
  sirka?: number;
  vyska?: number;
  rozvor?: number;
  emise_co2?: string;
  spotreba_paliva?: string;
  emisni_norma?: string;
  datum_stk?: string;
  stk_platnost?: string;
}

// Complete vehicle type
export interface Vehicle extends VehicleBase, VehicleFraudFields, VehicleOCRFields, VehicleVTPFields {
  id?: string;
  buying_opportunity_id: string;
  data_source?: 'MANUAL' | 'OCR' | 'BC_IMPORT';
  validation_status?: string;
  created_at?: string;
}

// Request types
export interface CreateVehicleRequest extends VehicleBase, VehicleFraudFields {}
export interface UpdateVehicleRequest extends Partial<Vehicle> {}
```

### Step 2: Update Validation Schema

```typescript
/**
 * Validation schemas for vehicle requests
 */

const FUEL_TYPES = ['BA', 'NM', 'EL', 'LPG', 'CNG', 'H', 'HYBRID', 'BA/LPG', 'BA/CNG', 'EL/BA', 'EL/NM'];
const VEHICLE_CATEGORIES = ['M1', 'M2', 'M3', 'N1', 'N2', 'N3', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'];

export function validateVehicle(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required field
  if (!data.spz || typeof data.spz !== 'string') {
    errors.push('spz is required and must be a string');
  }

  // VIN validation (optional but if provided, must be valid)
  if (data.vin !== undefined && data.vin !== null) {
    if (typeof data.vin !== 'string' || !/^[A-HJ-NPR-Z0-9]{15,19}$/i.test(data.vin.replace(/\s/g, ''))) {
      errors.push('vin must be 15-19 alphanumeric characters (no I, O, Q)');
    }
  }

  // Tachometer validation (Phase 7.1)
  if (data.tachometer_km !== undefined && data.tachometer_km !== null) {
    if (typeof data.tachometer_km !== 'number' || data.tachometer_km < 0) {
      errors.push('tachometer_km must be a positive number');
    }
    if (data.tachometer_km > 2000000) {
      errors.push('tachometer_km seems unrealistic (> 2,000,000 km)');
    }
  }

  // Year validation
  if (data.rok_vyroby !== undefined && data.rok_vyroby !== null) {
    const currentYear = new Date().getFullYear();
    if (typeof data.rok_vyroby !== 'number' || data.rok_vyroby < 1900 || data.rok_vyroby > currentYear + 1) {
      errors.push(`rok_vyroby must be between 1900 and ${currentYear + 1}`);
    }
  }

  // Fuel type validation (Phase 7.2)
  if (data.palivo !== undefined && data.palivo !== null) {
    if (!FUEL_TYPES.includes(data.palivo.toUpperCase())) {
      errors.push(`palivo must be one of: ${FUEL_TYPES.join(', ')}`);
    }
  }

  // Vehicle category validation (Phase 7.2)
  if (data.kategorie_vozidla !== undefined && data.kategorie_vozidla !== null) {
    if (!VEHICLE_CATEGORIES.includes(data.kategorie_vozidla.toUpperCase())) {
      errors.push(`kategorie_vozidla must be one of: ${VEHICLE_CATEGORIES.join(', ')}`);
    }
  }

  // Numeric field validations (Phase 7.2 & 7.3)
  const numericFields = [
    { name: 'objem_motoru', min: 0, max: 20000 },
    { name: 'pocet_mist', min: 1, max: 100 },
    { name: 'max_rychlost', min: 0, max: 500 },
    { name: 'vykon_kw', min: 0, max: 2000 },
    { name: 'provozni_hmotnost', min: 0, max: 100000 },
    { name: 'povolena_hmotnost', min: 0, max: 100000 },
    { name: 'delka', min: 0, max: 30000 },
    { name: 'sirka', min: 0, max: 5000 },
    { name: 'vyska', min: 0, max: 5000 },
    { name: 'rozvor', min: 0, max: 10000 },
  ];

  numericFields.forEach(({ name, min, max }) => {
    const value = data[name];
    if (value !== undefined && value !== null) {
      if (typeof value !== 'number' || value < min || value > max) {
        errors.push(`${name} must be a number between ${min} and ${max}`);
      }
    }
  });

  return { valid: errors.length === 0, errors };
}
```

### Step 3: Update Index Handler

Update file: `supabase/functions/vehicle/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateVehicle, Vehicle, CreateVehicleRequest, UpdateVehicleRequest } from "./types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

// All vehicle columns (Phase 7 extended)
const VEHICLE_COLUMNS = [
  // Original fields
  'id', 'buying_opportunity_id', 'spz', 'vin', 'znacka', 'model',
  'rok_vyroby', 'datum_1_registrace', 'majitel', 'motor', 'vykon_kw',
  // Phase 7.1
  'tachometer_km', 'datum_posledni_preregistrace',
  // Phase 7.2
  'barva', 'palivo', 'objem_motoru', 'pocet_mist', 'max_rychlost', 'kategorie_vozidla',
  // Phase 7.3
  'karoserie', 'cislo_motoru', 'provozni_hmotnost', 'povolena_hmotnost',
  'delka', 'sirka', 'vyska', 'rozvor',
  'emise_co2', 'spotreba_paliva', 'emisni_norma',
  'datum_stk', 'stk_platnost',
  // Metadata
  'data_source', 'validation_status', 'created_at'
];

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const vehicleId = pathParts[pathParts.length - 1];

    // GET - Fetch vehicle(s)
    if (req.method === "GET") {
      if (vehicleId && vehicleId !== "vehicle") {
        // Get single vehicle by ID
        const { data, error } = await supabase
          .from("vehicles")
          .select(VEHICLE_COLUMNS.join(','))
          .eq("id", vehicleId)
          .single();

        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        // Get vehicles by buying_opportunity_id
        const boId = url.searchParams.get("buying_opportunity_id");
        if (!boId) {
          return new Response(
            JSON.stringify({ error: "buying_opportunity_id query param required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data, error } = await supabase
          .from("vehicles")
          .select(VEHICLE_COLUMNS.join(','))
          .eq("buying_opportunity_id", boId);

        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // POST - Create vehicle
    if (req.method === "POST") {
      const body: CreateVehicleRequest = await req.json();

      // Validate
      const validation = validateVehicle(body);
      if (!validation.valid) {
        return new Response(
          JSON.stringify({ error: "Validation failed", details: validation.errors }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Filter to only allowed columns
      const insertData: Record<string, any> = {};
      VEHICLE_COLUMNS.forEach(col => {
        if (col in body && col !== 'id' && col !== 'created_at') {
          insertData[col] = (body as any)[col];
        }
      });

      // Set default data_source if not provided
      if (!insertData.data_source) {
        insertData.data_source = 'MANUAL';
      }

      const { data, error } = await supabase
        .from("vehicles")
        .insert(insertData)
        .select(VEHICLE_COLUMNS.join(','))
        .single();

      if (error) throw error;
      return new Response(JSON.stringify(data), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PUT - Update vehicle
    if (req.method === "PUT") {
      if (!vehicleId || vehicleId === "vehicle") {
        return new Response(
          JSON.stringify({ error: "Vehicle ID required in URL" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const body: UpdateVehicleRequest = await req.json();

      // Validate (partial validation for updates)
      if (Object.keys(body).length === 0) {
        return new Response(
          JSON.stringify({ error: "No fields to update" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Filter to only allowed columns
      const updateData: Record<string, any> = {};
      VEHICLE_COLUMNS.forEach(col => {
        if (col in body && col !== 'id' && col !== 'created_at' && col !== 'buying_opportunity_id') {
          updateData[col] = (body as any)[col];
        }
      });

      const { data, error } = await supabase
        .from("vehicles")
        .update(updateData)
        .eq("id", vehicleId)
        .select(VEHICLE_COLUMNS.join(','))
        .single();

      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE - Remove vehicle
    if (req.method === "DELETE") {
      if (!vehicleId || vehicleId === "vehicle") {
        return new Response(
          JSON.stringify({ error: "Vehicle ID required in URL" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabase
        .from("vehicles")
        .delete()
        .eq("id", vehicleId);

      if (error) throw error;
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Vehicle endpoint error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

### Step 4: Deploy Function

```bash
supabase functions deploy vehicle
```

---

## Test Cases

### Manual Testing

```bash
# Create vehicle with tachometer (Phase 7.1)
curl -X POST "https://[project].supabase.co/functions/v1/vehicle" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [token]" \
  -d '{
    "buying_opportunity_id": "uuid-here",
    "spz": "TEST123",
    "vin": "TESTVIN12345678901",
    "tachometer_km": 150000
  }'

# Update with OCR data (Phase 7.2)
curl -X PUT "https://[project].supabase.co/functions/v1/vehicle/[id]" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [token]" \
  -d '{
    "barva": "ČERNÁ",
    "palivo": "BA",
    "objem_motoru": 1969,
    "pocet_mist": 5,
    "data_source": "OCR"
  }'
```

---

## Validation Criteria

- [ ] POST accepts `tachometer_km` field
- [ ] PUT accepts all Phase 7 fields
- [ ] Validation rejects invalid fuel types
- [ ] Validation rejects invalid vehicle categories
- [ ] Validation rejects out-of-range numeric values
- [ ] GET returns all Phase 7 fields
- [ ] Function deployed successfully

---

## Completion Checklist

- [ ] Types file created/updated
- [ ] Validation schema extended
- [ ] Index handler updated
- [ ] Function deployed
- [ ] Manual tests passing
- [ ] Update tracker: `PHASE7_IMPLEMENTATION_TRACKER.md`
