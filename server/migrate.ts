/**
 * Migration Script: data/rides_db.json -> Supabase PostgreSQL
 * 
 * Safely migrates all 193 rides, 19 fleet drivers, 797 events, tokens, sessions,
 * adminEmails, and company branding into Supabase PostgreSQL.
 * 
 * Safe & repeatable: Uses upsert (ON CONFLICT DO UPDATE) so running multiple times
 * never produces duplicate rides or records.
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

import { getSupabaseClient, isSupabaseConfigured, verifySupabaseConnection } from './supabase';

export interface MigrationSummary {
  success: boolean;
  totalRides: number;
  migratedRides: number;
  totalDrivers: number;
  migratedDrivers: number;
  totalEvents: number;
  migratedEvents: number;
  totalTokens: number;
  migratedTokens: number;
  brandingMigrated: boolean;
  adminEmailsMigrated: boolean;
  error?: string;
}

export async function migrateJsonToSupabase(customJsonPath?: string): Promise<MigrationSummary> {
  const jsonPath = customJsonPath || path.join(process.cwd(), 'data', 'rides_db.json');
  
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Migration source file not found at: ${jsonPath}`);
  }

  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(raw);

  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error(
      'Supabase client not initialized. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in environment variables.'
    );
  }

  const ridesList: any[] = (data.rides || []).map((item: any) => item[1]);
  const driversList: any[] = (data.drivers || []).map((item: any) => item[1]);
  const eventsList: any[] = (data.events || []).map((item: any) => item[1]);
  const tokensList: any[] = (data.tokens || []).map((item: any) => item[1]);
  const adminEmailsList: string[] = data.adminEmails || [];
  const brandingData: any = data.branding || {};

  console.log(`[Supabase Migration] Found in JSON: ${ridesList.length} rides, ${driversList.length} drivers, ${eventsList.length} events, ${tokensList.length} tokens.`);

  // 1. Migrate Fleet Drivers (upsert on id)
  let migratedDrivers = 0;
  if (driversList.length > 0) {
    const driverRows = driversList.map(d => ({
      id: d.id,
      name: d.name,
      phone: d.phone || null,
      email: d.email || null,
      vehicle: d.vehicle || null,
      license_plate: d.licensePlate || null,
      active: d.active ?? true,
      created_at: d.createdAt || new Date().toISOString()
    }));

    // Ensure any driver referenced in rides is also present in driverRows
    const knownDriverIds = new Set(driverRows.map(d => d.id));
    for (const r of ridesList) {
      if (r.driverId && !knownDriverIds.has(r.driverId)) {
        driverRows.push({
          id: r.driverId,
          name: r.driverName || 'Driver',
          phone: r.driverPhone || null,
          email: null,
          vehicle: null,
          license_plate: null,
          active: true,
          created_at: r.createdAt || new Date().toISOString()
        });
        knownDriverIds.add(r.driverId);
      }
    }

    // Batch upsert in chunks of 50
    for (let i = 0; i < driverRows.length; i += 50) {
      const chunk = driverRows.slice(i, i + 50);
      let { error } = await supabase
        .from('drivers')
        .upsert(chunk, { onConflict: 'id' });
      if (error && error.message.includes('Could not find the table')) {
        const fallback = await supabase
          .from('fleet_drivers')
          .upsert(chunk, { onConflict: 'id' });
        error = fallback.error;
      }
      if (error) {
        throw new Error(`Failed to migrate drivers: ${error.message}`);
      }
      migratedDrivers += chunk.length;
    }
    console.log(`[Supabase Migration] Successfully upserted ${migratedDrivers} drivers.`);
  }

  // 2. Migrate Rides (upsert on id)
  let migratedRides = 0;
  if (ridesList.length > 0) {
    const rideRows = ridesList.map(r => ({
      id: r.id,
      reservation_id: r.reservationId,
      passenger_name: r.passengerName,
      passenger_email: r.passengerEmail,
      additional_passenger_emails: r.additionalPassengerEmails || [],
      driver_id: r.driverId || null,
      driver_name: r.driverName || null,
      driver_phone: r.driverPhone || null,
      current_status: r.currentStatus || 'created',
      created_at: r.createdAt || new Date().toISOString(),
      completed_at: r.completedAt || null,
      updated_at: r.updatedAt || new Date().toISOString(),
      tokens: r.tokens || {},
      last_email_dispatched_at: r.lastEmailDispatchedAt || null,
      last_assigned_driver_id_for_email: r.lastAssignedDriverIdForEmail || null,
      email_dispatch_status: r.emailDispatchStatus || null
    }));

    for (let i = 0; i < rideRows.length; i += 50) {
      const chunk = rideRows.slice(i, i + 50);
      let { error } = await supabase
        .from('rides')
        .upsert(chunk, { onConflict: 'id' });
      if (error && (
        error.code === '23503' ||
        error.message.includes('rides_driver_id_fkey') ||
        error.message.includes('violates foreign key constraint')
      )) {
        console.warn(`[Supabase Migration] Chunk ${i} had driver foreign key issues. Upserting rides individually with fallback...`);
        for (const singleRide of chunk) {
          let singleRes = await supabase.from('rides').upsert(singleRide, { onConflict: 'id' });
          if (singleRes.error && (singleRes.error.code === '23503' || singleRes.error.message.includes('foreign key'))) {
            const noDriver = { ...singleRide, driver_id: null };
            singleRes = await supabase.from('rides').upsert(noDriver, { onConflict: 'id' });
          }
          if (!singleRes.error) {
            migratedRides++;
          }
        }
      } else if (error) {
        throw new Error(`Failed to migrate rides chunk ${i}: ${error.message}`);
      } else {
        migratedRides += chunk.length;
      }
    }
    console.log(`[Supabase Migration] Successfully upserted ${migratedRides} rides.`);
  }

  // 3. Migrate Granular Events
  let migratedEvents = 0;
  if (eventsList.length > 0) {
    const eventRows = eventsList.map(e => ({
      id: e.id,
      ride_id: e.rideId,
      reservation_id: e.reservationId,
      status: e.status,
      started_at: e.startedAt,
      ended_at: e.endedAt || null,
      duration_seconds: e.durationSeconds ?? null,
      comment: e.comment || null,
      driver_id: e.driverId || null,
      driver_name: e.driverName || null,
      created_at: e.createdAt || new Date().toISOString()
    }));

    for (let i = 0; i < eventRows.length; i += 100) {
      const chunk = eventRows.slice(i, i + 100);
      const { error } = await supabase
        .from('ride_status_events')
        .upsert(chunk, { onConflict: 'id' });
      if (error) {
        console.warn(`[Supabase Migration] Warning upserting events chunk ${i}:`, error.message);
      } else {
        migratedEvents += chunk.length;
      }
    }
    console.log(`[Supabase Migration] Successfully upserted ${migratedEvents} ride status events.`);
  }

  // 4. Migrate Tracking Tokens
  let migratedTokens = 0;
  if (tokensList.length > 0) {
    const tokenRows = tokensList.map(t => ({
      token: t.token,
      ride_id: t.rideId,
      type: t.type,
      created_at: t.createdAt || new Date().toISOString(),
      expires_at: t.expiresAt || null,
      revoked_at: t.revokedAt || null
    }));

    for (let i = 0; i < tokenRows.length; i += 100) {
      const chunk = tokenRows.slice(i, i + 100);
      const { error } = await supabase
        .from('tracking_tokens')
        .upsert(chunk, { onConflict: 'token' });
      if (error) {
        console.warn(`[Supabase Migration] Warning upserting tokens chunk ${i}:`, error.message);
      } else {
        migratedTokens += chunk.length;
      }
    }
    console.log(`[Supabase Migration] Successfully upserted ${migratedTokens} tracking tokens.`);
  }

  // 5. Migrate System Settings (Admin Emails & Branding)
  let adminEmailsMigrated = false;
  if (adminEmailsList.length > 0) {
    const { error } = await supabase
      .from('system_settings')
      .upsert({
        key: 'admin_emails',
        value: { emails: adminEmailsList },
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
    if (!error) adminEmailsMigrated = true;
  }

  let brandingMigrated = false;
  if (brandingData && brandingData.companyName) {
    const { error } = await supabase
      .from('system_settings')
      .upsert({
        key: 'branding',
        value: brandingData,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
    if (!error) brandingMigrated = true;
  }

  return {
    success: true,
    totalRides: ridesList.length,
    migratedRides,
    totalDrivers: driversList.length,
    migratedDrivers,
    totalEvents: eventsList.length,
    migratedEvents,
    totalTokens: tokensList.length,
    migratedTokens,
    brandingMigrated,
    adminEmailsMigrated
  };
}

// Standalone CLI runner: node/tsx server/migrate.ts
if (process.argv[1] && process.argv[1].endsWith('migrate.ts')) {
  console.log('[Supabase Migration CLI] Starting migration...');
  migrateJsonToSupabase()
    .then(summary => {
      console.log('[Supabase Migration CLI] Completed successfully:', summary);
      process.exit(0);
    })
    .catch(err => {
      console.error('[Supabase Migration CLI] Migration failed:', err.message);
      process.exit(1);
    });
}
